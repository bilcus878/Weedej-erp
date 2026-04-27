import type { ShippingMethod } from '../types'

export async function fetchShippingMethods(activeOnly = false): Promise<ShippingMethod[]> {
  const url = activeOnly ? '/api/shipping/methods?active=true' : '/api/shipping/methods'
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Nepodařilo se načíst metody dopravy')
  return res.json()
}

export async function updateShippingMethod(
  id:   string,
  data: Partial<Omit<ShippingMethod, 'id' | 'createdAt'>>,
): Promise<ShippingMethod> {
  const res = await fetch(`/api/shipping/methods/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Nepodařilo se aktualizovat metodu dopravy')
  }
  return res.json()
}

export async function createShippingMethod(
  data: Omit<ShippingMethod, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ShippingMethod> {
  const res = await fetch('/api/shipping/methods', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Nepodařilo se vytvořit metodu dopravy')
  }
  return res.json()
}

export async function deleteShippingMethod(id: string): Promise<void> {
  const res = await fetch(`/api/shipping/methods/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Nepodařilo se smazat metodu dopravy')
  }
}
