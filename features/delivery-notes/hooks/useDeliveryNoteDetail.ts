'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchDeliveryNote } from '../services/deliveryNoteService'
import type { DeliveryNote } from '../types'

export function useDeliveryNoteDetail(id: string) {
  const [note, setNote]     = useState<DeliveryNote | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchDeliveryNote(id)
      setNote(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  return { note, loading, error, refresh }
}
