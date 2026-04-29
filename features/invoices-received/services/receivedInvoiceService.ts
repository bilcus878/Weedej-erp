import type { ReceivedInvoice, Supplier, CompleteInvoicePayload } from '../types'

export async function fetchReceivedInvoices(): Promise<ReceivedInvoice[]> {
  const res = await fetch('/api/invoices/received')
  if (!res.ok) throw new Error('Nepodařilo se načíst přijaté faktury')
  return res.json()
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await fetch('/api/suppliers')
  if (!res.ok) throw new Error('Nepodařilo se načíst dodavatele')
  return res.json()
}

export async function stornoInvoice(invoiceId: string, reason?: string): Promise<{ warning?: string }> {
  const res  = await fetch(`/api/invoices/received/${invoiceId}/storno`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ reason }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se stornovat fakturu')
  return data
}

export async function uploadAttachment(invoiceId: string, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`/api/received-invoices/${invoiceId}/attachment`, { method: 'POST', body: formData })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Nepodařilo se nahrát přílohu') }
  const { path } = await res.json()
  return path
}

export async function applyDiscount(invoiceId: string, discountType: string, discountValue: number): Promise<void> {
  const res = await fetch(`/api/received-invoices/${invoiceId}/apply-discount`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ discountType, discountValue }),
  })
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Chyba při uplatňování slevy') }
}

export async function completeInvoice(invoiceId: string, payload: CompleteInvoicePayload): Promise<void> {
  const res = await fetch(`/api/invoices/received/${invoiceId}/complete`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Nepodařilo se uložit fakturu')
  }
}
