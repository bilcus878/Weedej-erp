'use client'

import { useState, useEffect } from 'react'
import { fetchCreditNotes, createCreditNote } from '../services/issuedInvoiceService'
import type { CreditNoteData, CreditNoteFormItem, IssuedInvoice } from '../types'

export function useCreditNotes(expandedIds: Set<string>, autoLoadId: string | null | undefined) {
  const [creditNotesMap, setCreditNotesMap] = useState<Record<string, CreditNoteData[]>>({})

  // Auto-load credit notes when a row is highlighted and auto-expanded
  useEffect(() => {
    if (autoLoadId && expandedIds.has(autoLoadId) && !creditNotesMap[autoLoadId]) {
      load(autoLoadId)
    }
  }, [autoLoadId, expandedIds.size]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load(invoiceId: string) {
    try {
      const data = await fetchCreditNotes(invoiceId)
      setCreditNotesMap(prev => ({ ...prev, [invoiceId]: data }))
    } catch {}
  }

  async function submit(
    invoice: IssuedInvoice,
    items: CreditNoteFormItem[],
    reason: string,
    note: string,
  ): Promise<string> {
    const valid = items.filter(i => i.productName && parseFloat(i.quantity) > 0 && parseFloat(i.price) > 0)
    if (valid.length === 0) throw new Error('Vyplň alespoň jednu platnou položku (název, množství, cena)')

    const data = await createCreditNote({
      issuedInvoiceId: invoice.id,
      reason: reason || null,
      note:   note   || null,
      items:  valid,
    })
    await load(invoice.id)
    return data.creditNoteNumber
  }

  return { creditNotesMap, loadCreditNotes: load, submitCreditNote: submit }
}
