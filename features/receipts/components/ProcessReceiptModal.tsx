'use client'

import { Package, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { formatPrice } from '@/lib/utils'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import type { ReceiptItem, InvoiceData } from '../types'

interface Props {
  isVatPayer:              boolean
  processingOrderId:       string | null
  processingReceiptItems:  ReceiptItem[]
  receivedQuantities:      Record<string, number>
  setReceivedQuantities:   (q: Record<string, number>) => void
  invoiceData:             InvoiceData
  setInvoiceData:          (d: InvoiceData) => void
  processReceiptDate:      string
  setProcessReceiptDate:   (d: string) => void
  hasExistingInvoice:      boolean
  isInvoiceSectionExpanded: boolean
  setIsInvoiceSectionExpanded: (v: boolean) => void
  isProcessing:            boolean
  onConfirm:               () => Promise<void>
  onClose:                 () => void
}

export function ProcessReceiptModal({
  isVatPayer, processingOrderId, processingReceiptItems,
  receivedQuantities, setReceivedQuantities,
  invoiceData, setInvoiceData,
  processReceiptDate, setProcessReceiptDate,
  hasExistingInvoice, isInvoiceSectionExpanded, setIsInvoiceSectionExpanded,
  isProcessing, onConfirm, onClose,
}: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-5 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Package className="w-7 h-7" />
            <div>
              <h2 className="text-2xl font-bold">{processingOrderId ? 'Přímé naskladnění z objednávky' : 'Zpracovat příjemku'}</h2>
              <p className="text-orange-100 text-sm mt-1">Nastav množství k naskladnění a vyplň údaje o faktuře</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Items table */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-l-4 border-purple-500 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              Položky k naskladnění
            </h3>
            <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-purple-200">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-purple-100 to-purple-50">
                  <tr>
                    <th className="text-left px-3 py-3 font-semibold text-gray-700">Produkt</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">Objednáno</th>
                    {processingOrderId && <th className="text-right px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">Přijato</th>}
                    <th className="text-right px-3 py-3 font-semibold text-green-700 bg-green-50 whitespace-nowrap">Nyní přijmout</th>
                    <th className="text-right px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">{isVatPayer ? 'Bez DPH/ks' : 'Cena/ks'}</th>
                    {isVatPayer && <th className="text-right px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">S DPH/ks</th>}
                    <th className="text-right px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">Celkem</th>
                  </tr>
                </thead>
                <tbody>
                  {processingReceiptItems.map((item: any, idx) => {
                    const received      = receivedQuantities[item.id!] || 0
                    const unitPrice     = Number(item.purchasePrice || 0)
                    const itemVatRate   = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
                    const itemIsNonVat  = isNonVatPayer(itemVatRate)
                    const vatPerUnit    = (isVatPayer && !itemIsNonVat) ? unitPrice * itemVatRate / 100 : 0
                    const priceWithVat  = unitPrice + vatPerUnit
                    const total         = received * (isVatPayer ? priceWithVat : unitPrice)
                    const maxAllowed    = item.remainingQuantity || Number(item.quantity)
                    const alreadyReceived = item.alreadyReceived || 0
                    return (
                      <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'} hover:bg-purple-100/40 transition-colors`}>
                        <td className="px-3 py-3 font-medium text-gray-800">{item.product?.name || item.productName || 'Neznámý produkt'}</td>
                        <td className="text-right px-3 py-3 text-gray-600 whitespace-nowrap">{Number(item.quantity)} {item.unit}</td>
                        {processingOrderId && <td className="text-right px-3 py-3 text-gray-500 whitespace-nowrap">{alreadyReceived} {item.unit}</td>}
                        <td className="text-right px-3 py-3 bg-green-50">
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number" value={received || ''}
                              onChange={e => {
                                const v = e.target.value
                                if (v === '') { setReceivedQuantities({ ...receivedQuantities, [item.id!]: '' as any }); return }
                                const n = Number(v)
                                if (n > maxAllowed || n < 0) { setReceivedQuantities({ ...receivedQuantities, [item.id!]: '' as any }); return }
                                setReceivedQuantities({ ...receivedQuantities, [item.id!]: n })
                              }}
                              min="0" max={maxAllowed} step="1"
                              className="w-16 px-2 py-2 border-2 border-green-300 rounded-lg text-right font-medium focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                            />
                            <span className="text-gray-600 font-medium w-6 text-left text-xs">{item.unit}</span>
                          </div>
                          {processingOrderId && maxAllowed < Number(item.quantity) && (
                            <p className="text-xs text-orange-600 mt-1 font-medium text-right">Max: {maxAllowed}</p>
                          )}
                        </td>
                        <td className="text-right px-3 py-3 text-gray-700 whitespace-nowrap">{formatPrice(unitPrice)}</td>
                        {isVatPayer && (
                          <td className="text-right px-3 py-3 whitespace-nowrap">
                            {itemIsNonVat
                              ? <span className="text-gray-500">—</span>
                              : <div><div className="font-medium text-blue-700">{formatPrice(priceWithVat)}</div><div className="text-xs text-gray-400">+{itemVatRate}% ({formatPrice(vatPerUnit)})</div></div>}
                          </td>
                        )}
                        <td className="text-right px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatPrice(total)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50 font-bold border-t-2 border-purple-300">
                  <tr>
                    <td colSpan={processingOrderId ? (isVatPayer ? 5 : 4) : (isVatPayer ? 4 : 3)} className="px-3 py-3 text-left text-gray-800">CELKEM:</td>
                    <td colSpan={2} className="text-right px-3 py-3 text-lg text-purple-700 whitespace-nowrap">
                      {formatPrice(processingReceiptItems.reduce((sum, item: any) => {
                        const r   = receivedQuantities[item.id!] || 0
                        const up  = Number(item.purchasePrice || 0)
                        const vr  = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
                        const inv = isNonVatPayer(vr)
                        const vpu = (isVatPayer && !inv) ? up * vr / 100 : 0
                        return sum + r * (isVatPayer ? up + vpu : up)
                      }, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Receipt date */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border-l-4 border-blue-500 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Datum příjmu
            </h3>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Kdy zboží fyzicky dorazilo? <span className="text-red-500">*</span></label>
              <Input type="date" value={processReceiptDate} onChange={e => setProcessReceiptDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400" />
              {(() => {
                const sel = new Date(processReceiptDate)
                const today = new Date()
                const diff = Math.floor((today.getTime() - sel.getTime()) / (1000 * 60 * 60 * 24))
                if (sel > today) return <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Datum nesmí být v budoucnosti</p>
                if (diff > 30)   return <p className="text-xs text-orange-600 mt-2 font-medium">⚠️ Datum je starší než 30 dní</p>
                return null
              })()}
            </div>
          </div>

          {/* Invoice section */}
          {!hasExistingInvoice && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-l-4 border-green-500 shadow-sm">
              <div className="px-5 py-4 cursor-pointer hover:bg-green-100/50 transition-colors rounded-t-lg" onClick={() => setIsInvoiceSectionExpanded(!isInvoiceSectionExpanded)}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Faktura od dodavatele
                    <span className="text-sm font-normal text-gray-600 ml-2">(volitelné - klikni pro rozbalení)</span>
                  </h3>
                  {isInvoiceSectionExpanded ? <ChevronDown className="h-6 w-6 text-green-600" /> : <ChevronRight className="h-6 w-6 text-green-600" />}
                </div>
              </div>
              {isInvoiceSectionExpanded && (
                <div className="px-5 pb-5 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Číslo faktury <span className="text-orange-600 text-xs">(můžeš nechat prázdné - doplníš později)</span></label>
                    <Input value={invoiceData.invoiceNumber} onChange={e => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })} placeholder="např. FA-2025-001" className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400" />
                    <p className="text-xs text-gray-600 mt-2">💡 Pokud nemáš číslo faktury, nech prázdné. Vytvoří se dočasná faktura.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Datum faktury</label>
                      <Input type="date" value={invoiceData.invoiceDate} onChange={e => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })} className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Splatnost <span className="text-gray-500 text-xs">(volitelné)</span></label>
                      <Input type="date" value={invoiceData.dueDate} onChange={e => setInvoiceData({ ...invoiceData, dueDate: e.target.value })} className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Poznámka <span className="text-gray-500 text-xs">(volitelné)</span></label>
                    <textarea value={invoiceData.note} onChange={e => setInvoiceData({ ...invoiceData, note: e.target.value })} className="w-full border-2 border-green-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all bg-white" rows={3} placeholder="Volitelná poznámka k faktuře..." />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t-2 border-gray-200">
            <Button variant="ghost" onClick={onClose} className="px-6 py-2 hover:bg-gray-100 transition-colors">Zrušit</Button>
            <Button onClick={onConfirm} disabled={isProcessing} className="px-8 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              <CheckCircle className="w-4 h-4 mr-2" />
              {isProcessing ? '⏳ Zpracovávám...' : 'Zpracovat a naskladnit'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
