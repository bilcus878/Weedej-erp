import { RETURN_STATUS_LABELS, type ReturnStatus } from '@/lib/returns/returnWorkflow'

const COLORS: Record<ReturnStatus, string> = {
  submitted:          'bg-blue-100 text-blue-700',
  under_review:       'bg-indigo-100 text-indigo-700',
  waiting_for_goods:  'bg-amber-100 text-amber-700',
  goods_received:     'bg-cyan-100 text-cyan-700',
  inspecting:         'bg-orange-100 text-orange-700',
  approved:           'bg-green-100 text-green-700',
  partially_approved: 'bg-lime-100 text-lime-700',
  rejected:           'bg-red-100 text-red-700',
  resolved:           'bg-teal-100 text-teal-700',
  closed:             'bg-gray-100 text-gray-500',
  cancelled:          'bg-gray-100 text-gray-400',
}

interface Props {
  status: ReturnStatus
  size?:  'sm' | 'md'
}

export function ReturnStatusBadge({ status, size = 'md' }: Props) {
  const color = COLORS[status] ?? 'bg-gray-100 text-gray-600'
  const label = RETURN_STATUS_LABELS[status] ?? status
  return (
    <span className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${color} ${
      size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
    }`}>
      {label}
    </span>
  )
}
