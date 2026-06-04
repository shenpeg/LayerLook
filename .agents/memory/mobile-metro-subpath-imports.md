---
name: mobile Metro subpath imports of workspace libs
description: Why importing a server integration lib's /subpath export from the Expo app crashes at runtime, and what to do instead.
---

The Expo/mobile artifact bundles with Metro. Importing a workspace lib's subpath
export (e.g. `@workspace/integrations-gemini-ai/batch`, declared via the package's
`exports` map) relies on Metro package-exports subpath resolution. This is flaky:
it fails with `UnableToResolveError: Unable to resolve module .../batch` on cold
starts and after dependency changes (the symlink/cache isn't ready when Metro first
builds), and only recovers after a Metro restart — so the crash recurs.

**Rule:** keep the mobile bundle self-contained. Do NOT import server-side
integration libraries (or their `/subpath` exports) from the Expo app. Those libs
also pull server-only deps (e.g. `@google/genai`) into the mobile graph.

**Why:** the recurring runtime crash for the Outfit Collage Maker was exactly this —
`editor.tsx` imported `@workspace/integrations-gemini-ai/batch` for a ~15-line
generic concurrency helper. The fix was to inline the helper locally
(`artifacts/mobile/lib/batch.ts`) and remove the `@workspace/integrations-gemini-ai`
dependency from the mobile package.json.

**How to apply:** when the mobile app needs a small generic utility that lives in a
server lib, copy/inline it into `artifacts/mobile/lib/` instead of cross-importing.
For genuine shared client code, put it in a client-safe workspace lib with a `.`
export and no server-only deps. Talk to the backend over the generated API client
(`@workspace/api-client-react`), not by importing server libs directly.
