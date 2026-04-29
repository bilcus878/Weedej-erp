'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchLotDetail, updateLotStatus } from '../services/batchService'
import type { LotDetail } from '../types'

export function useLotDetail(batchNumber: string) {
  const [detail,  setDetail]  = useState<LotDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLotDetail(batchNumber)
      setDetail(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [batchNumber])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(status: string) {
    setSaving(true)
    try {
      await updateLotStatus(batchNumber, status)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return { detail, loading, error, saving, refresh: load, handleStatusChange }
}
