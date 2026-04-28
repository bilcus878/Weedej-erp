'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchBatchDetail, updateBatchStatus } from '../services/batchService'
import type { BatchDetail } from '../types'

export function useBatchDetail(id: string) {
  const [detail,  setDetail]  = useState<BatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBatchDetail(id)
      setDetail(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(status: string, notes?: string) {
    setSaving(true)
    try {
      await updateBatchStatus(id, status, notes)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return { detail, loading, error, saving, refresh: load, handleStatusChange }
}
