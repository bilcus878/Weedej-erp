import type { Batch, BatchDetail } from '../types'

export interface BatchListResult {
  batches: Batch[]
  total:   number
  page:    number
  limit:   number
}

export async function fetchBatches(params?: {
  productId?: string
  status?:    string
  search?:    string
  page?:      number
  limit?:     number
}): Promise<BatchListResult> {
  const q = new URLSearchParams()
  if (params?.productId) q.set('productId', params.productId)
  if (params?.status)    q.set('status',    params.status)
  if (params?.search)    q.set('search',    params.search)
  if (params?.page)      q.set('page',      String(params.page))
  if (params?.limit)     q.set('limit',     String(params.limit))

  const res  = await fetch(`/api/batches?${q.toString()}`, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se načíst šarže')
  return data
}

export async function fetchBatchDetail(id: string): Promise<BatchDetail> {
  const res  = await fetch(`/api/batches/${id}`, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se načíst šarži')
  return data
}

export async function fetchProductBatches(productId: string): Promise<Batch[]> {
  const res  = await fetch(`/api/products/${productId}/batches`, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se načíst šarže produktu')
  return Array.isArray(data) ? data : []
}

export async function updateBatchStatus(
  id:     string,
  status: string,
  notes?: string,
): Promise<Batch> {
  const res  = await fetch(`/api/batches/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status, notes }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se aktualizovat šarži')
  return data
}
