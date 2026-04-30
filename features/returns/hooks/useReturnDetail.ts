'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchReturnDetail } from '../services/returnService'
import type { ReturnRequestDetail } from '../types'

export function useReturnDetail(id: string) {
  const [detail,  setDetail]  = useState<ReturnRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReturnDetail(id)
      setDetail(data)
    } catch (e: any) {
      setError(e.message ?? 'Chyba načítání')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  return { detail, loading, error, refresh: load }
}
