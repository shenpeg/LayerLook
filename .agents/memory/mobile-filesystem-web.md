---
name: expo-file-system unavailable on web
description: Why cut-out / image-persistence code must have a web fallback, and the pattern to use.
---

`expo-file-system` (legacy) is **not available on Expo web**:
`FileSystem.documentDirectory` is `null` and `writeAsStringAsync` /
`copyAsync` / `readAsStringAsync` throw. Any pipeline that persists generated
images to disk (e.g. background-removal cut-outs) silently fails in the **web
preview** even though it works on device — errors get swallowed by surrounding
try/catch and surface only as "couldn't process" UI.

**Pattern that works cross-platform:**
- `saveBase64`: on web (or when `documentDirectory` is null) return an inline
  `data:image/png;base64,...` URI instead of writing a file; fall back to the
  same data URI if a native write throws.
- `uriToBase64`: short-circuit `data:` URIs by slicing after the comma before
  attempting a filesystem read.

**Why:** the user views the app through the web preview, so features that
depend on file writes must degrade to data URIs there.

**Tradeoff / known limitation:** on web these data URIs get persisted into
AsyncStorage (localStorage), which can hit quota with several cut-outs. Acceptable
for a preview; a real web target would need IndexedDB/blob storage with short keys.
