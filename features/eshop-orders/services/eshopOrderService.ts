import type { EshopOrder } from '../types'

export async function fetchEshopOrders(): Promise<EshopOrder[]> {
  const res = await fetch('/api/eshop-orders')
  if (!res.ok) throw new Error('Nepodařilo se načíst eshop objednávky')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function updateEshopOrderStatus(orderId: string, status: string): Promise<void> {
  const res = await fetch(`/api/eshop-orders/${orderId}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Nepodařilo se aktualizovat status')
  }
}
