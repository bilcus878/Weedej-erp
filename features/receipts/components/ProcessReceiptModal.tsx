'use client'

import { AlertTriangle, Package, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { SupplierOrderDetail } from '@/components/erp'
import type { SupplierOrderDetailData, SupplierOrderDetailItem } from '@/components/erp'
import { formatPrice } from '@/lib/utils'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import type { ReceiptItem, InvoiceData } from '../types'

// Map a pending PurchaseOrder (runtime shape) to SupplierOrderDetailData
function mapToSupplierDetail(order: any, isVatPayer: boolean): SupplierOrderDetailData {
  const supplier = order.supplier
  const items: SupplierOrderDetailItem[] = (order.items || []).map((item: any, idx: number) => {
    const unitPrice    = Number(item.expectedPrice || 0)
    const vatRate      = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
    const isItemNonVat = isNonVatPayer(vatRate)
    const vatPerUnit   = (isVatPayer && !isItemNonVat) ? unitPrice * vatRate / 100 : 0
    const priceWithVat = unitPrice + vatPerUnit
    return {
      id:                      item.id || String(idx),
      productId:               item.productId   || null,
      productName:             item.productName || item.product?.name || null,
      quantity:                Number(item.quantity),
      alreadyReceivedQuantity: Number(item.alreadyReceivedQuantity ?? 0),
      unit:                    item.unit || 'ks',
      price:                   unitPrice,
      vatRate,
      vatAmount:               vatPerUnit,
      priceWithVat,
      product: item.product
        ? { id: item.product.id, name: item.product.name, price: unitPrice, unit: item.unit || 'ks' }
        : null,
    }
  })
  const totalAmount = items.reduce(
    (sum, item) => sum + item.quantity * (isVatPayer ? item.priceWithVat : item.price),
    0,
  )
  return {
    id:          order.id,
    orderNumber: order.orderNumber,
    orderDate:   order.orderDate || new Date().toISOString(),
    status:      order.status,
    totalAmount,
    expectedDate:            order.expectedDate ? new Date(order.expectedDate).toISOString().split('T')[0] : null,
    supplierName:            supplier?.name    || order.supplierName    || null,
    supplierEmail:           supplier?.email   || null,
    supplierPhone:           supplier?.phone   || null,
    supplierAddress:         supplier?.address || null,
    supplierContactPerson:   supplier?.contactPerson || null,
    supplierEntityType:      supplier?.entityType    || null,
    supplierICO:             supplier?.ico  || null,
    supplierDIC:             supplier?.dic  || null,
    supplierBankAccount:     supplier?.bankAccount || null,
    supplierWebsite:         supplier?.website    || null,
    paymentType:             order.invoice?.paymentType  || null,
    dueDate:                 order.invoice?.dueDate ? new Date(order.invoice.dueDate).toISOString().split('T')[0] : null,
    variableSymbol:          order.invoice?.variableSymbol || null,
    discountAmount:          null,
    stornoAt:                null,
    stornoBy:                null,
    stornoReason:            null,
    note:                    order.note || null,
    items,
    receivedInvoice:         null,
    receipts:                [],
  }
}

interface Props {
  isVatPayer:               boolean
  processingOrderId:        string | null
  processingOrder?:         any
  processingReceiptItems:   ReceiptItem[]
  receivedQuantities:       Record<string, number>
  setReceivedQuantities:    (q: Record<string, number>) => void
  invoiceData:              InvoiceData
  setInvoiceData:           (d: InvoiceData) => void
  processReceiptDate:       string
  setProcessReceiptDate:    (d: string) => void
  hasExistingInvoice:       boolean
  isInvoiceSectionExpanded: boolean
  setIsInvoiceSectionExpanded: (v: boolean) => void
  isProcessing:             boolean
  onConfirm:                () => Promise<void>
  onClose:                  () => void
}

export function ProcessReceiptModal({
  isVatPayer, processingOrderId, processingOrder,
  processingReceiptItems, receivedQuantities, setReceivedQuantities,
  invoiceData, setInvoiceData,
  processReceiptDate, setProcessReceiptDate,
  hasExistingInvoice, isInvoiceSectionExpanded, setIsInvoiceSectionExpanded,
  isProcessing, onConfirm, onClose,
}: Props) {
  const supplierDetail = processingOrder ? mapToSupplierDetail(processingOrder, isVatPayer) : null

  const total = processingReceiptItems.reduce((sum, item: any) => {
    const r   = receivedQuantities[item.id!] || 0
    const up  = Number(item.purchasePrice || 0)
    const vr  = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
    const inv = isNonVatPayer(vr)
    const vpu = (isVatPayer && !inv) ? up * vr / 100 : 0
    return sum + r * (isVatPayer ? up + vpu : up)
  }, 0)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-stretch justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full max-w-[1440px] sm:my-4 flex flex-col sm:max-h-[calc(100vh-2rem)] overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white shrink-0">
          <Package className="w-6 h-6 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-xl font-bold">{processingOrderId ? 'Přímé naskladnění z objednávky' : 'Zpracovat příjemku'}</h2>
            <p className="text-orange-100 text-sm mt-0.5">Zkontroluj dodavatele · nastav přijaté množství · vyplň fakturu</p>
          </div>
          <button onClick={onClose} className="ml-auto text-white/70 hover:text-white text-2xl leading-none transition-colors shrink-0">×</button>
        </div>

        {/* ── 2-column body ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[3fr_2fr] lg:divide-x divide-gray-200 overflow-hidden">

          {/* LEFT — fulfillment workspace */}
          <div className="flex flex-col overflow-y-auto min-h-0">
            <div className="flex-1 p-5 space-y-5">

              {/* Items table */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Položky k naskladnění</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="bg-gray-50 border-b border-gray-200 text-xs">
                        <tr>
                          <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Produkt</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">Objednáno</th>
                          {processingOrderId && <th className="text-right px-3 py-2.5 font-semibold text-gray-500 whitespace-nowrap">Přijato</th>}
                          <th className="text-right px-3 py-2.5 font-semibold text-green-700 bg-green-50/80 whitespace-nowrap">Nyní přijmout</th>
                          <th className="text-right px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">{isVatPayer ? 'Bez DPH/ks' : 'Cena/ks'}</th>
                          {isVatPayer && <th className="text-right px-3 py-2.5 font-semibold text-blue-700 whitespace-nowrap">S DPH/ks</th>}
                          <th className="text-right px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Celkem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {processingReceiptItems.map((item: any, idx) => {
                          const received        = receivedQuantities[item.id!] || 0
                          const unitPrice       = Number(item.purchasePrice || 0)
                          const itemVatRate     = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
                          const itemIsNonVat    = isNonVatPayer(itemVatRate)
                          const vatPerUnit      = (isVatPayer && !itemIsNonVat) ? unitPrice * itemVatRate / 100 : 0
                          const priceWithVat    = unitPrice + vatPerUnit
                          const rowTotal        = received * (isVatPayer ? priceWithVat : unitPrice)
                          const maxAllowed      = item.remainingQuantity || Number(item.quantity)
                          const alreadyReceived = item.alreadyReceived || 0

                          const rowCls = `${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-green-50/30 transition-colors`
                          return (
                            <tr key={item.id} className={rowCls}>
                              <td className="px-3 py-2.5 font-medium text-gray-800 text-sm">{item.product?.name || item.productName || 'Neznámý produkt'}</td>
                              <td className="text-right px-3 py-2.5 text-gray-500 whitespace-nowrap text-sm">{Number(item.quantity)} {item.unit}</td>
                              {processingOrderId && <td className="text-right px-3 py-2.5 text-gray-400 whitespace-nowrap text-sm">{alreadyReceived} {item.unit}</td>}
                              <td className="text-right px-3 py-2.5 bg-green-50/60">
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
                                    className="w-16 px-2 py-1.5 border-2 border-green-300 rounded-md text-right font-medium text-sm focus:border-green-500 focus:ring-1 focus:ring-green-200 transition-all"
                                  />
                                  <span className="text-gray-400 font-medium w-5 text-xs">{item.unit}</span>
                                </div>
                                {processingOrderId && maxAllowed < Number(item.quantity) && (
                                  <p className="text-[10px] text-orange-500 mt-0.5 text-right font-medium">Max: {maxAllowed}</p>
                                )}
                              </td>
                              <td className="text-right px-3 py-2.5 text-gray-600 whitespace-nowrap text-sm">{formatPrice(unitPrice)}</td>
                              {isVatPayer && (
                                <td className="text-right px-3 py-2.5 whitespace-nowrap">
                                  {itemIsNonVat
                                    ? <span className="text-gray-400 text-sm">—</span>
                                    : <div>
                                        <div className="font-medium text-blue-700 text-sm">{formatPrice(priceWithVat)}</div>
                                        <div className="text-[10px] text-gray-400">+{itemVatRate}% ({formatPrice(vatPerUnit)})</div>
                                      </div>}
                                </td>
                              )}
                              <td className="text-right px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap text-sm">{formatPrice(rowTotal)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="border-t-2 border-gray-200 bg-gray-100 text-sm font-bold">
                        <tr>
                          <td colSpan={processingOrderId ? (isVatPayer ? 5 : 4) : (isVatPayer ? 4 : 3)} className="px-3 py-2.5 text-gray-700">CELKEM</td>
                          <td colSpan={2} className="text-right px-3 py-2.5 text-gray-900 whitespace-nowrap">{formatPrice(total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </section>

              {/* Receipt date */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Datum příjmu</p>
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
                  <label className="text-sm font-semibold text-gray-700 block">
                    Kdy zboží fyzicky dorazilo? <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date" value={processReceiptDate} onChange={e => setProcessReceiptDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="bg-white"
                  />
                  {(() => {
                    const sel   = new Date(processReceiptDate)
                    const today = new Date()
                    const diff  = Math.floor((today.getTime() - sel.getTime()) / (1000 * 60 * 60 * 24))
                    if (sel > today) return <p className="text-xs text-red-500 font-medium">⚠️ Datum nesmí být v budoucnosti</p>
                    if (diff > 30)   return <p className="text-xs text-orange-500 font-medium">⚠️ Datum je starší než 30 dní</p>
                    return null
                  })()}
                </div>
              </section>

              {/* Invoice section */}
              {!hasExistingInvoice && (
                <section>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Faktura od dodavatele</p>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setIsInvoiceSectionExpanded(!isInvoiceSectionExpanded)}
                    >
                      <div>
                        <span className="text-sm font-semibold text-gray-800">Údaje o faktuře</span>
                        <span className="ml-2 text-xs text-gray-400">(volitelné — klikni pro rozbalení)</span>
                      </div>
                      {isInvoiceSectionExpanded
                        ? <ChevronDown className="h-4 w-4 text-gray-500" />
                        : <ChevronRight className="h-4 w-4 text-gray-500" />
                      }
                    </div>
                    {isInvoiceSectionExpanded && (
                      <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100">
                        <div>
                          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                            Číslo faktury <span className="font-normal text-gray-400 text-xs">(nech prázdné → doplníš později)</span>
                          </label>
                          <Input
                            value={invoiceData.invoiceNumber}
                            onChange={e => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                            placeholder="např. FA-2025-001"
                          />
                          <p className="text-xs text-gray-400 mt-1.5">💡 Pokud nemáš číslo faktury, nech prázdné. Vytvoří se dočasná faktura.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Datum faktury</label>
                            <Input type="date" value={invoiceData.invoiceDate} onChange={e => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                              Splatnost <span className="font-normal text-gray-400 text-xs">(vol.)</span>
                            </label>
                            <Input type="date" value={invoiceData.dueDate} onChange={e => setInvoiceData({ ...invoiceData, dueDate: e.target.value })} />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                            Poznámka <span className="font-normal text-gray-400 text-xs">(vol.)</span>
                          </label>
                          <textarea
                            value={invoiceData.note} onChange={e => setInvoiceData({ ...invoiceData, note: e.target.value })}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:ring-1 focus:ring-green-200 bg-white resize-none transition-all" rows={3}
                            placeholder="Volitelná poznámka k faktuře…"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Warning */}
              <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Po naskladnění se zboží přičte do skladu a objednávka se označí jako přijatá.&nbsp;
                  <strong className="font-semibold">Tato akce je nevratná.</strong>
                </p>
              </div>

            </div>

            {/* Sticky footer */}
            <div className="border-t border-gray-200 px-5 py-4 bg-white flex items-center justify-between gap-3 shrink-0">
              <Button variant="ghost" onClick={onClose} className="text-gray-600">Zrušit</Button>
              <Button
                onClick={onConfirm} disabled={isProcessing}
                className="px-7 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4 mr-2 inline" />
                {isProcessing ? '⏳ Zpracovávám…' : 'Zpracovat a naskladnit'}
              </Button>
            </div>
          </div>

          {/* RIGHT — supplier/order summary panel */}
          <div className="hidden lg:flex flex-col overflow-y-auto bg-gray-50/60 min-h-0">
            <div className="px-5 py-3 border-b border-gray-200 bg-white shrink-0">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Shrnutí objednávky</p>
            </div>
            <div className="flex-1 p-4">
              {supplierDetail ? (
                <SupplierOrderDetail
                  order={supplierDetail}
                  isVatPayer={isVatPayer}
                  showReceiptsSection={false}
                />
              ) : (
                <p className="text-sm text-gray-400 italic mt-4">Žádná objednávka nebyla vybrána.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
