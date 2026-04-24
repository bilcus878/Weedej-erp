'use client'

import { Package } from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import type { DeliveryNoteItem } from '../types'

interface Props {
  isVatPayer:          boolean
  isCustomerOrder:     boolean
  processingNoteItems: DeliveryNoteItem[]
  shippedQuantities:   Record<string, number>
  setShippedQuantities: (q: Record<string, number>) => void
  processNote:         string
  setProcessNote:      (n: string) => void
  isProcessing:        boolean
  onConfirm:           () => Promise<void>
  onClose:             () => void
}

export function ProcessShipmentModal({
  isVatPayer, isCustomerOrder, processingNoteItems,
  shippedQuantities, setShippedQuantities,
  processNote, setProcessNote,
  isProcessing, onConfirm, onClose,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-5 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Package className="w-7 h-7" />
            <div>
              <h2 className="text-2xl font-bold">{isCustomerOrder ? 'Vyskladnit objednávku' : 'Vyskladnit výdejku'}</h2>
              <p className="text-orange-100 text-sm mt-1">Nastav množství k vyskladnění a odešli zboží odběrateli</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-l-4 border-purple-500 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Položky k vyskladnění</h3>
            <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-purple-200">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-gradient-to-r from-purple-100 to-purple-50">
                  {isVatPayer ? (
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[28%]">Produkt</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[10%]">Objednáno</th>
                      <th className="text-center px-4 py-3 font-semibold text-orange-700 bg-orange-50 w-[12%]">Vyskladnit</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[8%]">DPH</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[10%]">Cena/ks</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[10%]">DPH/ks</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[10%]">S DPH/ks</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[12%]">Celkem</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[40%]">Produkt</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-700 w-[15%]">Objednáno</th>
                      <th className="text-right px-4 py-3 font-semibold text-orange-700 bg-orange-50 w-[15%]">Vyskladnit</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-700 w-[15%]">Cena/ks</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-700 w-[15%]">Celkem</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {processingNoteItems.map((item, idx) => {
                    const shipped      = shippedQuantities[item.id!] || 0
                    const maxAllowed   = item.quantity
                    const isVariant    = item.isVariant ?? false
                    const isOverLimit  = shipped > maxAllowed + 0.001
                    const hasSaved     = item.price != null && item.priceWithVat != null
                    const unitPrice    = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
                    const itemVatRate  = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
                    const isItemNonVat = isNonVatPayer(itemVatRate)
                    const vatPerUnit   = hasSaved ? Number(item.vatAmount ?? 0) : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
                    const priceWithVat = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
                    const packEquiv    = isVariant && item.variantValue ? shipped / item.variantValue : shipped
                    const total        = packEquiv * (isVatPayer ? priceWithVat : unitPrice)
                    const orderedDisplay = isVariant && item.orderedBaseQty != null
                      ? `${item.orderedBaseQty} ${item.unit}${item.shippedBaseQty ? ` (zbývá ${item.quantity})` : ''}`
                      : `${item.quantity} ${item.unit}`

                    function handleQtyChange(raw: string) {
                      if (raw === '') { setShippedQuantities({ ...shippedQuantities, [item.id!]: 0 }); return }
                      const v = Math.round(Number(raw) * 1000) / 1000
                      setShippedQuantities({ ...shippedQuantities, [item.id!]: v < 0 ? 0 : v })
                    }

                    const trBg = `${idx % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'} hover:bg-purple-100/40 transition-colors`
                    const inputEl = (align: 'center' | 'right') => (
                      <div className={`flex items-center justify-${align} gap-1.5`}>
                        <input type="number" value={shipped || ''} onChange={e => handleQtyChange(e.target.value)}
                          min="0" max={maxAllowed} step={isVariant ? '0.001' : '1'}
                          className={`${isVariant ? 'w-20' : 'w-16'} px-2 py-2 border-2 ${isOverLimit ? 'border-red-400 bg-red-50' : 'border-orange-300'} rounded-lg text-center font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-sm`}
                        />
                        <span className="text-gray-600 font-medium text-xs">{item.unit}</span>
                        {isVariant && (
                          <button type="button" title="Vyskladnit vše" onClick={() => setShippedQuantities({ ...shippedQuantities, [item.id!]: maxAllowed })}
                            className="text-[10px] text-orange-500 hover:text-orange-700 underline leading-none">vše</button>
                        )}
                      </div>
                    )

                    return isVatPayer ? (
                      <tr key={item.id} className={trBg}>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {item.productName || item.product?.name || 'Neznámý produkt'}
                          {isVariant && <div className="text-[11px] text-orange-600 font-normal mt-0.5">objednáno {item.orderedBaseQty} {item.unit} · zbývá {item.remainingBaseQty} {item.unit}</div>}
                        </td>
                        <td className="text-center px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{orderedDisplay}</td>
                        <td className="text-center px-4 py-3 bg-orange-50">
                          {inputEl('center')}
                          {isOverLimit && <div className="text-[10px] text-red-600 mt-0.5 text-center">max {maxAllowed} {item.unit}</div>}
                        </td>
                        <td className="text-center px-4 py-3 text-gray-500 whitespace-nowrap">{isItemNonVat ? '-' : `${itemVatRate}%`}</td>
                        <td className="text-center px-4 py-3 text-gray-700 whitespace-nowrap">{formatPrice(unitPrice)}</td>
                        <td className="text-center px-4 py-3 text-gray-500 whitespace-nowrap">{isItemNonVat ? '-' : formatPrice(vatPerUnit)}</td>
                        <td className="text-center px-4 py-3 text-gray-700 whitespace-nowrap">{formatPrice(priceWithVat)}</td>
                        <td className="text-center px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatPrice(total)}</td>
                      </tr>
                    ) : (
                      <tr key={item.id} className={trBg}>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {item.productName || item.product?.name || 'Neznámý produkt'}
                          {isVariant && <div className="text-[11px] text-orange-600 font-normal mt-0.5">objednáno {item.orderedBaseQty} {item.unit} · zbývá {item.remainingBaseQty} {item.unit}</div>}
                        </td>
                        <td className="text-right px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{orderedDisplay}</td>
                        <td className="text-right px-4 py-3 bg-orange-50">
                          {inputEl('right')}
                          {isOverLimit && <div className="text-[10px] text-red-600 mt-0.5 text-right">max {maxAllowed} {item.unit}</div>}
                        </td>
                        <td className="text-right px-4 py-3 text-gray-700 whitespace-nowrap">{formatPrice(unitPrice)}</td>
                        <td className="text-right px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatPrice(total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50 font-bold border-t-2 border-purple-300">
                  <tr>
                    <td colSpan={isVatPayer ? 7 : 4} className="px-4 py-3 text-left text-gray-800">{isVatPayer ? 'CELKEM S DPH:' : 'CELKEM:'}</td>
                    <td className="text-center px-4 py-3 text-lg text-purple-700 whitespace-nowrap">
                      {formatPrice(processingNoteItems.reduce((sum, item) => {
                        const s      = shippedQuantities[item.id!] || 0
                        const saved  = item.price != null && item.priceWithVat != null
                        const up     = saved ? Number(item.price) : Number(item.product?.price || 0)
                        const vr     = saved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
                        const nv     = isNonVatPayer(vr)
                        const vpu    = saved ? Number(item.vatAmount ?? 0) : (nv ? 0 : up * vr / 100)
                        const pwv    = saved ? Number(item.priceWithVat) : (up + vpu)
                        const isV    = item.isVariant ?? false
                        const equiv  = isV && item.variantValue ? s / item.variantValue : s
                        return sum + equiv * (isVatPayer ? pwv : up)
                      }, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border-l-4 border-blue-500 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Poznámka</h3>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Poznámka k vyskladnění <span className="text-gray-500 text-xs">(volitelné)</span></label>
            <textarea value={processNote} onChange={e => setProcessNote(e.target.value)}
              placeholder="Volitelná poznámka k vyskladnění..." rows={3}
              className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all bg-white"
            />
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 p-4 rounded-lg shadow-sm">
            <p className="font-semibold text-yellow-900 mb-1">Upozornění</p>
            <p className="text-sm text-yellow-800">Po vyskladnění se zboží odečte ze skladu a uvolní se rezervace. Tato akce je nevratná.</p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t-2 border-gray-200">
            <Button variant="ghost" onClick={onClose} className="px-6 py-2.5">Zrušit</Button>
            <Button onClick={onConfirm} disabled={isProcessing}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {isProcessing ? '⏳ Zpracovávám...' : 'Vyskladnit'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
