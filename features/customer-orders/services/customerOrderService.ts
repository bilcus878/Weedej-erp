import type { CustomerOrder, CreateOrderPayload, Customer, Product } from '../types'

export async function fetchCustomerOrders(): Promise<CustomerOrder[]> {
  const res = await fetch('/api/customer-orders')
  if (!res.ok) throw new Error('Nepodařilo se načíst objednávky')
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchCustomers(): Promise<Customer[]> {
  const res = await fetch('/api/customers')
  if (!res.ok) throw new Error('Nepodařilo se načíst zákazníky')
  return res.json()
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/products')
  if (!res.ok) throw new Error('Nepodařilo se načíst produkty')
  return res.json()
}

export async function fetchNextOrderNumber(): Promise<string> {
  const res  = await fetch('/api/customer-orders/next-number')
  const data = await res.json()
  return data.nextNumber
}

export async function createCustomerOrder(payload: CreateOrderPayload): Promise<void> {
  const res = await fetch('/api/customer-orders', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Chyba při vytváření objednávky')
  }
}

export async function markOrderPaid(orderId: string): Promise<void> {
  const res = await fetch(`/api/customer-orders/${orderId}/mark-paid`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({}),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Nepodařilo se označit jako zaplacenou')
  }
}

export async function cancelCustomerOrder(orderId: string): Promise<void> {
  const res = await fetch(`/api/customer-orders/${orderId}/cancel`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({}),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Nepodařilo se zrušit objednávku')
  }
}

export async function updateCustomerOrderStatus(orderId: string, status: string): Promise<void> {
  const res = await fetch(`/api/customer-orders/${orderId}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Nepodařilo se změnit status')
  }
}
