'use client'

import { useRouter } from 'next/navigation'
import { FlaskConical, Search, X, Package } from 'lucide-react'
import { useBatches, BatchStatusBadge } from '@/features/batches'
import { LoadingState, ErrorState } from '@/components/erp'

export const dynamic = 'force-dynamic'

const STATUS_OPTIONS = [
  { value: '',           label: 'Všechny statusy' },
  { value: 'active',     label: 'Aktivní'         },
  { value: 'quarantine', label: 'Karanténa'       },
  { value: 'recalled',   label: 'Recall'          },
  { value: 'expired',    label: 'Prošlá'          },
  { value: 'consumed',   label: 'Vyskladněna'     },
]

export default function BatchesPage() {
  const router = useRouter()
  const {
    lots, total, loading, error,
    search, setSearch,
    status, setStatus,
    page, setPage, totalPages,
    refresh,
  } = useBatches()

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={refresh} />

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">

        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <FlaskConical className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Šarže</h1>
            <p className="text-xs text-gray-400">{total} šarží celkem</p>
          </div>
          <button onClick={refresh} className="ml-auto text-xs text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            Obnovit
          </button>
        </div>

        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Hledat číslo šarže..."
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:border-amber-400 focus:ring-1 focus:ring-amber-100 focus:outline-none"
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="h-8 px-2 text-sm border border-gray-200 rounded-lg focus:border-amber-400 focus:outline-none"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(search || status) && (
            <button onClick={() => { setSearch(''); setStatus(''); setPage(1) }} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
              <X className="w-3 h-3" /> Smazat filtry
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
                <th className="text-left px-5 py-3">Číslo šarže</th>
                <th className="text-left px-3 py-3">Dodavatel</th>
                <th className="text-center px-3 py-3">Příjem</th>
                <th className="text-left px-3 py-3">Produkty</th>
                <th className="text-center px-3 py-3">Celkem na skladě</th>
                <th className="text-center px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lots.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    {search || status ? 'Žádné šarže odpovídající filtru' : 'Žádné šarže'}
                  </td>
                </tr>
              )}
              {lots.map(lot => (
                <tr
                  key={lot.batchNumber}
                  onClick={() => router.push(`/batches/lot/${encodeURIComponent(lot.batchNumber)}`)}
                  className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3">
                    <span className="font-mono font-semibold text-amber-700">{lot.batchNumber}</span>
                    {lot.supplierLotRef && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Lot dodavatele: {lot.supplierLotRef}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{lot.supplier?.name ?? '—'}</td>
                  <td className="text-center px-3 py-3 text-gray-600 text-xs">
                    {lot.receivedDate ? new Date(lot.receivedDate).toLocaleDateString('cs-CZ') : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Package className="w-3 h-3 text-gray-400" />{lot.productCount}
                      </span>
                      {lot.products.slice(0, 3).map(p => (
                        <span key={p.id} className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[90px]">{p.name}</span>
                      ))}
                      {lot.products.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{lot.products.length - 3} další</span>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className={`font-semibold text-sm ${lot.totalStock > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      {lot.totalStock}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <BatchStatusBadge status={lot.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-gray-100">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">‹</button>
            <span className="text-sm text-gray-600">Stránka {page} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">›</button>
          </div>
        )}
      </div>
    </div>
  )
}
