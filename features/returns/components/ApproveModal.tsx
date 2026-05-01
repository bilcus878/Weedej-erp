'use client'

import { useState } from 'react'
import { XCircle, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/shared/finance/money'
import type { ReturnRequestDetail, ReturnItemCondition, ReturnItemStatus } from '../types'
import type { useReturnActions } from '../hooks/useReturnActions'

interface Props {
  detail:  ReturnRequestDetail
  onClose: () => void
  actions: ReturnType<typeof useReturnActions>
}

export function ApproveModal({ detail, onClose, actions }: Props) {
  const [resolutionType, setResolutionType] = useState<string>('refund')
  const [itemDecisions, setItemDecisions]   = useState(
    detail.items.map(item => ({
      id:                  item.id,
      itemStatus:          'approved' as ReturnItemStatus,
      approvedQuantity:    item.returnedQuantity,
      condition:           item.condition as ReturnItemCondition | null,
      conditionNote:       item.conditionNote,
      itemRejectionReason: null as string | null,
    }))
  )

  const computedRefund = itemDecisions.reduce((sum, d) => {
    if (d.itemStatus === 'rejected') return sum
    const item = detail.items.find(i => i.id === d.id)!
    return sum + (d.approvedQuantity ?? 0) * item.unitPriceWithVat
  }, 0)

  const handleSubmit = async () => {
    const ok = await actions.approve(detail.id, {
      items:          itemDecisions,
      resolutionType: resolutionType as any,
    })
    // Only close when the server confirmed success
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Schválit reklamaci</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Resolution type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Typ rozhodnutí</label>
            <select
              value={resolutionType}
              onChange={e => setResolutionType(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="refund">Vrácení peněz</option>
              <option value="store_credit">Kredit v e-shopu</option>
              <option value="exchange">Výměna produktu</option>
              <option value="repair">Oprava</option>
            </select>
          </div>

          {/* Per-item decisions */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Rozhodnutí položek</label>
            <div className="space-y-3">
              {detail.items.map((item, idx) => {
                const decision = itemDecisions[idx]
                return (
                  <div key={item.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{item.productName}</span>
                      <span className="text-xs text-gray-500">{item.returnedQuantity} {item.unit}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-semibold">Rozhodnutí</label>
                        <select
                          value={decision.itemStatus}
                          onChange={e => {
                            const updated = [...itemDecisions]
                            updated[idx] = { ...updated[idx], itemStatus: e.target.value as ReturnItemStatus }
                            setItemDecisions(updated)
                          }}
                          className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        >
                          <option value="approved">Schváleno</option>
                          <option value="partial">Částečně</option>
                          <option value="rejected">Zamítnuto</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-semibold">Schválené mn.</label>
                        <input
                          type="number"
                          min={0}
                          max={item.returnedQuantity}
                          step="any"
                          value={decision.approvedQuantity ?? ''}
                          onChange={e => {
                            const updated = [...itemDecisions]
                            updated[idx] = { ...updated[idx], approvedQuantity: parseFloat(e.target.value) || 0 }
                            setItemDecisions(updated)
                          }}
                          disabled={decision.itemStatus === 'rejected'}
                          className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-semibold">Stav zboží</label>
                        <select
                          value={decision.condition ?? ''}
                          onChange={e => {
                            const updated = [...itemDecisions]
                            updated[idx] = { ...updated[idx], condition: (e.target.value || null) as ReturnItemCondition | null }
                            setItemDecisions(updated)
                          }}
                          className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        >
                          <option value="">Vybrat...</option>
                          <option value="good">Nepoškozené</option>
                          <option value="damaged">Poškozené</option>
                          <option value="defective">Vadné</option>
                          <option value="opened">Otevřené</option>
                          <option value="wrong_item">Špatné zboží</option>
                        </select>
                      </div>
                    </div>
                    {decision.itemStatus === 'rejected' && (
                      <input
                        type="text"
                        placeholder="Důvod zamítnutí položky..."
                        value={decision.itemRejectionReason ?? ''}
                        onChange={e => {
                          const updated = [...itemDecisions]
                          updated[idx] = { ...updated[idx], itemRejectionReason: e.target.value || null }
                          setItemDecisions(updated)
                        }}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Computed refund */}
          <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700 font-medium">Celková refundace</span>
            <span className="text-lg font-bold text-green-700">{formatPrice(Math.round(computedRefund * 100) / 100)}</span>
          </div>

          {/* Inline error — stays visible while modal is open */}
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
            className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
          >
            {actions.saving ? 'Ukládám...' : 'Potvrdit rozhodnutí'}
          </button>
        </div>
      </div>
    </div>
  )
}
