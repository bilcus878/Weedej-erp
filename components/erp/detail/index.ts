export type {
  OrderDetailData,
  OrderDetailItem,
  OrderDetailInvoice,
  OrderDetailDeliveryNote,
  OrderDetailDeliveryNoteItem,
} from './OrderDetailTypes'
export { ERPDetailPageLayout }        from './ERPDetailPageLayout'
export type { BreadcrumbItem }        from './ERPDetailPageLayout'
export { ERPSectionCard, ERPDetailRow, ERPDetailGrid } from './ERPSectionCard'
export { ERPActionBar }               from './ERPActionBar'
export type { ERPAction }             from './ERPActionBar'
export { ERPStatusTimeline, ERPStatusBadge } from './ERPStatusTimeline'
export type { TimelineEntry }         from './ERPStatusTimeline'

// ── Shared detail sections ────────────────────────────────────────────────────
export { CustomerContactSection }     from './CustomerContactSection'
export type { CustomerContactProps }  from './CustomerContactSection'
export { StornoSection }              from './StornoSection'
export type { StornoSectionProps }    from './StornoSection'
export { OrderSummarySection }        from './OrderSummarySection'
export type { OrderSummarySectionProps } from './OrderSummarySection'
export { ShippingSection }            from './ShippingSection'
export type { ShippingSectionProps }  from './ShippingSection'
export { OrderItemsSection }          from './OrderItemsSection'
export type { OrderItemsSectionProps } from './OrderItemsSection'

// ── Supplier detail sections ──────────────────────────────────────────────────
export { SupplierContactSection }     from './SupplierContactSection'
export type { SupplierContactProps }  from './SupplierContactSection'
export { PaymentTermsSection }        from './PaymentTermsSection'
export type { PaymentTermsSectionProps } from './PaymentTermsSection'
export { LinkedReceiptsSection }      from './LinkedReceiptsSection'
export type { LinkedReceiptsSectionProps } from './LinkedReceiptsSection'
export { PurchaseItemsSection }       from './PurchaseItemsSection'
export type { PurchaseItemsSectionProps } from './PurchaseItemsSection'

// ── Supplier detail types ─────────────────────────────────────────────────────
export type {
  SupplierOrderDetailData,
  SupplierOrderDetailItem,
  SupplierOrderDetailInvoice,
  SupplierOrderDetailReceipt,
  SupplierOrderDetailReceiptItem,
} from './SupplierOrderDetailTypes'

// ── Shared sidebar cards ──────────────────────────────────────────────────────
export { DocumentActionsCard }        from './DocumentActionsCard'
export type { DocumentActionsCardProps, DocumentAction } from './DocumentActionsCard'
export { StatusTimelineCard }         from './StatusTimelineCard'
export type { StatusTimelineCardProps } from './StatusTimelineCard'
export { DocumentOverviewCard }       from './DocumentOverviewCard'
export type { DocumentOverviewCardProps, OverviewRow } from './DocumentOverviewCard'
