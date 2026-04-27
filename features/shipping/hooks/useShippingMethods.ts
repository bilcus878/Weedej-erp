'use client'

import { useEffect, useState } from 'react'
import { fetchShippingMethods } from '../services/shippingService'
import type { ShippingMethod } from '../types'

export function useShippingMethods() {
  const [methods,  setMethods]  = useState<ShippingMethod[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchShippingMethods(true)
      .then(data => { if (!cancelled) { setMethods(data); setLoading(false) } })
      .catch(e   => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  // Convenience lookups used by the order form
  const byId = (id: string) => methods.find(m => m.id === id)

  const byProvider = (provider: ShippingMethod['provider']) =>
    methods.filter(m => m.provider === provider)

  const priceOf = (id: string) => methods.find(m => m.id === id)?.price ?? 0

  const minPriceOf = (provider: ShippingMethod['provider']) => {
    const ms = byProvider(provider)
    return ms.length ? Math.min(...ms.map(m => m.price)) : 0
  }

  return { methods, loading, error, byId, byProvider, priceOf, minPriceOf }
}
