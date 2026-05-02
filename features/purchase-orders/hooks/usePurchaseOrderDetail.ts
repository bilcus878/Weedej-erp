'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchPurchaseOrder } from '../services/purchaseOrderService'
import type { PurchaseOrder } from '../types'

export function usePurchaseOrderDetail(id: string) {
  const [order, setOrder]     = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPurchaseOrder(id)
      setOrder(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  return { order, loading, error, refresh }
}
