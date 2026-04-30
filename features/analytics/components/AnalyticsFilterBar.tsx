'use client'

import { RefreshCw }              from 'lucide-react'
import { DateRangePicker }        from './DateRangePicker'
import type { AnalyticsFilters }  from '../types'

interface Props {
  filters:   AnalyticsFilters
  onChange:  (next: Partial<AnalyticsFilters>) => void
  onRefresh: () => void
  loading?:  boolean
}

export function AnalyticsFilterBar({ filters, onChange, onRefresh, loading }: Props) {
  const compareEnabled = filters.compare !== 'none'

  function toggleCompare() {
    onChange({ compare: compareEnabled ? 'none' : 'previous_period' })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DateRangePicker filters={filters} onChange={onChange} disabled={loading} />

      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
        <div
          onClick={toggleCompare}
          className={`relative w-9 h-5 rounded-full transition-colors ${compareEnabled ? 'bg-emerald-600' : 'bg-gray-200'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${compareEnabled ? 'translate-x-4' : 'translate-x-0'}`}
          />
        </div>
        <span className="text-sm text-gray-600 whitespace-nowrap">Srovnat s předchozím obdobím</span>
      </label>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
        title="Obnovit"
      >
        <RefreshCw className={`h-4 w-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        Obnovit
      </button>
    </div>
  )
}
