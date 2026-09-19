---
name: react-clean-architecture
description: Principles for structuring React applications with clean architecture. Use when refactoring, reviewing code, deciding when to abstract, or understanding layer responsibilities. Covers the WHY behind structure decisions.
---

# React Clean Architecture Principles

## Overview

This skill provides the **principles and decision-making framework** for building maintainable React applications. It answers WHEN and WHY to structure code, while `create-feature` provides the HOW.

**Core philosophy:** Structure exists to manage change. Good architecture makes future changes easy; bad architecture makes them expensive.

## Related Skills

| Skill | Relationship |
|-------|-------------|
| `create-feature` | Implementation templates for these principles |
| `prd-to-ux` | UX foundations before building |
| `frontend-testing` | Testing the structured code |

## Layer Separation

### The Three Layers

```
┌─────────────────────────────────────────┐
│           PRESENTATION LAYER            │
│  Components, JSX, event handlers        │
│  "What to render"                       │
├─────────────────────────────────────────┤
│           BUSINESS LOGIC LAYER          │
│  Custom hooks, domain services          │
│  "What to do with data"                 │
├─────────────────────────────────────────┤
│           TRANSPORT LAYER               │
│  HTTP clients, API adapters             │
│  "How to get data"                      │
└─────────────────────────────────────────┘
```

### Why Layers Matter

Different layers change at different rates:
- **Transport** changes rarely (API endpoints are stable)
- **Business logic** changes sometimes (new features, rules)
- **Presentation** changes often (UI tweaks, styling)

When layers are mixed, a simple UI change requires understanding HTTP logic. When separated, changes stay contained.

### Layer Rules

| Layer | Can Import From | Never Imports |
|-------|-----------------|---------------|
| Transport (`api/`) | Domain schemas | React, hooks, components |
| Business Logic (`hooks/`, `domain/`) | Transport, domain | Components |
| Presentation (`components/`) | Hooks, domain services | Transport directly |

```tsx
// ❌ Component importing transport layer
import { axios } from 'axios'

const PaymentCard = () => {
  useEffect(() => {
    axios.get('/payments').then(...)  // Layer violation
  }, [])
}

// ✅ Component using hook (which hides transport)
const PaymentCard = () => {
  const { data } = usePayments()  // Clean separation
}
```

---

## Deep vs Shallow Modules

### The Iceberg Principle

A **deep module** has a small API surface hiding large complexity (like an iceberg).

```tsx
// Deep module: Simple API, complex internals
const { prompt, handleSubmit } = usePrompt()

// Inside usePrompt: query client, mutations, caching, error handling,
// refetch logic, optimistic updates... all hidden
```

A **shallow module** exposes too much, hiding little.

```tsx
// Shallow module: Large API, simple internals
const {
  data,
  isPending,
  isError,
  error,
  refetch,
  queryKey,
  queryFn,
  staleTime,
  ...
} = usePromptQuery()

// Just wraps useQuery with no added value
```

### When to Abstract

Create abstractions when they're **deep**:
- Hide 5+ lines of logic behind 1 function call
- Encapsulate decisions (caching, error handling)
- Provide domain-specific names (`usePrompt` not `useQueryWithConfig`)

Don't create abstractions when they're **shallow**:
- Just renaming existing functions
- Adding a layer that passes everything through
- Wrapping with no added behavior

---

## Interface Design for Testability

Interfaces that **accept dependencies** (instead of creating them) and **return results** (instead of producing side effects) are testable by construction, and mockable at system boundaries without touching internals. See [references/interface-design.md](references/interface-design.md) for the patterns: dependency injection at boundaries and SDK-style API adapters over generic fetchers.

---

## Guard Clauses

Prefer early returns over nested conditionals: handle faulty/loading states first (`if (!prompt) return <LoadingQuote />`), keep the happy path unnested, and invert conditions (`if (!x) return ...` instead of `else`). A nested ternary in JSX is a signal the component needs splitting.

---

## Trust Boundary Validation

