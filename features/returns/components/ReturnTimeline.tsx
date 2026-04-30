import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import {
  RETURN_STATUS_LABELS,
  type ReturnStatus,
} from '@/lib/returns/returnWorkflow'
import type { ReturnStatusHistoryEntry } from '../types'

const STATUS_ICON: Record<string, React.ReactNode> = {
  approved:           <CheckCircle className="w-4 h-4 text-green-500" />,
  partially_approved: <CheckCircle className="w-4 h-4 text-lime-500" />,
  resolved:           <CheckCircle className="w-4 h-4 text-teal-500" />,
  closed:             <CheckCircle className="w-4 h-4 text-gray-400" />,
  rejected:           <XCircle    className="w-4 h-4 text-red-500"   />,
  cancelled:          <XCircle    className="w-4 h-4 text-gray-400"  />,
  submitted:          <AlertCircle className="w-4 h-4 text-blue-500" />,
}

function getIcon(status: string) {
  return STATUS_ICON[status] ?? <Clock className="w-4 h-4 text-gray-400" />
}

interface Props {
  history: ReturnStatusHistoryEntry[]
}

export function ReturnTimeline({ history }: Props) {
  const sorted = [...history].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  if (sorted.length === 0) return null

  return (
    <div className="space-y-0">
      {sorted.map((entry, idx) => {
        const isLast = idx === sorted.length - 1
        const label  = RETURN_STATUS_LABELS[entry.toStatus as ReturnStatus] ?? entry.toStatus
        return (
          <div key={entry.id} className="flex gap-3">
            {/* Connector line + icon */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 z-10">
                {getIcon(entry.toStatus)}
              </div>
              {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
            </div>

            {/* Content */}
            <div className={`${isLast ? '' : 'pb-4'} min-w-0 flex-1`}>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{label}</p>
              {entry.note && (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{entry.note}</p>
              )}
              <p className="text-[11px] text-gray-400 mt-0.5">
                {entry.changedByName ?? 'Systém'}
                {' · '}
                {format(new Date(entry.createdAt), 'd. M. yyyy HH:mm', { locale: cs })}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
