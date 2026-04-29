'use client'

import { X } from 'lucide-react'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { ACTION_TYPE_LABELS, ACTION_TYPE_COLORS } from '../types'
import type { AuditLog, AuditActionType } from '../types'

interface Props {
  log:     AuditLog | null
  onClose: () => void
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900 break-all">{value ?? <span className="text-gray-300">—</span>}</dd>
    </div>
  )
}

function ValueBox({ label, value, variant }: { label: string; value: string | null; variant: 'old' | 'new' }) {
  if (!value) return null
  const color = variant === 'old' ? 'border-red-100 bg-red-50' : 'border-green-100 bg-green-50'
  const text  = variant === 'old' ? 'text-red-700' : 'text-green-700'

  return (
    <div className={`border rounded-lg p-3 ${color}`}>
      <p className={`text-xs font-semibold mb-1 ${text}`}>{label}</p>
      <pre className={`text-xs whitespace-pre-wrap break-all font-mono ${text}`}>{value}</pre>
    </div>
  )
}

export function AuditLogDetailModal({ log, onClose }: Props) {
  if (!log) return null

  const actionLabel = ACTION_TYPE_LABELS[log.actionType as AuditActionType] ?? log.actionType
  const actionColor = ACTION_TYPE_COLORS[log.actionType as AuditActionType] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Detail záznamu</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
            <Field label="Čas"      value={format(new Date(log.createdAt), 'dd. MM. yyyy HH:mm:ss', { locale: cs })} />
            <Field label="Uživatel" value={log.username ?? log.userId} />
            <Field label="Role"     value={log.role} />
            <Field label="IP"       value={log.ipAddress} />
            <Field label="Modul"    value={log.module} />
            <Field label="Entita"   value={log.entityName} />
            <Field label="ID entity" value={log.entityId} />
            <Field label="Pole"     value={log.fieldName} />
            <div>
              <dt className="text-xs font-medium text-gray-500 mb-0.5">Akce</dt>
              <dd>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${actionColor}`}>
                  {actionLabel}
                </span>
              </dd>
            </div>
          </dl>

          {(log.oldValue || log.newValue) && (
            <div className="space-y-2 pt-2">
              <ValueBox label="Původní hodnota" value={log.oldValue} variant="old" />
              <ValueBox label="Nová hodnota"    value={log.newValue} variant="new" />
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  )
}