This pattern has a name: the **Anti-Corruption Layer** (DDD), implemented as **DTO + Mapper**, following **"Parse, don't validate"** (Alexis King). Validate the wire format at the boundary (`parseResponse(dtoSchema, data)`), map it to a frontend-owned domain model (`toX(dto)`), and the rest of the app never doubts the data — backend changes stop at `api/`. The full rule (file layout, import restrictions, detection layers) lives in `rules/api-boundary.md`.

### Validate at the Edge

Validate data where it enters your application, not where it's used.

```tsx
// ❌ Validation in component
function AnswersList({ answers }) {
  if (!Array.isArray(answers)) return null
  if (!answers.every(a => a.text && a.author)) return null
  // Now render...
}

// ❌ Validation in hook
function usePrompt() {
  const { data } = useQuery(...)
  if (!data?.answers) return { prompt: null }
  // Check every field...
}

// ✅ Validation in transport layer
export function getActivePrompt() {
  const { data } = await client.get('/prompts/active')
  const dto = promptDtoSchema.parse(data)  // 1. validate the wire format
  return toPrompt(dto)                     // 2. map to the domain model
}
```

### Why Edge Validation Works

1. **Single point of validation** - Don't repeat checks everywhere
2. **Fail fast** - Bad data caught immediately
3. **Type safety downstream** - After validation, types are guaranteed
4. **No runtime surprises** - Components never see malformed data

### TypeScript Casting is Not Validation

```tsx
// ❌ False security
const data = response.data as Prompt  // No runtime check

// ✅ Actual validation
const data = promptSchema.parse(response.data)  // Runtime + types
```

---

## Domain-Driven API Design

### Design for Access Patterns, Not REST Purity

Build APIs around what the UI needs, not generic REST conventions.

```
❌ RESTful purism:
GET /prompts                    → Get list
GET /prompts?active=true        → Get current ID
GET /prompts/:id                → Get prompt data
GET /prompts/:id/answers        → Get answers
GET /users/:id/answered/:promptId → Check if answered

= 5 requests, complex client logic

✅ Domain-driven:
GET /prompt/active              → Everything the page needs

= 1 request, simple client
```

### The Purism Trap

When APIs are too generic:
- **Frontend becomes the driver** - Business logic leaks to client
- **Overfetching** - Get data you won't use
- **Waterfall requests** - Wait for each response
- **Complexity migration** - Not eliminated, just moved

### Backend Decides What, Frontend Decides How

- **Backend:** What data to return, what's allowed
- **Frontend:** How to render, what to show

Don't build a generic API and force the frontend to assemble data.

---

## Component Responsibility (Principle)

Components are **pure renderers** — they receive data and return JSX. Logic, state, and side effects belong in hooks.

This skill covers the *why*. For the project-specific *how* (file structure, hook naming, wizard step patterns, dialog state naming), see your project's `component-hook-separation.md` rule.

---

## Where Does This State Live?

Walk the ladder top-down and stop at the first match. In this model the hook owns the state; the component only receives it already shaped.

| The state is... | It belongs in... | Skipping the rung costs you |
|-----------------|------------------|-----------------------------|
| Server data — anything the API owns | TanStack Query, read through a feature hook. Never copied into a store or seeded into `useState` | Copying query data into Zustand creates two sources of truth that drift on the next refetch |
| UI state one component uses | `useState` inside that component's co-located hook | A global store entry for a local toggle survives unmount and leaks stale UI into the next mount |
| UI state two siblings share | `useState` in the nearest common parent's hook, passed down as props | Duplicating it in both siblings means they disagree the moment one of them updates |
| Client state crossing screens, or updating on every keystroke/drag | Zustand, read with primitive selectors (`useStore((s) => s.step)`) | Context re-renders every consumer on every update; selecting the whole store object re-renders on unrelated changes |
| Low-frequency global config (theme, locale, auth session) | Context, one provider near the app root | A store for values that change once per session adds indirection and hides the dependency from the tree |

Server data plus a little client state is the common case — keep them separate (query for the list, store for "which row is selected") instead of merging them into one blob.

Project specifics: `tanstack-query.md` (query keys, invalidation), `zustand-patterns.md` (selectors, why the store object breaks dep arrays), `component-hook-separation.md` (where the hook lives).

