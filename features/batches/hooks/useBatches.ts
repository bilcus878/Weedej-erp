'use client'

import { useState, useCallback, useEffect } from 'react'
import { fetchBatches } from '../services/batchService'
import type { Batch } from '../types'

export function useBatches() {
  const [batches,  setBatches]  = useState<Batch[]>([])
  const [total,    setTotal]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('')
  const [page,     setPage]     = useState(1)
  const limit = 50

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchBatches({ search: search || undefined, status: status || undefined, page, limit })
      setBatches(result.batches)
      setTotal(result.total)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [search, status, page, limit])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return {
    batches, total, loading, error,
    search, setSearch,
    status, setStatus,
    page, setPage, totalPages,
    refresh: load,
  }
}
