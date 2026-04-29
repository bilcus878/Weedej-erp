'use client'

import { useState } from 'react'
import { ClipboardList, ChevronUp, ChevronDown, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuditLogs, AuditLogFiltersBar, AuditLogDetailModal, ACTION_TYPE_LABELS, ACTION_TYPE_COLORS } from '@/features/audit-logs'
import { LoadingState, ErrorState } from '@/components/erp'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import type { AuditLog, AuditActionType } from '@/features/audit-logs'

export const dynamic = 'force-dynamic'

export default function AuditLogsPage() {
  const {
    logs, total, totalPages, page, sortDir, filters,
    loading, error, setPage, applyFilters, clearFilters, toggleSort, refresh,
  } = useAuditLogs()

  const [detail, setDetail] = useState<AuditLog | null>(null)

  if (loading && logs.length === 0) return <LoadingState />
  if (error && logs.length === 0)   return <ErrorState message={error} onRetry={refresh} />

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Audit log</h1>
            <p className="text-xs text-gray-400">{total.toLocaleString()} záznamů celkem</p>
          </div>
        </div>
        <button
          onClick={refresh}
          className={`p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors ${loading ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-4">
        <AuditLogFiltersBar filters={filters} onChange={applyFilters} onClear={clearFilters} />
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                onClick={toggleSort}
              >
                <span className="flex items-center gap-1">
                  Čas
                  {sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uživatel</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Akce</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Modul</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entita</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pole</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const actionLabel = ACTION_TYPE_LABELS[log.actionType as AuditActionType] ?? log.actionType
              const actionColor = ACTION_TYPE_COLORS[log.actionType as AuditActionType] ?? 'bg-gray-100 text-gray-600'
              return (
                <tr
                  key={log.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => setDetail(log)}
                >
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {format(new Date(log.createdAt), 'dd.MM.yy HH:mm:ss', { locale: cs })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{log.username ?? '—'}</p>
                    {log.role && <p className="text-xs text-gray-400">{log.role}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${actionColor}`}>
                      {actionLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{log.module ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <span>{log.entityName ?? '—'}</span>
                    {log.entityId && <span className="text-gray-300 ml-1 font-mono">{log.entityId.slice(0, 8)}…</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{log.fieldName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); setDetail(log) }}
                      className="text-xs text-violet-500 hover:text-violet-700 font-medium transition-colors"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              )
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                  Žádné záznamy
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-400">Strana {page} z {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AuditLogDetailModal log={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
