import sharp from "sharp";

/**
 * The solid background colour we ask the model to place the subject on. We use
 * pure magenta because it almost never appears in clothing/skin, so keying it
 * out is far safer than white (which collides with white garments, highlights
 * and pale skin) or green (which collides with sage/olive/khaki outfits).
 */
export const KEY_COLOR = { r: 255, g: 0, b: 255 } as const;

// Hue band (degrees) that counts as the magenta/pink key family. The model
// rarely returns exactly #FF00FF — it drifts in brightness and saturation — so
// keying a single exact colour leaves a visible pink background. Detecting the
// whole magenta hue band instead removes the background regardless of shade.
// The band excludes blue/purple (< ~285°) and red/rose (> ~338°) so coloured
// garments are not mistaken for background.
const HUE_MIN = 285;
const HUE_MAX = 338;
// Saturation needed to *seed* the flood fill from a border pixel. The model's
// magenta fill is highly saturated (vivid), so only seeding from vivid border
// pixels avoids latching onto a muted pink/purple garment that merely touches
// the edge.
const SEED_SAT = 0.5;
// Lower saturation needed to *grow* the flood into a connected pixel. Once
// anchored in real background, we propagate through the slightly desaturated
// transition pixels around the subject too, so no magenta halo is left behind.
const GROW_SAT = 0.25;
// Minimum brightness so deep shadows aren't keyed.
const MIN_VAL = 45;

// How many pixels the feathered edge may grow inward from the keyed region.
// Bounding this means a pink/purple garment that happens to touch the magenta
// background only loses a thin rim instead of being eaten away wholesale.
const FEATHER_PX = 3;

/** Hue in degrees [0,360) for an RGB pixel (0 if achromatic). */
function hue(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h *= 60;
  if (h < 0) h += 360;
  return h;
}

/** Whether a pixel is in the magenta key hue band and at least `minSat` saturated. */
function isMagentaHue(r: number, g: number, b: number, minSat: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < MIN_VAL) return false;
  const sat = (max - min) / max;
  if (sat < minSat) return false;
  const h = hue(r, g, b);
  return h >= HUE_MIN && h <= HUE_MAX;
}

/**
 * Vivid key colour — used to *seed* the flood fill from the image borders. Only
 * unmistakable, highly saturated magenta anchors the fill, so a muted pink or
 * purple garment that merely touches the edge is not treated as background.
 */
function isSeedColor(r: number, g: number, b: number): boolean {
  return isMagentaHue(r, g, b, SEED_SAT);
}

/**
 * Looser key colour — used to *grow* the flood through pixels connected to an
 * already-keyed region (including the slightly desaturated transition pixels
 * around the subject). Because growth only continues from real background, an
 * interior garment not reachable from a seeded border stays fully opaque.
 */
function isGrowColor(r: number, g: number, b: number): boolean {
  return isMagentaHue(r, g, b, GROW_SAT);
}

/**
 * Magenta dominance in [0,1]: how much red and blue exceed green. High for the
 * key colour, ~0 for most subject content. Drives the edge despill and the
 * partial alpha of feathered rim pixels so a thin magenta halo doesn't remain.
 */
function magentaness(r: number, g: number, b: number): number {
  const m = (Math.min(r, b) - g) / 255;
  return m < 0 ? 0 : m > 1 ? 1 : m;
}

/**
 * Convert an image whose subject sits on a solid magenta background into a PNG
 * with a genuinely transparent background.
 *
 * Strategy (designed to avoid cutting holes in magenta/pink garments):
 *  1. Flood-fill keyed by saturation. The fill is *seeded* from every vivid
 *     magenta pixel anywhere in the image — vivid saturation is the chroma
 *     background's signature — which catches both the outer background and
 *     background trapped inside the subject (a bag's handle loop, the gap
 *     between an arm and the torso) that an edge-only flood can't reach. It
 *     then *grows* through any connected magenta-hue pixel down to a looser
 *     saturation, sweeping up off/desaturated background and the transition
 *     band around the subject. A muted pink/purple garment (saturation below
 *     the seed threshold) is left untouched unless it is directly connected to
 *     a vivid seed; a garment that is itself vividly magenta is inherently
 *     ambiguous against a magenta key and may be removed.
 *  2. Feather a few pixels inward from the keyed region, giving rim pixels a
 *     partial alpha proportional to how magenta they are, and despill the
 *     magenta cast — eliminating the pink halo around the cut-out.
 */
