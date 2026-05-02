// ── Detail primitives ─────────────────────────────────────────────────────────
export { DetailSection }        from './detail/DetailSection'
export { DetailRow }            from './detail/DetailRow'
export { DetailSubheading }     from './detail/DetailSubheading'
export { ActionToolbar }        from './layout/ActionToolbar'
export { DetailActionFooter }   from './detail/DetailActionFooter'
export type { DocumentFlow }    from './detail/DetailActionFooter'
export { EmptyState }           from './states/EmptyState'
export { LinkedDocumentBanner } from './detail/LinkedDocumentBanner'
export { PartySection }         from './detail/PartySection'
export { ItemsTable }           from './detail/ItemsTable'
export type { ErpItem }         from './detail/ItemsTable'

// ── Order detail types ───────────────────────────────────────────────────────
export type {
  OrderDetailData,
  OrderDetailItem,
  OrderDetailInvoice,
  OrderDetailDeliveryNote,
  OrderDetailDeliveryNoteItem,
} from './detail/OrderDetailTypes'

// ── SupplierOrderDetail ──────────────────────────────────────────────────────
export { SupplierOrderDetail }  from './detail/SupplierOrderDetail'
export type {
  SupplierOrderDetailData,
  SupplierOrderDetailItem,
  SupplierOrderDetailInvoice,
  SupplierOrderDetailReceipt,
  SupplierOrderDetailReceiptItem,
} from './detail/SupplierOrderDetail'

// ── Page architecture ────────────────────────────────────────────────────────
export { EntityPage }           from './layout/EntityPage'
export { ActionsDropdown }      from './layout/ActionsDropdown'
export type { PageAction }      from './layout/ActionsDropdown'

// ── Hooks ────────────────────────────────────────────────────────────────────
export { useEntityPage }        from './hooks/useEntityPage'
export type { EntityPageConfig, EntityPageState } from './hooks/useEntityPage'
export { useFilters }           from './hooks/useFilters'
export type { FilterConfig, FiltersResult } from './hooks/useFilters'

// ── Filters ──────────────────────────────────────────────────────────────────
export { FilterInput }          from './filters/FilterInput'
export { FilterSelect }         from './filters/FilterSelect'
export { FilterCombobox }       from './filters/FilterCombobox'

// ── States ───────────────────────────────────────────────────────────────────
export { LoadingState }         from './states/LoadingState'
export { ErrorState }           from './states/ErrorState'

// ── Shared party form ────────────────────────────────────────────────────────
export { PartyFormModal }         from './detail/PartyFormModal'
export type { PartyFormData, PartyFormConfig } from './detail/PartyFormModal'

// ── Types ────────────────────────────────────────────────────────────────────
export type { ColumnDef, AccentColor, SelectOption } from './table/ColumnDef'

// ── Security ─────────────────────────────────────────────────────────────────
export { PermissionGate }       from './security/PermissionGate'
