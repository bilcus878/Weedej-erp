// ── Legacy detail primitives ─────────────────────────────────────────────────
export { DetailSection }        from './DetailSection'
export { DetailRow }            from './DetailRow'
export { DetailSubheading }     from './DetailSubheading'
export { ActionToolbar }        from './ActionToolbar'
export { EmptyState }           from './EmptyState'
export { LinkedDocumentBanner } from './LinkedDocumentBanner'
export { PartySection }         from './PartySection'
export { ItemsTable }           from './ItemsTable'
export type { ErpItem }         from './ItemsTable'

// ── CustomerOrderDetail ──────────────────────────────────────────────────────
export { CustomerOrderDetail }  from './CustomerOrderDetail'
export type {
  OrderDetailData,
  OrderDetailItem,
  OrderDetailInvoice,
  OrderDetailDeliveryNote,
  OrderDetailDeliveryNoteItem,
} from './CustomerOrderDetail'

// ── SupplierOrderDetail ──────────────────────────────────────────────────────
export { SupplierOrderDetail }  from './SupplierOrderDetail'
export type {
  SupplierOrderDetailData,
  SupplierOrderDetailItem,
  SupplierOrderDetailInvoice,
  SupplierOrderDetailReceipt,
  SupplierOrderDetailReceiptItem,
} from './SupplierOrderDetail'

// ── Page architecture ────────────────────────────────────────────────────────
export { EntityPage }           from './layout/EntityPage'
// ── Hooks ────────────────────────────────────────────────────────────────────
export { useEntityPage }        from './hooks/useEntityPage'
export type { EntityPageConfig, EntityPageState } from './hooks/useEntityPage'
export { useFilters }           from './hooks/useFilters'
export type { FilterConfig, FiltersResult } from './hooks/useFilters'

// ── Filters ──────────────────────────────────────────────────────────────────
export { FilterInput }          from './filters/FilterInput'
export { FilterSelect }         from './filters/FilterSelect'

// ── States ───────────────────────────────────────────────────────────────────
export { LoadingState }         from './states/LoadingState'
export { ErrorState }           from './states/ErrorState'

// ── Types ────────────────────────────────────────────────────────────────────
export type { ColumnDef, AccentColor, SelectOption } from './table/ColumnDef'
