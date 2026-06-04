---
name: api-server external dependency bundling
description: Why transitive deps of integration libs can crash the bundled api-server at runtime, and how to fix it.
---

The api-server `build.mjs` (esbuild) marks whole scopes as `external` — notably
`@google/*`, `@aws-sdk/*`, `@azure/*`, `@grpc/*`, etc. External packages are NOT
bundled into `dist/index.mjs`; node resolves them at runtime from the api-server's
own `node_modules`.

**Rule:** If a workspace integration lib (e.g. `@workspace/integrations-gemini-ai`)
depends on an externalized package (e.g. `@google/genai`), that package is only a
*transitive* dep and is NOT resolvable from api-server's node_modules under pnpm.
At runtime you get `Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@google/genai'`.

**Fix:** add the externalized package as a DIRECT dependency of `artifacts/api-server/package.json`
(matching the version the lib uses) and `pnpm install`. Then it lives in api-server's
node_modules and resolves at runtime.

**How to apply:** whenever you wire a new integration lib into api-server and the
server starts but crashes immediately with ERR_MODULE_NOT_FOUND for a scoped package,
check whether that scope is in build.mjs's `external` list — if so, add it directly.
