'use client'

import { ArrowLeft, FlaskConical, TrendingUp, TrendingDown, Package, AlertTriangle } from 'lucide-react'
import type { Batch } from '../types'
import { BatchStatusBadge } from './BatchStatusBadge'
import { STATUS_OPTIONS } from '../constants'
import { getDaysLeft } from '../utils'

interface Props {
  batch:          Batch
  currentStock:   number
  totalReceived:  number
  totalConsumed:  number
  saving:         boolean
  onStatusChange: (status: string) => void
  onBack:         () => void
}

export function BatchDetailHeader({
  batch, currentStock, totalReceived, totalConsumed,
  saving, onStatusChange, onBack,
}: Props) {
  const expiry   = batch.expiryDate ? new Date(batch.expiryDate) : null
  const daysLeft = getDaysLeft(batch.expiryDate)
  const unit     = batch.product?.unit ?? ''

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

      {/* Title row */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <FlaskConical className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 font-mono">{batch.batchNumber}</h1>
          <p className="text-xs text-gray-400">{batch.product?.name}</p>
        </div>
        <div className="ml-auto">
          <BatchStatusBadge status={batch.status} />
        </div>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 border-b border-gray-100">
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Produkt</p>
          <p className="font-semibold text-gray-900 text-sm">{batch.product?.name ?? '—'}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Dodavatel</p>
          <p className="font-semibold text-gray-900 text-sm">{batch.supplier?.name ?? '—'}</p>
          {batch.supplierLotRef && <p className="text-[10px] text-gray-400">Lot: {batch.supplierLotRef}</p>}
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Datum výroby</p>
          <p className="font-semibold text-gray-900 text-sm">
            {batch.productionDate ? new Date(batch.productionDate).toLocaleDateString('cs-CZ') : '—'}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Expirace</p>
          {expiry ? (
            <div>
              <p className={`font-semibold text-sm ${daysLeft !== null && daysLeft <= 0 ? 'text-red-600' : daysLeft !== null && daysLeft <= 30 ? 'text-orange-600' : 'text-gray-900'}`}>
                {expiry.toLocaleDateString('cs-CZ')}
              </p>
              {daysLeft !== null && (
                <p className="text-[10px] text-gray-400">
                  {daysLeft <= 0 ? 'Prošlá' : `Za ${daysLeft} dní`}
                </p>
              )}
            </div>
          ) : (
            <p className="font-semibold text-gray-400 text-sm">—</p>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Přijato celkem</p>
            <p className="text-lg font-bold text-gray-900">{totalReceived} <span className="text-sm font-normal text-gray-500">{unit}</span></p>
          </div>
        </div>
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Vydáno celkem</p>
            <p className="text-lg font-bold text-gray-900">{totalConsumed} <span className="text-sm font-normal text-gray-500">{unit}</span></p>
          </div>
        </div>
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Aktuálně na skladě</p>
            <p className={`text-lg font-bold ${currentStock > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
              {currentStock} <span className="text-sm font-normal text-gray-500">{unit}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Status change */}
      <div className="px-6 py-4 flex items-center gap-4">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Změna statusu:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => onStatusChange(o.value)}
              disabled={saving || batch.status === o.value}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                batch.status === o.value
                  ? 'bg-amber-500 text-white border-amber-500 font-semibold cursor-default'
                  : 'border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-700 disabled:opacity-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {batch.status === 'recalled' && (
          <div className="ml-auto flex items-center gap-1.5 text-red-600 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            RECALL AKTÍVNÍ
          </div>
        )}
      </div>
    </div>
  )
}
