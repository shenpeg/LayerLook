---
name: Gemini cut-out transparency
description: Why background removal uses a magenta chroma-key instead of trusting the model for alpha
---

`gemini-2.5-flash-image` (used in `removeBackground`, lib/integrations-gemini-ai) does NOT reliably return a transparent (alpha) background — it bakes a solid fill (usually white). Faithfully saving its bytes to a `.png` therefore yields a solid background, not a cut-out.

**Approach that works:** prompt the model to place the subject on a solid **pure magenta `#FF00FF`** background, then chroma-key that magenta to real alpha server-side with `sharp` (raw RGBA), returning `image/png`.

**Why magenta (not white/green):** the key colour must not collide with subject content. White collides with white garments / pale skin / highlights; green collides with sage/olive/khaki outfits (and this app's sage theme). Magenta almost never appears in clothing.

**Why edge-connected flood-fill, not a global colour-distance threshold:** a global "remove everything near magenta" pass punches holes in pink/purple garments. Instead, flood-fill the key colour inward from the image borders (only background reachable from an edge is removed), plus a tight pure-magenta pass to clear background trapped between limbs, plus a small bounded inward feather (a few px) for clean anti-aliased edges + magenta despill. Interior pink/purple clothing not connected to the border stays fully opaque.

**How to apply:** see `lib/integrations-gemini-ai/src/image/chroma-key.ts`. Tune PURE (seed/flood threshold) and FAR (feather outer edge) in 0–441 RGB-euclidean space; FEATHER_PX bounds how far the feather erodes inward so edge-touching garments only lose a thin rim. `sharp` must be a DIRECT api-server dep (it's externalized by esbuild) — see api-server-external-deps note.
