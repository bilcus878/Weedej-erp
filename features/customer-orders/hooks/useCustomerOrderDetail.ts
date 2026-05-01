'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchCustomerOrder } from '../services/customerOrderService'
import type { CustomerOrder } from '../types'

export function useCustomerOrderDetail(id: string) {
  const [order,   setOrder]   = useState<CustomerOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCustomerOrder(id)
      setOrder(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba při načítání')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { refresh() }, [refresh])

  return { order, loading, error, refresh }
}
