'use client'

import type { Metadata } from 'next'
import {
  Truck, Plus, Save, RotateCcw, Trash2,
  CheckCircle, XCircle, Loader2,
} from 'lucide-react'
import { useShippingSettings } from '@/features/shipping'
import { PROVIDER_LABELS, PROVIDER_COLORS } from '@/features/shipping'
import type { ShippingProvider } from '@/features/shipping'

export const dynamic = 'force-dynamic'

// Input class tokens — identical to ShippingSettingsModal so visual parity is maintained.
const inp    = 'w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-100 focus:outline-none transition-colors'
const numInp = `${inp} text-right tabular-nums`

const COLS = 'grid-cols-[2fr_1fr_1fr_1fr_1fr_auto_auto]'

export default function ShippingPage() {
  const s = useShippingSettings()

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-l-4 border-slate-500 rounded-lg shadow-sm py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-700">Doprava</h1>
            <p className="text-slate-500 text-sm mt-0.5">Metody doručení, ceny a pravidla pro e-shop a interní objednávky</p>
          </div>
        </div>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {s.toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border ${
          s.toast.type === 'ok'
            ? 'bg-green-50 text-green-800 border-green-200'
            : 'bg-red-50   text-red-800   border-red-200'
        }`}>
          {s.toast.type === 'ok'
            ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            : <XCircle     className="w-4 h-4 text-red-500   shrink-0" />}
          {s.toast.msg}
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      {s.loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Načítám metody dopravy…</span>
        </div>
      ) : s.error ? (
        <div className="text-center text-sm text-red-600 py-12">{s.error}</div>
      ) : (
        <div className="space-y-2">

          {/* Legend row */}
          <div className={`grid ${COLS} gap-3 px-4 pb-2 border-b border-gray-100`}>
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
              <div
                key={m.id}
                className={`rounded-xl border transition-colors ${
                  dirty ? 'border-amber-300 bg-amber-50/40' : 'border-gray-100 bg-white hover:bg-gray-50/60'
                }`}
              >
                {/* Main row */}
                <div className={`grid ${COLS} gap-3 items-center px-4 py-3`}>

                  {/* Name + provider badge */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${PROVIDER_COLORS[m.provider as ShippingProvider]}`}>
                      {PROVIDER_LABELS[m.provider as ShippingProvider]}
                    </span>
                    {isCustom ? (
                      <input
                        value={String(name)}
                        onChange={e => s.fieldChange(m.id, 'name', e.target.value)}
                        className={`${inp} flex-1 min-w-0`}
                        placeholder="Název metody"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                    )}
                  </div>

                  {/* Price */}
                  <input
                    type="number" min="0" step="1"
                    value={price}
                    onChange={e => s.fieldChange(m.id, 'price', e.target.value === '' ? 0 : Number(e.target.value))}
                    className={numInp}
                  />

                  {/* Free threshold */}
                  <input
                    type="number" min="0" step="1"
                    value={free ?? ''}
                    placeholder="—"
                    onChange={e => s.fieldChange(m.id, 'freeThreshold', e.target.value)}
                    className={numInp}
                  />

                  {/* COD fee */}
                  <input
                    type="number" min="0" step="1"
                    value={cod}
                    onChange={e => s.fieldChange(m.id, 'codFee', e.target.value === '' ? 0 : Number(e.target.value))}
                    className={numInp}
                  />

                  {/* Estimated days */}
                  <input
                    value={String(days)}
                    onChange={e => s.fieldChange(m.id, 'estimatedDays', e.target.value)}
                    className={inp}
                    placeholder="2-3"
                  />

                  {/* Active toggle */}
                  <button
                    type="button"
                    onClick={() => s.toggleActive(m.id, Boolean(active))}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none ${
                      active ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow-sm transform transition-transform ${
                      active ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>

                  {/* Row actions */}
                  <div className="flex items-center gap-1">
                    {isCustom && !dirty && (
                      <button
                        type="button"
                        onClick={() => s.handleDelete(m.id)}
                        disabled={s.deleting === m.id}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {s.deleting === m.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2  className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {dirty && (
                      <>
                        <button
                          type="button"
                          onClick={() => s.saveRow(m.id)}
                          disabled={isSaving}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Uložit
                        </button>
                        <button
                          type="button"
                          onClick={() => s.cancelRow(m.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Note row — shown when dirty or note exists */}
                {(dirty || note) && (
                  <div className="px-4 pb-3 grid grid-cols-[auto_1fr] gap-2 items-center border-t border-dashed border-gray-100 pt-2.5">
                    <span className="text-xs text-gray-400 font-medium shrink-0">Poznámka</span>
                    <input
                      value={String(note ?? '')}
                      onChange={e => s.fieldChange(m.id, 'note', e.target.value)}
                      className={inp}
                      placeholder="Interní poznámka (volitelné)"
                    />
                  </div>
                )}
              </div>
            )
          })}

          {s.methods.length === 0 && (
            <p className="text-center text-sm text-gray-400 italic py-10">Žádné metody dopravy</p>
          )}

          {/* Add new method */}
          {s.showAddForm ? (
            <div className="rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/30 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Nová metoda dopravy</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Název <span className="text-red-400">*</span></label>
                  <input
                    value={s.draft.name}
                    onChange={e => s.setDraft(d => ({ ...d, name: e.target.value }))}
                    className={inp}
                    placeholder="Např. Express DPD"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Poskytovatel</label>
                  <select
                    value={s.draft.provider}
                    onChange={e => s.setDraft(d => ({ ...d, provider: e.target.value as ShippingProvider }))}
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
                  <input
                    value={s.draft.estimatedDays}
                    onChange={e => s.setDraft(d => ({ ...d, estimatedDays: e.target.value }))}
                    className={inp} placeholder="2-3" />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Poznámka</label>
                  <input
                    value={s.draft.note}
                    onChange={e => s.setDraft(d => ({ ...d, note: e.target.value }))}
                    className={inp} placeholder="Interní poznámka (volitelné)" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={s.handleCreate}
                  disabled={s.creating}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                >
                  {s.creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Vytvořit metodu
                </button>
                <button
                  type="button"
                  onClick={() => s.setShowAddForm(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Zrušit
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => s.setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-orange-300 hover:text-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Přidat vlastní metodu
            </button>
          )}

          <p className="text-xs text-gray-400 pt-1">
            Změny se projeví okamžitě v nových objednávkách.
            Hodnoty se ukládají po řádcích tlačítkem&nbsp;<strong>Uložit</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