---

## useEffect — When NOT to Reach for It

`useEffect` synchronizes with systems outside React — browser APIs, third-party widgets, real subscriptions. For everything below there is a shorter answer that cannot fall out of sync:

| Reaching for an effect to... | ✅ Do this instead |
|------------------------------|-------------------|
| Derive state from props or other state | Compute it during render in the hook (`const fullName = [first, last].join(' ')`) — the effect version renders once with the stale value first |
| Reset state when a prop changes | Pass `key={id}` to the child so React remounts it with fresh state |
| Notify the parent that something changed | Call the parent's callback in the event handler that caused the change |
| Subscribe to an external store | Use the store's own hook (`useMyStore((s) => s.x)`) or `useSyncExternalStore` |
| Run one-time setup (analytics, i18n, client config) | Call it at module scope or in the app entry — a component effect runs again on every mount |
| Fetch server data | Use a TanStack Query hook (see the Extraction Triggers table) |

What's left is a legitimate effect: an event listener, an interval, a widget instance, an imperative browser API — and each returns a cleanup. Per `component-hook-separation.md`, all of them live in the co-located hook, never in the component body.

---

## Hardcoded Value Extraction (Principle)

Hardcoded strings (routes, endpoints, query keys) drift into bugs when copy-pasted. Extract them to a single source of truth so the type system catches typos.

This skill covers the *why*. For project-specific extraction locations and patterns (where `links` lives, how endpoint constants are structured, query key conventions), see your project's `centralized-links.md` and `tanstack-query.md` rules.

---

## Extraction Triggers

### When to Extract

| Trigger | Action |
|---------|--------|
| Used 3+ times | Extract to shared location |
| 50+ lines in component | Split into sub-components |
| Nested conditional | Extract to child component |
| `useEffect` with fetch | Extract to custom hook |
| Data transformation | Move to hook or service |
| Business rule check | Move to domain service |

### When NOT to Extract

| Situation | Keep Inline |
|-----------|-------------|
| Used once | Don't premature-abstract |
| Simple ternary | Not every condition needs extraction |
| Short component | Don't split for the sake of splitting |
| Prototype code | Wait until patterns emerge |
| Thin wrapper | A div with className + children is not worth a component |

### Inline vs Extract: The Wrapper Test

A component is a **thin wrapper** if it:
- Has < 10 lines of JSX
- Has no hook or logic (just props → JSX)
- Adds only styling/layout (a `div` with `className`)
- Is used in exactly one place

**Thin wrappers should be inlined.** They add indirection without hiding complexity.

```tsx
// ❌ Thin wrapper — just a styled div
export const PageToolbar = ({ children, className }) => (
  <div className={cn('flex items-center gap-2 border-b px-4 py-2', className)}>
    {children}
  </div>
)

// ✅ Inline it in the parent
<div className="flex items-center gap-2 border-b border-border px-4 py-2">
  <BackButton href={backHref} />
  <CheckoutGuideDialog ... />
</div>
```

**Extract when:** the component has its own hook, manages state, or is used in 2+ places.

---

## Anti-Patterns

See [references/anti-patterns.md](references/anti-patterns.md) for detailed examples including:
- **Component Knows Too Much** -- mixing state, fetching, transforms, and business logic
- **Shallow Abstraction** -- wrappers that add no value vs deep modules
- **Validation in Wrong Place** -- scattered checks vs single boundary validation
- **Domain Re-Exporting Wire Types** -- `z.infer` of a DTO schema passed off as the domain model

---

## Mapping to create-feature Structure

See [references/layer-mapping.md](references/layer-mapping.md) for the detailed diagram mapping these 3 layers to the `create-feature` folder structure.

---

## Next Step

```
Understand Principles (this skill)
        ↓
Scaffold Structure (create-feature skill)
        ↓
Write Tests (frontend-testing skill)
```

## Source

Adapted from Alex Kondov's "Clean Architecture in React" from [The Full-Stack Tao](https://alexkondov.com/full-stack-tao-clean-architecture-react/).
