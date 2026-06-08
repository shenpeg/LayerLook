import sharp from "sharp";

/**
 * The solid background colour we ask the model to place the subject on. We use
 * pure magenta because it almost never appears in clothing/skin, so keying it
 * out is far safer than white (which collides with white garments, highlights
 * and pale skin) or green (which collides with sage/olive/khaki outfits).
 */
export const KEY_COLOR = { r: 255, g: 0, b: 255 } as const;

// Distances measured in 0–441 RGB-euclidean space.
// - PURE: a pixel this close to the key colour is unmistakably background. Used
//   to seed the flood fill and to clear background trapped between limbs.
// - FAR: a pixel this far from the key colour is unmistakably subject; the
//   feather ramp runs from PURE (alpha 0) to FAR (alpha 255).
const PURE = 60;
const FAR = 170;

// How many pixels the feathered edge may grow inward from the keyed region.
// Bounding this means a pink/purple garment that happens to touch the magenta
// background only loses a thin rim instead of being eaten away wholesale.
const FEATHER_PX = 3;

function dist(r: number, g: number, b: number): number {
  const dr = r - KEY_COLOR.r;
  const dg = g - KEY_COLOR.g;
  const db = b - KEY_COLOR.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function ramp(d: number): number {
  if (d <= PURE) return 0;
  if (d >= FAR) return 255;
  return Math.round(((d - PURE) / (FAR - PURE)) * 255);
}

/**
 * Convert an image whose subject sits on a solid {@link KEY_COLOR} background
 * into a PNG with a genuinely transparent background.
 *
 * Strategy (so we never cut holes in magenta/pink garments):
 *  1. Flood-fill inward from the image borders through near-pure magenta. Only
 *     background connected to an edge is removed, so an interior pink shirt is
 *     left untouched.
 *  2. Also clear any near-pure magenta anywhere (handles background trapped
 *     between an arm and the torso). The tight PURE threshold keeps real
 *     clothing safe.
 *  3. Feather a few pixels inward from the keyed region for clean anti-aliased
 *     edges, and despill the magenta cast on those edge pixels.
 *
 * @param input Encoded image bytes returned by the model (PNG/JPEG/etc).
 * @returns PNG bytes with a transparent background.
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
  const isBgColor = (p: number) => {
    const o = px(p);
    return dist(data[o], data[o + 1], data[o + 2]) <= PURE;
  };

  // Seed: all border pixels that are background colour.
  for (let x = 0; x < width; x++) {
    const top = x;
    const bottom = (height - 1) * width + x;
    if (state[top] === 0 && isBgColor(top)) {
      state[top] = 1;
      stack.push(top);
    }
    if (state[bottom] === 0 && isBgColor(bottom)) {
      state[bottom] = 1;
      stack.push(bottom);
    }
  }
  for (let y = 0; y < height; y++) {
    const left = y * width;
    const right = y * width + (width - 1);
    if (state[left] === 0 && isBgColor(left)) {
      state[left] = 1;
      stack.push(left);
    }
    if (state[right] === 0 && isBgColor(right)) {
      state[right] = 1;
      stack.push(right);
    }
  }

  // Flood fill through connected background-colour pixels.
  while (stack.length > 0) {
    const p = stack.pop()!;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) {
      const q = p - 1;
      if (state[q] === 0 && isBgColor(q)) {
        state[q] = 1;
        stack.push(q);
      }
    }
    if (x < width - 1) {
      const q = p + 1;
      if (state[q] === 0 && isBgColor(q)) {
        state[q] = 1;
        stack.push(q);
      }
    }
    if (y > 0) {
      const q = p - width;
      if (state[q] === 0 && isBgColor(q)) {
        state[q] = 1;
        stack.push(q);
      }
    }
    if (y < height - 1) {
      const q = p + width;
      if (state[q] === 0 && isBgColor(q)) {
        state[q] = 1;
        stack.push(q);
      }
    }
  }

  // Clear background trapped between limbs (pure magenta, not edge-connected).
  for (let p = 0; p < n; p++) {
    if (state[p] === 0 && isBgColor(p)) state[p] = 1;
  }

  // Grow a bounded feather inward from the keyed region.
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
        const d = dist(data[o], data[o + 1], data[o + 2]);
        if (d < FAR) {
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
      const a = ramp(dist(r, g, b));
      data[o + 3] = Math.min(data[o + 3], a);
      // Despill the magenta fringe (magenta = high R & B, low G).
      const mix = 1 - a / 255;
      if (r > g) data[o] = Math.round(r - (r - g) * mix);
      if (b > g) data[o + 2] = Math.round(b - (b - g) * mix);
    }
    // state === 0: subject pixel, left fully intact.
  }

  return sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}
