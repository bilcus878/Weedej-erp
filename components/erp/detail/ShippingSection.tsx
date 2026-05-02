'use client'

import { useState } from 'react'
import { Truck, ExternalLink, MapPin } from 'lucide-react'
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

function buildMapUrl(address: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&zoom=15`
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
  const isInStore   = order.shippingMethod === 'PICKUP_IN_STORE'

  const locationLine = order.pickupPointId
    ? [order.pickupPointName, order.pickupPointAddress].filter(Boolean).join(' · ')
    : order.customerAddress || null

  const mapAddress = order.pickupPointAddress || (!isInStore ? order.customerAddress ?? null : null)
  const mapUrl     = mapAddress ? buildMapUrl(mapAddress) : null

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-gray-100 shrink-0">
        <Truck className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden />
        <span className="text-sm font-semibold text-gray-700">{title}</span>
      </div>

      {/* ── Info ── */}
      <div className="px-4 py-3 space-y-2 flex-1">

        {/* Method */}
        <p className="text-xs font-semibold text-gray-800">
          {order.shippingMethod ? shippingLabel(order.shippingMethod) : '—'}
        </p>

        {/* Location */}
        {locationLine && (
          <p className="text-xs text-gray-500 leading-relaxed">{locationLine}</p>
        )}

        {/* Pickup point ID — the most important identifier */}
        {order.pickupPointId && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
            ID {order.pickupPointId}
          </span>
        )}

        {/* Tracking */}
        {editing ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-300 transition-all mt-1">
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
              className="text-[11px] font-semibold text-white bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded-md disabled:opacity-50 transition-colors shrink-0"
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
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <code className="text-xs font-mono text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">
              {order.trackingNumber}
            </code>
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-xs text-indigo-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> Sledovat
              </a>
            )}
            <button
              onClick={() => { setForm({ trackingNumber: order.trackingNumber || '', carrier: order.carrier || '' }); setEditing(true) }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
            >
              upravit
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setForm({ trackingNumber: '', carrier: order.pickupPointCarrier || '' }); setEditing(true) }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1"
          >
            + přidat tracking
          </button>
        )}

      </div>

      {/* ── Map at bottom ── */}
      {mapUrl ? (
        <div className="h-40 relative shrink-0 border-t border-gray-100">
          <iframe
            src={mapUrl}
            className="absolute inset-0 w-full h-full border-none"
            loading="lazy"
            title="Mapa doručení"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        <div className="h-24 bg-gradient-to-br from-violet-50 via-indigo-50 to-blue-50 flex flex-col items-center justify-center gap-1.5 shrink-0 border-t border-gray-100">
          <div className="w-9 h-9 rounded-full bg-white/70 shadow-sm flex items-center justify-center">
            <MapPin className="w-4 h-4 text-violet-500" />
          </div>
          <span className="text-xs font-medium text-violet-500">
            {isInStore ? 'Osobní odběr' : 'Doprava'}
          </span>
        </div>
      )}

    </div>
  )
}
