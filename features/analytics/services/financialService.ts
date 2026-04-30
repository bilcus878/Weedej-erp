import { prisma }      from '@/lib/prisma'
import { compare }     from '@/lib/analytics/comparisonEngine'
import { formatPrice } from '@/lib/utils'
import type { DateRange } from '@/lib/analytics/dateRange'
import type { FinancialReport } from '../types'

interface FinancialServiceParams {
  range:    DateRange
  prevRange?: DateRange
}

export async function getFinancialReport({ range, prevRange }: FinancialServiceParams): Promise<FinancialReport> {
  const [txns, prevTxns, invoices] = await Promise.all([
    // Cash-flow: actual transactions in period
    prisma.transaction.findMany({
      where: {
        transactionDate: { gte: range.from, lte: range.to },
        invoiceType:     'issued',
        status:          'completed',
      },
      select: { totalAmount: true, paymentType: true, transactionDate: true },
      orderBy: { transactionDate: 'asc' },
    }),
    prevRange ? prisma.transaction.findMany({
      where: {
        transactionDate: { gte: prevRange.from, lte: prevRange.to },
        invoiceType:     'issued',
        status:          'completed',
      },
      select: { totalAmount: true },
    }) : Promise.resolve(null),
    // Accrual: issued invoices with invoiceDate in period
    prisma.issuedInvoice.findMany({
      where: {
        invoiceDate: { gte: range.from, lte: range.to },
        status:      'active',
      },
      select: { totalAmount: true, paymentStatus: true, dueDate: true },
    }),
  ])

  const cashRevenue  = txns.reduce((s, t) => s + Number(t.totalAmount), 0)
  const prevCashRev  = prevTxns?.reduce((s, t) => s + Number(t.totalAmount), 0) ?? 0
  const accrualRevenue = invoices.reduce((s, i) => s + Number(i.totalAmount), 0)

  const cashAmt  = txns.filter(t => t.paymentType === 'cash').reduce((s, t) => s + Number(t.totalAmount), 0)
  const cardAmt  = txns.filter(t => t.paymentType !== 'cash').reduce((s, t) => s + Number(t.totalAmount), 0)

  const now = new Date()
  const overdueAmount = invoices
    .filter(i => i.paymentStatus !== 'paid' && i.dueDate && new Date(i.dueDate) < now)
    .reduce((s, i) => s + Number(i.totalAmount), 0)

  const invoicesByStatus = Object.entries(
    invoices.reduce<Record<string, { count: number; amount: number }>>((acc, i) => {
      const k = i.paymentStatus
      if (!acc[k]) acc[k] = { count: 0, amount: 0 }
      acc[k].count  += 1
      acc[k].amount += Number(i.totalAmount)
      return acc
    }, {})
  ).map(([status, v]) => ({ status, ...v })).sort((a, b) => b.amount - a.amount)

  // Daily revenue chart from transactions
  const dayMap: Record<string, number> = {}
  for (let d = new Date(range.from); d <= range.to; d.setDate(d.getDate() + 1)) {
    dayMap[d.toISOString().slice(0, 10)] = 0
  }
  for (const t of txns) {
    const key = new Date(t.transactionDate).toISOString().slice(0, 10)
    if (dayMap[key] !== undefined) dayMap[key] += Number(t.totalAmount)
  }
  const revenueByDay = Object.entries(dayMap).map(([date, value]) => ({ date, value }))

  return {
    cashRevenue:    { label: 'Tržby (cash)',    value: cashRevenue,    formatted: formatPrice(cashRevenue),    comparison: prevTxns ? compare(cashRevenue, prevCashRev) : undefined },
    accrualRevenue: { label: 'Tržby (faktury)', value: accrualRevenue, formatted: formatPrice(accrualRevenue) },
    cashVsCard:     { cash: cashAmt, card: cardAmt },
    invoicesByStatus,
    overdueAmount:  { label: 'Po splatnosti',   value: overdueAmount,  formatted: formatPrice(overdueAmount) },
    revenueByDay,
  }
}
