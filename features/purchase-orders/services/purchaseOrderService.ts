import type { PurchaseOrder, Supplier, Product, CreatePurchaseOrderPayload } from '../types'

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  const res  = await fetch('/api/purchase-orders')
  if (!res.ok) throw new Error('Nepodařilo se načíst objednávky')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const res  = await fetch('/api/suppliers')
  if (!res.ok) throw new Error('Nepodařilo se načíst dodavatele')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchProducts(): Promise<Product[]> {
  const res  = await fetch('/api/products')
  if (!res.ok) throw new Error('Nepodařilo se načíst produkty')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchNextOrderNumber(date: string): Promise<string> {
  const res  = await fetch(`/api/purchase-orders/next-number?date=${date}`)
  const data = await res.json()
  return data.nextNumber
}

export async function createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<void> {
  const res = await fetch('/api/purchase-orders', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Chyba při vytváření objednávky') }
}
