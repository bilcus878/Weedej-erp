'use client'

import { useState } from 'react'
import { Truck, Package, ExternalLink, MapPin } from 'lucide-react'
import { ERPSectionCard } from '@/components/erp/detail'
import type { OrderDetailData } from '@/components/erp'

const SHIPPING_LABELS: Record<string, string> = {
  DPD_HOME:          'DPD — Doručení na adresu',
  DPD_PICKUP:        'DPD — Výdejní místo',
  ZASILKOVNA_HOME:   'Zásilkovna — Doručení na adresu',
  ZASILKOVNA_PICKUP: 'Zásilkovna — Výdejní místo / Z-BOX',
  COURIER:           'Kurýr',
  PICKUP_IN_STORE:   'Osobní odběr',
}

interface Props {
  order:      OrderDetailData
  onRefresh?: () => Promise<void>
}

export function OrderShippingSection({ order, onRefresh }: Props) {
  const [editing, setEditing] = useState(false)
  const [form,    setForm]    = useState({ trackingNumber: '', carrier: '' })
  const [saving,  setSaving]  = useState(false)

  const hasTracking = !!(order.trackingNumber || order.carrier)
  const carrierKey  = (order.pickupPointCarrier || order.carrier || '').toLowerCase()
  const trackingUrl = order.trackingNumber
    ? carrierKey === 'zasilkovna'
      ? `https://www.zasilkovna.cz/sledovani-zasilky?barcode=${order.trackingNumber}`
      : carrierKey === 'dpd'
        ? `https://tracking.dpd.de/status/cs/parcel/${order.trackingNumber}`
        : null
    : null

  async function saveTracking() {
    setSaving(true)
    try {
      const res = await fetch(`/api/eshop-orders/${order.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          trackingNumber: form.trackingNumber.trim() || null,
          carrier:        form.carrier.trim()        || null,
        }),
      })
      if (!res.ok) { alert('Nepodařilo se uložit tracking'); return }
      await onRefresh?.()
      setEditing(false)
    } catch {
      alert('Chyba při ukládání trackingu')
    } finally {
      setSaving(false)
    }
  }

  const statusLabel =
    hasTracking ? 'Sledováno' :
    order.status === 'shipped'   ? 'Odesláno'  :
    order.status === 'delivered' ? 'Doručeno'  : 'Čeká'
  const statusColor =
    hasTracking ? 'bg-blue-100 text-blue-700' :
    ['shipped', 'delivered'].includes(order.status) ? 'bg-green-100 text-green-700' :
    'bg-gray-100 text-gray-500'

  return (
    <ERPSectionCard
      title="Doručení"
      icon={<Truck />}
      headerActions={
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColor}`}>
          {statusLabel}
        </span>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Left: způsob + tracking */}
        <div className="space-y-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Způsob dopravy</p>
            <p className="text-sm font-semibold text-gray-900 leading-snug">
              {order.shippingMethod ? (SHIPPING_LABELS[order.shippingMethod] ?? order.shippingMethod) : '—'}
            </p>
            {order.pickupPointCarrier && (
              <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                {order.pickupPointCarrier}
              </span>
            )}
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Zásilka</p>
            {editing ? (
              <div>
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
                  <input
                    type="text"
                    value={form.trackingNumber}
                    onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') saveTracking(); if (e.key === 'Escape') setEditing(false) }}
                    placeholder="Číslo zásilky…"
                    className="flex-1 min-w-0 text-xs font-mono bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
                    autoFocus
                  />
                  <button
                    onClick={saveTracking}
                    disabled={saving}
                    className="px-2.5 py-1 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
                  >
                    {saving ? '…' : 'Uložit'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-2 py-1 text-gray-400 hover:text-gray-700 text-xs rounded-md transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[9px] text-gray-400 mt-1">Enter pro uložení · Esc pro zrušení</p>
              </div>
            ) : hasTracking ? (
              <div className="space-y-1.5">
                {order.trackingNumber && (
                  <code className="block font-mono text-xs font-bold text-gray-800">{order.trackingNumber}</code>
                )}
                {order.carrier && <p className="text-xs text-gray-500">{order.carrier}</p>}
                <div className="flex items-center gap-2 pt-1">
                  {trackingUrl && (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />Sledovat
                    </a>
                  )}
                  <button
                    onClick={() => { setForm({ trackingNumber: order.trackingNumber || '', carrier: order.carrier || '' }); setEditing(true) }}
                    className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Upravit
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400">Zásilka nebyla předána dopravci.</p>
                <button
                  onClick={() => { setForm({ trackingNumber: '', carrier: order.pickupPointCarrier || '' }); setEditing(true) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  <Package className="w-3.5 h-3.5" />Přidat tracking
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: pickup point or delivery address */}
        <div>
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
                <p className="font-bold text-sm text-gray-900 leading-tight">{order.customerName || '—'}</p>
                <p className="text-gray-500 text-xs mt-0.5 whitespace-pre-line leading-relaxed">{order.customerAddress || '—'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map — full width below both columns */}
      {order.pickupPointId && (order.pickupPointAddress || order.pickupPointName) && (
        <div className="mt-4 -mx-5 -mb-4 border-t border-gray-100 overflow-hidden rounded-b-xl">
          <iframe
            src={`https://maps.google.com/maps?q=${encodeURIComponent((order.pickupPointAddress || order.pickupPointName)!)}&output=embed&z=16`}
            className="w-full h-[160px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa výdejního místa"
          />
        </div>
      )}
    </ERPSectionCard>
  )
}
