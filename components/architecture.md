# components/ — Architecture

`components/` contains **reusable UI building blocks** that are not tied to any single business feature. The key distinction: if a component encodes logic specific to customer orders, invoices, or any other domain entity, it belongs in `features/`, not here.

---

## Component hierarchy

There are three levels, each with a strictly defined role:

```
components/
  ui/          — pure UI primitives (no business logic, no ERP concepts)
  erp/         — ERP-framework components (patterns shared by ALL features)
  shared/      — cross-feature components that know about the domain
  providers/   — React context providers (session, etc.)
```

Features (`features/*/components/`) sit above all of these — they consume `erp/` and `ui/`, and may consume `shared/`.

---

## `components/ui/`

Pure presentational primitives. Equivalent to a headless UI library, but custom-styled for this project.

```
components/ui/
  Badge.tsx          — colored pill label
  Button.tsx         — styled button with variant props
  Card.tsx           — surface container with optional header
  Input.tsx          — text input with label and error state
  Logo.tsx           — Weedej logo SVG
  Modal.tsx          — dialog overlay (controlled open/close)
  PopupButton.tsx    — button that opens an anchored popup
  Table.tsx          — HTML table with basic styling
  Toast.tsx          — toast notification component
  useClickOutside.ts — hook: call callback when clicking outside a ref
  useToast.ts        — hook: programmatic toast trigger
```

**Rules:**
- Zero domain knowledge. `Badge` renders a colored label — it knows nothing about order statuses
- Props are generic strings/booleans/React nodes — no ERP-specific props
- No `fetch()` calls, no Prisma, no feature imports
- The only state allowed is UI state (open/closed, hover, focus)

**When to add something to `ui/`:**
- It's a pure presentational component used in 3+ unrelated places
- It has no business meaning — it could exist in any web app

---

## `components/erp/`

The ERP application framework. These components implement the **structural patterns** that repeat across every feature: list pages, detail pages, filters, states, navbar. They know about ERP concepts (pagination, entity rows, action bars) but not about specific entities (orders, invoices, products).

```
components/erp/
  detail/
    ERPDetailPageLayout.tsx    — two-column detail page shell
    ERPSectionCard.tsx         — card section within a detail page
    ERPActionBar.tsx           — sticky bottom action bar with buttons
    ERPStatusTimeline.tsx      — visual status history timeline
    DocumentOverviewCard.tsx   — standard document header card (number, date, status)
    DocumentActionsCard.tsx    — document action buttons (PDF, cancel, etc.)
    DetailRow.tsx              — label + value row inside a section
    DetailSection.tsx          — grouped rows with heading
    PartySection.tsx           — buyer/seller address block
    ItemsTable.tsx             — line items table (products, qty, price)
    OrderItemsSection.tsx      — order-specific items section
    PurchaseItemsSection.tsx   — purchase-specific items section
    PaymentTermsSection.tsx    — payment method and due date display
    ShippingSection.tsx        — shipping method and tracking display
    StornoSection.tsx          — storno reason and date display
    StatusTimelineCard.tsx     — status timeline wrapped in a card
    LinkedDocumentBanner.tsx   — banner linking to related documents
    LinkedReceiptsSection.tsx  — list of linked cash receipts
    CustomerContactSection.tsx — customer contact info block
    SupplierContactSection.tsx — supplier contact info block
    PartyFormModal.tsx         — modal to edit buyer/seller party data
    OrderDetailTypes.ts        — shared types for order detail data shape
    SupplierOrderDetailTypes.ts
    index.ts
  filters/
    FilterInput.tsx      — text filter input
    FilterSelect.tsx     — dropdown filter
    FilterCombobox.tsx   — autocomplete filter
  hooks/
    useEntityPage.ts     — pagination + filtering + expand + highlight state
    useFilters.tsx       — filter definition and state management
    useCompanySettings.ts — cached company settings (VAT payer status, etc.)
  layout/
    EntityPage.tsx       — compound component: Header + Table + Pagination
    ActionToolbar.tsx    — page-level toolbar with title and action buttons
    ActionsDropdown.tsx  — dropdown menu for multiple actions
  list/
    ERPListPageLayout.tsx  — list page shell (title, filters slot, content)
    ERPListTable.tsx       — paginated data table
    ERPListFilters.tsx     — filter row container
    ERPResponsiveList.tsx  — mobile-friendly list alternative to table
    index.ts
  navbar/
    ErpNavbar.tsx          — top navigation bar with all module links
    NavbarMetaContext.tsx   — context: pending order/shipment badge counts
  security/
    PermissionGate.tsx     — conditionally renders children based on user permission
  states/
    LoadingState.tsx   — full-page loading skeleton
    ErrorState.tsx     — full-page error with retry button
    EmptyState.tsx     — empty state with optional action
  table/
    ColumnDef.ts       — TypeScript types for table column definitions
  widgets/
    QuickPreviewCard.tsx        — compact summary card for dashboard
    ExpectedDocumentsPanel.tsx  — panel showing documents pending action
    EntityOrdersButton.tsx      — button showing order count for an entity
    ExpectedOrdersButton.tsx    — button showing pending orders count
  index.ts             — re-exports everything from erp/
```

### Core hooks

#### `useEntityPage<T>`

The most important hook in the entire codebase. Every list page uses it.

