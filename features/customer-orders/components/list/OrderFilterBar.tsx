'use client'

import { useState } from 'react'
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react'
import { PAYMENT_OPTIONS } from '@/features/shared/paymentOptions'
import type { OrderFilters } from '../../hooks/useOrderFilters'

interface Props {
  filters:       OrderFilters
  setFilter:     (key: keyof OrderFilters, value: string) => void
  clearFilters:  () => void
  advancedCount: number
}

const INPUT = 'w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300'
const LABEL = 'block text-xs text-gray-500 mb-1'

export function OrderFilterBar({ filters, setFilter, clearFilters, advancedCount }: Props) {
  // Auto-open when the page loads with pre-existing advanced filters in the URL
  const [open, setOpen] = useState(advancedCount > 0)

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
      >
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-500" />
          Rozšířené filtry
          {advancedCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
              {advancedCount}
            </span>
          )}
        </div>
        {open
          ? <ChevronUp   size={14} className="text-gray-400" />
          : <ChevronDown size={14} className="text-gray-400" />
        }
      </button>

      {open && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 border-t border-gray-100 bg-white px-4 py-3">
          <div className="col-span-2 lg:col-span-2">
            <label className={LABEL}>Hledat (číslo / zákazník)</label>
            <input
              type="text"
              placeholder="OBJ-2024... nebo jméno..."
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>Typ platby</label>
            <select
              value={filters.payment}
              onChange={e => setFilter('payment', e.target.value)}
              className={INPUT}
            >
              {PAYMENT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL}>Datum od</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilter('dateFrom', e.target.value)}
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>Datum do</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={e => setFilter('dateTo', e.target.value)}
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>Min. hodnota (Kč)</label>
            <input
              type="number"
              placeholder="≥ 0"
              min={0}
              value={filters.minValue}
              onChange={e => setFilter('minValue', e.target.value)}
              className={INPUT}
            />
          </div>

          {advancedCount > 0 && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 transition-colors"
              >
                <X size={14} /> Vymazat vše
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
