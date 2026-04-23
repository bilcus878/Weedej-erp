'use client'

import { generateInvoicePDF } from '@/lib/generateInvoicePDF'
import { stornoInvoice } from '../services/issuedInvoiceService'
import type { IssuedInvoice } from '../types'

export function useInvoiceActions(onRefresh: () => Promise<void>) {
  async function handleStorno(invoice: IssuedInvoice) {
    const reason = prompt(
      `Opravdu chceš stornovat fakturu ${invoice.transactionCode}?\n\nZadej důvod storna (volitelně):`,
    )
    if (reason === null) return
    try {
      const data = await stornoInvoice(invoice.id, reason || undefined)
      alert(`Faktura byla stornována!\n\n⚠️ ${data.warning}`)
      await onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Nepodařilo se stornovat fakturu')
    }
  }

  async function handlePrintPDF(invoice: IssuedInvoice) {
    try {
      const sRes = await fetch('/api/settings')
      await generateInvoicePDF(invoice, await sRes.json())
    } catch (e) {
      alert(
        e instanceof Error
          ? `Nepodařilo se vygenerovat PDF: ${e.message}`
          : 'Nepodařilo se vygenerovat PDF',
      )
    }
  }

  return { handleStorno, handlePrintPDF }
}
