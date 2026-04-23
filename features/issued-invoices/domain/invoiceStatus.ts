interface InvoiceForStatus {
  status: string
  customerOrder?: { status: string } | null
  transactionId?: string | null
}

/**
 * Priority: storno > customerOrder.status > SumUp (transactionId) > invoice.status
 */
export function resolveInvoiceStatus(invoice: InvoiceForStatus): string {
  if (invoice.status === 'storno') return 'storno'
  if (invoice.customerOrder) return invoice.customerOrder.status
  if (invoice.transactionId) return 'delivered'
  return invoice.status
}
