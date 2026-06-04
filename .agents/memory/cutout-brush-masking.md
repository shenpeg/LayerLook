---
name: Cut-out erase/restore brush (no Skia)
description: How the mobile editor does pixel-level erase/restore on cut-outs without react-native-skia
---

The mobile artifact has NO `@shopify/react-native-skia`. The erase/restore
brush for cut-outs is built with the already-installed `react-native-svg`
(masks) + `react-native-view-shot` (snapshot to PNG) instead.

**Technique (order-correct compositing with two SVG masks):**
Stack two `<Image>` elements in one `<Svg>`:
- bottom = the ORIGINAL photo, masked by `restoreMask`
- top = the CUT-OUT png, masked by `eraseMask`

Strokes are a chronological list of `{mode: erase|restore, points, size}`.
- `eraseMask`: white `<Rect>` background; paint each *erase* stroke black.
- `restoreMask`: black `<Rect>` background; replay ALL strokes in order —
  restore→white, erase→black.

This makes erase-then-restore and restore-then-erase on the same spot both
behave correctly, because the original layer is only revealed where the latest
stroke at that pixel was a restore. Snapshot with `captureRef(... format png)`
on a transparent-background `View` wrapping the Svg; the result keeps alpha.

**Why:** restore needs to bring back original pixels (not a flat colour), and
erase must also be able to remove freshly-restored areas. A single combined
mask via luminance fails (dark clothing reads as low luminance → wrongly
hidden), so two masks + chronological replay is the workable path.

**Gotchas:**
- Set `maskUnits="userSpaceOnUse"` AND `maskContentUnits="userSpaceOnUse"` so
  stroke coords are plain pixels.
- Wrap the capture box in the `GestureDetector` and size the `<Svg>` to the same
  box so Pan `e.x/e.y` map 1:1 to SVG user space.
- Re-running removal / restore needs the pre-removal photo, so each `Layer`
  persists `originalUri` (copy of the picked photo). Old collages without it
  fall back to re-cutting the existing cut-out and hide the Restore mode.
