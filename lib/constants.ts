// Centralized status constants — prevents magic string typos across the codebase

export const DeliveryNoteStatus = {
  DRAFT:  'draft',
  ACTIVE: 'active',
  STORNO: 'storno',
} as const
export type DeliveryNoteStatus = typeof DeliveryNoteStatus[keyof typeof DeliveryNoteStatus]

export const CustomerOrderStatus = {
  NEW:        'new',
  PAID:       'paid',
  PROCESSING: 'processing',
  SHIPPED:    'shipped',
  STORNO:     'storno',
} as const
export type CustomerOrderStatus = typeof CustomerOrderStatus[keyof typeof CustomerOrderStatus]

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
} as const
export type PurchaseOrderStatus = typeof PurchaseOrderStatus[keyof typeof PurchaseOrderStatus]
