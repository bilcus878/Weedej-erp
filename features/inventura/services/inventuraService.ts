import type { InventorySummary, InventuraDetail, InventuraRecord } from '../types'

export async function fetchInventorySummary(): Promise<InventorySummary[]> {
  const res = await fetch('/api/inventory/summary')
  return res.json()
}

export async function fetchCategories(): Promise<{ id: string; name: string }[]> {
  const res = await fetch('/api/categories')
  return res.json()
}

export async function fetchInventuraHistory(): Promise<InventuraRecord[]> {
  const res = await fetch('/api/inventura')
  if (!res.ok) throw new Error()
  return res.json()
}

export async function fetchInventuraDetail(id: string): Promise<InventuraDetail> {
  const res = await fetch(`/api/inventura/${id}`)
  if (!res.ok) throw new Error()
  return res.json()
}

export async function saveInventura(payload: {
  items: {
    productId: string; productName: string; unit: string
    systemStock: number; actualStock: string
    category?: { id: string; name: string } | null
  }[]
  note: null
}): Promise<{ inventuraNumber: string; differencesCount: number }> {
  const res = await fetch('/api/inventura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Chyba při ukládání')
  return res.json()
}
