'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FileText, FileDown, Truck, CheckCircle, Clock,
  Package, ExternalLink, Building2, CreditCard,
  XCircle,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupplierOrderDetailItem {
  id: string
  productId?: string | null
  productName?: string | null
  quantity: number
  alreadyReceivedQuantity?: number
  unit: string
  price: number
  vatRate: number
  vatAmount: number
  priceWithVat: number
  product?: { id: string; name: string; price: number; unit: string } | null
}

export interface SupplierOrderDetailReceiptItem {
  id: string
  quantity: number
  receivedQuantity?: number
  unit: string
  productName?: string | null
  purchasePrice: number
  productId?: string | null
  inventoryItemId?: string | null
  product?: { id?: string; name: string } | null
}

export interface SupplierOrderDetailReceipt {
  id: string
  receiptNumber: string
  receiptDate: string
  status: string
  items: SupplierOrderDetailReceiptItem[]
}

export interface SupplierOrderDetailInvoice {
  id: string
  invoiceNumber: string
  paymentStatus?: string
  status: string
  invoiceDate: string
}

export interface SupplierOrderDetailData {
  id: string
  orderNumber: string
  orderDate: string
  status: string
  totalAmount: number
  expectedDate?: string | null
  supplierName?: string | null
  supplierEmail?: string | null
  supplierPhone?: string | null
  supplierAddress?: string | null
  supplierContactPerson?: string | null
  supplierEntityType?: string | null
  supplierICO?: string | null
  supplierDIC?: string | null
  supplierBankAccount?: string | null
  supplierWebsite?: string | null
  paymentType?: string | null
  dueDate?: string | null
  variableSymbol?: string | null
  stornoAt?: string | null
  stornoBy?: string | null
  stornoReason?: string | null
  discountAmount?: number | null
  note?: string | null
  items: SupplierOrderDetailItem[]
  receivedInvoice?: SupplierOrderDetailInvoice | null
  receipts?: SupplierOrderDetailReceipt[]
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  order: SupplierOrderDetailData
  isVatPayer: boolean
  orderHref?: string
  onPrintPdf?: () => void
  onUpdateStatus?: (status: string) => void
  onRefresh?: () => Promise<void>
  processingStatus?: boolean
  showReceiptsSection?: boolean
  showPaymentSection?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3" /> Čeká
        </span>
      )
    case 'confirmed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CheckCircle className="w-3 h-3" /> Potvrzena
        </span>
      )
    case 'partially_received':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <Truck className="w-3 h-3" /> Částečně přijata
        </span>
      )
    case 'received':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" /> Přijata
        </span>
      )
    case 'storno':
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" /> STORNO
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>
      )
  }
}

function paymentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    cash:          'Hotovost',
    card:          'Platební karta',
    transfer:      'Bankovní převod',
    bank_transfer: 'Bankovní převod',
  }
  return labels[type] ?? type
}

