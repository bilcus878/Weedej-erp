'use client'

import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import { calcPackCount } from '@/lib/packQuantity'
import { generateDeliveryNotePDF, openPDFInNewTab } from '@/lib/pdfGenerator'
import { stornoDeliveryNote } from '../services/deliveryNoteService'
import type { DeliveryNote } from '../types'

type ShowToast = (type: 'success' | 'error', message: string) => void

export function useDeliveryNoteActions(
  rows:      DeliveryNote[],
  isVatPayer: boolean,
  showToast:  ShowToast,
  onRefresh:  () => Promise<void>,
) {
  async function handleStorno(noteId: string) {
    const note = rows.find(n => n.id === noteId)
    if (!note) return
    if (note.status === 'storno') { alert('Tato výdejka je již stornována'); return }
    const reason = prompt(`Opravdu chceš stornovat výdejku ${note.deliveryNumber}?\n\nZadej důvod storna (povinné):`)
    if (!reason || reason.trim().length === 0) return
    try {
      await stornoDeliveryNote(noteId, reason)
      await onRefresh()
      showToast('success', 'Výdejka byla stornována a zboží vráceno do skladu.')
    } catch (error: any) {
      showToast('error', `Chyba: ${error.message}`)
    }
  }

  async function handleDownloadPDF(noteId: string) {
    const note = rows.find(n => n.id === noteId)
    if (!note) return
    try {
      const pdfData = {
        noteNumber:      note.deliveryNumber,
        noteDate:        note.deliveryDate,
        customerName:    note.customerOrder?.customer?.name || (note.customerOrder as any)?.customerName || note.customerName || 'Neznámý zákazník',
        customerAddress: (note.customerOrder as any)?.customerAddress,
        customerEmail:   (note.customerOrder as any)?.customerEmail,
        customerPhone:   (note.customerOrder as any)?.customerPhone,
        customerICO:     (note.customerOrder as any)?.customer?.ico,
        customerDIC:     (note.customerOrder as any)?.customer?.dic,
        items: note.items.map(item => {
          const hasSaved         = item.price != null && item.priceWithVat != null
          const unitPrice        = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
          const itemVatRate      = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
          const isItemNonVat     = isNonVatPayer(itemVatRate)
          const vatPerUnit       = hasSaved ? Number(item.vatAmount ?? 0) : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
          const priceWithVatPerUnit = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
          const packs            = calcPackCount(Number(item.quantity), item.productName, item.unit)
          return {
            productName: item.productName || item.product?.name || 'Neznámý produkt',
            quantity:    packs,
            unit:        item.unit !== 'ks' && item.productName?.includes(' — ') ? 'ks' : item.unit,
            price:       isVatPayer ? priceWithVatPerUnit : unitPrice,
          }
        }),
        totalAmount: note.items.reduce((sum, item) => {
          const hasSaved         = item.price != null && item.priceWithVat != null
          const unitPrice        = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
          const itemVatRate      = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
          const isItemNonVat     = isNonVatPayer(itemVatRate)
          const vatPerUnit       = hasSaved ? Number(item.vatAmount ?? 0) : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
          const priceWithVatPerUnit = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
          const packs            = calcPackCount(Number(item.quantity), item.productName, item.unit)
          return sum + packs * (isVatPayer ? priceWithVatPerUnit : unitPrice)
        }, 0),
        note:   note.note,
        status: note.status,
      }
      const settingsRes = await fetch('/api/settings')
      const settings    = await settingsRes.json()
      const pdfBlob     = await generateDeliveryNotePDF(pdfData, settings)
      openPDFInNewTab(pdfBlob)
    } catch (error: any) {
      alert(`Chyba při generování PDF: ${error.message}`)
    }
  }

  return { handleStorno, handleDownloadPDF }
}
