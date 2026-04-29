'use client'

import { useState } from 'react'
import {
  stornoInvoice, uploadAttachment, applyDiscount,
} from '../services/receivedInvoiceService'
import type { ReceivedInvoice } from '../types'

export function useReceivedInvoiceActions(rows: ReceivedInvoice[], onRefresh: () => Promise<void>) {
  const [selectedInvoice,  setSelectedInvoice]  = useState<ReceivedInvoice | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  function handleOpenDetailsModal(invoice: ReceivedInvoice) {
    setSelectedInvoice(invoice)
    setShowDetailsModal(true)
  }

  function handleCloseDetailsModal() {
    setShowDetailsModal(false)
    setSelectedInvoice(null)
  }

  async function handleStorno(invoiceId: string) {
    const invoice = rows.find(r => r.id === invoiceId)
    if (!invoice) return
    if (invoice.status === 'storno') { alert('Tato faktura je již stornována'); return }
    const reason = prompt(`Opravdu chceš stornovat fakturu ${invoice.invoiceNumber}?\n\nZadej důvod storna (volitelně):`)
    if (reason === null) return
    try {
      const data = await stornoInvoice(invoiceId, reason || undefined)
      alert(`Faktura byla stornována!\n\n⚠️ ${data.warning}`)
      await onRefresh()
    } catch (error: any) {
      alert(`Chyba: ${error.message}`)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, invoiceId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/', 'application/pdf']
    if (!allowedTypes.some(t => file.type.startsWith(t))) { alert('Prosím nahrajte obrázek nebo PDF'); return }
    if (file.size > 10 * 1024 * 1024) { alert('Soubor je příliš velký. Maximum je 10MB.'); return }
    try {
      await uploadAttachment(invoiceId, file)
      await onRefresh()
      alert('Soubor byl úspěšně nahrán!')
    } catch {
      alert('Nepodařilo se nahrát soubor')
    }
  }

  function handleDownloadPDF(invoiceId: string) {
    window.open(`/api/received-invoices/${invoiceId}/pdf`, '_blank')
  }

  async function handleApplyDiscount(invoiceId: string, discountType: string, discountValue: string) {
    if (!discountValue) { alert('Zadejte hodnotu slevy'); return }
    if (!confirm('Opravdu chcete uplatnit slevu dodavatele? Tato akce upraví ceny položek v objednávce a faktuře.')) return
    try {
      await applyDiscount(invoiceId, discountType, parseFloat(discountValue))
      alert('Sleva dodavatele byla úspěšně uplatněna!')
      await onRefresh()
    } catch (error: any) {
      alert(error.message || 'Nepodařilo se uplatnit slevu')
    }
  }

  return {
    selectedInvoice, showDetailsModal,
    handleOpenDetailsModal, handleCloseDetailsModal,
    handleStorno, handleFileUpload, handleDownloadPDF, handleApplyDiscount,
  }
}
