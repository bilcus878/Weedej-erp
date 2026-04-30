'use client'

import { Plus, Loader2 } from 'lucide-react'
import type { ShippingMethodDraft, ShippingProvider } from '../types'
import { inp, numInp } from '../constants'

interface Props {
  draft:         ShippingMethodDraft
  creating:      boolean
  onDraftChange: (updater: (d: ShippingMethodDraft) => ShippingMethodDraft) => void
  onCreate:      () => void
  onCancel:      () => void
}

export function AddShippingMethodForm({ draft, creating, onDraftChange, onCreate, onCancel }: Props) {
  return (
    <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/30 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">Nová metoda dopravy</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Název <span className="text-red-400">*</span></label>
          <input
            value={draft.name}
            onChange={e => onDraftChange(d => ({ ...d, name: e.target.value }))}
            className={inp}
            placeholder="Např. Express DPD"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Poskytovatel</label>
          <select
            value={draft.provider}
            onChange={e => onDraftChange(d => ({ ...d, provider: e.target.value as ShippingProvider }))}
            className={inp}
          >
            <option value="dpd">DPD</option>
            <option value="zasilkovna">Zásilkovna</option>
            <option value="courier">Kurýr</option>
            <option value="personal">Osobní odběr</option>
            <option value="custom">Vlastní</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Cena (Kč)</label>
          <input type="number" min="0" step="1" value={draft.price}
            onChange={e => onDraftChange(d => ({ ...d, price: e.target.value }))}
            className={numInp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Zdarma od (Kč)</label>
          <input type="number" min="0" step="1" value={draft.freeThreshold}
            onChange={e => onDraftChange(d => ({ ...d, freeThreshold: e.target.value }))}
            className={numInp} placeholder="—" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Dobírka (Kč)</label>
          <input type="number" min="0" step="1" value={draft.codFee}
            onChange={e => onDraftChange(d => ({ ...d, codFee: e.target.value }))}
            className={numInp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Odhad dnů</label>
          <input
            value={draft.estimatedDays}
            onChange={e => onDraftChange(d => ({ ...d, estimatedDays: e.target.value }))}
            className={inp} placeholder="2-3" />
        </div>
        <div className="col-span-2 sm:col-span-3">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Poznámka</label>
          <input
            value={draft.note}
            onChange={e => onDraftChange(d => ({ ...d, note: e.target.value }))}
            className={inp} placeholder="Interní poznámka (volitelné)" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCreate}
          disabled={creating}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Vytvořit metodu
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Zrušit
        </button>
      </div>
    </div>
  )
}
