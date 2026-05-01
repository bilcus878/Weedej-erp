'use client'

import { useState } from 'react'
import { XCircle, AlertCircle, Info } from 'lucide-react'
import type { ReturnRequestDetail, ReturnItemCondition } from '../types'
import type { useReturnActions } from '../hooks/useReturnActions'

interface Props {
  detail:  ReturnRequestDetail
  onClose: () => void
  actions: ReturnType<typeof useReturnActions>
}

export function ReceiveGoodsModal({ detail, onClose, actions }: Props) {
  const [restock, setRestock] = useState(false)  // default OFF — safer than auto-restocking
  const [conditions, setConditions] = useState(
    detail.items.map(i => ({
      id:            i.id,
      condition:     'good' as ReturnItemCondition,
      conditionNote: '',
    }))
  )

  const handleSubmit = async () => {
    const ok = await actions.receiveGoods(detail.id, { items: conditions, restock })
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Přijmout vrácené zboží</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {detail.items.map((item, idx) => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-sm font-medium text-gray-900">{item.productName}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Fyzický stav zboží</label>
                  <select
                    value={conditions[idx].condition}
                    onChange={e => {
                      const updated = [...conditions]
                      updated[idx] = { ...updated[idx], condition: e.target.value as ReturnItemCondition }
                      setConditions(updated)
                    }}
                    className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    <option value="good">Nepoškozené</option>
                    <option value="opened">Otevřené</option>
                    <option value="damaged">Poškozené</option>
                    <option value="defective">Vadné</option>
                    <option value="wrong_item">Špatné zboží</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Poznámka</label>
                  <input
                    type="text"
                    placeholder="Volitelně..."
                    value={conditions[idx].conditionNote}
                    onChange={e => {
                      const updated = [...conditions]
                      updated[idx] = { ...updated[idx], conditionNote: e.target.value }
                      setConditions(updated)
                    }}
                    className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={restock}
                onChange={e => setRestock(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-400"
              />
              <span className="text-sm text-gray-700">Naskladnit nepoškozené zboží zpět do skladu</span>
            </label>
            {restock && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Naskladnění proběhne okamžitě. Zboží bude přidáno do skladu ještě před schválením.
                  Použijte pouze pokud jste si jisti stavem zboží.
                </span>
              </div>
            )}
          </div>

          {actions.error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{actions.error}</span>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            Zrušit
          </button>
          <button
            onClick={handleSubmit}
            disabled={actions.saving}
            className="text-sm px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors font-medium"
          >
            {actions.saving ? 'Ukládám...' : 'Potvrdit příjem'}
          </button>
        </div>
      </div>
    </div>
  )
}
