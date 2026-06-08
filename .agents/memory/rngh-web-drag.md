---
name: RN gesture-handler drag on web
description: Why draggable content feels broken/hard to drag on Expo web and the durable rule to fix it.
---

**Principle:** On Expo web, any element dragged with `react-native-gesture-handler`
`Gesture.Pan` must have its visual content (images/text) made non-interactive,
and selection/touch behavior disabled, or the browser hijacks the pointer.

**Why:** the browser's native HTML5 image drag-and-drop and text/image selection
fire on mousedown over an `<img>`/text node and compete with RNGH's pointer
capture, so layers don't follow the cursor ("hard to drag").

**How to apply:**
- Set `pointerEvents="none"` on the inner image/text so pointer events land on
  the gesture-detector wrapper view, never on the draggable element.
- On web only, add `{ userSelect: "none", cursor: "grab", touchAction: "none" }`
  to the wrapper. Note: reanimated's `Animated.View` style type rejects
  `cursor: "grab"` — cast the web style to a loose type.
