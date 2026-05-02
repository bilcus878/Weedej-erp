'use client'

import { useState } from 'react'
import { Truck, ExternalLink } from 'lucide-react'
import { ERPSectionCard } from './ERPSectionCard'
import type { OrderDetailData } from './OrderDetailTypes'

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

export interface ShippingSectionProps {
  order:           OrderDetailData
  onRefresh?:      () => Promise<void>
  onSaveTracking?: (trackingNumber: string | null, carrier: string | null) => Promise<void>
  title?:          string
}

export function ShippingSection({ order, onRefresh, onSaveTracking, title = 'Doručení' }: ShippingSectionProps) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({ trackingNumber: '', carrier: '' })
  const [saving, setSaving]   = useState(false)

  const hasTracking = !!(order.trackingNumber || order.carrier)
  const carrierKey  = (order.pickupPointCarrier || order.carrier || '').toLowerCase()
  const trackingUrl = order.trackingNumber ? buildTrackingUrl(order.trackingNumber, carrierKey) : null

  async function handleSave() {
    setSaving(true)
    try {
      if (onSaveTracking) {
        await onSaveTracking(form.trackingNumber.trim() || null, form.carrier.trim() || null)
      } else {
        const res = await fetch(`/api/eshop-orders/${order.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
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

  // Compact location line — name + address on one line where possible
  const locationLine = order.pickupPointId
    ? [order.pickupPointName, order.pickupPointAddress].filter(Boolean).join(' · ')
    : order.customerAddress || null

  return (
    <ERPSectionCard title={title} icon={<Truck />}>
      <div className="space-y-2.5">

        {/* Method */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-900">
            {order.shippingMethod ? shippingLabel(order.shippingMethod) : '—'}
          </span>
          {order.pickupPointCarrier && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
              {order.pickupPointCarrier}
            </span>
          )}
        </div>

        {/* Location */}
        {locationLine && (
          <p className="text-xs text-gray-500 leading-relaxed">{locationLine}</p>
        )}

        {/* Tracking */}
        {editing ? (
          <div className="flex items-center gap-1.5 rounded border border-gray-200 bg-gray-50 px-2.5 py-1.5 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-300 transition-all">
            <input
              type="text"
              value={form.trackingNumber}
              onChange={e => setForm(f => ({ ...f, trackingNumber: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
              placeholder="Číslo zásilky…"
              className="flex-1 min-w-0 text-xs font-mono bg-transparent border-none outline-none text-gray-900 placeholder-gray-400"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-[11px] font-semibold text-white bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded disabled:opacity-50 transition-colors shrink-0"
            >
              {saving ? '…' : 'OK'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-gray-400 hover:text-gray-600 shrink-0 transition-colors"
            >
              ✕
            </button>
          </div>
        ) : hasTracking ? (
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-mono text-gray-700">{order.trackingNumber}</code>
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
              >
                <ExternalLink className="w-3 h-3" />
                Sledovat
              </a>
            )}
            <button
              onClick={() => { setForm({ trackingNumber: order.trackingNumber || '', carrier: order.carrier || '' }); setEditing(true) }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              upravit
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setForm({ trackingNumber: '', carrier: order.pickupPointCarrier || '' }); setEditing(true) }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            + přidat tracking
          </button>
        )}

      </div>
    </ERPSectionCard>
  )
}
