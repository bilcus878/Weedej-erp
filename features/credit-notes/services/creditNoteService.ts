import type { CreditNote } from '../types'

export async function fetchCreditNotes(): Promise<CreditNote[]> {
  const res = await fetch('/api/credit-notes')
  return res.json()
}

export async function stornoCreditNote(id: string, reason?: string): Promise<{ error?: string }> {
  const res = await fetch(`/api/credit-notes/${id}/storno`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ reason }),
  })
  return res.json()
}
