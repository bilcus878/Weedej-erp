'use client'

import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { PAYMENT_OPTIONS } from '@/features/shared/paymentOptions'
import type { OrderFilters } from '../../hooks/useOrderFilters'

interface Props {
  filters:       OrderFilters
  setFilter:     (key: keyof OrderFilters, value: string) => void
  clearFilters:  () => void
  advancedCount: number
  filteredCount: number
}

const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-300/40'
const LABEL = 'block text-sm font-medium text-gray-700 mb-1.5'

export function OrderFilterDrawer({ filters, setFilter, clearFilters, advancedCount, filteredCount }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-transform active:scale-95"
      >
        <SlidersHorizontal size={16} />
        Filtry
        {advancedCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-violet-700">
            {advancedCount}
          </span>
        )}
      </button>

      {/* Backdrop — tap outside to close */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom sheet — CSS transform-based so it animates smoothly */}
      <div
        className={[
          'fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
      >
        {/* Drag handle affordance */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <h3 className="text-base font-semibold text-gray-900">Rozšířené filtry</h3>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable filter inputs */}
        <div className="space-y-4 overflow-y-auto px-4 pb-4" style={{ maxHeight: '55vh' }}>
          <div>
            <label className={LABEL}>Hledat</label>
            <input
              type="text"
              placeholder="Číslo objednávky nebo zákazník..."
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
            <label className={LABEL}>Datum</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="mb-1 block text-xs text-gray-500">Od</span>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => setFilter('dateFrom', e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <span className="mb-1 block text-xs text-gray-500">Do</span>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={e => setFilter('dateTo', e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
          </div>

          <div>
            <label className={LABEL}>Minimální hodnota</label>
            <input
              type="number"
              placeholder="≥ 0 Kč"
              min={0}
              value={filters.minValue}
              onChange={e => setFilter('minValue', e.target.value)}
              className={INPUT}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-gray-100 px-4 pb-8 pt-3">
          {advancedCount > 0 && (
            <button
              onClick={() => { clearFilters(); setOpen(false) }}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Vymazat
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
          >
            Zobrazit {filteredCount} objednávek
          </button>
        </div>
      </div>
    </>
  )
}
