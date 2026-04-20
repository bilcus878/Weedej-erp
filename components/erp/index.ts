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

// ── EshopOrderDetail ─────────────────────────────────────────────────────────
export { EshopOrderDetail }     from './EshopOrderDetail'
export type {
  OrderDetailData,
  OrderDetailItem,
  OrderDetailInvoice,
  OrderDetailDeliveryNote,
  OrderDetailDeliveryNoteItem,
} from './EshopOrderDetail'

// ── Page architecture ────────────────────────────────────────────────────────
export { EntityPage }           from './layout/EntityPage'
export { PageHeader }           from './PageHeader'

// ── Hooks ────────────────────────────────────────────────────────────────────
export { useEntityPage }        from './hooks/useEntityPage'
export type { EntityPageConfig, EntityPageState } from './hooks/useEntityPage'

// ── Filters ──────────────────────────────────────────────────────────────────
export { FilterInput }          from './filters/FilterInput'
export { FilterSelect }         from './filters/FilterSelect'

// ── States ───────────────────────────────────────────────────────────────────
export { LoadingState }         from './states/LoadingState'
export { ErrorState }           from './states/ErrorState'

// ── Types ────────────────────────────────────────────────────────────────────
export type { ColumnDef, AccentColor, SelectOption } from './table/ColumnDef'
