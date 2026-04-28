'use client'

import { useState } from 'react'
import { Package, Building2, ChevronDown, ChevronRight, FlaskConical } from 'lucide-react'
import Input from '@/components/ui/Input'
import { formatPrice } from '@/lib/utils'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import { BatchFormFields } from '@/features/batches'
import { emptyBatchFormData, type BatchFormData } from '@/features/batches/types'
import type { ReceiptItem, InvoiceData } from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pending:            { bg: 'bg-yellow-50',  text: 'text-yellow-700', label: 'Čeká'              },
    confirmed:          { bg: 'bg-blue-50',    text: 'text-blue-700',   label: 'Potvrzena'         },
    partially_received: { bg: 'bg-orange-50',  text: 'text-orange-700', label: 'Částečně přijata'  },
    received:           { bg: 'bg-green-50',   text: 'text-green-700',  label: 'Přijata'           },
    storno:             { bg: 'bg-red-50',     text: 'text-red-700',    label: 'Storno'            },
    cancelled:          { bg: 'bg-red-50',     text: 'text-red-700',    label: 'Zrušena'           },
  }
  const s = map[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: status }
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isVatPayer:               boolean
  processingOrderId:        string | null
  processingOrder?:         any
  processingReceiptItems:   ReceiptItem[]
  receivedQuantities:       Record<string, number>
  setReceivedQuantities:    (q: Record<string, number>) => void
  batchData:                Record<string, BatchFormData>
  setBatchData:             (d: Record<string, BatchFormData>) => void
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

// ─── Component ───────────────────────────────────────────────────────────────

