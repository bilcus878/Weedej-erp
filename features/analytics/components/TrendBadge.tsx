'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatPctChange }                  from '@/lib/analytics/comparisonEngine'
import type { ComparisonValue }             from '@/lib/analytics/comparisonEngine'

interface Props {
  comparison: ComparisonValue
  invertColors?: boolean  // when lower is better (e.g. cancellations)
}

export function TrendBadge({ comparison, invertColors }: Props) {
  const { direction, pctChange } = comparison
  const isPositive = invertColors ? direction === 'down' : direction === 'up'
  const isNegative = invertColors ? direction === 'up'   : direction === 'down'

  const cls =
    direction === 'flat' ? 'bg-gray-100 text-gray-500' :
    isPositive           ? 'bg-emerald-50 text-emerald-600' :
                           'bg-red-50 text-red-500'

  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>
      <Icon className="h-2.5 w-2.5" />
      {formatPctChange(pctChange)}
    </span>
  )
}
