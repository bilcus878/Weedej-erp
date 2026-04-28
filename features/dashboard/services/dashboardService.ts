import type { DashboardData } from '../types'

export async function fetchDashboardData(): Promise<DashboardData> {
  const [statsRes, receivedRes, issuedRes, ordersRes, inventoryRes, pendingRes] = await Promise.all([
    fetch('/api/stats'),
    fetch('/api/invoices/received'),
    fetch('/api/issued-invoices'),
    fetch('/api/customer-orders'),
    fetch('/api/inventory/summary'),
    fetch('/api/customer-orders/pending-shipment'),
  ])

  const [stats, receivedRaw, issuedRaw, ordersRaw, inventoryRaw, pendingRaw] = await Promise.all([
    statsRes.json(),
    receivedRes.json(),
    issuedRes.json(),
    ordersRes.json(),
    inventoryRes.json(),
    pendingRes.json(),
  ])

  return {
    stats,
    receivedInvoices: Array.isArray(receivedRaw)  ? receivedRaw  : [],
    issuedInvoices:   Array.isArray(issuedRaw)    ? issuedRaw    : [],
    customerOrders:   Array.isArray(ordersRaw)    ? ordersRaw    : [],
    inventorySummary: Array.isArray(inventoryRaw) ? inventoryRaw : [],
    pendingShipments: Array.isArray(pendingRaw)   ? pendingRaw   : [],
  }
}
