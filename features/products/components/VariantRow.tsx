'use client'

import { X, Star, ShoppingCart, Zap } from 'lucide-react'
import { TogglePill } from './TogglePill'
import type { EshopVariantForm } from '../types'

interface VariantRowProps {
  v:         EshopVariantForm
  onChange:  (patch: Partial<EshopVariantForm>) => void
  onRemove?: () => void
  isEditing?: boolean
}

export function VariantRow({ v, onChange, onRemove, isEditing }: VariantRowProps) {
  return (
    <div className={`rounded-lg border p-3 space-y-2.5 ${isEditing ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 bg-white'}`}>
      <div className="grid grid-cols-[2fr_1.5fr_1fr_90px] gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Název varianty *</label>
          <input
            type="text"
            value={v.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="např. 3,5g / Zelená / M"
            className="w-full h-8 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Cena (Kč) *</label>
          <input
            type="number"
            step="0.01"
            value={v.price}
            onChange={e => onChange({ price: e.target.value })}
            placeholder="0"
            className="w-full h-8 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Množství</label>
          <input
            type="number"
            step="0.001"
            value={v.variantValue}
            onChange={e => onChange({ variantValue: e.target.value })}
            placeholder="3.5"
            className="w-full h-8 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Jednotka</label>
          <select
            value={v.variantUnit}
            onChange={e => onChange({ variantUnit: e.target.value as 'g' | 'ml' | 'ks' | '' })}
            className="w-full h-8 px-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          >
            <option value="">—</option>
            <option value="g">g</option>
            <option value="ml">ml</option>
            <option value="ks">ks</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          <TogglePill active={v.isDefault} onChange={val => onChange({ isDefault: val })} label="Výchozí"
            icon={<Star className="w-3 h-3" />}
            activeClass="bg-emerald-600 text-white border-emerald-600"
            inactiveClass="bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-700"
          />
          <TogglePill active={v.isActive} onChange={val => onChange({ isActive: val })} label="E-shop"
            icon={<ShoppingCart className="w-3 h-3" />}
            activeClass="bg-blue-600 text-white border-blue-600"
            inactiveClass="bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
          />
          <TogglePill active={v.isSumup} onChange={val => onChange({ isSumup: val })} label="SumUp"
            icon={<Zap className="w-3 h-3" />}
            activeClass="bg-orange-500 text-white border-orange-500"
            inactiveClass="bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600"
          />
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Odebrat variantu">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
