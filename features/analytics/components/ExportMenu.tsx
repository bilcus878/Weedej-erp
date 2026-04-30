'use client'

import { useState }             from 'react'
import { Download }             from 'lucide-react'
import { analyticsService }     from '../services/analyticsService'
import type { AnalyticsFilters } from '../types'

interface Props {
  section:   string
  filters:   AnalyticsFilters
  disabled?: boolean
}

const FORMATS = [
  { value: 'csv',   label: 'CSV (.csv)'   },
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'pdf',   label: 'PDF (.pdf)'   },
] as const

export function ExportMenu({ section, filters, disabled }: Props) {
  const [open, setOpen] = useState(false)

  function download(format: 'csv' | 'excel' | 'pdf') {
    const url = analyticsService.exportUrl(section, filters, format)
    const a   = document.createElement('a')
    a.href    = url
    a.download = `${section}-report.${format === 'excel' ? 'xlsx' : format}`
    a.click()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <Download className="h-4 w-4 text-gray-400" />
        Export
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {FORMATS.map(f => (
              <button
                key={f.value}
                onClick={() => download(f.value)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
