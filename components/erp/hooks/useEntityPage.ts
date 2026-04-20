'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export interface EntityPageConfig<T> {
  fetchData:    () => Promise<T[]>
  getRowId:     (row: T) => string
  filterFn:     (row: T, filters: Record<string, string>) => boolean
  itemsPerPage?: number
  highlightId?:  string | null
}

export interface EntityPageState<T> {
  rows:        T[]
  filtered:    T[]
  paginated:   T[]
  loading:     boolean
  error:       string | null
  refresh:     () => Promise<void>
  filters:     Record<string, string>
  setFilter:   (key: string, value: string) => void
  clearFilters: () => void
  page:        number
  setPage:     (p: number) => void
  totalPages:  number
  expanded:    Set<string>
  toggleExpand: (id: string) => void
  expandRow:   (id: string) => void
  highlightId: string | null | undefined
}

export function useEntityPage<T>({
  fetchData,
  getRowId,
  filterFn,
  itemsPerPage = 20,
  highlightId,
}: EntityPageConfig<T>): EntityPageState<T> {
  const [rows, setRows]         = useState<T[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [filters, setFiltersState] = useState<Record<string, string>>({})
  const [page, setPage]         = useState(1)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Stable ref so refresh callback doesn't recreate on every render
  const fetchRef = useRef(fetchData)
  fetchRef.current = fetchData

  const filtered   = rows.filter(row => filterFn(row, filters))
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const paginated  = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setRows(await fetchRef.current())
    } catch (e: any) {
      setError(e?.message ?? 'Nepodařilo se načíst data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Auto-highlight: navigate to page, expand row, scroll into view
  useEffect(() => {
    if (!highlightId || filtered.length === 0) return
    const index = filtered.findIndex(r => getRowId(r) === highlightId)
    if (index === -1) return
    const targetPage = Math.floor(index / itemsPerPage) + 1
    setPage(targetPage)
    setExpanded(prev => new Set([...prev, highlightId]))
    setTimeout(() => {
      document.getElementById(`row-${highlightId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
  }, [highlightId, filtered.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function setFilter(key: string, value: string) {
    setFiltersState(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFiltersState({})
    setPage(1)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function expandRow(id: string) {
    setExpanded(prev => new Set([...prev, id]))
  }

  return {
    rows, filtered, paginated, loading, error, refresh,
    filters, setFilter, clearFilters,
    page, setPage, totalPages,
    expanded, toggleExpand, expandRow,
    highlightId,
  }
}