export async function chromaKeyToTransparent(input: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) {
    return sharp(input).png().toBuffer();
  }

  const n = width * height;
  // 0 = subject (default), 1 = keyed background, 2 = feathered edge.
  const state = new Uint8Array(n);
  const stack: number[] = [];

  const px = (p: number) => p * 4;

  // Seed only from vivid border magenta — the unmistakable background.
  const seedBorder = (p: number) => {
    if (state[p] !== 0) return;
    const o = px(p);
    if (isSeedColor(data[o], data[o + 1], data[o + 2])) {
      state[p] = 1;
      stack.push(p);
    }
  };
  // Grow into any connected magenta-hue pixel (looser), so the desaturated
  // transition band around the subject is removed too — no halo left behind.
  const grow = (p: number) => {
    if (state[p] !== 0) return;
    const o = px(p);
    if (isGrowColor(data[o], data[o + 1], data[o + 2])) {
      state[p] = 1;
      stack.push(p);
    }
  };

  // Seed: every vivid-magenta pixel, wherever it sits. Border seeds catch the
  // outer background; interior seeds catch background trapped inside the subject
  // (e.g. the gap enclosed by a bag's handles or between an arm and the torso),
  // which an edge-only flood could never reach. Vivid saturation is the chroma
  // background's signature, so this stays clear of muted pink/purple garments.
  for (let p = 0; p < n; p++) seedBorder(p);

  // Flood fill outward from every seed through connected background-colour
  // pixels, sweeping up the desaturated transition band around the subject.
  while (stack.length > 0) {
    const p = stack.pop()!;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) grow(p - 1);
    if (x < width - 1) grow(p + 1);
    if (y > 0) grow(p - width);
    if (y < height - 1) grow(p + width);
  }

  // Grow a bounded feather inward from the keyed region: any subject pixel that
  // still carries a magenta cast becomes a partially transparent rim pixel.
  let frontier: number[] = [];
  for (let p = 0; p < n; p++) if (state[p] === 1) frontier.push(p);

  for (let step = 0; step < FEATHER_PX && frontier.length > 0; step++) {
    const next: number[] = [];
    for (const p of frontier) {
      const x = p % width;
      const y = (p - x) / width;
      const neighbors = [
        x > 0 ? p - 1 : -1,
        x < width - 1 ? p + 1 : -1,
        y > 0 ? p - width : -1,
        y < height - 1 ? p + width : -1,
      ];
      for (const q of neighbors) {
        if (q < 0 || state[q] !== 0) continue;
        const o = px(q);
        if (magentaness(data[o], data[o + 1], data[o + 2]) > 0.1) {
          state[q] = 2;
          next.push(q);
        }
      }
    }
    frontier = next;
  }

  // Apply alpha + despill based on final state.
  for (let p = 0; p < n; p++) {
    const o = px(p);
    if (state[p] === 1) {
      data[o + 3] = 0;
      continue;
    }
    if (state[p] === 2) {
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const m = magentaness(r, g, b);
      // The more magenta the rim pixel, the more transparent it becomes.
      const a = Math.round(255 * (1 - m));
      data[o + 3] = Math.min(data[o + 3], a);
      // Despill: pull the magenta cast (high R & B, low G) back toward neutral.
      if (r > g) data[o] = Math.round(r - (r - g) * m);
      if (b > g) data[o + 2] = Math.round(b - (b - g) * m);
    }
    // state === 0: subject pixel, left fully intact.
  }

  return sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}
