'use client'

import { generateReceiptPDF, openPDFInNewTab } from '@/lib/pdfGenerator'
import { stornoReceipt } from '../services/receiptService'
import type { Receipt } from '../types'

type ShowToast = (type: 'success' | 'error', message: string) => void

export function useReceiptActions(
  isVatPayer: boolean,
  showToast:  ShowToast,
  onRefresh:  () => Promise<void>,
) {
  async function handleStorno(receipt: Receipt) {
    if (receipt.status === 'storno') { alert('Tato příjemka je již stornována'); return }
    if (receipt.status === 'draft')  { alert('Koncept lze přímo smazat, ne stornovat'); return }
    const reason = prompt('Zadejte důvod storna (povinné):')
    if (!reason || reason.trim().length === 0) return
    if (!confirm(`Opravdu stornovat příjemku ${receipt.receiptNumber}?\n\nDůvod: ${reason}\n\nTato akce je nevratná.`)) return
    try {
      await stornoReceipt(receipt.id, reason)
      await onRefresh()
      showToast('success', 'Příjemka byla úspěšně stornována.')
    } catch (error: any) {
      showToast('error', `Chyba: ${error.message}`)
    }
  }

  async function handleDownloadPDF(receipt: Receipt) {
    try {
      const supplier = receipt.supplier as any
      const pdfData = {
        receiptNumber:   receipt.receiptNumber,
        receiptDate:     receipt.receiptDate,
        supplierName:    supplier?.name || receipt.supplierName || 'Neznámý dodavatel',
        supplierAddress: supplier?.address,
        supplierICO:     supplier?.ico,
        supplierDIC:     supplier?.dic,
        items: receipt.items.map(item => ({
          productName: item.product?.name || item.productName || 'Neznámý produkt',
          quantity:    Number(item.receivedQuantity || item.quantity),
          unit:        item.unit,
          price:       Number(item.purchasePrice),
        })),
        totalAmount: receipt.items.reduce((sum, item) =>
          sum + Number(item.receivedQuantity || item.quantity) * Number(item.purchasePrice), 0),
        note:        receipt.note,
        status:      receipt.status,
        stornoReason: receipt.stornoReason,
        stornoAt:     receipt.stornoAt,
      }
      const settingsRes = await fetch('/api/settings')
      const settings    = await settingsRes.json()
      const pdfBlob     = await generateReceiptPDF(pdfData, settings)
      openPDFInNewTab(pdfBlob)
    } catch (error: any) {
      alert(`Chyba při generování PDF: ${error.message}`)
    }
  }

  return { handleStorno, handleDownloadPDF }
}
