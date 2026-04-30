'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FlaskConical, TrendingUp, TrendingDown, Package } from 'lucide-react'
import {
  useLotDetail, BatchStatusBadge, LotProductsTable, LotMovementsTable,
  STATUS_OPTIONS, fmtNum,
} from '@/features/batches'
import { fmt } from '@/features/batches'

export default function LotDetailPage() {
  const params      = useParams()
  const router      = useRouter()
  const batchNumber = decodeURIComponent(params.batchNumber as string)

  const { detail, loading, error, saving, handleStatusChange } = useLotDetail(batchNumber)

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Načítám šarži…</div>
  }
  if (error || !detail) {
    return <div className="p-8 text-sm text-red-600">{error ?? 'Šarže nenalezena'}</div>
  }

  const { lot, movements, totalReceived, totalConsumed } = detail

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-0.5 p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-amber-500 shrink-0" />
            <h1 className="text-xl font-bold text-gray-900 font-mono truncate">{lot.batchNumber}</h1>
            <BatchStatusBadge status={lot.status as any} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500 ml-7">
            {lot.supplier && <span>{lot.supplier.name}</span>}
            {lot.supplierLotRef && (
              <span>Šarže dodavatele: <span className="font-mono text-gray-700">{lot.supplierLotRef}</span></span>
            )}
            <span>Příjem: {fmt(lot.receivedDate)}</span>
            <span>{lot.productCount} {lot.productCount === 1 ? 'produkt' : lot.productCount < 5 ? 'produkty' : 'produktů'}</span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: TrendingUp,   bg: 'bg-green-50',  ic: 'text-green-600', label: 'Celkem přijato', value: fmtNum(totalReceived) },
          { icon: TrendingDown, bg: 'bg-red-50',    ic: 'text-red-500',   label: 'Celkem vydáno',  value: fmtNum(totalConsumed) },
          { icon: Package,      bg: 'bg-blue-50',   ic: 'text-blue-600',  label: 'Na skladě',      value: fmtNum(lot.totalStock) },
        ].map(({ icon: Icon, bg, ic, label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${ic}`} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{label}</p>
              <p className="text-lg font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bulk status change */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Změnit status šarže</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(o => (
            <button
              key={o.value}
              disabled={saving || lot.status === o.value}
              onClick={() => handleStatusChange(o.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 border-gray-200 text-gray-700"
            >
              {saving ? '…' : o.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">Změní status u všech produktů v této šarži najednou.</p>
      </div>

      <LotProductsTable products={lot.products} />

      {/* Movement history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Historie pohybů</h2>
        </div>
        <LotMovementsTable movements={movements} />
      </div>

      {lot.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1.5">Poznámky</p>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{lot.notes}</p>
        </div>
      )}
    </div>
  )
}
