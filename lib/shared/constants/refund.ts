export const RefundStatus = {
  NONE:      'none',
  PENDING:   'pending',
  COMPLETED: 'completed',
  FAILED:    'failed',
} as const
export type RefundStatus = typeof RefundStatus[keyof typeof RefundStatus]
