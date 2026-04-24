import type { DashboardData } from '../types'

export async function fetchDashboardData(): Promise<DashboardData> {
  const [statsRes, receivedRes, issuedRes, ordersRes] = await Promise.all([
    fetch('/api/stats'),
    fetch('/api/invoices/received'),
    fetch('/api/issued-invoices'),
    fetch('/api/customer-orders'),
  ])

  const [stats, receivedRaw, issuedRaw, ordersRaw] = await Promise.all([
    statsRes.json(), receivedRes.json(), issuedRes.json(), ordersRes.json(),
  ])

  return {
    stats,
    receivedInvoices: Array.isArray(receivedRaw) ? receivedRaw : [],
    issuedInvoices:   Array.isArray(issuedRaw)   ? issuedRaw   : [],
    customerOrders:   Array.isArray(ordersRaw)    ? ordersRaw   : [],
  }
}
