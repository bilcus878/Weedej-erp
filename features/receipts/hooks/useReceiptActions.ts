'use client'

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

  function handleDownloadPDF(receipt: Receipt) {
    window.open(`/api/receipts/${receipt.id}/pdf`, '_blank')
  }

  return { handleStorno, handleDownloadPDF }
}
