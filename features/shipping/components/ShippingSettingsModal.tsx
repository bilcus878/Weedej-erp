'use client'

import React from 'react'
import { Truck, X, Plus, Save, RotateCcw, Trash2, CheckCircle, XCircle, Loader2, ChevronRight } from 'lucide-react'
import { useShippingSettings } from '../hooks/useShippingSettings'
import { PROVIDER_LABELS, PROVIDER_COLORS } from '../types'
import type { ShippingProvider } from '../types'

interface Props {
  onClose: () => void
}

const inp = 'w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-100 focus:outline-none transition-colors'
const numInp = `${inp} text-right tabular-nums`

export function ShippingSettingsModal({ onClose }: Props) {
  const s = useShippingSettings()

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nastavení dopravy</h2>
            <p className="text-sm text-gray-400">Ceny a pravidla pro každou metodu doručení</p>
          </div>
          <button type="button" onClick={onClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {s.toast && (
          <div className={`mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium shrink-0
            ${s.toast.type === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {s.toast.type === 'ok'
              ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
            {s.toast.msg}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {s.loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Načítám metody dopravy…</span>
            </div>
          ) : s.error ? (
            <div className="p-6 text-center text-sm text-red-600">{s.error}</div>
          ) : (
            <div className="px-6 py-4 space-y-2">

              {/* Legend */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto_auto] gap-3 px-4 pb-1 border-b border-gray-100">
                {['Metoda doručení', 'Cena (Kč)', 'Zdarma od (Kč)', 'Dobírka (Kč)', 'Odhad dnů', 'Stav', ''].map(h => (
                  <span key={h} className="text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</span>
                ))}
              </div>

              {/* Method rows */}
              {s.methods.map(m => {
                const dirty    = s.isDirty(m.id)
                const isSaving = s.saving === m.id
                const name     = s.localValue(m.id, 'name',          m.name)
                const price    = s.localValue(m.id, 'price',         m.price)
                const free     = s.localValue(m.id, 'freeThreshold', m.freeThreshold)
                const cod      = s.localValue(m.id, 'codFee',        m.codFee)
                const days     = s.localValue(m.id, 'estimatedDays', m.estimatedDays)
                const note     = s.localValue(m.id, 'note',          m.note)
                const active   = s.localValue(m.id, 'isActive',      m.isActive)
                const isCustom = m.provider === 'custom'

                return (
                  <div key={m.id}
                    className={`rounded-xl border transition-colors ${dirty ? 'border-amber-300 bg-amber-50/40' : 'border-gray-100 bg-white hover:bg-gray-50/60'}`}>

                    {/* Main row */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto_auto] gap-3 items-center px-4 py-3">

                      {/* Name + provider badge */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${PROVIDER_COLORS[m.provider as ShippingProvider]}`}>
                          {PROVIDER_LABELS[m.provider as ShippingProvider]}
                        </span>
                        {isCustom ? (
                          <input value={String(name)} onChange={e => s.fieldChange(m.id, 'name', e.target.value)}
                            className={`${inp} flex-1 min-w-0`} placeholder="Název metody" />
                        ) : (
                          <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                        )}
                      </div>

                      {/* Price */}
                      <input type="number" min="0" step="1" value={price}
                        onChange={e => s.fieldChange(m.id, 'price', e.target.value === '' ? 0 : Number(e.target.value))}
                        className={numInp} />

                      {/* Free threshold */}
                      <input type="number" min="0" step="1" value={free ?? ''}
                        placeholder="—"
                        onChange={e => s.fieldChange(m.id, 'freeThreshold', e.target.value)}
                        className={numInp} />

                      {/* COD fee */}
                      <input type="number" min="0" step="1" value={cod}
                        onChange={e => s.fieldChange(m.id, 'codFee', e.target.value === '' ? 0 : Number(e.target.value))}
                        className={numInp} />

                      {/* Estimated days */}
                      <input value={String(days)}
                        onChange={e => s.fieldChange(m.id, 'estimatedDays', e.target.value)}
                        className={inp} placeholder="2-3" />

                      {/* Active toggle */}
                      <button type="button" onClick={() => s.toggleActive(m.id, Boolean(active))}
                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none
                          ${active ? 'bg-green-500' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow-sm transform transition-transform
                          ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {isCustom && !dirty && (
                          <button type="button" onClick={() => s.handleDelete(m.id)} disabled={s.deleting === m.id}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                            {s.deleting === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {dirty && (
                          <>
                            <button type="button" onClick={() => s.saveRow(m.id)} disabled={isSaving}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60">
                              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              Uložit
                            </button>
                            <button type="button" onClick={() => s.cancelRow(m.id)}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Note row (always visible if has note, or if row is dirty) */}
                    {(dirty || note) && (
                      <div className="px-4 pb-3 grid grid-cols-[auto_1fr] gap-2 items-center border-t border-dashed border-gray-100 mt-0 pt-2.5">
                        <span className="text-xs text-gray-400 font-medium shrink-0">Poznámka</span>
                        <input value={String(note ?? '')}
                          onChange={e => s.fieldChange(m.id, 'note', e.target.value)}
                          className={inp} placeholder="Interní poznámka (volitelné)" />
                      </div>
                    )}
                  </div>
                )
              })}

              {s.methods.length === 0 && !s.loading && (
                <p className="text-center text-sm text-gray-400 italic py-10">Žádné metody dopravy</p>
              )}

              {/* Add new method form */}
              {s.showAddForm ? (
                <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/30 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Nová metoda dopravy</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Název <span className="text-red-400">*</span></label>
                      <input value={s.draft.name} onChange={e => s.setDraft(d => ({ ...d, name: e.target.value }))}
                        className={inp} placeholder="Např. Express DPD" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Poskytovatel</label>
                      <select value={s.draft.provider}
                        onChange={e => s.setDraft(d => ({ ...d, provider: e.target.value as ShippingProvider }))}
                        className={inp}>
                        <option value="dpd">DPD</option>
                        <option value="zasilkovna">Zásilkovna</option>
                        <option value="courier">Kurýr</option>
                        <option value="personal">Osobní odběr</option>
                        <option value="custom">Vlastní</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Cena (Kč)</label>
                      <input type="number" min="0" step="1" value={s.draft.price}
                        onChange={e => s.setDraft(d => ({ ...d, price: e.target.value }))}
                        className={numInp} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Zdarma od (Kč)</label>
                      <input type="number" min="0" step="1" value={s.draft.freeThreshold}
                        onChange={e => s.setDraft(d => ({ ...d, freeThreshold: e.target.value }))}
                        className={numInp} placeholder="—" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Dobírka (Kč)</label>
                      <input type="number" min="0" step="1" value={s.draft.codFee}
                        onChange={e => s.setDraft(d => ({ ...d, codFee: e.target.value }))}
                        className={numInp} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Odhad dnů</label>
                      <input value={s.draft.estimatedDays}
                        onChange={e => s.setDraft(d => ({ ...d, estimatedDays: e.target.value }))}
                        className={inp} placeholder="2-3" />
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Poznámka</label>
                      <input value={s.draft.note}
                        onChange={e => s.setDraft(d => ({ ...d, note: e.target.value }))}
                        className={inp} placeholder="Interní poznámka (volitelné)" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={s.handleCreate} disabled={s.creating}
                      className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
                      {s.creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Vytvořit metodu
                    </button>
                    <button type="button" onClick={() => { s.setShowAddForm(false) }}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      Zrušit
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => s.setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-orange-300 hover:text-orange-600 transition-colors">
                  <Plus className="w-4 h-4" /> Přidat vlastní metodu
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 shrink-0 flex items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            Změny se projeví okamžitě v nových objednávkách. Hodnoty se ukládají po řádcích tlačítkem&nbsp;<strong>Uložit</strong>.
          </p>
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            Zavřít
          </button>
        </div>

      </div>
    </div>
  )
}
