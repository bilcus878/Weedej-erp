'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FileText, FileDown, Truck, CheckCircle, Clock,
  Package, ExternalLink, ShoppingBag, CreditCard,
  XCircle, RefreshCw, MapPin,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/lib/utils'
import { formatVariantQty } from '@/lib/formatVariantQty'

// ─── Typy ────────────────────────────────────────────────────────────────────

export interface OrderDetailItem {
  id: string
  productId?: string | null
  productName?: string | null
  quantity: number
  unit: string
  price: number         // bez DPH
  vatRate: number
  vatAmount: number
  priceWithVat: number  // s DPH
  product?: { id: string; name: string; price: number; unit: string } | null
}

export interface OrderDetailDeliveryNoteItem {
  id: string
  quantity: number
  unit: string
  productName?: string | null
  price?: number | null
  priceWithVat?: number | null
  vatRate?: number | null
  vatAmount?: number | null
  product?: { id: string; name: string; price: number } | null
}

export interface OrderDetailDeliveryNote {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status: string
  items: OrderDetailDeliveryNoteItem[]
}

export interface OrderDetailInvoice {
  id: string
  invoiceNumber: string
  paymentStatus: string  // 'paid' | 'unpaid'
  status: string
  invoiceDate: string
}

export interface OrderDetailData {
  id: string                          // eshop order ID — used for tracking API
  orderNumber: string                 // ESH... order number
  orderDate: string
  status: string
  totalAmount: number
  totalVatAmount?: number | null
  paidAt?: string | null
  shippedAt?: string | null
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  paymentReference?: string | null
  trackingNumber?: string | null
  carrier?: string | null
  stornoAt?: string | null
  stornoBy?: string | null
  stornoReason?: string | null
  discountAmount?: number | null
  note?: string | null
  // Shipping
  shippingMethod?: string | null
  pickupPointId?: string | null
  pickupPointName?: string | null
  pickupPointAddress?: string | null
  pickupPointCarrier?: string | null
  // Billing
  billingName?: string | null
  billingCompany?: string | null
  billingIco?: string | null
  billingStreet?: string | null
  billingCity?: string | null
  billingZip?: string | null
  billingCountry?: string | null
  items: OrderDetailItem[]
  issuedInvoice?: OrderDetailInvoice | null
  deliveryNotes?: OrderDetailDeliveryNote[]
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  order: OrderDetailData
  isVatPayer: boolean
  onPrintPdf?: () => void
  onCreateInvoice?: () => void
  onUpdateStatus?: (status: string) => void
  onRefresh?: () => Promise<void>
  processingInvoice?: boolean
  processingStatus?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3" /> Zaplaceno
        </span>
      )
    case 'shipped':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Truck className="w-3 h-3" /> Odesláno
        </span>
      )
    case 'delivered':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" /> Doručeno
        </span>
      )
    case 'cancelled':
    case 'storno':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" /> Zrušeno
        </span>
      )
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Truck className="w-3 h-3" /> Částečně odesláno
        </span>
      )
    case 'new':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Package className="w-3 h-3" /> Nová
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

function shippingMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    DPD_HOME:          'DPD — Doručení na adresu',
    DPD_PICKUP:        'DPD — Výdejní místo',
    ZASILKOVNA_HOME:   'Zásilkovna — Doručení na adresu',
    ZASILKOVNA_PICKUP: 'Zásilkovna — Výdejní místo / Z-BOX',
    COURIER:           'Kurýr',
    PICKUP_IN_STORE:   'Osobní odběr',
  }
  return labels[method] ?? method
}

// ─── Komponenta ───────────────────────────────────────────────────────────────

