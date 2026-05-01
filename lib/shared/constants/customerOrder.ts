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
