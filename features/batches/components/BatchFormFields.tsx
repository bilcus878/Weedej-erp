'use client'

import { FlaskConical } from 'lucide-react'
import type { BatchFormData } from '../types'

interface Props {
  value:    BatchFormData
  onChange: (v: BatchFormData) => void
}

export function BatchFormFields({ value, onChange }: Props) {
  function patch(partial: Partial<BatchFormData>) {
    onChange({ ...value, ...partial })
  }

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-3 space-y-3">
      <div className="flex items-center gap-1.5 mb-1">
        <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
        <span className="text-xs font-bold uppercase tracking-widest text-amber-700">Šarže</span>
      </div>

      {/* Batch number — required when batchTracking=true */}
      <div>
        <label className="block text-[10px] font-semibold text-amber-700 mb-1">
          Číslo šarže <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={value.batchNumber}
          onChange={e => patch({ batchNumber: e.target.value })}
          placeholder="např. LOT-2024-001"
          className="w-full px-2.5 py-1.5 text-sm border border-amber-300 bg-white rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-200 focus:outline-none transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-amber-700 mb-1">
            Datum výroby <span className="text-gray-400 font-normal">(vol.)</span>
          </label>
          <input
            type="date"
            value={value.productionDate}
            onChange={e => patch({ productionDate: e.target.value })}
            className="w-full px-2.5 py-1.5 text-sm border border-amber-300 bg-white rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-200 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-amber-700 mb-1">
            Datum expirace <span className="text-gray-400 font-normal">(vol.)</span>
          </label>
          <input
            type="date"
            value={value.expiryDate}
            onChange={e => patch({ expiryDate: e.target.value })}
            className="w-full px-2.5 py-1.5 text-sm border border-amber-300 bg-white rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-200 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-amber-700 mb-1">
          Šarže dodavatele <span className="text-gray-400 font-normal">(vol.)</span>
        </label>
        <input
          type="text"
          value={value.supplierLotRef}
          onChange={e => patch({ supplierLotRef: e.target.value })}
          placeholder="např. SUP-LOT-9921"
          className="w-full px-2.5 py-1.5 text-sm border border-amber-300 bg-white rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-200 focus:outline-none transition-colors"
        />
      </div>
    </div>
  )
}
