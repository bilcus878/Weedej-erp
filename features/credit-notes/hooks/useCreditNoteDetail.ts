'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchCreditNote } from '../services/creditNoteService'
import type { CreditNote } from '../types'

export function useCreditNoteDetail(id: string) {
  const [creditNote, setCreditNote] = useState<CreditNote | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCreditNote(id)
      setCreditNote(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  return { creditNote, loading, error, refresh }
}
