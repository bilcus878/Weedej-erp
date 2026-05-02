'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchTransaction } from '../services/transactionService'
import type { Transaction } from '../types'

export function useTransactionDetail(id: string) {
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchTransaction(id)
      setTransaction(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  return { transaction, loading, error, refresh }
}
