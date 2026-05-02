'use client'

import { FileText } from 'lucide-react'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import { ERPInfoCard } from '@/components/erp/detail'
import { useCustomerOrderAudit } from '../hooks/useCustomerOrderAudit'
import type { AuditEntry } from '../hooks/useCustomerOrderAudit'

const STATUS_LABELS: Record<string, string> = {
  new:        'Nová',
  paid:       'Zaplacena',
  processing: 'Připravuje se',
  shipped:    'Odeslána',
  delivered:  'Doručena',
  cancelled:  'Zrušena',
  storno:     'STORNO',
}

const FIELD_LABELS: Record<string, string> = {
  status:          'Status',
  customerName:    'Jméno zákazníka',
  customerEmail:   'E-mail',
  customerPhone:   'Telefon',
  customerAddress: 'Adresa',
  note:            'Poznámka',
  paidAt:          'Datum platby',
  shippedAt:       'Datum odeslání',
  totalAmount:     'Celková částka',
}

function formatAction(e: AuditEntry): string {
  if (e.actionType === 'CREATE') return 'Objednávka vytvořena'
  if (e.actionType === 'DELETE') return 'Objednávka smazána'
  if (e.actionType === 'UPDATE') {
    if (e.fieldName === 'status') {
      const from = e.oldValue ? (STATUS_LABELS[e.oldValue] ?? e.oldValue) : '?'
      const to   = e.newValue ? (STATUS_LABELS[e.newValue] ?? e.newValue) : '?'
      return `Status: ${from} → ${to}`
    }
    const label = e.fieldName ? (FIELD_LABELS[e.fieldName] ?? e.fieldName) : 'Objednávka'
    return e.oldValue != null
      ? `${label} upraven: ${e.oldValue} → ${e.newValue ?? '—'}`
      : `${label} upraven`
  }
  return e.actionType
}

interface Props { orderId: string }

export function CustomerOrderAuditSection({ orderId }: Props) {
  const { entries, loading } = useCustomerOrderAudit(orderId)

  return (
    <ERPInfoCard title="Audit / Historie změn" icon={FileText}>
      {loading ? (
        <div className="animate-pulse space-y-3 py-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-200 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded w-52" />
                <div className="h-2.5 bg-gray-100 rounded w-36" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Žádné záznamy změn</p>
      ) : (
        <ol className="relative space-y-3">
          {entries.map((entry, i) => {
            const isLast = i === entries.length - 1
            return (
              <li key={entry.id} className="relative flex gap-3">
                {!isLast && (
                  <div className="absolute left-[4px] top-4 bottom-0 w-0.5 bg-gray-100" aria-hidden />
                )}
                <div className="shrink-0 mt-1 w-2.5 h-2.5 rounded-full bg-gray-300 ring-2 ring-white" />
                <div className="flex-1 min-w-0 pb-0.5">
                  <p className="text-xs font-medium text-gray-800 leading-snug">
                    {formatAction(entry)}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {entry.username && (
                      <span className="text-[11px] text-gray-500">{entry.username}</span>
                    )}
                    <time
                      dateTime={entry.createdAt}
                      className="text-[11px] text-gray-400"
                      title={entry.createdAt}
                    >
                      {format(new Date(entry.createdAt), 'd. M. yyyy HH:mm', { locale: cs })}
                    </time>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </ERPInfoCard>
  )
}