export function ProcessReceiptModal({
  isVatPayer, processingOrderId, processingOrder,
  processingReceiptItems, receivedQuantities, setReceivedQuantities,
  batchData, setBatchData,
  invoiceData, setInvoiceData,
  processReceiptDate, setProcessReceiptDate,
  hasExistingInvoice, isInvoiceSectionExpanded, setIsInvoiceSectionExpanded,
  isProcessing, onConfirm, onClose,
}: Props) {
  const o        = processingOrder
  const supplier = o?.supplier

  const [expandedBatchItems, setExpandedBatchItems] = useState<Set<string>>(new Set())
  function toggleBatchItem(id: string) {
    setExpandedBatchItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Running total across currently entered received quantities
  const total = processingReceiptItems.reduce((sum, item: any) => {
    const r   = receivedQuantities[item.id!] || 0
    const up  = Number(item.purchasePrice || 0)
    const vr  = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
    const inv = isNonVatPayer(vr)
    const vpu = (isVatPayer && !inv) ? up * vr / 100 : 0
    return sum + r * (isVatPayer ? up + vpu : up)
  }, 0)

  // Receipt date validation
  const today    = new Date()
  const selDate  = new Date(processReceiptDate)
  const dateDiff = Math.floor((today.getTime() - selDate.getTime()) / (1000 * 60 * 60 * 24))
  const dateError   = selDate > today
  const dateWarning = !dateError && dateDiff > 30

  return (
    <div className="fixed inset-0 bg-black/60 flex items-stretch justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-gray-50 rounded-none sm:rounded-xl shadow-2xl w-full max-w-[1440px] sm:my-4 flex flex-col sm:max-h-[calc(100vh-2rem)] overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {processingOrderId ? 'Přímé naskladnění z objednávky' : 'Zpracovat příjemku'}
            </h2>
            <p className="text-sm text-gray-400">
              Zkontroluj dodavatele · potvrď množství · příjmi zboží na sklad
            </p>
            <p className="text-xs text-gray-300 mt-0.5">
              Po potvrzení bude sklad automaticky upraven.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* ── 2-column body ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[7fr_3fr] overflow-hidden">

          {/* ════ LEFT — receipt workflow ════════════════════════════════════════ */}
          <div className="flex flex-col overflow-y-auto min-h-0 bg-white border-r border-gray-200">
            <div className="flex-1 px-6 py-6 space-y-8">

              {/* 1. Items ────────────────────────────────────────────────────── */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                  Položky k naskladnění
                </p>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                          <th className="text-left  px-4 py-3">Produkt</th>
                          <th className="text-right px-3 py-3 whitespace-nowrap">Objednáno</th>
                          {processingOrderId && (
                            <th className="text-right px-3 py-3 whitespace-nowrap">Přijato</th>
                          )}
                          <th className="text-right px-3 py-3 whitespace-nowrap text-green-600">Nyní přijmout</th>
                          <th className="text-right px-3 py-3 whitespace-nowrap">
                            {isVatPayer ? 'Bez DPH/ks' : 'Cena/ks'}
                          </th>
                          {isVatPayer && (
                            <th className="text-right px-3 py-3 whitespace-nowrap text-blue-500">S DPH/ks</th>
                          )}
                          <th className="text-right px-3 py-3 whitespace-nowrap">Celkem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {processingReceiptItems.map((item: any) => {
                          const received        = receivedQuantities[item.id!] || 0
                          const unitPrice       = Number(item.purchasePrice || 0)
                          const itemVatRate     = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
                          const itemIsNonVat    = isNonVatPayer(itemVatRate)
                          const vatPerUnit      = (isVatPayer && !itemIsNonVat) ? unitPrice * itemVatRate / 100 : 0
                          const priceWithVat    = unitPrice + vatPerUnit
                          const rowTotal        = received * (isVatPayer ? priceWithVat : unitPrice)
                          const maxAllowed      = item.remainingQuantity || Number(item.quantity)
                          const alreadyReceived = item.alreadyReceived || 0
                          const itemBatch       = batchData[item.id!] ?? emptyBatchFormData()
                          const hasBatchNumber  = !!itemBatch.batchNumber.trim()
                          const batchOpen       = expandedBatchItems.has(item.id!) || hasBatchNumber

                          return (
                            <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{item.product?.name || item.productName || 'Neznámý produkt'}</p>
                                <button
                                  type="button"
                                  onClick={() => toggleBatchItem(item.id!)}
                                  className={`mt-1.5 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors ${
                                    hasBatchNumber
                                      ? 'bg-amber-100 text-amber-700 border-amber-300 font-semibold'
                                      : 'text-gray-400 border-gray-200 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50'
                                  }`}
                                >
                                  <FlaskConical className="w-3 h-3" />
                                  {hasBatchNumber ? itemBatch.batchNumber : '+ Šarže'}
                                </button>
                                {batchOpen && (
                                  <BatchFormFields
                                    value={itemBatch}
                                    onChange={v => setBatchData({ ...batchData, [item.id!]: v })}
                                  />
                                )}
                              </td>
                              <td className="text-right px-3 py-3 text-gray-500 whitespace-nowrap">
                                {Number(item.quantity)} {item.unit}
                              </td>
                              {processingOrderId && (
                                <td className="text-right px-3 py-3 text-gray-400 whitespace-nowrap">
                                  {alreadyReceived} {item.unit}
                                </td>
                              )}
                              <td className="text-right px-3 py-3 bg-green-50/40">
                                <div className="flex items-center justify-end gap-2">
                                  <input
                                    type="number"
                                    value={received || ''}
                                    onChange={e => {
                                      const v = e.target.value
                                      if (v === '') { setReceivedQuantities({ ...receivedQuantities, [item.id!]: '' as any }); return }
                                      const n = Number(v)
                                      if (n > maxAllowed || n < 0) { setReceivedQuantities({ ...receivedQuantities, [item.id!]: '' as any }); return }
                                      setReceivedQuantities({ ...receivedQuantities, [item.id!]: n })
                                    }}
                                    min="0" max={maxAllowed} step="1"
                                    className="w-16 px-2 py-1.5 border-2 border-green-200 bg-green-50/60 rounded-lg text-right font-semibold text-sm text-green-900 focus:border-green-400 focus:ring-1 focus:ring-green-100 focus:outline-none transition-colors"
                                  />
                                  <span className="text-gray-400 text-xs w-5">{item.unit}</span>
                                </div>
                                {processingOrderId && maxAllowed < Number(item.quantity) && (
                                  <p className="text-[10px] text-orange-500 mt-0.5 text-right">Max: {maxAllowed}</p>
                                )}
                              </td>
                              <td className="text-right px-3 py-3 text-gray-600 whitespace-nowrap">
                                {formatPrice(unitPrice)}
                              </td>
                              {isVatPayer && (
                                <td className="text-right px-3 py-3 whitespace-nowrap">
                                  {itemIsNonVat ? (
                                    <span className="text-gray-400">—</span>
                                  ) : (
                                    <div>
                                      <div className="font-medium text-blue-700">{formatPrice(priceWithVat)}</div>
                                      <div className="text-[10px] text-gray-400">+{itemVatRate}% ({formatPrice(vatPerUnit)})</div>
                                    </div>
                                  )}
                                </td>
                              )}
                              <td className="text-right px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                {formatPrice(rowTotal)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td
                            colSpan={processingOrderId ? (isVatPayer ? 5 : 4) : (isVatPayer ? 4 : 3)}
                            className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400"
                          >
                            Celkem
                          </td>
                          <td colSpan={2} className="text-right px-3 py-3 font-bold text-gray-900 text-base whitespace-nowrap">
                            {formatPrice(total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </section>

              {/* 2. Receipt date ─────────────────────────────────────────────── */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Datum příjmu</p>
                <div className="border border-gray-200 rounded-xl bg-white p-5 space-y-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Kdy zboží fyzicky dorazilo? <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={processReceiptDate}
                    onChange={e => setProcessReceiptDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="bg-white"
                  />
                  {dateError   && <p className="text-xs text-red-500 font-medium">⚠️ Datum nesmí být v budoucnosti</p>}
                  {dateWarning && <p className="text-xs text-orange-500 font-medium">⚠️ Datum je starší než 30 dní</p>}
                </div>
              </section>

              {/* 3. Invoice ──────────────────────────────────────────────────── */}
              {!hasExistingInvoice && (
                <section>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                    Faktura od dodavatele
                  </p>
                  <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setIsInvoiceSectionExpanded(!isInvoiceSectionExpanded)}
                    >
                      <div>
                        <span className="text-sm font-semibold text-gray-800">Údaje o faktuře</span>
                        <span className="ml-2 text-xs text-gray-400">(volitelné — klikni pro rozbalení)</span>
                      </div>
                      {isInvoiceSectionExpanded
                        ? <ChevronDown className="h-4 w-4 text-gray-400" />
                        : <ChevronRight className="h-4 w-4 text-gray-400" />
                      }
                    </div>
                    {isInvoiceSectionExpanded && (
                      <div className="px-4 pb-5 pt-1 space-y-4 border-t border-gray-100">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Číslo faktury <span className="font-normal text-gray-400">(nech prázdné → doplníš později)</span>
                          </label>
                          <Input
                            value={invoiceData.invoiceNumber}
                            onChange={e => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                            placeholder="např. FA-2025-001"
                          />
                          <p className="text-xs text-gray-400 mt-1.5">
                            💡 Pokud nemáš číslo faktury, nech prázdné. Vytvoří se dočasná faktura.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Datum faktury</label>
                            <Input
                              type="date"
                              value={invoiceData.invoiceDate}
                              onChange={e => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                              Splatnost <span className="font-normal text-gray-400">(vol.)</span>
                            </label>
                            <Input
                              type="date"
                              value={invoiceData.dueDate}
                              onChange={e => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Poznámka <span className="font-normal text-gray-400">(vol.)</span>
                          </label>
                          <textarea
                            value={invoiceData.note}
                            onChange={e => setInvoiceData({ ...invoiceData, note: e.target.value })}
                            rows={3}
                            placeholder="Volitelná poznámka k faktuře…"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-gray-300 focus:ring-1 focus:ring-gray-100 focus:outline-none bg-white resize-none transition-colors"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

            </div>

            {/* Sticky footer ────────────────────────────────────────────────── */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white flex items-center justify-between gap-4 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Zrušit
              </button>
              <button
                onClick={onConfirm}
                disabled={isProcessing}
                className="flex items-center gap-2 px-7 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Package className="w-4 h-4" />
                {isProcessing ? 'Zpracovávám…' : 'Zpracovat a naskladnit'}
              </button>
            </div>
          </div>

          {/* ════ RIGHT — supplier & order summary ══════════════════════════════ */}
          <div className="hidden lg:flex flex-col gap-3 p-4 overflow-y-auto bg-gray-50 min-h-0">

            {/* Card 1 — Supplier ───────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Building2 className="w-4 h-4 text-gray-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Dodavatel</span>
              </div>
              <div className="px-4 py-4 space-y-4 text-sm">

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-1.5">Název</p>
                  <p className="font-semibold text-gray-900 leading-snug">
                    {supplier?.name || o?.supplierName || '—'}
                  </p>
                </div>

                {(supplier?.email || supplier?.phone) && (
                  <>
                    <hr className="border-gray-100" />
                    <div className="space-y-1.5">
                      {supplier?.email && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-0.5">E-mail</p>
                          <a
                            href={`mailto:${supplier.email}`}
                            className="text-blue-600 hover:underline text-xs"
                            onClick={e => e.stopPropagation()}
                          >
                            {supplier.email}
                          </a>
                        </div>
                      )}
                      {supplier?.phone && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-0.5">Telefon</p>
                          <p className="text-gray-700 text-xs">{supplier.phone}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {(supplier?.ico || supplier?.dic || supplier?.address) && (
                  <>
                    <hr className="border-gray-100" />
                    <div className="space-y-1.5">
                      {supplier?.ico && (
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">IČO</span>
                          <span className="font-mono text-xs text-gray-700">{supplier.ico}</span>
                        </div>
                      )}
                      {supplier?.dic && (
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">DIČ</span>
                          <span className="font-mono text-xs text-gray-700">{supplier.dic}</span>
                        </div>
                      )}
                      {supplier?.address && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-0.5">Adresa</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{supplier.address}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {!supplier && !o?.supplierName && (
                  <p className="text-xs text-gray-400 italic">Žádný dodavatel nebyl vybrán.</p>
                )}

              </div>
            </div>

            {/* Card 2 — Order ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Package className="w-4 h-4 text-gray-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Objednávka</span>
              </div>
              <div className="px-4 py-4 space-y-3 text-sm">

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400">Číslo</span>
                  <span className="font-mono font-semibold text-gray-900">{o?.orderNumber || '—'}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400">Status</span>
                  <OrderStatusBadge status={o?.status || ''} />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400">Vytvořeno</span>
                  <span className="text-gray-700">
                    {o?.orderDate ? new Date(o.orderDate).toLocaleDateString('cs-CZ') : '—'}
                  </span>
                </div>

                {o?.expectedDate && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">Očekáváno</span>
                    <span className="text-gray-700">
                      {new Date(o.expectedDate).toLocaleDateString('cs-CZ')}
                    </span>
                  </div>
                )}

                {o?.invoice && (
                  <>
                    <hr className="border-gray-100" />
                    {o.invoice.paymentType && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-400">Platba</span>
                        <span className="text-xs text-gray-700 font-medium">
                          {{ cash: 'Hotovost', card: 'Karta', transfer: 'Převod' }[o.invoice.paymentType as string] ?? o.invoice.paymentType}
                        </span>
                      </div>
                    )}
                    {o.invoice.dueDate && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-400">Splatnost</span>
                        <span className="text-gray-700">
                          {new Date(o.invoice.dueDate).toLocaleDateString('cs-CZ')}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <hr className="border-gray-100" />
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Celkem</span>
                  <span className="font-bold text-gray-900 text-lg">{formatPrice(total)}</span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
