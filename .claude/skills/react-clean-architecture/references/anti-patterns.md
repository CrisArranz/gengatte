# Anti-Patterns

Detailed examples of architecture anti-patterns and their corrections.

## Component Knows Too Much

```tsx
// Bad: Component with all responsibilities
function Dashboard() {
  // State management
  const [data, setData] = useState()
  const [filters, setFilters] = useState()

  // Data fetching
  useEffect(() => { fetch()... }, [])

  // Data transformation
  const formatted = data?.map(transform)

  // Business logic
  const canEdit = user.role === 'admin' && data?.status === 'draft'

  // Render everything
  return <div>...</div>
}
```

Fix: Extract data fetching to a custom hook, business logic to a domain service, transformation to a mapper.

## Shallow Abstraction

```tsx
// Bad: Wrapper that adds nothing
function usePaymentQuery(id) {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: () => fetchPayment(id)
  })
}

// Just use useQuery directly, or make it deeper:

// Good: Deep abstraction with value
function usePayment(id) {
  const query = useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: () => paymentApi.getById(id),
  })

  return {
    payment: query.data,
    isPending: query.isPending,
    canRefund: query.data ? canRefund(query.data) : false,
    canEdit: query.data ? canEdit(query.data) : false,
  }
}
```

## Validation in Wrong Place

```tsx
// Bad: Scattered validation
function Card({ data }) {
  if (!data?.id) return null  // Validation here
}

function List({ items }) {
  if (!Array.isArray(items)) return null  // And here
}

function Page() {
  const { data } = useQuery(...)
  if (!data?.valid) return null  // And here
}

// Good: Validate once at boundary, then map to the domain model
function getItems() {
  const response = await client.get('/items')
  const dto = itemsDtoSchema.parse(response.data)  // Only here
  return dto.results.map(toItem)
}
```

## Domain Re-Exporting Wire Types

The domain layer must own its types. Re-exporting `z.infer` of a wire (DTO) schema as the domain type couples every hook and component to the backend's shape — a backend rename ripples through the whole app instead of stopping at `api/`. See `rules/api-boundary.md`.

```tsx
// Bad: domain/{feature}.types.ts is just a passthrough of the wire format
export type { Stay } from '../api/stays.schemas'
export type Stay = z.infer<typeof stayDtoSchema>

// Good: hand-authored, frontend-owned domain type; mapper converts dto → domain
// domain/stays.types.ts
export type Stay = {
  id: number
  status: StayStatus
  plate: string | null
  // ...named and shaped for the app, not the wire
}
```
