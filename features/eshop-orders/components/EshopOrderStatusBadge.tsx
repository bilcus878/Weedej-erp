'use client'

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  paid:       { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Zaplaceno'        },
  processing: { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Část. odesláno'  },
  shipped:    { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Odesláno'         },
  delivered:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Doručeno'         },
  cancelled:  { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Zrušeno'          },
  storno:     { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Zrušeno'          },
  new:        { bg: 'bg-gray-100',   text: 'text-gray-800',   label: 'Nová'             },
}

export function EshopOrderStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}