```ts
const ep = useEntityPage<CustomerOrder>({
  fetchData:   () => fetchCustomerOrders(),   // async loader
  getRowId:    r => r.id,                     // unique key
  filterFn:    filters.fn,                    // client-side filter
  itemsPerPage: 20,
  highlightId: searchParams.get('highlight'), // auto-scroll to this row
})

// ep gives you:
ep.rows        // full unfiltered data
ep.filtered    // after applying filters
ep.paginated   // current page slice
ep.loading     // boolean
ep.error       // string | null
ep.refresh()   // re-fetch
ep.page        // current page number
ep.setPage(n)  // go to page n
ep.totalPages  // total page count
ep.expanded    // Set<string> of expanded row IDs
ep.toggleExpand(id)
ep.highlightId // auto-scroll target
```

#### `useFilters<T>`

Defines declarative filter specifications that `useEntityPage` consumes.

```ts
const filters = useFilters<CustomerOrder>([
  {
    key: 'status',
    type: 'select',
    options: STATUS_OPTIONS,
    match: (row, value) => value === 'all' || row.status === value,
  },
  {
    key: 'customer',
    type: 'text',
    placeholder: 'Odběratel...',
    match: (row, value) => row.customer?.name.toLowerCase().includes(value.toLowerCase()),
  },
])
// filters.fn — the composed predicate passed to useEntityPage
// filters.clear() — reset all filters
```

### `EntityPage` compound component

The standard list page structure:

```tsx
<EntityPage highlightId={ep.highlightId}>
  <EntityPage.Header
    title="Vystavené objednávky"
    icon={ShoppingCart}
    color="blue"
    total={ep.rows.length}
    filtered={ep.filtered.length}
    onRefresh={ep.refresh}
    actions={<button>Nová objednávka</button>}
  />
  <EntityPage.Table
    columns={columns}
    rows={ep.paginated}
    getRowId={r => r.id}
    onClearFilters={filters.clear}
  />
  <EntityPage.Pagination
    page={ep.page}
    total={ep.totalPages}
    onChange={ep.setPage}
  />
</EntityPage>
```

### `PermissionGate`

Hides UI elements the current user lacks permission to see:

```tsx
<PermissionGate permission="invoices:write">
  <button onClick={handleCreate}>Vytvořit fakturu</button>
</PermissionGate>
```

Reads permissions from the NextAuth session. Does not make additional DB calls.

---

## `components/shared/`

Cross-feature components that carry domain knowledge but are used by multiple features.

```
components/shared/
  CascadingProductDropdown.tsx  — product + variant selector (used in order forms)
```

**Use `shared/` when:**
- A component is used by 2+ different features
- It carries domain knowledge (e.g., knows about products and variants)
- It doesn't belong to any single feature

**Do NOT use `shared/` for:**
- UI primitives → `ui/`
- ERP framework patterns → `erp/`
- Single-feature components → `features/{name}/components/`

---

## `components/providers/`

React context providers that wrap the entire app.

```
components/providers/
  Providers.tsx   — NextAuth SessionProvider wrapper
```

---

## Decision: where does my component go?

```
Is it a pure UI primitive with no domain knowledge?
  → components/ui/

Is it an ERP structural pattern (list layout, detail layout, filter, state)?
  → components/erp/

Is it domain-aware but used by 2+ features?
  → components/shared/

Is it domain-aware and used only by one feature?
  → features/{name}/components/
```

---

## Naming conventions

| Type | Pattern | Example |
|---|---|---|
| UI primitive | Noun | `Button.tsx`, `Modal.tsx` |
| ERP framework component | `ERP` prefix or descriptive noun | `ERPListPageLayout.tsx`, `EntityPage.tsx` |
| Feature component | Noun or `XxxStatusBadge` | `CustomerOrderStatusBadge.tsx` |
| Feature column def file | `{entity}Columns.tsx` | `customerOrderColumns.tsx` |
| Feature form component | `Create/EditXxxForm.tsx` | `CreateCustomerOrderForm.tsx` |
| Feature action modal | `ProcessXxxModal.tsx` | `ProcessShipmentModal.tsx` |

---

## Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Business logic in `components/ui/` | Makes primitives domain-coupled, unusable elsewhere | Move logic to `components/erp/` or `features/` |
| Feature component in `components/erp/` | Pollutes framework with domain knowledge | Move to `features/{name}/components/` |
| Fetching data inside a `components/erp/` component | Shared components should receive data as props | Pass data down from feature hooks via props |
| One monolithic `components/components.tsx` | God file, impossible to navigate | Each component in its own file |
| `components/shared/` as a dumping ground | Becomes a second God folder | Only cross-feature + domain-aware things here |
| Duplicating `ERPListPageLayout` inside a feature | Creates drift | Always use the shared layout |

---

## Relationship map

```
app/{feature}/page.tsx
  uses ──────────────────────► components/erp/layout/EntityPage
                                components/erp/states/LoadingState
                                components/erp/states/ErrorState
  uses ──────────────────────► features/{name}/hooks/useXxx
                                features/{name}/components/XxxColumns
                                features/{name}/components/CreateXxxForm

features/{name}/components/
  uses ──────────────────────► components/erp/detail/* (for detail pages)
                                components/erp/filters/* (filter inputs)
                                components/ui/* (Button, Modal, Badge, Input)
                                components/shared/* (CascadingProductDropdown)

components/erp/
  uses ──────────────────────► components/ui/*
                                (nothing from features/)
```