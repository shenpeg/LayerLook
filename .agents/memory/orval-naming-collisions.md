---
name: orval generated name collisions
description: How orval-derived zod/type names collide with component schema names in the api-zod barrel.
---

The OpenAPI codegen (orval) generates, for an operation with `operationId: removeBackground`,
zod consts named `RemoveBackgroundBody` (request) and `RemoveBackgroundResponse` (response).
It ALSO generates a type/zod for every `components/schemas` entry using the schema's name.

**Collision:** if a component schema is itself named `RemoveBackgroundResponse`, the api-zod
barrel re-exports two members with the same name →
`TS2308: Module "./generated/api" has already exported a member named 'RemoveBackgroundResponse'`.

**Fix:** name component schemas so they never match `<OperationId>Body` / `<OperationId>Response`.
E.g. for operation `removeBackground`, name the request/response schemas `CutoutRequest` /
`CutoutResult` instead of `RemoveBackground*`. The operation-derived zod consts keep the
`RemoveBackground*` names and the route imports those from `@workspace/api-zod`.

**How to apply:** when adding a new endpoint to `lib/api-spec/openapi.yaml`, pick schema
names distinct from the operationId-derived names before running codegen.
