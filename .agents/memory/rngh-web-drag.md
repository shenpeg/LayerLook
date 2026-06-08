---
name: RN gesture-handler drag on web
description: Why draggable cut-out layers feel broken/hard to drag on Expo web and how to fix it.
---

On Expo web, layers dragged with `react-native-gesture-handler` `Gesture.Pan`
feel "hard to drag" with a mouse because the browser's native image
drag-and-drop (and text/image selection) fires on mousedown over the inner
`<img>` and hijacks the pointer stream.

Fix (applied in `components/DraggableLayer.tsx`):
- Set `pointerEvents="none"` on the inner `Image` so pointer events land on the
  gesture-detector wrapper view, never on the draggable `<img>` element.
- On web only, add `{ userSelect: "none", cursor: "grab", touchAction: "none" }`
  to the wrapper (cast to a loose type — reanimated's Animated.View style type
  rejects `cursor: "grab"`).

**Why:** the native HTML5 image drag + selection competes with RNGH's pointer
capture; killing pointer events on the img and disabling selection/touch-action
lets the gesture track the cursor 1:1.

**How to apply:** any RNGH-dragged element that contains an image/text on web —
make the visual content non-interactive and let the wrapper own the gesture.
