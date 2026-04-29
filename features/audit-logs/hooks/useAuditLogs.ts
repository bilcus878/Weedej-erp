'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchAuditLogs } from '../services/auditLogService'
import { emptyFilters } from '../types'
import type { AuditLog, AuditLogFilters } from '../types'

const PAGE_SIZE = 50

export function useAuditLogs() {
  const [logs, setLogs]         = useState<AuditLog[]>([])
  const [total, setTotal]       = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage]         = useState(1)
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters]   = useState<AuditLogFilters>(emptyFilters)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchAuditLogs(filters, page, PAGE_SIZE, sortDir)
      setLogs(result.data)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters, page, sortDir])

  useEffect(() => { load() }, [load])

  function applyFilters(next: Partial<AuditLogFilters>) {
    setFilters(prev => ({ ...prev, ...next }))
    setPage(1)
  }

  function clearFilters() {
    setFilters(emptyFilters)
    setPage(1)
  }

  function toggleSort() {
    setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    setPage(1)
  }

  return {
    logs, total, totalPages, page, sortDir, filters, loading, error,
    setPage, applyFilters, clearFilters, toggleSort, refresh: load,
  }
}
