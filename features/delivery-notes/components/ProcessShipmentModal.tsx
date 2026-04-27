'use client'

import { useState } from 'react'
import { Package, Truck, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import type { DeliveryNoteItem, CustomerOrder } from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CARRIERS = ['Zásilkovna', 'DPD', 'PPL', 'Česká pošta', 'GLS', 'DHL', 'Kurýr']

const SHIPPING_LABELS: Record<string, string> = {
  DPD_HOME:          'DPD — Doručení na adresu',
  DPD_PICKUP:        'DPD — Výdejní místo',
  ZASILKOVNA_HOME:   'Zásilkovna — Doručení na adresu',
  ZASILKOVNA_PICKUP: 'Zásilkovna — Výdejní místo / Z-BOX',
  COURIER:           'Kurýr',
  PICKUP_IN_STORE:   'Osobní odběr',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    paid:        { bg: 'bg-yellow-50',  text: 'text-yellow-700', label: 'Zaplaceno'       },
    processing:  { bg: 'bg-blue-50',    text: 'text-blue-700',   label: 'Připravuje se'   },
    shipped:     { bg: 'bg-purple-50',  text: 'text-purple-700', label: 'Odesláno'        },
    delivered:   { bg: 'bg-green-50',   text: 'text-green-700',  label: 'Doručeno'        },
    cancelled:   { bg: 'bg-red-50',     text: 'text-red-700',    label: 'Zrušeno'         },
    storno:      { bg: 'bg-red-50',     text: 'text-red-700',    label: 'Storno'          },
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
  isVatPayer:           boolean
  isCustomerOrder:      boolean
  processingOrder?:     CustomerOrder | null
  processingNoteItems:  DeliveryNoteItem[]
  shippedQuantities:    Record<string, number>
  setShippedQuantities: (q: Record<string, number>) => void
  processNote:          string
  setProcessNote:       (n: string) => void
  isProcessing:         boolean
  onConfirm:            () => Promise<void>
  onClose:              () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProcessShipmentModal({
  isVatPayer, isCustomerOrder, processingOrder,
  processingNoteItems, shippedQuantities, setShippedQuantities,
  processNote, setProcessNote,
  isProcessing, onConfirm, onClose,
}: Props) {
  const o = processingOrder as any

  // Tracking — saved automatically as part of dispatch
  const [carrier,     setCarrier]     = useState<string>(o?.carrier || o?.pickupPointCarrier || '')
  const [trackingNum, setTrackingNum] = useState<string>(o?.trackingNumber || '')
  const [showMap,     setShowMap]     = useState(false)

  const isEshopOrder = processingOrder?.orderNumber?.startsWith('ESH')

  // Saves tracking then dispatches. Tracking failure is non-blocking.
  async function handleDispatch() {
    if (isEshopOrder && processingOrder?.id && (trackingNum.trim() || carrier.trim())) {
      try {
        await fetch(`/api/eshop-orders/${processingOrder.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackingNumber: trackingNum.trim() || null,
            carrier: carrier.trim() || null,
          }),
        })
      } catch {
        // non-blocking — dispatch proceeds regardless
      }
    }
    await onConfirm()
  }

  // Totals
  const total = processingNoteItems.reduce((sum, item) => {
    const s     = shippedQuantities[item.id!] || 0
    const saved = item.price != null && item.priceWithVat != null
    const up    = saved ? Number(item.price) : Number(item.product?.price || 0)
    const vr    = saved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
    const nv    = isNonVatPayer(vr)
    const vpu   = saved ? Number(item.vatAmount ?? 0) : (nv ? 0 : up * vr / 100)
    const pwv   = saved ? Number(item.priceWithVat)   : (up + vpu)
    const isV   = item.isVariant ?? false
    const equiv = isV && item.variantValue ? s / item.variantValue : s
    return sum + equiv * (isVatPayer ? pwv : up)
  }, 0)

  // Right panel data
  const customerName  = o?.customer?.name || o?.customerName || null
  const shippingLabel = o?.shippingMethod ? (SHIPPING_LABELS[o.shippingMethod] ?? o.shippingMethod) : null
  const isPickup      = !!o?.pickupPointId

  return (
    <div className="fixed inset-0 bg-black/60 flex items-stretch justify-center z-50 p-0 sm:p-4 overflow-y-auto">
      <div className="bg-gray-50 rounded-none sm:rounded-xl shadow-2xl w-full max-w-[1440px] sm:my-4 flex flex-col sm:max-h-[calc(100vh-2rem)] overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isCustomerOrder ? 'Vyskladnit objednávku' : 'Vyskladnit výdejku'}
            </h2>
            <p className="text-sm text-gray-400">
              Zkontroluj adresu · nastav množství · zadej tracking · odešli zásilku
            </p>
            <p className="text-xs text-gray-300 mt-0.5">
              Po potvrzení bude sklad automaticky upraven a rezervace uvolněna.
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

          {/* ════ LEFT — fulfillment workflow ════════════════════════════════════ */}
          <div className="flex flex-col overflow-y-auto min-h-0 bg-white border-r border-gray-200">
            <div className="flex-1 px-6 py-6 space-y-8">

              {/* 1. Products ──────────────────────────────────────────────────── */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                  Položky k vyskladnění
                </p>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        {isVatPayer ? (
                          <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                            <th className="text-left   px-4 py-3 w-[26%]">Produkt</th>
                            <th className="text-center px-3 py-3 w-[9%]" >Obj.</th>
                            <th className="text-center px-3 py-3 w-[12%] text-orange-500">Vyskladnit</th>
                            <th className="text-center px-3 py-3 w-[7%]" >DPH</th>
                            <th className="text-center px-3 py-3 w-[11%]">Cena/ks</th>
                            <th className="text-center px-3 py-3 w-[11%]">DPH/ks</th>
                            <th className="text-center px-3 py-3 w-[11%]">S DPH/ks</th>
                            <th className="text-center px-3 py-3 w-[13%]">Celkem</th>
                          </tr>
                        ) : (
                          <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                            <th className="text-left   px-4 py-3">Produkt</th>
                            <th className="text-center px-3 py-3 w-[14%]">Objednáno</th>
                            <th className="text-center px-3 py-3 w-[16%] text-orange-500">Vyskladnit</th>
                            <th className="text-right  px-3 py-3 w-[14%]">Cena/ks</th>
                            <th className="text-right  px-3 py-3 w-[14%]">Celkem</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {processingNoteItems.map((item) => {
                          const shipped     = shippedQuantities[item.id!] || 0
                          const maxAllowed  = item.quantity
                          const isVariant   = item.isVariant ?? false
                          const isOverLimit = shipped > maxAllowed + 0.001
                          const hasSaved    = item.price != null && item.priceWithVat != null
                          const unitPrice   = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
                          const itemVatRate = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
                          const isNV        = isNonVatPayer(itemVatRate)
                          const vatPU       = hasSaved ? Number(item.vatAmount ?? 0) : (isNV ? 0 : unitPrice * itemVatRate / 100)
                          const pwv         = hasSaved ? Number(item.priceWithVat)   : (unitPrice + vatPU)
                          const packEquiv   = isVariant && item.variantValue ? shipped / item.variantValue : shipped
                          const rowTotal    = packEquiv * (isVatPayer ? pwv : unitPrice)
                          const orderedDisplay = isVariant && item.orderedBaseQty != null
                            ? `${item.orderedBaseQty} ${item.unit}${item.shippedBaseQty ? ` (zbývá ${item.quantity})` : ''}`
                            : `${item.quantity} ${item.unit}`

                          function handleQtyChange(raw: string) {
                            if (raw === '') { setShippedQuantities({ ...shippedQuantities, [item.id!]: 0 }); return }
                            const v = Math.round(Number(raw) * 1000) / 1000
                            setShippedQuantities({ ...shippedQuantities, [item.id!]: v < 0 ? 0 : v })
                          }

                          const inputEl = (
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number" value={shipped || ''} onChange={e => handleQtyChange(e.target.value)}
                                min="0" max={maxAllowed} step={isVariant ? '0.001' : '1'}
                                className={`${isVariant ? 'w-[72px]' : 'w-14'} px-2 py-1.5 rounded-lg border text-center font-semibold text-sm focus:outline-none focus:ring-2 transition-colors ${
                                  isOverLimit
                                    ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-400 focus:ring-red-100'
                                    : 'border-orange-200 bg-orange-50/60 text-orange-900 focus:border-orange-400 focus:ring-orange-100'
                                }`}
                              />
                              <span className="text-gray-400 text-xs">{item.unit}</span>
                              {isVariant && (
                                <button
                                  type="button"
                                  onClick={() => setShippedQuantities({ ...shippedQuantities, [item.id!]: maxAllowed })}
                                  className="text-[10px] text-orange-500 hover:text-orange-700 font-medium underline"
                                >
                                  vše
                                </button>
                              )}
                            </div>
                          )

                          return isVatPayer ? (
                            <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{item.productName || item.product?.name || 'Neznámý produkt'}</p>
                                {isVariant && <p className="text-[11px] text-orange-500 mt-0.5">objednáno {item.orderedBaseQty} {item.unit} · zbývá {item.remainingBaseQty} {item.unit}</p>}
                              </td>
                              <td className="text-center px-3 py-3 text-gray-500 text-sm whitespace-nowrap">{orderedDisplay}</td>
                              <td className="text-center px-3 py-3">
                                {inputEl}
                                {isOverLimit && <p className="text-[10px] text-red-500 mt-0.5 text-center">max {maxAllowed}</p>}
                              </td>
                              <td className="text-center px-3 py-3 text-gray-400 text-xs">{isNV ? '—' : `${itemVatRate}%`}</td>
                              <td className="text-center px-3 py-3 text-gray-600 text-sm whitespace-nowrap">{formatPrice(unitPrice)}</td>
                              <td className="text-center px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{isNV ? '—' : formatPrice(vatPU)}</td>
                              <td className="text-center px-3 py-3 text-gray-700 text-sm whitespace-nowrap">{formatPrice(pwv)}</td>
                              <td className="text-center px-3 py-3 font-semibold text-gray-900 text-sm whitespace-nowrap">{formatPrice(rowTotal)}</td>
                            </tr>
                          ) : (
                            <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{item.productName || item.product?.name || 'Neznámý produkt'}</p>
                                {isVariant && <p className="text-[11px] text-orange-500 mt-0.5">objednáno {item.orderedBaseQty} {item.unit} · zbývá {item.remainingBaseQty} {item.unit}</p>}
                              </td>
                              <td className="text-center px-3 py-3 text-gray-500 text-sm whitespace-nowrap">{orderedDisplay}</td>
                              <td className="text-center px-3 py-3">
                                {inputEl}
                                {isOverLimit && <p className="text-[10px] text-red-500 mt-0.5 text-center">max {maxAllowed}</p>}
                              </td>
                              <td className="text-right px-3 py-3 text-gray-600 text-sm whitespace-nowrap">{formatPrice(unitPrice)}</td>
                              <td className="text-right px-3 py-3 font-semibold text-gray-900 text-sm whitespace-nowrap">{formatPrice(rowTotal)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={isVatPayer ? 7 : 4} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-400">
                            {isVatPayer ? 'Celkem s DPH' : 'Celkem'}
                          </td>
                          <td className={`${isVatPayer ? 'text-center' : 'text-right'} px-3 py-3 font-bold text-gray-900 text-base whitespace-nowrap`}>
                            {formatPrice(total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </section>

              {/* 2. Tracking ──────────────────────────────────────────────────── */}
              <section>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Trackování zásilky</p>
                <div className="border border-gray-200 rounded-xl bg-white p-5 space-y-4">
                  {!isEshopOrder && (
                    <p className="text-xs text-gray-400 italic">
                      Tracking lze přidat pouze u eshop objednávek (ESH…).
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Dopravce</label>
                      <input
                        type="text"
                        value={carrier}
                        onChange={e => setCarrier(e.target.value)}
                        placeholder="Zásilkovna, DPD, PPL…"
                        list="carriers-datalist"
                        disabled={!isEshopOrder}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-100 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors bg-white"
                      />
                      <datalist id="carriers-datalist">
                        {CARRIERS.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Číslo zásilky</label>
                      <input
                        type="text"
                        value={trackingNum}
                        onChange={e => setTrackingNum(e.target.value)}
                        placeholder="např. Z1234567890"
                        disabled={!isEshopOrder}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono focus:border-gray-400 focus:ring-1 focus:ring-gray-100 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors bg-white"
                      />
                    </div>
                  </div>
                  {isEshopOrder && (trackingNum || carrier) && (
                    <p className="text-xs text-gray-400 pt-1">
                      Tracking se uloží automaticky při vyskladnění.
                    </p>
                  )}
                </div>
              </section>

              {/* 3. Note ─────────────────────────────────────────────────────── */}
              <section>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                  Interní poznámka <span className="normal-case font-normal">(volitelné)</span>
                </label>
                <textarea
                  value={processNote} onChange={e => setProcessNote(e.target.value)}
                  placeholder="Poznámka k vyskladnění…" rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-gray-300 focus:ring-1 focus:ring-gray-100 focus:outline-none bg-white resize-none transition-colors"
                />
              </section>

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
                onClick={handleDispatch}
                disabled={isProcessing}
                className="flex items-center gap-2 px-7 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Package className="w-4 h-4" />
                {isProcessing ? 'Zpracovávám…' : 'Vyskladnit zásilku'}
              </button>
            </div>
          </div>

          {/* ════ RIGHT — shipment summary panel ════════════════════════════════ */}
          <div className="hidden lg:flex flex-col gap-3 p-4 overflow-y-auto bg-gray-50 min-h-0">

            {/* Card 1 — Delivery address ─────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <MapPin className="w-4 h-4 text-gray-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Doručení</span>
                {isPickup && (
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">
                    {o?.pickupPointCarrier || 'Výdejní místo'}
                  </span>
                )}
              </div>

              <div className="px-4 py-4 space-y-4 text-sm">

                {/* Recipient */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-1.5">Příjemce</p>
                  <p className="font-semibold text-gray-900 leading-snug">{customerName || '—'}</p>
                  {o?.customerEmail && (
                    <p className="text-xs text-gray-500 mt-1">{o.customerEmail}</p>
                  )}
                  {o?.customerPhone && (
                    <p className="text-xs text-gray-500">{o.customerPhone}</p>
                  )}
                </div>

                <hr className="border-gray-100" />

                {/* Address */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-1.5">
                    {isPickup ? 'Výdejní místo' : 'Doručovací adresa'}
                  </p>
                  {isPickup ? (
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-900">{o?.pickupPointName || '—'}</p>
                      {o?.pickupPointAddress && (
                        <p className="text-xs text-gray-500 leading-relaxed">{o.pickupPointAddress}</p>
                      )}
                      {o?.pickupPointId && (
                        <p className="text-[11px] text-gray-400 font-mono mt-1">ID: {o.pickupPointId}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {(o?.billingStreet || o?.customerAddress) && (
                        <p className="text-gray-800">{o?.billingStreet || o?.customerAddress?.split(',')[0] || '—'}</p>
                      )}
                      {(o?.billingZip || o?.billingCity) && (
                        <p className="text-gray-800">{[o?.billingZip, o?.billingCity].filter(Boolean).join(' ')}</p>
                      )}
                      <p className="text-xs text-gray-400">{o?.billingCountry || 'CZ'}</p>
                      {!o?.billingStreet && !o?.customerAddress && !o?.billingCity && (
                        <p className="text-xs text-gray-400 italic">Adresa není k dispozici</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Shipping method */}
                {shippingLabel && (
                  <>
                    <hr className="border-gray-100" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-1.5">Způsob dopravy</p>
                      <p className="font-medium text-gray-800">{shippingLabel}</p>
                    </div>
                  </>
                )}

                {/* Map toggle — hidden by default */}
                {isPickup && (o?.pickupPointAddress || o?.pickupPointName) && (
                  <>
                    <hr className="border-gray-100" />
                    <button
                      type="button"
                      onClick={() => setShowMap(v => !v)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full text-left"
                    >
                      {showMap ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
                      {showMap ? 'Skrýt mapu' : 'Zobrazit mapu výdejního místa'}
                    </button>
                    {showMap && (
                      <div className="rounded-lg overflow-hidden border border-gray-100">
                        <iframe
                          src={`https://maps.google.com/maps?q=${encodeURIComponent((o.pickupPointAddress || o.pickupPointName)!)}&output=embed&z=16`}
                          className="w-full h-[160px]"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Mapa výdejního místa"
                        />
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>

            {/* Card 2 — Order summary ────────────────────────────────────────── */}
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
                  <StatusBadge status={processingOrder?.status || ''} />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400">Vytvořeno</span>
                  <span className="text-gray-700">
                    {o?.orderDate ? new Date(o.orderDate).toLocaleDateString('cs-CZ') : '—'}
                  </span>
                </div>

                {o?.issuedInvoice && (
                  <>
                    <hr className="border-gray-100" />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-400">Faktura</span>
                      <span className="font-mono text-sm text-gray-700">{o.issuedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-400">Platba</span>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        o.issuedInvoice.paymentStatus === 'paid'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {o.issuedInvoice.paymentStatus === 'paid' ? '✓ Zaplaceno' : '○ Čeká na platbu'}
                      </span>
                    </div>
                  </>
                )}

                <hr className="border-gray-100" />
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">Celkem</span>
                  <span className="font-bold text-gray-900 text-lg">{formatPrice(Number(o?.totalAmount || 0))}</span>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
