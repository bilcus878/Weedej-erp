'use client'

import { useState }         from 'react'
import { Calendar }         from 'lucide-react'
import { format }           from 'date-fns'
import { buildPreset, DATE_PRESETS } from '@/lib/analytics/dateRange'
import type { AnalyticsFilters }     from '../types'
import type { DatePreset }           from '@/lib/analytics/dateRange'

interface Props {
  filters:   AnalyticsFilters
  onChange:  (next: Partial<AnalyticsFilters>) => void
  disabled?: boolean
}

export function DateRangePicker({ filters, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)

  function selectPreset(preset: DatePreset) {
    if (preset === 'custom') {
      onChange({ preset })
      return
    }
    const r = buildPreset(preset)
    onChange({
      preset,
      from: r.from.toISOString().slice(0, 10),
      to:   r.to.toISOString().slice(0, 10),
    })
    setOpen(false)
  }

  function applyCustom(from: string, to: string) {
    onChange({
      preset: 'custom',
      from,
      to,
    })
    setOpen(false)
  }

  const current = DATE_PRESETS.find(p => p.value === filters.preset)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        <Calendar className="h-4 w-4 text-gray-400" />
        <span>{current?.label ?? 'Vyberte období'}</span>
        {filters.preset !== 'custom' ? null : (
          <span className="text-gray-400">
            ({filters.from} – {filters.to})
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-64 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {DATE_PRESETS.filter(p => p.value !== 'custom').map(p => (
              <button
                key={p.value}
                onClick={() => selectPreset(p.value)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 ${
                  filters.preset === p.value ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="border-t border-gray-100 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Vlastní rozsah</p>
              <CustomRange from={filters.from} to={filters.to} onApply={applyCustom} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CustomRange({ from, to, onApply }: { from: string; to: string; onApply: (f: string, t: string) => void }) {
  const [f, setF] = useState(from)
  const [t, setT] = useState(to)
  return (
    <div className="space-y-2">
      <input type="date" value={f} onChange={e => setF(e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 text-gray-700" />
      <input type="date" value={t} onChange={e => setT(e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 text-gray-700" />
      <button
        onClick={() => onApply(f, t)}
        disabled={!f || !t || f > t}
        className="w-full py-1.5 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition-colors"
      >
        Použít
      </button>
    </div>
  )
}
