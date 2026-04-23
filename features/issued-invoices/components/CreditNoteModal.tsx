'use client'

import { useState } from 'react'
import { FileOutput, Plus, X } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { IssuedInvoice, CreditNoteFormItem } from '../types'

interface Props {
  invoice:  IssuedInvoice
  onSubmit: (items: CreditNoteFormItem[], reason: string, note: string) => Promise<void>
  onClose:  () => void
}

function buildPrefill(invoice: IssuedInvoice): CreditNoteFormItem[] {
  const items = invoice.items.map(item => ({
    productName: (item.product as any)?.name || item.productName || '',
    quantity:    String(item.quantity),
    unit:        item.unit || 'ks',
    price:       String(item.price || 0),
    vatRate:     String(item.vatRate || 21),
  }))
  return items.length > 0 ? items : [{ productName: '', quantity: '', unit: 'ks', price: '', vatRate: '21' }]
}

const UNITS     = ['ks', 'g', 'ml', 'kg', 'l', 'm'] as const
const VAT_RATES = ['21', '12', '0']                  as const

export function CreditNoteModal({ invoice, onSubmit, onClose }: Props) {
  const [items,  setItems]  = useState<CreditNoteFormItem[]>(() => buildPrefill(invoice))
  const [reason, setReason] = useState('')
  const [note,   setNote]   = useState('')
  const [busy,   setBusy]   = useState(false)

  function updateItem(idx: number, patch: Partial<CreditNoteFormItem>) {
    setItems(prev => prev.map((item, n) => n === idx ? { ...item, ...patch } : item))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try { await onSubmit(items, reason, note) }
    finally { setBusy(false) }
  }

  const totals = items.reduce(
    (acc, i) => {
      const q = parseFloat(i.quantity) || 0
      const p = parseFloat(i.price)    || 0
      const r = parseFloat(i.vatRate)  || 0
      const line = q * p
      const vat  = line * r / 100
      return { noVat: acc.noVat + line, vat: acc.vat + vat, withVat: acc.withVat + line + vat }
    },
    { noVat: 0, vat: 0, withVat: 0 },
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileOutput className="w-6 h-6" />
            <div>
              <h3 className="text-lg font-bold">Vystavit dobropis</h3>
              <p className="text-sm text-purple-200">K faktuře {invoice.transactionCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Reason + Note */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Důvod dobropisu</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Např. Reklamace, chybná fakturace..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="Volitelná poznámka..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Položky dobropisu jsou předvyplněny z faktury. Uprav množství, ceny nebo odeber položky, které nechceš dobropisovat.
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Položky dobropisu</h4>
              <button type="button"
                onClick={() => setItems(prev => [...prev, { productName: '', quantity: '', unit: 'ks', price: '', vatRate: '21' }])}
                className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200 flex items-center gap-1">
                <Plus className="w-3 h-3" />Přidat položku
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[3fr_1fr_0.7fr_1fr_0.8fr_auto] gap-2 px-2 text-xs font-semibold text-gray-600">
                <div>Název produktu</div>
                <div className="text-center">Množství</div>
                <div className="text-center">Jedn.</div>
                <div className="text-center">Cena bez DPH</div>
                <div className="text-center">DPH %</div>
                <div className="w-8" />
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[3fr_1fr_0.7fr_1fr_0.8fr_auto] gap-2 items-center">
                  <input type="text" value={item.productName}
                    onChange={e => updateItem(idx, { productName: e.target.value })}
                    placeholder="Název..."
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-purple-500" />
                  <input type="number" step="0.001" value={item.quantity}
                    onChange={e => updateItem(idx, { quantity: e.target.value })}
                    placeholder="0"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-purple-500" />
                  <select value={item.unit} onChange={e => updateItem(idx, { unit: e.target.value })}
                    className="px-1 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-purple-500">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input type="number" step="0.01" value={item.price}
                    onChange={e => updateItem(idx, { price: e.target.value })}
                    placeholder="0.00"
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-purple-500" />
                  <select value={item.vatRate} onChange={e => updateItem(idx, { vatRate: e.target.value })}
                    className="px-1 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-purple-500">
                    {VAT_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                  <button type="button" onClick={() => setItems(prev => prev.filter((_, n) => n !== idx))}
                    className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-600">Bez DPH:</span>      <span className="font-semibold ml-2 text-red-600">-{formatPrice(Math.round(totals.noVat   * 100) / 100)}</span></div>
                  <div><span className="text-gray-600">DPH:</span>           <span className="font-semibold ml-2 text-red-600">-{formatPrice(Math.round(totals.vat    * 100) / 100)}</span></div>
                  <div><span className="text-gray-600">Celkem s DPH:</span>  <span className="font-bold    ml-2 text-red-600">-{formatPrice(Math.round(totals.withVat * 100) / 100)}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg">
              Zrušit
            </button>
            <button type="submit" disabled={busy}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2 disabled:opacity-60">
              <FileOutput className="w-4 h-4" />Vystavit dobropis
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
