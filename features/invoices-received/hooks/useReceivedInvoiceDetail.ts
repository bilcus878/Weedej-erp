'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchReceivedInvoice } from '../services/receivedInvoiceService'
import type { ReceivedInvoice } from '../types'

export function useReceivedInvoiceDetail(id: string) {
  const [invoice, setInvoice] = useState<ReceivedInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchReceivedInvoice(id)
      setInvoice(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  return { invoice, loading, error, refresh }
}
