'use client'

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  storno:     { cls: 'bg-red-100 text-red-800',       label: 'STORNO'            },
  new:        { cls: 'bg-yellow-100 text-yellow-800', label: 'Nová (neuhrazená)' },
  paid:       { cls: 'bg-blue-100 text-blue-800',     label: 'Zaplacená'         },
  processing: { cls: 'bg-orange-100 text-orange-800', label: 'Připravuje se'     },
  shipped:    { cls: 'bg-green-100 text-green-800',   label: 'Odesláno'          },
  delivered:  { cls: 'bg-green-100 text-green-800',   label: 'Předáno'           },
  cancelled:  { cls: 'bg-red-100 text-red-800',       label: 'Zrušená'           },
}

interface Props { status: string }

export function StatusBadge({ status }: Props) {
  const cfg = STATUS_MAP[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg?.cls ?? 'bg-gray-100 text-gray-800'}`}>
      {cfg?.label ?? (status || 'Aktivní')}
    </span>
  )
}
