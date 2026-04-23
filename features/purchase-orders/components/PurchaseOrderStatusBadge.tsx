'use client'

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  storno:             { cls: 'bg-red-100 text-red-800',       label: 'STORNO'             },
  cancelled:          { cls: 'bg-red-100 text-red-800',       label: 'Zrušena'            },
  pending:            { cls: 'bg-yellow-100 text-yellow-800', label: 'Čeká'               },
  confirmed:          { cls: 'bg-blue-100 text-blue-800',     label: 'Potvrzena'          },
  partially_received: { cls: 'bg-orange-100 text-orange-800', label: 'Částečně přijata'   },
  received:           { cls: 'bg-green-100 text-green-800',   label: 'Přijata'            },
}

export function PurchaseOrderStatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { cls: 'bg-yellow-100 text-yellow-800', label: 'Čeká' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  )
}
