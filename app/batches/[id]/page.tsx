'use client'

import { useRouter } from 'next/navigation'
import { FlaskConical, ArrowLeft, Package, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react'
import { useBatchDetail, BatchStatusBadge } from '@/features/batches'
import { LoadingState, ErrorState } from '@/components/erp'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_OPTIONS = [
  { value: 'active',     label: 'Aktivní'     },
  { value: 'quarantine', label: 'Karanténa'   },
  { value: 'recalled',   label: 'Recall'      },
  { value: 'expired',    label: 'Prošlá'      },
  { value: 'consumed',   label: 'Vyskladněna' },
]

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { detail, loading, error, saving, handleStatusChange } = useBatchDetail(params.id)

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={() => window.location.reload()} />
  if (!detail) return null

  const { batch, movements, currentStock, totalReceived, totalConsumed } = detail
  const today = new Date()
  const expiry = batch.expiryDate ? new Date(batch.expiryDate) : null
  const daysLeft = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="space-y-4 max-w-4xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <button onClick={() => router.push('/batches')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
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

        {/* ── Metadata grid ─────────────────────────────────────────────────── */}
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

        {/* ── KPI strip ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Přijato celkem</p>
              <p className="text-lg font-bold text-gray-900">{totalReceived} <span className="text-sm font-normal text-gray-500">{batch.product?.unit}</span></p>
            </div>
          </div>
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Vydáno celkem</p>
              <p className="text-lg font-bold text-gray-900">{totalConsumed} <span className="text-sm font-normal text-gray-500">{batch.product?.unit}</span></p>
            </div>
          </div>
          <div className="px-5 py-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Aktuálně na skladě</p>
              <p className={`text-lg font-bold ${currentStock > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                {currentStock} <span className="text-sm font-normal text-gray-500">{batch.product?.unit}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Status change ─────────────────────────────────────────────────── */}
        <div className="px-6 py-4 flex items-center gap-4">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Změna statusu:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => handleStatusChange(o.value)}
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

      {/* ── Movement history ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">Historie pohybů</h2>
          <p className="text-xs text-gray-400">{movements.length} pohybů</p>
        </div>

        {movements.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Žádné pohyby</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Datum</th>
                  <th className="text-center px-3 py-3">Typ</th>
                  <th className="text-right px-3 py-3">Množství</th>
                  <th className="text-left px-3 py-3">Dokument</th>
                  <th className="text-left px-3 py-3">Dodavatel</th>
                  <th className="text-right px-3 py-3">Nák. cena</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map(mv => {
                  const isIn = Number(mv.quantity) > 0
                  const dn   = (mv as any).deliveryNoteItems?.[0]?.deliveryNote

                  return (
                    <tr key={mv.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                        {new Date(mv.date).toLocaleDateString('cs-CZ')}
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isIn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {isIn ? 'Příjem' : 'Výdej'}
                        </span>
                      </td>
                      <td className={`text-right px-3 py-3 font-semibold ${isIn ? 'text-green-700' : 'text-red-600'}`}>
                        {isIn ? '+' : ''}{Number(mv.quantity)} {batch.product?.unit}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {(mv as any).receipt && (
                          <button
                            onClick={() => router.push(`/receipts?highlight=${(mv as any).receipt.id}`)}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {(mv as any).receipt.receiptNumber}
                          </button>
                        )}
                        {dn && (
                          <button
                            onClick={() => router.push(`/delivery-notes?highlight=${dn.id}`)}
                            className="text-purple-600 hover:underline font-medium"
                          >
                            {dn.deliveryNumber}
                          </button>
                        )}
                        {!(mv as any).receipt && !dn && (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {(mv as any).supplier?.name ?? '—'}
                      </td>
                      <td className="text-right px-3 py-3 text-xs text-gray-500">
                        {mv.purchasePrice ? formatPrice(mv.purchasePrice) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Notes ──────────────────────────────────────────────────────────── */}
      {batch.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-1">Poznámky</p>
          <p className="text-sm text-gray-700">{batch.notes}</p>
        </div>
      )}

    </div>
  )
}
