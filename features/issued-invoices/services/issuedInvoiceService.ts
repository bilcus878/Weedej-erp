import type { IssuedInvoice, CreditNoteData, CreditNoteFormItem } from '../types'

export async function fetchIssuedInvoices(): Promise<IssuedInvoice[]> {
  const res = await fetch('/api/issued-invoices')
  if (!res.ok) throw new Error('Nepodařilo se načíst faktury')
  return res.json()
}

export async function fetchCreditNotes(invoiceId: string): Promise<CreditNoteData[]> {
  const res = await fetch(`/api/issued-invoices/${invoiceId}/credit-notes`)
  if (!res.ok) throw new Error('Nepodařilo se načíst dobropisy')
  return res.json()
}

export async function stornoInvoice(
  invoiceId: string,
  reason?: string,
): Promise<{ warning?: string }> {
  const res = await fetch(`/api/invoices/issued/${invoiceId}/storno`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ reason: reason || undefined }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se stornovat fakturu')
  return data
}

export async function createCreditNote(payload: {
  issuedInvoiceId: string
  reason:  string | null
  note:    string | null
  items:   CreditNoteFormItem[]
}): Promise<{ creditNoteNumber: string }> {
  const res = await fetch('/api/credit-notes', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      issuedInvoiceId: payload.issuedInvoiceId,
      reason:          payload.reason,
      note:            payload.note,
      items: payload.items.map(i => ({
        productName: i.productName,
        quantity:    parseFloat(i.quantity),
        unit:        i.unit,
        price:       parseFloat(i.price),
        vatRate:     parseFloat(i.vatRate),
      })),
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Nepodařilo se vytvořit dobropis')
  return data
}
