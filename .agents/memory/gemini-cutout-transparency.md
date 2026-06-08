---
name: Gemini cut-out transparency
description: Why background removal uses a magenta chroma-key instead of trusting the model for alpha
---

`gemini-2.5-flash-image` (used in `removeBackground`, lib/integrations-gemini-ai) does NOT reliably return a transparent (alpha) background — it bakes a solid fill (usually white). Faithfully saving its bytes to a `.png` therefore yields a solid background, not a cut-out.

**Approach that works:** prompt the model to place the subject on a solid **pure magenta `#FF00FF`** background, then chroma-key that magenta to real alpha server-side with `sharp` (raw RGBA), returning `image/png`.

**Why magenta (not white/green):** the key colour must not collide with subject content. White collides with white garments / pale skin / highlights; green collides with sage/olive/khaki outfits (and this app's sage theme). Magenta almost never appears in clothing.

**Detection is hue + saturation, not RGB-euclidean distance:** the model rarely returns exact `#FF00FF` — it drifts in brightness/saturation — so distance-to-pure-magenta either leaves a visible off-magenta background (tight threshold) or eats pink garments (loose). Detect the magenta **hue band** (~285–338°, excludes blue/purple and red/rose) above a brightness floor instead.

**Saturation-keyed seed/grow flood-fill (the key idea):** the chroma background is consistently *vivid* (saturation ~0.7) even when its shade drifts, while real pink/purple garments are more muted. So:
- **Seed** the flood from *every* vivid-magenta pixel anywhere (SEED_SAT≈0.5), not just borders. Interior seeding is essential — it catches background **trapped inside the subject** that an edge-only flood can never reach (e.g. the gap enclosed by a bag's handle loop, between an arm and torso). Edge-only flood leaves a solid magenta blob in those pockets.
- **Grow** from seeds through any *connected* magenta-hue pixel down to a looser saturation (GROW_SAT≈0.25), sweeping up off/desaturated background + the transition band around the subject (kills the halo).
- A muted pink/purple garment (sat < SEED_SAT) survives unless directly connected to a vivid seed. A garment that is *itself* vividly magenta is inherently ambiguous against a magenta key and may be removed — acceptable tradeoff.
- Then a small bounded inward feather (FEATHER_PX≈3) with magenta despill for clean anti-aliased rims.

**Don't reintroduce a pure-magenta-distance pass** — the vivid-saturation interior seeding replaced it; an RGB-distance pass with a tight threshold misses the (off-magenta) trapped blobs and a loose one cuts garments.

**How to apply:** see `lib/integrations-gemini-ai/src/image/chroma-key.ts`. Verify deterministically by POSTing sample PNGs to `/api/collage/remove-background` and asserting alpha=0 at all borders AND zero vivid-magenta opaque pixels remaining (the bag/handle-loop sample is the canonical trapped-background regression case). `sharp` must be a DIRECT api-server dep (externalized by esbuild) — see api-server-external-deps note. Restart the api-server workflow to rebuild lib changes (esbuild bundles on restart; it does NOT typecheck — run `pnpm --filter @workspace/api-server exec tsc --noEmit`).
