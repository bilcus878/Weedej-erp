'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchEshopOrder } from '../services/eshopOrderService'
import type { EshopOrder } from '../types'

export function useEshopOrderDetail(id: string) {
  const [order, setOrder]   = useState<EshopOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchEshopOrder(id)
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
