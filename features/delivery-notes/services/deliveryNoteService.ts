import type { DeliveryNote, CustomerOrder } from '../types'

export async function fetchDeliveryNotes(): Promise<DeliveryNote[]> {
  const res  = await fetch('/api/delivery-notes', { cache: 'no-store' })
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchPendingShipments(): Promise<CustomerOrder[]> {
  try {
    const res  = await fetch('/api/customer-orders/pending-shipment', { cache: 'no-store' })
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function stornoDeliveryNote(id: string, reason: string): Promise<void> {
  const res  = await fetch(`/api/delivery-notes/${id}/storno`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ reason, userId: 'user' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se stornovat výdejku')
}

export async function createDeliveryNoteFromOrder(
  customerOrderId: string,
  items: Array<{ orderItemId: string; productId: string | null; productName: string | null; quantity: number; unit: string }>,
  note?: string,
): Promise<void> {
  const payload: any = { customerOrderId, items }
  if (note?.trim()) payload.note = note.trim()
  const res = await fetch('/api/delivery-notes/create-from-order', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) {
    const e = await res.json()
    throw new Error(e.error || 'Chyba při vytváření výdejky')
  }
}

export async function processDeliveryNote(
  noteId: string,
  items:  Array<{ id: string; shippedQuantity: number }>,
  note?:  string,
): Promise<void> {
  const payload: any = { items }
  if (note?.trim()) payload.note = note.trim()
  const res = await fetch(`/api/delivery-notes/${noteId}/process`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) {
    const e = await res.json()
    throw new Error(e.error || 'Chyba při zpracování')
  }
}
