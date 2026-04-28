import type { BatchStatus } from '../types'

const CONFIG: Record<BatchStatus, { bg: string; text: string; label: string }> = {
  active:     { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Aktivní'    },
  quarantine: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Karanténa'  },
  recalled:   { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Recall'     },
  expired:    { bg: 'bg-gray-100',  text: 'text-gray-500',   label: 'Prošlá'     },
  consumed:   { bg: 'bg-blue-50',   text: 'text-blue-600',   label: 'Vyskladněna'},
}

export function BatchStatusBadge({ status }: { status: string }) {
  const s = CONFIG[status as BatchStatus] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: status }
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}
