# UI/UX & Design — Score: 5.5/10

## Strengths
- Polished dark sidebar with gradient KPI cards
- Consistent Czech localization throughout
- Dashboard immediately shows actionable KPI data
- Filter and search functionality on key pages

---

## Critical Findings

### 1. Zero ARIA Attributes Across All 37 TSX Files
Icon-only buttons have no accessible names. No `role="dialog"` on modals. No `scope` on table headers. Screen reader users cannot use the application.

**Fix:**
```tsx
// Icon buttons:
<button aria-label="Zavřít modal"><X /></button>

// Modal:
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">{title}</h2>
</div>

// Table headers:
<th scope="col">Číslo</th>
```

---

### 2. Three Core Pages Exceed 2000 Lines (4× the 500-line limit)
**Files:** `app/customer-orders/page.tsx` (1996 lines), `app/delivery-notes/page.tsx` (2006 lines), `app/invoices/issued/page.tsx` (1790 lines)

These monolithic client components contain data fetching, state, filtering, forms, modals, PDF generation, and table rendering in one file.

**Fix:** Extract sub-components:
```
app/customer-orders/
  page.tsx              ← orchestration only, ~100 lines
  components/
    OrderTable.tsx
    OrderForm.tsx
    OrderFilters.tsx
  hooks/
    useOrders.ts
```

---

## High Findings

### 3. Toast/Notification System Only on 3 of 15+ Pages
Creates/updates/deletes on most pages give no user feedback. Errors are silently caught with `console.error`.

**Fix:**
```bash
npm install sonner
```
```tsx
// app/layout.tsx:
<Toaster richColors />

// Any page:
import { toast } from 'sonner'
toast.success('Objednávka vytvořena')
toast.error('Nepodařilo se uložit změny')
```

---

### 4. `window.location.href` Navigation (Full Page Reloads)
**Files:** `app/page.tsx`, `app/customers/dashboard/page.tsx`, `app/inventory/dashboard/page.tsx`, and 3 more

Triggers full page reloads, destroys React state, bypasses prefetching.

**Fix:**
```tsx
// Replace:
window.location.href = '/customer-orders'
// With:
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/customer-orders')
// Or:
<Link href="/customer-orders">...</Link>
```

---

### 5. No Responsive Design on 11 of 19 Pages
Pages with dense data tables are unusable on tablets. Sidebar is 260px fixed-width with no mobile breakpoint.

**Fix:**
```tsx
// Add to all table wrappers:
<div className="overflow-x-auto">
  <Table>...</Table>
</div>

// Sidebar mobile toggle:
<div className={`sidebar ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
```

---

### 6. Form Validation — HTML5 `required` Only, No Error Messages
No client-side validation library. Invalid input (negative quantities, letters in number fields) not surfaced to user.

**Fix:**
```tsx
// Add error prop to Input component:
interface InputProps {
  error?: string
}
// Usage:
<Input error={errors.quantity} />
{error && <p className="text-red-500 text-sm mt-1">{error}</p>}
```

---

### 7. Modal Accessibility — No Focus Trap
Modal has no `role="dialog"`, no `aria-modal`, no focus trap. Keyboard focus escapes behind the overlay.

**Fix:** Add `focus-trap-react` or implement manual focus trap. Add keyboard `Escape` handler.

---

## Medium Findings

- Navigation terminology inconsistency: 'Vydané' and 'Vystavené' labels are confusing — use 'Nákupní objednávky' / 'Zákaznické objednávky'
- Filter pattern (8+ state variables) duplicated across 6+ pages — extract `<FilterBar>` component and `useFilter()` hook
- Table sorting only on products page — add sort props to shared `Table` component
- Loading states inconsistent across pages — standardize `<LoadingSpinner label="..." />` component
- Pending shipments section collapsed by default (`isPendingSectionExpanded = false`) — the PRIMARY daily warehouse workflow requires an extra click
- Login page shows developer instruction `node scripts/create-admin.mjs` — remove from production UI

---

## Low Findings

- Custom dropdown menus can't be opened with keyboard (Enter/Space) or closed with Escape
- Raw English status values ('processing', 'shipped') shown as fallback in status badges — add Czech fallback 'Neznámý stav'
- Sidebar group headers lack visual affordance that they are navigation links

