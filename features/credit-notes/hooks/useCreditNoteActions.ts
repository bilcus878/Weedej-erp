'use client'

import { stornoCreditNote } from '../services/creditNoteService'
import type { CreditNote } from '../types'

export function useCreditNoteActions(onRefresh: () => Promise<void>) {
  async function handleStorno(cn: CreditNote) {
    const reason = prompt(
      `Opravdu chceš stornovat dobropis ${cn.creditNoteNumber}?\n\nZadej důvod storna (volitelně):`
    )
    if (reason === null) return
    try {
      const data = await stornoCreditNote(cn.id, reason || undefined)
      if ('error' in data && data.error) {
        alert(`Nepodařilo se stornovat dobropis: ${data.error}`)
      } else {
        alert('Dobropis byl stornován!')
        await onRefresh()
      }
    } catch {
      alert('Nepodařilo se stornovat dobropis')
    }
  }

  return { handleStorno }
}
