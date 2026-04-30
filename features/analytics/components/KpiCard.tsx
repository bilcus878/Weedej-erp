'use client'

import { TrendBadge } from './TrendBadge'
import type { KpiMetric } from '../types'

interface Props {
  metric:       KpiMetric
  icon:         React.ReactNode
  accent:       string   // e.g. "border-l-emerald-400"
  iconBg:       string   // e.g. "bg-emerald-50"
  invertColors?: boolean
  loading?:     boolean
}

export function KpiCard({ metric, icon, accent, iconBg, invertColors, loading }: Props) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm flex gap-4 items-start p-5 border-l-4 ${accent}`}>
      <div className={`flex-shrink-0 p-2.5 rounded-lg ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{metric.label}</p>
          {metric.comparison && !loading && (
            <TrendBadge comparison={metric.comparison} invertColors={invertColors} />
          )}
        </div>
        {loading ? (
          <div className="h-7 w-28 bg-gray-100 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-gray-900 leading-tight truncate">{metric.formatted}</p>
        )}
      </div>
    </div>
  )
}