// Matches the SideRow / SideCard pattern from the new form components
function SRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className={`text-right text-xs text-gray-700 ${mono ? 'font-mono font-semibold' : ''}`}>{value}</span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SupplierOrderDetail({
  order,
  isVatPayer,
  orderHref,
  onPrintPdf,
  onUpdateStatus,
  onRefresh: _onRefresh,
  processingStatus,
  showReceiptsSection = true,
  showPaymentSection  = true,
}: Props) {
  const isCancelled = ['storno', 'cancelled'].includes(order.status)
  const supplierName = order.supplierName || 'Dodavatel'
  const hasReceipts  = (order.receipts?.filter(r => r.status !== 'storno') ?? []).length > 0
  const [showAllReceipts, setShowAllReceipts] = useState(false)

  const inventoryLookup: Record<string, string> = {}
  for (const receipt of order.receipts || []) {
    for (const ri of receipt.items) {
      if (ri.productId && ri.inventoryItemId) {
        inventoryLookup[ri.productId] = ri.inventoryItemId
      }
    }
  }

  const firstReceiptDate = order.receipts?.find(r => r.status !== 'storno')?.receiptDate

  return (
    <div className="space-y-4">

      {/* ══ Top 2-column card grid ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── A) Dodavatel ─────────────────────────────────────────────────── */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Building2 className="w-4 h-4 text-gray-300" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
              {order.supplierEntityType === 'individual' ? 'Fyzická osoba' : 'Dodavatel'}
            </span>
          </div>
          <div className="px-4 py-4 text-sm">
            <p className="font-semibold text-gray-900 leading-snug mb-0.5">{supplierName}</p>
            {order.supplierAddress && (
              <p className="text-xs text-gray-500 mb-3">{order.supplierAddress}</p>
            )}

            {/* Contact */}
            <div className="space-y-1.5">
              {order.supplierContactPerson && (
                <SRow label="Kontakt" value={order.supplierContactPerson} />
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400 shrink-0">E-mail</span>
                {order.supplierEmail
                  ? <a href={`mailto:${order.supplierEmail}`} className="text-xs text-blue-600 hover:underline text-right" onClick={e => e.stopPropagation()}>{order.supplierEmail}</a>
                  : <span className="text-xs text-gray-400">—</span>}
              </div>
              <SRow label="Telefon" value={order.supplierPhone || '—'} />
            </div>

            {/* Business data */}
            {(order.supplierICO || order.supplierDIC || order.supplierBankAccount || order.supplierWebsite) ? (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                {order.supplierICO        && <SRow label="IČO"      value={order.supplierICO}        mono />}
                {order.supplierDIC        && <SRow label="DIČ"      value={order.supplierDIC}        mono />}
                {order.supplierBankAccount && <SRow label="Číslo účtu" value={order.supplierBankAccount} mono />}
                {order.supplierWebsite    && <SRow label="Web"      value={order.supplierWebsite} />}
              </div>
            ) : (
              <p className="mt-3 text-xs text-gray-400 italic">Firemní údaje nejsou k dispozici</p>
            )}
          </div>
        </div>

        {/* ── B) Shrnutí ───────────────────────────────────────────────────── */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <CreditCard className="w-4 h-4 text-gray-300" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Shrnutí</span>
          </div>
          <div className="px-4 py-4 text-sm space-y-1.5">

            {/* Document reference */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400 shrink-0">{orderHref ? 'Faktura' : 'Objednávka'}</span>
              {orderHref ? (
                <Link
                  href={orderHref}
                  className="text-xs font-mono font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
                  onClick={e => e.stopPropagation()}
                >
                  {order.orderNumber}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ) : (
                <span className="text-xs font-mono font-semibold text-gray-700">{order.orderNumber}</span>
              )}
            </div>

            {/* Invoice link — shown only in PO context */}
            {!orderHref && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400 shrink-0">Faktura</span>
                {order.receivedInvoice ? (
                  <Link
                    href={`/invoices/received?highlight=${order.receivedInvoice.id}`}
                    className="text-xs font-mono font-semibold text-blue-600 hover:underline flex items-center gap-0.5"
                    onClick={e => e.stopPropagation()}
                  >
                    {order.receivedInvoice.invoiceNumber}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="text-xs text-gray-400 italic">nevystavena</span>
                )}
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400 shrink-0">Status</span>
              <span>{getStatusBadge(order.status)}</span>
            </div>

            {/* Dates */}
            <div className="pt-2 mt-1 border-t border-gray-100 space-y-1.5">
              <SRow label="Objednáno"         value={new Date(order.orderDate).toLocaleDateString('cs-CZ')} />
              <SRow label="Očekávané dodání"   value={order.expectedDate ? new Date(order.expectedDate).toLocaleDateString('cs-CZ') : '—'} />
              <SRow label="Přijato"            value={firstReceiptDate ? new Date(firstReceiptDate).toLocaleDateString('cs-CZ') : '—'} />
            </div>

            {/* Payment info — only when Platba section is hidden (invoice context) */}
            {!showPaymentSection && (order.paymentType || order.dueDate || order.variableSymbol) && (
              <div className="pt-2 mt-1 border-t border-gray-100 space-y-1.5">
                {order.paymentType    && <SRow label="Forma úhrady" value={paymentTypeLabel(order.paymentType)} />}
                {order.dueDate        && <SRow label="Splatnost"    value={new Date(order.dueDate).toLocaleDateString('cs-CZ')} />}
                {order.variableSymbol && <SRow label="VS"           value={order.variableSymbol} mono />}
              </div>
            )}

            {/* Total + note */}
            <div className="pt-2 mt-1 border-t border-gray-100 space-y-1.5">
              {order.note && <SRow label="Poznámka" value={order.note} />}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Celkem</span>
                <span className="font-bold text-gray-900 text-base">{formatPrice(Number(order.totalAmount))}</span>
              </div>
            </div>

            {/* Receipts */}
            {showReceiptsSection && (() => {
              const active = order.receipts?.filter(r => r.status !== 'storno') ?? []
              const visible = showAllReceipts ? active : active.slice(0, 2)
              const hiddenCount = active.length - 2
              return (
                <div className="flex justify-between items-start gap-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400 shrink-0 mt-0.5">Příjemky</span>
                  {active.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">Žádné příjemky</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {visible.map(receipt => {
                        const receiptTotal = receipt.items.reduce((sum, item) => {
                          const qty = item.receivedQuantity ?? item.quantity
                          return sum + Number(qty) * Number(item.purchasePrice)
                        }, 0)
                        return (
                          <Link
                            key={receipt.id}
                            href={`/receipts?highlight=${receipt.id}`}
                            className="inline-flex items-center px-2 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200 transition-colors whitespace-nowrap"
                            onClick={e => e.stopPropagation()}
                          >
                            {receipt.receiptNumber} · {new Date(receipt.receiptDate).toLocaleDateString('cs-CZ')} · {receipt.items.length} pol. · {Math.round(receiptTotal).toLocaleString('cs-CZ')} Kč
                          </Link>
                        )
                      })}
                      {!showAllReceipts && hiddenCount > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); setShowAllReceipts(true) }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                        >
                          a {hiddenCount} dalších →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* ── C) Platba a dodání — hidden for invoice context ──────────────── */}
        {showPaymentSection && (
          <div className="md:col-span-2 border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Platba a dodání</span>
              </div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                hasReceipts                    ? 'bg-green-100 text-green-700'
                : order.status === 'confirmed' ? 'bg-blue-100 text-blue-700'
                :                               'bg-gray-100 text-gray-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasReceipts ? 'bg-green-500' : order.status === 'confirmed' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                {hasReceipts ? 'Přijato' : order.status === 'confirmed' ? 'Potvrzeno' : 'Čeká'}
              </span>
            </div>

            <div className="grid grid-cols-3 divide-x divide-gray-100 bg-white text-sm">
              {/* 1 — Způsob platby */}
              <div className="px-4 py-3 space-y-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Způsob platby</p>
                  <p className="font-semibold text-gray-900 text-sm leading-snug">
                    {order.paymentType ? paymentTypeLabel(order.paymentType) : <span className="text-gray-400">—</span>}
                  </p>
                </div>
                {order.dueDate && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Datum splatnosti</p>
                    <p className="font-medium text-gray-800 text-sm">{new Date(order.dueDate).toLocaleDateString('cs-CZ')}</p>
                  </div>
                )}
              </div>
              {/* 2 — Variabilní symboly */}
              <div className="px-4 py-3 space-y-3">
                {order.variableSymbol ? (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Variabilní symbol</p>
                    <p className="font-mono font-medium text-gray-800 text-sm">{order.variableSymbol}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Platební symboly</p>
                    <p className="text-xs text-gray-400 italic">Nevyplněno</p>
                  </div>
                )}
              </div>
              {/* 3 — Stav dodání */}
              <div className="px-4 py-3 space-y-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Stav dodání</p>
                  <div className="space-y-1.5">
                    {order.expectedDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 shrink-0">Očekáváno</span>
                        <span className="font-medium text-gray-700 text-xs">{new Date(order.expectedDate).toLocaleDateString('cs-CZ')}</span>
                      </div>
                    )}
                    {hasReceipts ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 shrink-0">Přijato</span>
                        <span className="font-semibold text-green-700 text-xs">
                          {new Date(order.receipts!.find(r => r.status !== 'storno')!.receiptDate).toLocaleDateString('cs-CZ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Čeká na příjem</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Storno info ─────────────────────────────────────────────────────── */}
      {isCancelled && (order.stornoAt || order.stornoBy || order.stornoReason) && (
        <div className="border border-red-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100 bg-red-50">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-red-600">Storno</span>
          </div>
          <div className="px-4 py-3 space-y-1.5 text-sm bg-white">
            <SRow label="Datum storna" value={order.stornoAt ? new Date(order.stornoAt).toLocaleDateString('cs-CZ') : '—'} />
            <SRow label="Stornoval"    value={order.stornoBy || '—'} />
            {order.stornoReason && <SRow label="Důvod" value={order.stornoReason} />}
          </div>
        </div>
      )}

      {/* ── Položky ─────────────────────────────────────────────────────────── */}
      {order.items.length === 0 ? (
        <p className="text-gray-500 text-sm italic">Objednávka nemá žádné položky.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
            <Package className="w-4 h-4 text-gray-300" />
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Položky ({order.items.length})
            </span>
          </div>
          <div className="text-sm">
            {isVatPayer ? (
              <div className="grid grid-cols-[3fr_0.7fr_repeat(8,1fr)] gap-2 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b text-xs">
                <div>Produkt</div>
                <div className="text-center">Pohyb</div>
                <div className="text-center">Obj.</div>
                <div className="text-center">Přijato</div>
                <div className="text-center">Zbývá</div>
                <div className="text-center">DPH</div>
                <div className="text-center">Cena/ks</div>
                <div className="text-center">DPH/ks</div>
                <div className="text-center">S DPH/ks</div>
                <div className="text-center">Celkem</div>
              </div>
            ) : (
              <div className="grid grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
                <div>Produkt</div>
                <div className="text-center">Pohyb</div>
                <div className="text-right">Objednáno</div>
                <div className="text-right">Přijato</div>
                <div className="text-right">Zbývá</div>
                <div className="text-right">Cena/ks</div>
                <div className="text-right">Celkem</div>
              </div>
            )}

            {order.items.map((item, i) => {
              const ordered   = Number(item.quantity)
              const received  = Number(item.alreadyReceivedQuantity ?? 0)
              const remaining = ordered - received
              const unitPrice = Number(item.price)
              const vatRate   = Number(item.vatRate)
              const vatPerUnit   = Number(item.vatAmount)
              const priceWithVat = Number(item.priceWithVat)
              const rowTotal     = ordered * priceWithVat

              let bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              if (received >= ordered && ordered > 0) bg = 'bg-green-50'
              else if (received > 0) bg = 'bg-orange-50'

              const invMovId = item.productId ? (inventoryLookup[item.productId] ?? null) : null
              const invLink = item.productId == null
                ? <span className="text-gray-300 text-xs">—</span>
                : invMovId
                  ? <Link href={`/inventory?selectedProduct=${item.productId}&highlightMovement=${invMovId}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-md shadow-sm border border-green-200 transition-colors" onClick={e => e.stopPropagation()}>Zobrazit</Link>
                  : <span className="text-xs text-gray-400 italic">Čeká na příjemku</span>

              return isVatPayer ? (
                <div key={item.id} className={`grid grid-cols-[3fr_0.7fr_repeat(8,1fr)] gap-2 px-4 py-2 ${bg} text-xs`}>
                  <div className="font-medium text-gray-900">{item.product?.name || item.productName}</div>
                  <div className="text-center">{invLink}</div>
                  <div className="text-center text-gray-600">{ordered} {item.unit}</div>
                  <div className="text-center font-medium" style={{ color: received > 0 ? '#10b981' : '#6b7280' }}>{received} {item.unit}</div>
                  <div className="text-center font-medium" style={{ color: remaining === 0 ? '#10b981' : remaining < ordered ? '#f59e0b' : '#374151' }}>{remaining.toFixed(3)} {item.unit}</div>
                  <div className="text-center text-gray-500">{vatRate}%</div>
                  <div className="text-center text-gray-600">{formatPrice(unitPrice)}</div>
                  <div className="text-center text-gray-500">{formatPrice(vatPerUnit)}</div>
                  <div className="text-center text-gray-700">{formatPrice(priceWithVat)}</div>
                  <div className="text-center font-semibold text-gray-900">{formatPrice(rowTotal)}</div>
                </div>
              ) : (
                <div key={item.id} className={`grid grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2 ${bg}`}>
                  <div className="font-medium text-gray-900">{item.product?.name || item.productName}</div>
                  <div className="text-center">{invLink}</div>
                  <div className="text-right text-gray-600">{ordered} {item.unit}</div>
                  <div className="text-right font-medium" style={{ color: received > 0 ? '#10b981' : '#6b7280' }}>{received} {item.unit}</div>
                  <div className="text-right font-medium" style={{ color: remaining === 0 ? '#10b981' : remaining < ordered ? '#f59e0b' : '#374151' }}>{remaining.toFixed(3)} {item.unit}</div>
                  <div className="text-right text-gray-600">{formatPrice(unitPrice)}</div>
                  <div className="text-right font-semibold text-gray-900">{formatPrice(ordered * unitPrice)}</div>
                </div>
              )
            })}

            {/* Subtotals */}
            {(() => {
              const colGrid   = isVatPayer ? 'grid-cols-[3fr_0.7fr_repeat(8,1fr)]' : 'grid-cols-[2fr_0.7fr_1fr_1fr_1fr_1fr_1fr]'
              const labelSpan = isVatPayer ? 'col-span-9' : 'col-span-6'
              const subtotal  = order.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.priceWithVat), 0)
              if (!order.discountAmount || order.discountAmount <= 0) {
                return (
                  <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                    <div className={labelSpan}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                    <div className={isVatPayer ? 'text-center' : 'text-right'}>{formatPrice(Number(order.totalAmount))}</div>
                  </div>
                )
              }
              return (
                <>
                  <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-gray-50 border-t text-sm`}>
                    <div className={`${labelSpan} text-gray-600`}>Mezisoučet</div>
                    <div className={`${isVatPayer ? 'text-center' : 'text-right'} font-medium text-gray-700`}>{formatPrice(subtotal)}</div>
                  </div>
                  <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-yellow-50 text-sm`}>
                    <div className={`${labelSpan} font-medium text-gray-900`}>Sleva dodavatele</div>
                    <div className={`${isVatPayer ? 'text-center' : 'text-right'} font-medium text-red-600`}>-{formatPrice(order.discountAmount)}</div>
                  </div>
                  <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                    <div className={labelSpan}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                    <div className={isVatPayer ? 'text-center' : 'text-right'}>{formatPrice(Number(order.totalAmount))}</div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── Footer: akce ────────────────────────────────────────────────────── */}
      {(onPrintPdf || onUpdateStatus) && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div>
            {onPrintPdf && (
              <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); onPrintPdf() }}>
                <FileDown className="w-4 h-4 mr-1" />
                Zobrazit PDF
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {onUpdateStatus && order.status === 'pending' && (
              <button
                onClick={e => { e.stopPropagation(); onUpdateStatus('confirmed') }}
                disabled={processingStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {processingStatus ? 'Zpracovává se...' : 'Potvrdit'}
              </button>
            )}
            {onUpdateStatus && ['confirmed', 'partially_received'].includes(order.status) && (
              <Link
                href="/receipts"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <Package className="w-3.5 h-3.5" />
                Příjemka
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            {onUpdateStatus && ['pending', 'confirmed'].includes(order.status) && (
              <button
                onClick={e => {
                  e.stopPropagation()
                  if (confirm(`Opravdu stornovat objednávku ${order.orderNumber}?`)) onUpdateStatus('storno')
                }}
                disabled={processingStatus}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 text-xs font-medium rounded-lg transition-colors border border-red-200 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                Storno
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
