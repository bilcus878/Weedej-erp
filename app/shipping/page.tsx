'use client'

import { Truck, Plus, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useShippingSettings, ShippingMethodRow, AddShippingMethodForm } from '@/features/shipping'
import { COLS } from '@/features/shipping/constants'

export const dynamic = 'force-dynamic'

export default function ShippingPage() {
  const s = useShippingSettings()

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">

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

      {s.loading ? (
        <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Načítám metody dopravy…</span>
        </div>
      ) : s.error ? (
        <div className="text-center text-sm text-red-600 py-12">{s.error}</div>
      ) : (
        <div className="space-y-2">
          <div className={`grid ${COLS} gap-3 px-4 pb-2 border-b border-gray-100`}>
            {['Metoda doručení', 'Cena (Kč)', 'Zdarma od (Kč)', 'Dobírka (Kč)', 'Odhad dnů', 'Stav', ''].map(h => (
              <span key={h} className="text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</span>
            ))}
          </div>

          {s.methods.map(m => (
            <ShippingMethodRow
              key={m.id}
              method={m}
              isDirty={s.isDirty(m.id)}
              saving={s.saving}
              deleting={s.deleting}
              localValue={s.localValue}
              onFieldChange={s.fieldChange}
              onToggleActive={s.toggleActive}
              onSave={s.saveRow}
              onCancel={s.cancelRow}
              onDelete={s.handleDelete}
            />
          ))}

          {s.methods.length === 0 && (
            <p className="text-center text-sm text-gray-400 italic py-10">Žádné metody dopravy</p>
          )}

          {s.showAddForm ? (
            <AddShippingMethodForm
              draft={s.draft}
              creating={s.creating}
              onDraftChange={s.setDraft}
              onCreate={s.handleCreate}
              onCancel={() => s.setShowAddForm(false)}
            />
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
