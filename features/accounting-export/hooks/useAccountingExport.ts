'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DocType, ExportFormat, Preview, JobRecord } from '../types'
import { DOC_TYPES } from '../constants'
import { getPresets } from '../utils'

export function useAccountingExport() {
  const today        = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const [dateFrom,      setDateFrom]      = useState(firstOfMonth)
  const [dateTo,        setDateTo]        = useState(today)
  const [selected,      setSelected]      = useState<Set<DocType>>(new Set(DOC_TYPES.map(d => d.id)))
  const [format,        setFormat]        = useState<ExportFormat>('xlsx')
  const [includePdfs,   setIncludePdfs]   = useState(true)

  const [preview,        setPreview]        = useState<Preview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [exporting,    setExporting]    = useState(false)
  const [exportError,  setExportError]  = useState<string | null>(null)

  const [jobs,        setJobs]        = useState<JobRecord[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(true)

  const loadJobs = useCallback(async () => {
    setJobsLoading(true)
    try {
      const res = await fetch('/api/accounting/exports')
      if (res.ok) setJobs(await res.json())
    } finally {
      setJobsLoading(false)
    }
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  function updateDateFrom(v: string) { setDateFrom(v); setPreview(null) }
  function updateDateTo(v: string)   { setDateTo(v);   setPreview(null) }
  function applyPreset(from: string, to: string) { setDateFrom(from); setDateTo(to); setPreview(null) }

  function toggleType(id: DocType) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setPreview(null)
  }

  function selectAll()  { setSelected(new Set(DOC_TYPES.map(d => d.id))); setPreview(null) }
  function selectNone() { setSelected(new Set()); setPreview(null) }

  async function handlePreview() {
    if (selected.size === 0) return
    setPreviewLoading(true)
    setPreview(null)
    try {
      const res = await fetch('/api/accounting/exports/preview', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ dateFrom, dateTo, documentTypes: [...selected] }),
      })
      if (res.ok) setPreview(await res.json())
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleExport() {
    if (selected.size === 0 || exporting) return
    setExporting(true)
    setExportError(null)
    try {
      const res = await fetch('/api/accounting/exports', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ dateFrom, dateTo, documentTypes: [...selected], format, includePdfs }),
      })
      const data = await res.json()
      if (!res.ok) {
        setExportError(data.message ?? data.error ?? 'Export selhal')
        return
      }
      window.location.href = `/api/accounting/exports/${data.jobId}/download`
      await loadJobs()
    } catch {
      setExportError('Síťová chyba — zkuste znovu')
    } finally {
      setExporting(false)
    }
  }

  function downloadJob(jobId: string) {
    window.location.href = `/api/accounting/exports/${jobId}/download`
  }

  return {
    // state
    dateFrom, dateTo,
    selected, format, includePdfs,
    preview, previewLoading,
    exporting, exportError,
    jobs, jobsLoading,
    showHistory, setShowHistory,
    // computed
    canExport:  selected.size > 0 && !!dateFrom && !!dateTo && !exporting,
    canPreview: selected.size > 0 && !!dateFrom && !!dateTo,
    presets:    getPresets(),
    // actions
    updateDateFrom, updateDateTo, applyPreset,
    toggleType, selectAll, selectNone,
    setFormat, setIncludePdfs,
    handlePreview, handleExport,
    downloadJob, loadJobs,
  }
}
