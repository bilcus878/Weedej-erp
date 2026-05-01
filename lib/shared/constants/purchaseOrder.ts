export const PurchaseOrderStatus = {
  PENDING:            'pending',
  CONFIRMED:          'confirmed',
  PARTIALLY_RECEIVED: 'partially_received',
  RECEIVED:           'received',
  CANCELLED:          'cancelled',
  STORNO:             'storno',
} as const
export type PurchaseOrderStatus = typeof PurchaseOrderStatus[keyof typeof PurchaseOrderStatus]
