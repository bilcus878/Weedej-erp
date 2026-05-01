'use client'

import { useState } from 'react'
import { Truck, Package, MapPin, ExternalLink } from 'lucide-react'
import { ERPSectionCard, ERPDetailRow } from './ERPSectionCard'
import type { OrderDetailData } from './CustomerOrderDetail'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SHIPPING_LABELS: Record<string, string> = {
  DPD_HOME:          'DPD — Doručení na adresu',
  DPD_PICKUP:        'DPD — Výdejní místo',
  ZASILKOVNA_HOME:   'Zásilkovna — Doručení na adresu',
  ZASILKOVNA_PICKUP: 'Zásilkovna — Výdejní místo / Z-BOX',
  COURIER:           'Kurýr',
  PICKUP_IN_STORE:   'Osobní odběr',
}

function shippingLabel(method: string): string {
  return SHIPPING_LABELS[method] ?? method
}

function buildTrackingUrl(trackingNumber: string, carrier: string): string | null {
  const key = carrier.toLowerCase()
  if (key === 'zasilkovna') return `https://www.zasilkovna.cz/sledovani-zasilky?barcode=${trackingNumber}`
  if (key === 'dpd')        return `https://tracking.dpd.de/status/cs/parcel/${trackingNumber}`
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface ShippingSectionProps {
  order:      OrderDetailData
  onRefresh?: () => Promise<void>
  /** Override tracking save callback; defaults to PATCH /api/eshop-orders/:id */
  onSaveTracking?: (trackingNumber: string | null, carrier: string | null) => Promise<void>
  title?:     string
}

export function ShippingSection({ order, onRefresh, onSaveTracking, title = 'Doručení' }: ShippingSectionProps) {
  const [editing, setEditing]     = useState(false)
  const [form, setForm]           = useState({ trackingNumber: '', carrier: '' })
  const [saving, setSaving]       = useState(false)

  const hasTracking  = !!(order.trackingNumber || order.carrier)
  const carrierKey   = (order.pickupPointCarrier || order.carrier || '').toLowerCase()
  const trackingUrl  = order.trackingNumber ? buildTrackingUrl(order.trackingNumber, carrierKey) : null
  const customerName = order.customerName || 'Zákazník'

  async function handleSave() {
    setSaving(true)
    try {
      if (onSaveTracking) {
        await onSaveTracking(form.trackingNumber.trim() || null, form.carrier.trim() || null)
      } else {
        const res = await fetch(`/api/eshop-orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackingNumber: form.trackingNumber.trim() || null,
            carrier:        form.carrier.trim() || null,
          }),
        })
        if (!res.ok) { alert('Nepodařilo se uložit tracking'); return }
      }
      await onRefresh?.()
      setEditing(false)
    } catch {
      alert('Chyba při ukládání trackingu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ERPSectionCard title={title} icon={<Truck />}>
      <div className="space-y-4">

        {/* Shipping method */}
        <dl>
          <ERPDetailRow
            label="Způsob dopravy"
            value={
              order.shippingMethod
                ? (
                  <span>
                    {shippingLabel(order.shippingMethod)}
                    {order.pickupPointCarrier && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                        {order.pickupPointCarrier}
                      </span>
                    )}
                  </span>
                )
                : null
            }
          />
        </dl>

        {/* Tracking */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Zásilka</p>
          {editing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
                <input
                  type="text"
                  value={form.trackingNumber}
                  onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
                  placeholder="Číslo zásilky…"
                  className="flex-1 min-w-0 text-xs font-mono bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
                  autoFocus
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={handleSave}
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
              </div>
              <p className="text-[10px] text-gray-400">Enter pro uložení · Esc pro zrušení</p>
            </div>
          ) : hasTracking ? (
            <div className="space-y-2">
              {order.trackingNumber && (
                <p className="font-mono text-sm font-bold text-gray-800">{order.trackingNumber}</p>
              )}
              {order.carrier && <p className="text-xs text-gray-500">{order.carrier}</p>}
              <div className="flex items-center gap-2">
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Sledovat zásilku
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
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Zásilka nebyla předána dopravci.</p>
              <button
                onClick={() => { setForm({ trackingNumber: '', carrier: order.pickupPointCarrier || '' }); setEditing(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                <Package className="w-3.5 h-3.5" />
                Přidat tracking
              </button>
            </div>
          )}
        </div>

        {/* Pickup point or delivery address */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            {order.pickupPointId ? 'Výdejní místo' : 'Doručovací adresa'}
          </p>
          {order.pickupPointId ? (
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Package className="w-4 h-4 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 leading-tight">{order.pickupPointName || '—'}</p>
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
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-gray-400" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900 leading-tight">{customerName}</p>
                <p className="text-gray-500 text-xs mt-0.5 whitespace-pre-line leading-relaxed">{order.customerAddress || '—'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Pickup point map */}
        {order.pickupPointId && (order.pickupPointAddress || order.pickupPointName) && (
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent((order.pickupPointAddress || order.pickupPointName)!)}&output=embed&z=16`}
              className="w-full h-40"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa výdejního místa"
            />
          </div>
        )}

      </div>
    </ERPSectionCard>
  )
}
