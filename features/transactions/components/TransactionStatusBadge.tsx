'use client'

const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  storno:    { cls: 'bg-red-100 text-red-800',    label: 'STORNO'    },
  completed: { cls: 'bg-green-100 text-green-800', label: 'Dokončeno' },
  pending:   { cls: 'bg-gray-100 text-gray-800',   label: 'Čeká'     },
}

export function TransactionStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg?.cls ?? 'bg-gray-100 text-gray-800'}`}>
      {cfg?.label ?? status}
    </span>
  )
}
