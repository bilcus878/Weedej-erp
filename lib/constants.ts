// Centralized status constants — prevents magic string typos across the codebase

export const DeliveryNoteStatus = {
  DRAFT:     'draft',
  ACTIVE:    'active',    // dispatched (stock movement created)
  DELIVERED: 'delivered', // alias for ACTIVE used in older paths — normalise to ACTIVE going forward
  CANCELLED: 'cancelled', // soft-cancelled before processing
  STORNO:    'storno',    // reversed after processing
} as const
export type DeliveryNoteStatus = typeof DeliveryNoteStatus[keyof typeof DeliveryNoteStatus]

export const CustomerOrderStatus = {
  NEW:        'new',
  PAID:       'paid',
  PROCESSING: 'processing', // partially shipped
  SHIPPED:    'shipped',    // fully dispatched
  COMPLETED:  'completed',
  CANCELLED:  'cancelled',
  STORNO:     'storno',
} as const
export type CustomerOrderStatus = typeof CustomerOrderStatus[keyof typeof CustomerOrderStatus]

// Valid customer-order workflow transitions.
// Source of truth for PATCH /customer-orders/[id] and any ad-hoc status updates.
export const CUSTOMER_ORDER_TRANSITIONS: Record<CustomerOrderStatus, ReadonlyArray<CustomerOrderStatus>> = {
  new:        ['paid', 'cancelled', 'storno'],
  paid:       ['processing', 'shipped', 'storno'],
  processing: ['shipped', 'storno'],
  shipped:    ['completed', 'storno'],
  completed:  [],
  cancelled:  [],
  storno:     [],
}

export const ReservationStatus = {
  ACTIVE:    'active',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
  EXPIRED:   'expired',
} as const
export type ReservationStatus = typeof ReservationStatus[keyof typeof ReservationStatus]

export const ReceiptStatus = {
  DRAFT:  'draft',
  ACTIVE: 'active',
  STORNO: 'storno',
} as const
export type ReceiptStatus = typeof ReceiptStatus[keyof typeof ReceiptStatus]

export const IssuedInvoiceStatus = {
  ACTIVE: 'active',
  STORNO: 'storno',
} as const
export type IssuedInvoiceStatus = typeof IssuedInvoiceStatus[keyof typeof IssuedInvoiceStatus]

export const ReceivedInvoiceStatus = {
  DRAFT:  'draft',
  ACTIVE: 'active',
  STORNO: 'storno',
} as const
export type ReceivedInvoiceStatus = typeof ReceivedInvoiceStatus[keyof typeof ReceivedInvoiceStatus]

// Legacy alias — kept for files that import InvoiceStatus before they are migrated.
export const InvoiceStatus = {
  DRAFT:  'draft',
  ISSUED: 'issued',
  PAID:   'paid',
  STORNO: 'storno',
} as const
export type InvoiceStatus = typeof InvoiceStatus[keyof typeof InvoiceStatus]

export const PurchaseOrderStatus = {
  PENDING:            'pending',
  CONFIRMED:          'confirmed',
  PARTIALLY_RECEIVED: 'partially_received',
  RECEIVED:           'received',
  CANCELLED:          'cancelled',
  STORNO:             'storno',
} as const
export type PurchaseOrderStatus = typeof PurchaseOrderStatus[keyof typeof PurchaseOrderStatus]

export const RefundStatus = {
  NONE:      'none',
  PENDING:   'pending',
  COMPLETED: 'completed',
  FAILED:    'failed',
} as const
export type RefundStatus = typeof RefundStatus[keyof typeof RefundStatus]
