'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchIssuedInvoice } from '../services/issuedInvoiceService'
import type { IssuedInvoice } from '../types'

export function useIssuedInvoiceDetail(id: string) {
  const [invoice, setInvoice] = useState<IssuedInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]    = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchIssuedInvoice(id)
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
