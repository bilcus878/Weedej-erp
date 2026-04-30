'use client'

import { Calendar } from 'lucide-react'

interface Props {
  dateFrom:       string
  dateTo:         string
  presets:        { label: string; from: string; to: string }[]
  onDateFromChange: (v: string) => void
  onDateToChange:   (v: string) => void
  onApplyPreset:    (from: string, to: string) => void
}

export function DateRangeStep({ dateFrom, dateTo, presets, onDateFromChange, onDateToChange, onApplyPreset }: Props) {
  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold">1</span>
        <h2 className="font-semibold text-gray-800">Vyberte období</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => onApplyPreset(p.from, p.to)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              dateFrom === p.from && dateTo === p.to
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <label className="text-sm text-gray-600">Od:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => onDateFromChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <label className="text-sm text-gray-600">Do:</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => onDateToChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>
    </div>
  )
}
