---
name: Gemini cut-out transparency
description: Why background removal uses a magenta chroma-key instead of trusting the model for alpha
---

`gemini-2.5-flash-image` (used in `removeBackground`, lib/integrations-gemini-ai) does NOT reliably return a transparent (alpha) background — it bakes a solid fill (usually white). Faithfully saving its bytes to a `.png` therefore yields a solid background, not a cut-out.

**Approach that works:** prompt the model to place the subject on a solid **pure magenta `#FF00FF`** background, then chroma-key that magenta to real alpha server-side with `sharp` (raw RGBA), returning `image/png`.

**Why magenta (not white/green):** the key colour must not collide with subject content. White collides with white garments / pale skin / highlights; green collides with sage/olive/khaki outfits (and this app's sage theme). Magenta almost never appears in clothing.

**Detection is hue + saturation, not RGB-euclidean distance:** the model rarely returns exact `#FF00FF` — it drifts in brightness/saturation — so distance-to-pure-magenta either leaves a visible off-magenta background (tight threshold) or eats pink garments (loose). Detect the magenta **hue band** (~285–338°, excludes blue/purple and red/rose) above a brightness floor instead.

**Two-pass flood-fill (edge-connected primary + measured-fill trapped pockets):**
- **Pass 1 (outer background):** seed ONLY from vivid-magenta *border* pixels (SEED_SAT≈0.5 — the chroma fill is consistently vivid, sat~0.7), then grow through *connected* magenta-hue pixels down to a looser sat (GROW_SAT≈0.25), sweeping the desaturated transition band (kills the halo). Edge-connectivity is the core garment protection: an interior pink/purple garment not reachable from a border is never touched.
- **Pass 2 (trapped background):** Pass 1 can't reach background *enclosed* by the subject (the gap inside a bag's handle loop, between arm & torso). Clear it by *measuring* the actual fill colour (mean of Pass-1 vivid-keyed pixels) and keying only enclosed pixels that match it within a tight euclidean tolerance (TRAP_TOL≈55). The model paints ONE uniform fill, so real trapped pockets match closely; a differently-shaded magenta garment doesn't and is spared. Grow trapped seeds only through pixels still matching the fill so clearing can't bleed into the garment.
- Then a small bounded inward feather (FEATHER_PX≈3) with magenta despill for clean rims.

**Do NOT globally seed every vivid-magenta pixel anywhere** — it clears trapped pockets but punches holes in a genuinely vivid-magenta garment (code review REJECTED this). Use edge-connected Pass 1 + measured-fill Pass 2 instead. **Do NOT reintroduce a fixed pure-#FF00FF distance pass** for trapped pockets — it misses off-magenta fills; match the *measured* fill colour, not pure magenta.

**Only remaining (acceptable) gap:** a garment that is the *exact* background fill colour is indistinguishable and may be keyed — extremely unlikely.

**How to apply:** see `lib/integrations-gemini-ai/src/image/chroma-key.ts`. Verify deterministically by POSTing sample PNGs to `/api/collage/remove-background` and asserting alpha=0 at all borders AND zero vivid-magenta opaque pixels remaining (the bag/handle-loop sample is the canonical trapped-background regression case). `sharp` must be a DIRECT api-server dep (externalized by esbuild) — see api-server-external-deps note. Restart the api-server workflow to rebuild lib changes (esbuild bundles on restart; it does NOT typecheck — run `pnpm --filter @workspace/api-server exec tsc --noEmit`).
