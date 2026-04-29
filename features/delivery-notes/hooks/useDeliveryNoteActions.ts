'use client'

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

  function handleDownloadPDF(noteId: string) {
    window.open(`/api/delivery-notes/${noteId}/pdf`, '_blank')
  }

  return { handleStorno, handleDownloadPDF }
}
