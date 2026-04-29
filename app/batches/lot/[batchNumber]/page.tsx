'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FlaskConical, TrendingUp, TrendingDown, Package, ExternalLink } from 'lucide-react'
import { useLotDetail } from '@/features/batches'
import { BatchStatusBadge } from '@/features/batches'

const STATUS_OPTIONS = [
  { value: 'active',     label: 'Aktivní'    },
  { value: 'quarantine', label: 'Karanténa'  },
  { value: 'recalled',   label: 'Recall'     },
  { value: 'expired',    label: 'Prošlá'     },
  { value: 'consumed',   label: 'Vyskladněna'},
]

function fmt(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('cs-CZ')
}

function fmtNum(n: number) {
  return n.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  const days = (new Date(expiryDate).getTime() - Date.now()) / 86_400_000
  return days >= 0 && days <= 30
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate).getTime() < Date.now()
}

export default function LotDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const raw     = params.batchNumber as string
  const batchNumber = decodeURIComponent(raw)

  const { detail, loading, error, saving, handleStatusChange } = useLotDetail(batchNumber)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Načítám šarži…
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="p-8 text-sm text-red-600">
        {error ?? 'Šarže nenalezena'}
      </div>
    )
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
            <BatchStatusBadge status={lot.status} />
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
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Celkem přijato</p>
            <p className="text-lg font-bold text-gray-900">{fmtNum(totalReceived)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Celkem vydáno</p>
            <p className="text-lg font-bold text-gray-900">{fmtNum(totalConsumed)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Na skladě</p>
            <p className="text-lg font-bold text-gray-900">{fmtNum(lot.totalStock)}</p>
          </div>
        </div>
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

      {/* Products table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Produkty v šarži</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Produkt</th>
              <th className="px-5 py-3 text-left font-medium">Expirace</th>
              <th className="px-5 py-3 text-right font-medium">Na skladě</th>
              <th className="px-5 py-3 text-left font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lot.products.map(p => {
              const expired   = isExpired(p.expiryDate)
              const expiring  = !expired && isExpiringSoon(p.expiryDate)
              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-3.5">
                    {p.expiryDate ? (
                      <span className={
                        expired  ? 'text-red-600 font-semibold' :
                        expiring ? 'text-amber-600 font-semibold' :
                        'text-gray-600'
                      }>
                        {fmt(p.expiryDate)}
                        {expired  && ' (prošlá)'}
                        {expiring && ' (brzy vyprší)'}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-gray-900">
                    {fmtNum(p.currentStock)} <span className="text-gray-400 text-xs">{p.unit}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <BatchStatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <a
                      href={`/batches/${p.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Detail
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Movement history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Historie pohybů</h2>
        </div>
        {movements.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">Žádné pohyby</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Datum</th>
                <th className="px-5 py-3 text-left font-medium">Produkt</th>
                <th className="px-5 py-3 text-right font-medium">Množství</th>
                <th className="px-5 py-3 text-left font-medium">Doklad</th>
                <th className="px-5 py-3 text-left font-medium">Poznámka</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map(m => {
                const isOut = m.quantity < 0
                const doc = m.receipt
                  ? { label: m.receipt.receiptNumber, href: `/receipts/${m.receipt.id}` }
                  : m.deliveryNoteItems?.[0]?.deliveryNote
                  ? { label: m.deliveryNoteItems[0].deliveryNote!.deliveryNumber, href: `/delivery-notes/${m.deliveryNoteItems[0].deliveryNote!.id}` }
                  : null
                return (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{fmt(m.date)}</td>
                    <td className="px-5 py-3 text-gray-700">{m.productName}</td>
                    <td className={`px-5 py-3 text-right font-mono font-semibold ${isOut ? 'text-red-600' : 'text-green-700'}`}>
                      {isOut ? '' : '+'}{fmtNum(m.quantity)} <span className="text-gray-400 font-normal text-xs">{m.unit}</span>
                    </td>
                    <td className="px-5 py-3">
                      {doc ? (
                        <a href={doc.href} className="text-blue-600 hover:underline font-mono text-xs">
                          {doc.label}
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{m.note ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Notes */}
      {lot.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1.5">Poznámky</p>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{lot.notes}</p>
        </div>
      )}

    </div>
  )
}
