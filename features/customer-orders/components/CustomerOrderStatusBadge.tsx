'use client'

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  storno:     { bg: 'bg-red-100',    text: 'text-red-800',    label: 'STORNO'        },
  new:        { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Nová'          },
  paid:       { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Zaplacená'     },
  processing: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Připravuje se' },
  shipped:    { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Odeslaná'      },
  delivered:  { bg: 'bg-teal-100',   text: 'text-teal-800',   label: 'Doručená'      },
  cancelled:  { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Zrušená'       },
}

export function CustomerOrderStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { bg: 'bg-gray-100', text: 'text-gray-800', label: status || 'Nová' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}