export function EshopOrderDetail({
  order,
  isVatPayer,
  onPrintPdf,
  onCreateInvoice,
  onUpdateStatus,
  onRefresh,
  processingInvoice,
  processingStatus,
}: Props) {
  const isCancelled = ['cancelled', 'storno'].includes(order.status)

  // Tracking state — managed internally per instance
  const [isEditingTracking, setIsEditingTracking] = useState(false)
  const [trackingForm, setTrackingForm] = useState({ trackingNumber: '', carrier: '' })
  const [savingTracking, setSavingTracking] = useState(false)

  const customerName = order.customerName || 'Zákazník'
  const hasTracking  = !!(order.trackingNumber || order.carrier)
  const carrierKey   = (order.pickupPointCarrier || order.carrier || '').toLowerCase()
  const trackingUrl  = order.trackingNumber
    ? carrierKey === 'zasilkovna'
      ? `https://www.zasilkovna.cz/sledovani-zasilky?barcode=${order.trackingNumber}`
      : carrierKey === 'dpd'
        ? `https://tracking.dpd.de/status/cs/parcel/${order.trackingNumber}`
        : null
    : null

  async function handleSaveTracking() {
    setSavingTracking(true)
    try {
      const res = await fetch(`/api/eshop-orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNumber: trackingForm.trackingNumber.trim() || null,
          carrier: trackingForm.carrier.trim() || null,
        }),
      })
      if (!res.ok) { alert('Nepodařilo se uložit tracking'); return }
      await onRefresh?.()
      setIsEditingTracking(false)
    } catch {
      alert('Chyba při ukládání trackingu')
    } finally {
      setSavingTracking(false)
    }
  }

  return (
    <div className="space-y-4">

      {/* ══ DETAIL ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ── A) Zákazník + Fakturační adresa ─────────────────────────────── */}
        <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
          <h4 className="font-bold text-sm text-gray-900 px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2 shrink-0">
            <ShoppingBag className="w-4 h-4 text-gray-500" />
            Zákazník / Odběratel
          </h4>
          <div className="flex-1 px-4 py-2.5 text-sm bg-white divide-y divide-gray-100">
            {/* Kontakt */}
            <div className="space-y-1.5 pb-2.5">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Jméno</span>
                <span className="font-semibold text-gray-900 text-right">{customerName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">E-mail</span>
                {order.customerEmail
                  ? <a href={`mailto:${order.customerEmail}`} className="font-medium text-blue-600 hover:underline text-right text-xs" onClick={e => e.stopPropagation()}>{order.customerEmail}</a>
                  : <span className="text-gray-400">—</span>}
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Telefon</span>
                <span className="font-medium text-gray-800 text-right">{order.customerPhone || <span className="text-gray-400">—</span>}</span>
              </div>
              {order.billingCompany && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Firma</span>
                  <span className="font-semibold text-gray-900 text-right">{order.billingCompany}</span>
                </div>
              )}
              {order.billingIco && (
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">IČO</span>
                  <span className="font-mono font-medium text-gray-800 text-right">{order.billingIco}</span>
                </div>
              )}
            </div>
            {/* Fakturační adresa — vždy viditelná */}
            <div className="space-y-1.5 pt-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5 flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                Fakturační adresa
              </p>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Příjemce</span>
                <span className="font-semibold text-gray-900 text-right">{order.billingCompany || order.billingName || customerName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Ulice</span>
                <span className="font-medium text-gray-800 text-right">{order.billingStreet || <span className="text-gray-400">—</span>}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Město / PSČ</span>
                <span className="font-medium text-gray-800 text-right">{[order.billingZip, order.billingCity].filter(Boolean).join(' ') || <span className="text-gray-400">—</span>}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Země</span>
                <span className="font-medium text-gray-800 text-right">{order.billingCountry || 'CZ'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── B) Shrnutí objednávky ────────────────────────────────────────── */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <h4 className="font-bold text-sm text-gray-900 px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-500" />
            Shrnutí objednávky
          </h4>
          <div className="px-4 py-2.5 text-sm bg-white space-y-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Objednávka</span>
              <span className="font-mono font-semibold text-gray-900 text-right">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Faktura</span>
              {order.issuedInvoice ? (
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${order.issuedInvoice.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {order.issuedInvoice.paymentStatus === 'paid' ? 'Zap.' : 'Nezap.'}
                  </span>
                  <Link
                    href={`/invoices/issued?highlight=${order.issuedInvoice.id}`}
                    className="font-mono font-semibold text-blue-600 hover:underline flex items-center gap-0.5 text-right"
                    onClick={e => e.stopPropagation()}
                  >
                    {order.issuedInvoice.invoiceNumber}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <span className="text-gray-400 text-xs italic">nevystavena</span>
              )}
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Status</span>
              <span>{getStatusBadge(order.status)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Objednáno</span>
              <span className="font-medium text-gray-800 text-right">{new Date(order.orderDate).toLocaleDateString('cs-CZ')}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Zaplaceno</span>
              <span className="font-medium text-gray-800 text-right">
                {order.paidAt ? new Date(order.paidAt).toLocaleDateString('cs-CZ') : <span className="text-gray-400">—</span>}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Odesláno</span>
              <span className="font-medium text-gray-800 text-right">
                {order.shippedAt
                  ? new Date(order.shippedAt).toLocaleDateString('cs-CZ')
                  : (order.deliveryNotes?.find(dn => dn.status === 'active')
                      ? new Date(order.deliveryNotes.find(dn => dn.status === 'active')!.deliveryDate).toLocaleDateString('cs-CZ')
                      : <span className="text-gray-400">—</span>)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Celkem</span>
              <span className="font-bold text-gray-900 text-right">{formatPrice(Number(order.totalAmount))}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Ref. platby</span>
              <span className="font-mono text-xs text-gray-500 text-right break-all">{order.paymentReference || <span className="text-gray-400">—</span>}</span>
            </div>
            {order.note && !order.note.startsWith('Platba:') && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-400 shrink-0 text-xs uppercase tracking-wide font-medium">Poznámka</span>
                <span className="font-medium text-gray-800 text-right">{order.note}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── C) Doručení ─────────────────────────────────────────────────── */}
        <div className="md:col-span-2 border border-gray-200 rounded-lg overflow-hidden">

          <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="font-bold text-sm text-gray-900">Doručení</span>
            </div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              hasTracking                                          ? 'bg-blue-100 text-blue-700'
              : ['shipped','delivered'].includes(order.status)    ? 'bg-green-100 text-green-700'
                                                                 : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hasTracking ? 'bg-blue-500' : ['shipped','delivered'].includes(order.status) ? 'bg-green-500' : 'bg-gray-400'}`} />
              {hasTracking ? 'Sledováno' : order.status === 'shipped' ? 'Odesláno' : order.status === 'delivered' ? 'Doručeno' : 'Čeká'}
            </span>
          </div>

          <div className="grid grid-cols-4 divide-x divide-gray-200 bg-white text-sm">

            {/* 1 — Způsob dopravy */}
            <div className="px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Způsob dopravy</p>
              <p className="font-semibold text-gray-900 text-sm leading-snug">
                {order.shippingMethod ? shippingMethodLabel(order.shippingMethod) : <span className="text-gray-400">—</span>}
              </p>
              {order.pickupPointCarrier && (
                <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  {order.pickupPointCarrier}
                </span>
              )}
            </div>

            {/* 2 — Destinace */}
            <div className="px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                {order.pickupPointId ? 'Výdejní místo' : 'Doručovací adresa'}
              </p>
              {order.pickupPointId ? (
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 w-8 h-8 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <Package className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 leading-tight">{order.pickupPointName || '—'}</p>
                    {order.pickupPointAddress && (
                      <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{order.pickupPointAddress}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">ID</span>
                      <code className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{order.pickupPointId}</code>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 w-8 h-8 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 leading-tight">{customerName}</p>
                    <p className="text-gray-500 text-xs mt-0.5 whitespace-pre-line leading-relaxed">{order.customerAddress || '—'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 3 — Mapa */}
            {order.pickupPointId && (order.pickupPointAddress || order.pickupPointName)
              ? (
                <div className="overflow-hidden">
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent((order.pickupPointAddress || order.pickupPointName)!)}&output=embed&z=16`}
                    className="w-full h-full min-h-[110px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Mapa výdejního místa"
                  />
                </div>
              ) : (
                <div />
              )
            }

            {/* 4 — Zásilka / tracking */}
            <div className="px-4 py-3 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Zásilka</p>

              {isEditingTracking ? (
                <div onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                    <input
                      type="text"
                      value={trackingForm.trackingNumber}
                      onChange={e => setTrackingForm(f => ({ ...f, trackingNumber: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveTracking(); if (e.key === 'Escape') setIsEditingTracking(false) }}
                      placeholder="Číslo zásilky…"
                      className="flex-1 min-w-0 text-xs font-mono bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
                      autoFocus
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={handleSaveTracking}
                        disabled={savingTracking}
                        className="px-2.5 py-1 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
                      >
                        {savingTracking ? '…' : 'Uložit'}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setIsEditingTracking(false) }}
                        className="px-2 py-1 text-gray-400 hover:text-gray-700 text-xs rounded-md transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1.5 ml-0.5">Enter pro uložení · Esc pro zrušení</p>
                </div>
              ) : hasTracking ? (
                <div className="space-y-1.5">
                  {order.trackingNumber && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-gray-800">{order.trackingNumber}</span>
                      <button
                        onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(order.trackingNumber!) }}
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                        title="Kopírovat"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {order.carrier && <p className="text-xs text-gray-500">{order.carrier}</p>}
                  <div className="flex items-center gap-2 pt-1.5">
                    {trackingUrl && (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Sledovat
                      </a>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setTrackingForm({ trackingNumber: order.trackingNumber || '', carrier: order.carrier || '' }); setIsEditingTracking(true) }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      Upravit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Zásilka nebyla předána dopravci.</p>
                  <button
                    onClick={e => { e.stopPropagation(); setTrackingForm({ trackingNumber: '', carrier: order.pickupPointCarrier || '' }); setIsEditingTracking(true) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Přidat tracking
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* ── Storno info ─────────────────────────────────────────────────────── */}
      {isCancelled && (order.stornoAt || order.stornoBy || order.stornoReason) && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <h4 className="font-bold text-sm text-red-700 px-4 py-2.5 bg-red-50 border-b border-red-200">Storno</h4>
          <div className="px-4 py-3 space-y-1.5 text-sm bg-white">
            <div className="flex justify-between gap-2">
              <span className="text-gray-500 shrink-0">Datum storna</span>
              <span className="font-medium">{order.stornoAt ? new Date(order.stornoAt).toLocaleDateString('cs-CZ') : '—'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500 shrink-0">Stornoval</span>
              <span className="font-medium">{order.stornoBy || '—'}</span>
            </div>
            {order.stornoReason && (
              <div className="flex justify-between gap-2">
                <span className="text-gray-500 shrink-0">Důvod</span>
                <span className="font-medium text-right">{order.stornoReason}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Položky ─────────────────────────────────────────────────────────── */}
      {order.items.length === 0 ? (
        <p className="text-red-600 text-sm">Objednávka nemá žádné položky!</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">
            Položky ({order.items.filter(i => i.productId !== null).length})
          </h4>
          <div className="text-sm">
            {isVatPayer ? (
              <div className="grid grid-cols-[3fr_repeat(6,1fr)] gap-2 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b text-xs">
                <div>Produkt</div>
                <div className="text-center">Množství</div>
                <div className="text-center">DPH</div>
                <div className="text-center">Cena/ks</div>
                <div className="text-center">DPH/ks</div>
                <div className="text-center">S DPH/ks</div>
                <div className="text-center">Celkem</div>
              </div>
            ) : (
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
                <div>Produkt</div>
                <div className="text-right">Množství</div>
                <div className="text-right">Cena za kus</div>
                <div className="text-right">Celkem</div>
              </div>
            )}

            {order.items
              .filter(item => item.productId !== null)
              .sort((a, b) => {
                const aShip = /(doprav|shipping)/i.test(a.productName || '') ? 1 : 0
                const bShip = /(doprav|shipping)/i.test(b.productName || '') ? 1 : 0
                return aShip - bShip
              })
              .map((item, i) => {
                const qty          = Number(item.quantity)
                const qtyDisplay   = formatVariantQty(qty, item.productName, item.unit)
                const unitPrice    = Number(item.price)
                const vatRate      = Number(item.vatRate)
                const vatPerUnit   = Number(item.vatAmount)
                const priceWithVat = Number(item.priceWithVat)
                const rawRowTotal  = priceWithVat * qty
                const rowTotal     = rawRowTotal > Number(order.totalAmount) * 1.05 ? priceWithVat : rawRowTotal

                return isVatPayer ? (
                  <div key={item.id} className={`grid grid-cols-[3fr_repeat(6,1fr)] gap-2 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-xs`}>
                    <div className="font-medium text-gray-900">{item.product?.name || item.productName}</div>
                    <div className="text-center text-gray-600">{qtyDisplay}</div>
                    <div className="text-center text-gray-500">{vatRate}%</div>
                    <div className="text-center text-gray-600">{formatPrice(unitPrice)}</div>
                    <div className="text-center text-gray-500">{formatPrice(vatPerUnit)}</div>
                    <div className="text-center text-gray-700">{formatPrice(priceWithVat)}</div>
                    <div className="text-center font-semibold text-gray-900">{formatPrice(rowTotal)}</div>
                  </div>
                ) : (
                  <div key={item.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <div className="font-medium text-gray-900">{item.product?.name || item.productName}</div>
                    <div className="text-right text-gray-600">{qtyDisplay}</div>
                    <div className="text-right text-gray-600">{formatPrice(priceWithVat)}</div>
                    <div className="text-right font-semibold text-gray-900">{formatPrice(rowTotal)}</div>
                  </div>
                )
              })}

            {/* Mezisoučty */}
            {(() => {
              const colGrid   = isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'
              const labelSpan = isVatPayer ? 'col-span-6' : 'col-span-3'
              const nullItems    = order.items.filter(item => item.productId === null)
              const shippingItem = nullItems.find(item => /(doprav|shipping)/i.test(item.productName || ''))
              const discountItem = nullItems.find(item => !/(doprav|shipping)/i.test(item.productName || ''))
              const catalogSubtotal = order.items
                .filter(item => item.productId !== null)
                .reduce((sum, item) => {
                  const pwv = Number(item.priceWithVat)
                  const raw = pwv * Number(item.quantity)
                  return sum + (raw > Number(order.totalAmount) * 1.05 ? pwv : raw)
                }, 0)
              const shippingTotal = shippingItem
                ? Number(shippingItem.priceWithVat ?? shippingItem.price ?? 0) * Number(shippingItem.quantity ?? 1)
                : 0
              const discountTotal = discountItem
                ? Number(discountItem.priceWithVat ?? discountItem.price ?? 0) * Number(discountItem.quantity ?? 1)
                : 0
              if (shippingTotal === 0 && discountTotal === 0) return null
              return (
                <>
                  <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-gray-50 border-t text-sm`}>
                    <div className={`${labelSpan} text-gray-600`}>Mezisoučet</div>
                    <div className={`${isVatPayer ? 'text-center' : 'text-right'} font-medium text-gray-800`}>{formatPrice(catalogSubtotal)}</div>
                  </div>
                  {shippingTotal !== 0 && (
                    <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-blue-50 border-t text-sm`}>
                      <div className={`${labelSpan} font-medium text-gray-900`}>{shippingItem?.productName || 'Doprava'}</div>
                      <div className={`${isVatPayer ? 'text-center' : 'text-right'} text-blue-700 font-medium`}>{formatPrice(shippingTotal)}</div>
                    </div>
                  )}
                  {discountTotal !== 0 && (
                    <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-yellow-50 border-t text-sm`}>
                      <div className={`${labelSpan} font-medium text-gray-900`}>{discountItem?.productName || 'Sleva'}</div>
                      <div className={`${isVatPayer ? 'text-center' : 'text-right'} text-red-600 font-medium`}>{formatPrice(discountTotal)}</div>
                    </div>
                  )}
                </>
              )
            })()}

            <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
              <div className={isVatPayer ? 'col-span-6' : 'col-span-3'}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
              <div className={isVatPayer ? 'text-center' : 'text-right'}>{formatPrice(Number(order.totalAmount))}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Výdejky ─────────────────────────────────────────────────────────── */}
      {(() => {
        const active = order.deliveryNotes?.filter(dn => dn.status === 'active') ?? []
        if (active.length === 0) return null
        return (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <h4 className="font-bold text-sm text-gray-900 px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Výdejky — vyskladněno ({active.length})
            </h4>
            <div className="text-sm">
              <div className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b text-xs">
                <div>Číslo</div>
                <div>Datum</div>
                <div className="text-center">Položek</div>
                <div className="text-right">Hodnota</div>
                <div className="w-4" />
              </div>
              {active.map(dn => {
                const dnTotal = dn.items.reduce((sum, item) => {
                  const hasSaved = item.price != null && item.priceWithVat != null
                  const unitPrice = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
                  const itemVatRate = hasSaved ? Number(item.vatRate ?? 21) : 21
                  const vatPerUnit = hasSaved ? Number(item.vatAmount ?? 0) : (itemVatRate === 0 ? 0 : unitPrice * itemVatRate / 100)
                  const priceWithVatPU = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
                  let packs = Number(item.quantity)
                  if (item.productName?.includes(' — ') && item.unit !== 'ks') {
                    const variantLabel = item.productName.split(' — ').slice(-1)[0]
                    const match = variantLabel.match(/^([\d.]+)/)
                    if (match) {
                      const packSize = parseFloat(match[1])
                      if (packSize > 0) packs = Math.round((packs / packSize) * 1000) / 1000
                    }
                  }
                  return sum + packs * (isVatPayer ? priceWithVatPU : unitPrice)
                }, 0)
                return (
                  <Link
                    key={dn.id}
                    href={`/delivery-notes?highlight=${dn.id}`}
                    className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-3 bg-white hover:bg-green-50 transition-colors items-center"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="font-medium text-green-700 hover:underline">{dn.deliveryNumber}</div>
                    <div className="text-gray-700">{new Date(dn.deliveryDate).toLocaleDateString('cs-CZ')}</div>
                    <div className="text-gray-700 text-center">{dn.items.length}</div>
                    <div className="font-semibold text-gray-900 text-right">{dnTotal.toLocaleString('cs-CZ')} Kč</div>
                    <div className="flex justify-end"><ExternalLink className="w-4 h-4 text-green-600" /></div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Footer: akce ────────────────────────────────────────────────────── */}
      {(onPrintPdf || onCreateInvoice || onUpdateStatus) && (
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
          {onCreateInvoice && !order.issuedInvoice && !isCancelled && (
            <button
              onClick={e => { e.stopPropagation(); onCreateInvoice() }}
              disabled={processingInvoice}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-3.5 h-3.5" />
              {processingInvoice ? 'Vytváří se...' : 'Vystavit fakturu'}
            </button>
          )}
          {onUpdateStatus && (order.status === 'paid' || order.status === 'processing') && !order.deliveryNotes?.some(dn => dn.status === 'active') && (
            <Link
              href="/delivery-notes"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <Package className="w-3.5 h-3.5" />
              Vyskladnit
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
          {onUpdateStatus && order.status === 'shipped' && (
            <button
              onClick={e => { e.stopPropagation(); onUpdateStatus('delivered') }}
              disabled={processingStatus}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {processingStatus ? 'Zpracovává se...' : 'Doručeno'}
            </button>
          )}
          {onUpdateStatus && ['paid', 'shipped'].includes(order.status) && (
            <button
              onClick={e => {
                e.stopPropagation()
                if (confirm(`Opravdu zrušit objednávku ${order.orderNumber}?`)) onUpdateStatus('cancelled')
              }}
              disabled={processingStatus}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 text-xs font-medium rounded-lg transition-colors border border-red-200 disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Zrušit
            </button>
          )}
        </div>
      </div>
      )}

    </div>
  )
}
