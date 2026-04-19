// Centralized status constants — prevents magic string typos across the codebase

export const DeliveryNoteStatus = {
  DRAFT:  'draft',
  ACTIVE: 'active',
  STORNO: 'storno',
} as const

export const CustomerOrderStatus = {
  NEW:        'new',
  PAID:       'paid',
  PROCESSING: 'processing',
  SHIPPED:    'shipped',
  STORNO:     'storno',
} as const

export const ReservationStatus = {
  ACTIVE:    'active',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
  EXPIRED:   'expired',
} as const

export const ReceiptStatus = {
  DRAFT:  'draft',
  ACTIVE: 'active',
  STORNO: 'storno',
} as const

export const InvoiceStatus = {
  DRAFT:  'draft',
  ISSUED: 'issued',
  PAID:   'paid',
  STORNO: 'storno',
} as const
