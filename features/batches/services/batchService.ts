import type { Batch, BatchDetail, Lot, LotListResult, LotDetail } from '../types'

// ── Lot list (grouped by batchNumber) ────────────────────────────────────────

export async function fetchLots(params?: {
  status?: string
  search?: string
  page?:   number
  limit?:  number
}): Promise<LotListResult> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.search) q.set('search', params.search)
  if (params?.page)   q.set('page',   String(params.page))
  if (params?.limit)  q.set('limit',  String(params.limit))

  const res  = await fetch(`/api/batches?${q.toString()}`, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se načíst šarže')
  return data
}

// ── Lot detail (one batchNumber → all products + combined movements) ──────────

export async function fetchLotDetail(batchNumber: string): Promise<LotDetail> {
  const res  = await fetch(`/api/batches/lot/${encodeURIComponent(batchNumber)}`, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se načíst šarži')
  return data
}

export async function updateLotStatus(batchNumber: string, status: string, notes?: string): Promise<void> {
  const res = await fetch(`/api/batches/lot/${encodeURIComponent(batchNumber)}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status, notes }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se aktualizovat šarži')
}

// ── Individual batch-product (used by /batches/[id] — inventory deep-links) ──

export async function fetchBatchDetail(id: string): Promise<BatchDetail> {
  const res  = await fetch(`/api/batches/${id}`, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se načíst šarži')
  return data
}

export async function updateBatchStatus(id: string, status: string, notes?: string): Promise<Batch> {
  const res  = await fetch(`/api/batches/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status, notes }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se aktualizovat šarži')
  return data
}

export async function fetchProductBatches(productId: string): Promise<Batch[]> {
  const res  = await fetch(`/api/products/${productId}/batches`, { cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se načíst šarže produktu')
  return Array.isArray(data) ? data : []
}
