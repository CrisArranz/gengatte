# Layer Mapping to create-feature Structure

How the 3-layer model lands in a feature folder (see the `create-feature` skill for the full folder template — this file only maps principles to locations):

- **Presentation** → `components/` (pure renderers, one hook per component)
- **Business logic** → `hooks/` (React ports to UI), `queries/` (query key factories), `store/` (Zustand UI state, optional), `domain/` (pure TS business logic + **hand-authored domain types** in `domain/{feature}.types.ts` — frontend-owned, never inferred from wire schemas)
- **Transport** → `api/` — **DTO + Mapper convention** (Anti-Corruption Layer, see `rules/api-boundary.md`):
  - `{feature}.dto.ts` — Zod wire schemas + `z.infer` DTO types; the ONLY place that knows the backend's shapes
  - `{feature}.mapper.ts` — pure functions: `toX(dto)` for responses, `buildXBody(input)` for request bodies
  - `{feature}.api.ts` — HTTP adapter: `client` + `handleApiError` + `parseResponse(dtoSchema)` → mapper

Adapter methods validate then map: `toX(parseResponse(xDtoSchema, response.data))`. Files outside `api/` never import from `*.dto.ts` — hooks and components import types from `domain/` only (enforced by the `api-boundary` rule; projects may add their own PreToolUse hook). This supersedes the earlier "schemas-only" convention where domain types were re-exported `z.infer` types.

## Principle to Implementation Mapping

| Principle | create-feature Implementation |
|-----------|-------------------------------|
| Trust Boundary Validation | `api/{feature}.dto.ts` validated via `parseResponse` + mapped via `api/{feature}.mapper.ts` in the adapter |
| Deep Modules | `hooks/use-{feature}.ts` hides query complexity |
| Hardcoded Value Extraction | `queries/{feature}.keys.ts` for query keys; endpoint constants at the top of `api/{feature}.api.ts` |
| Guard Clauses | `components/{feature}s-view.tsx` handles loading/error first |
| Layer Separation | Import rules enforced per folder |
| Component Responsibility | Components import hooks, never api directly |
| Interface Design for Testability | Adapter objects expose one method per operation (SDK-style) |
