import type {
  ReceivedInvoice, IssuedInvoice, CustomerOrder,
  NormalizedInvoice, OverdueSummary, OrderStats,
} from '../types'

export function computeInvoiceBalance(received: ReceivedInvoice[], issued: IssuedInvoice[]): number {
  const receivedTotal = received.filter(i => i.status !== 'storno').reduce((s, i) => s + Number(i.totalAmount || 0), 0)
  const issuedTotal   = issued.filter(i => i.status !== 'storno').reduce((s, i) => s + Number(i.totalAmount || 0), 0)
  return issuedTotal - receivedTotal
}

export function computeOverdueInvoices(received: ReceivedInvoice[], issued: IssuedInvoice[]): OverdueSummary {
  const now = new Date()
  const rc  = received.filter(i => i.dueDate && i.status !== 'received' && i.status !== 'storno' && new Date(i.dueDate) < now).length
  const ic  = issued.filter(i => i.dueDate && i.status !== 'paid' && i.status !== 'storno' && new Date(i.dueDate) < now).length
  return { receivedCount: rc, issuedCount: ic, total: rc + ic }
}

export function computeUpcomingDue(received: ReceivedInvoice[], issued: IssuedInvoice[]): (ReceivedInvoice | (IssuedInvoice & { type: 'issued'; invoiceDate: string }))[] {
  const now     = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const rc = received
    .filter(i => {
      if (!i.dueDate || i.status === 'received' || i.status === 'storno') return false
      const d = new Date(i.dueDate)
      return d >= now && d <= nextWeek
    })
    .map(i => ({ ...i, type: 'received' as const }))

  const ic = issued
    .filter(i => {
      if (!i.dueDate || i.status === 'paid' || i.status === 'storno') return false
      const d = new Date(i.dueDate)
      return d >= now && d <= nextWeek
    })
    .map(i => ({ ...i, type: 'issued' as const, invoiceDate: i.issueDate }))

  return [...rc, ...ic]
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 6)
}

export function computeOrderStats(orders: CustomerOrder[]): OrderStats {
  const active = orders.filter(o => o.status !== 'storno')
  return {
    total:           orders.length,
    newCount:        orders.filter(o => o.status === 'new').length,
    processingCount: orders.filter(o => o.status === 'processing' || o.status === 'paid').length,
    totalValue:      active.reduce((s, o) => s + Number(o.totalAmount || 0), 0),
  }
}

export function computeRecentOrders(orders: CustomerOrder[]): CustomerOrder[] {
  return [...orders].sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()).slice(0, 5)
}

export function computeRecentInvoices(received: ReceivedInvoice[], issued: IssuedInvoice[]): NormalizedInvoice[] {
  const rc: NormalizedInvoice[] = received.slice(0, 10).map(i => ({
    id: i.id, number: i.invoiceNumber, date: i.invoiceDate,
    amount: Number(i.totalAmount || 0), status: i.status, type: 'received',
    name: i.supplierName || i.purchaseOrder?.supplier?.name || i.purchaseOrder?.supplierName || i.receipts?.[0]?.supplier?.name || 'Anonymní',
  }))
  const ic: NormalizedInvoice[] = issued.slice(0, 10).map(i => ({
    id: i.id, number: i.invoiceNumber, date: i.issueDate,
    amount: Number(i.totalAmount || 0), status: i.status, type: 'issued',
    name: i.customer?.name || i.customerName || 'Anonymní',
  }))
  return [...rc, ...ic].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)
}

export function computePaymentBar(cashRevenue: number, cardRevenue: number): { cash: number; card: number } {
  const total = cashRevenue + cardRevenue
  if (total === 0) return { cash: 50, card: 50 }
  return { cash: (cashRevenue / total) * 100, card: (cardRevenue / total) * 100 }
}

export function computeOutstandingReceivables(issued: IssuedInvoice[]): { amount: number; count: number } {
  const outstanding = issued.filter(i => i.status !== 'paid' && i.status !== 'storno')
  return {
    amount: outstanding.reduce((s, i) => s + Number(i.totalAmount || 0), 0),
    count:  outstanding.length,
  }
}

export function computeNewOrdersCount(orders: CustomerOrder[]): number {
  return orders.filter(o => o.status === 'new').length
}

export function computeRevenueContext(todayRevenue: number, avgDailyRevenue: number): {
  pct: number; label: string; dir: 'up' | 'down' | 'flat'
} | null {
  if (avgDailyRevenue <= 0) return null
  const pct = ((todayRevenue - avgDailyRevenue) / avgDailyRevenue) * 100
  if (Math.abs(pct) < 5) return { pct, label: '≈ průměr', dir: 'flat' }
  return {
    pct,
    label: `${pct > 0 ? '+' : ''}${Math.round(pct)} % vs průměr`,
    dir:   pct > 0 ? 'up' : 'down',
  }
}
