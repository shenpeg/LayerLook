---
name: mobile asset URI resolution (web vs native)
description: How to resolve a bundled require()'d image to a usable {uri,width,height} on both Expo web and native.
---

`Image.resolveAssetSource` from `react-native` does NOT exist on Expo **web** —
calling it throws `RNImage.default.resolveAssetSource is not a function`, which
silently breaks code paths that try to derive a `uri` from a bundled asset.

**Use `Asset.fromModule(require("..."))` from `expo-asset` instead.** It is
synchronous for metadata and returns `{ uri, width, height }` on both web and
native.

**How to apply:**
- Add `expo-asset` as a *direct* dependency (`expo install expo-asset`) — it's a
  transitive dep of `expo` so it runs fine, but TS won't resolve its types
  unless it's listed directly in the artifact's package.json.
- `Asset.fromModule` types accept `string | number`; `require("x.png")` resolves
  to a `number` (asset registry id), so type the source field as `number` and
  cast the require (the monorepo's typed config makes `require()` return
  `unknown`).

**Why:** persisting a derived `uri` for seeded/sample content needs to work in
the dev web preview AND on device; `resolveAssetSource` only works on native.
