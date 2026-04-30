import { RETURN_TYPE_LABELS, type ReturnType } from '@/lib/returns/returnWorkflow'

const COLORS: Record<ReturnType, string> = {
  return:         'bg-purple-100 text-purple-700',
  warranty_claim: 'bg-rose-100 text-rose-700',
  complaint:      'bg-yellow-100 text-yellow-700',
  exchange:       'bg-sky-100 text-sky-700',
}

interface Props { type: ReturnType }

export function ReturnTypeBadge({ type }: Props) {
  const color = COLORS[type] ?? 'bg-gray-100 text-gray-600'
  const label = RETURN_TYPE_LABELS[type] ?? type
  return (
    <span className={`inline-flex items-center rounded-full text-[10px] font-medium px-1.5 py-0.5 whitespace-nowrap ${color}`}>
      {label}
    </span>
  )
}
