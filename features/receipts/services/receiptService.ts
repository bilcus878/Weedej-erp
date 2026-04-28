import type { Receipt, PurchaseOrder, Supplier, InvoiceData, BatchInput } from '../types'

export async function fetchReceipts(): Promise<Receipt[]> {
  const res  = await fetch('/api/receipts', { cache: 'no-store' })
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function fetchPendingOrders(): Promise<{ orders: PurchaseOrder[]; suppliers: Supplier[]; error: string | null }> {
  try {
    const [pendingRes, suppliersRes] = await Promise.all([
      fetch('/api/purchase-orders/pending', { cache: 'no-store' }),
      fetch('/api/suppliers',               { cache: 'no-store' }),
    ])
    const [pendingData, suppliersData] = await Promise.all([
      pendingRes.json(), suppliersRes.json(),
    ])
    if (!pendingRes.ok || !Array.isArray(pendingData)) {
      return {
        orders: [],
        suppliers: Array.isArray(suppliersData) ? suppliersData : [],
        error: pendingData?.error || `Chyba serveru (HTTP ${pendingRes.status})`,
      }
    }
    return {
      orders:    pendingData,
      suppliers: Array.isArray(suppliersData) ? suppliersData : [],
      error:     null,
    }
  } catch {
    return { orders: [], suppliers: [], error: 'Nepodařilo se načíst očekávané příjemky' }
  }
}

export async function stornoReceipt(id: string, reason: string): Promise<void> {
  const res  = await fetch(`/api/receipts/${id}/storno`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, userId: 'user' }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se stornovat příjemku')
}

export async function receiveFromOrder(
  orderId:     string,
  items:       Array<{ productId: string; receivedQuantity: number }>,
  invoiceData: InvoiceData,
  receiptDate: string,
  batchData?:  BatchInput | null,
): Promise<void> {
  const res = await fetch(`/api/purchase-orders/${orderId}/receive`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ items, invoiceData, receiptDate, batchData }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Chyba při zpracování')
  }
}
