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

const COMPARE_OPTIONS = [
  { value: 'none',            label: 'Bez porovnání'   },
  { value: 'previous_period', label: 'Předchozí období' },
  { value: 'year_ago',        label: 'Rok zpět'         },
] as const

export function AnalyticsFilterBar({ filters, onChange, onRefresh, loading }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <DateRangePicker filters={filters} onChange={onChange} disabled={loading} />

      <select
        value={filters.compare}
        onChange={e => onChange({ compare: e.target.value as AnalyticsFilters['compare'] })}
        disabled={loading}
        className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-300 focus:outline-none disabled:opacity-50"
      >
        {COMPARE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

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
