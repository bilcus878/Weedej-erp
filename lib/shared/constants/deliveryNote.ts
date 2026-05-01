export const DeliveryNoteStatus = {
  DRAFT:     'draft',
  ACTIVE:    'active',    // dispatched (stock movement created)
  DELIVERED: 'delivered', // alias for ACTIVE used in older paths — normalise to ACTIVE going forward
  CANCELLED: 'cancelled', // soft-cancelled before processing
  STORNO:    'storno',    // reversed after processing
} as const
export type DeliveryNoteStatus = typeof DeliveryNoteStatus[keyof typeof DeliveryNoteStatus]
