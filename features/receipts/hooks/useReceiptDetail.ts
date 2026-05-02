'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchReceipt } from '../services/receiptService'
import type { Receipt } from '../types'

export function useReceiptDetail(id: string) {
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchReceipt(id)
      setReceipt(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  return { receipt, loading, error, refresh }
}
