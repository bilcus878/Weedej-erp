'use client'

import { Users, UserPlus, RefreshCw, DollarSign, Percent } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { KpiCard }    from '../KpiCard'
import { KpiGrid }    from '../KpiGrid'
import { ExportMenu } from '../ExportMenu'
import { formatPrice } from '@/lib/utils'
import type { CustomersReport }  from '../../types'
import type { AnalyticsFilters } from '../../types'

interface Props {
  report:  CustomersReport | null
  filters: AnalyticsFilters
  loading: boolean
}

function EmptyKpi(label: string) {
  return { label, value: 0, formatted: '—' }
}

export function CustomersSection({ report, filters, loading }: Props) {
  const r = report

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Zákazníci</h2>
        <ExportMenu section="customers" filters={filters} disabled={loading} />
      </div>

      <KpiGrid cols={5}>
        <KpiCard metric={r?.total         ?? EmptyKpi('Celkem zákazníků')} icon={<Users     className="h-5 w-5 text-slate-600"   />} accent="border-l-slate-400"   iconBg="bg-slate-50"   loading={loading} />
        <KpiCard metric={r?.newInPeriod   ?? EmptyKpi('Noví za období')}   icon={<UserPlus  className="h-5 w-5 text-emerald-600" />} accent="border-l-emerald-400" iconBg="bg-emerald-50" loading={loading} />
        <KpiCard metric={r?.returning     ?? EmptyKpi('Vracející se')}      icon={<RefreshCw className="h-5 w-5 text-blue-600"   />} accent="border-l-blue-400"    iconBg="bg-blue-50"    loading={loading} />
        <KpiCard metric={r?.avgLtv        ?? EmptyKpi('Průměr. LTV')}       icon={<DollarSign className="h-5 w-5 text-orange-600" />} accent="border-l-orange-400"  iconBg="bg-orange-50"  loading={loading} />
        <KpiCard metric={r?.retentionRate ?? EmptyKpi('Míra retence')}      icon={<Percent   className="h-5 w-5 text-purple-600" />} accent="border-l-purple-400"  iconBg="bg-purple-50"  loading={loading} />
      </KpiGrid>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Noví zákazníci — denní trend</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={r?.newByDay ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradCust" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v: number) => [v, 'Noví zákazníci']} />
            <Area type="monotone" dataKey="value" stroke="#7c3aed" fill="url(#gradCust)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Top zákazníci dle tržeb</p>
        <div className="space-y-2">
          {(r?.topByRevenue ?? []).map((c, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-gray-400 w-5 flex-shrink-0">{i + 1}.</span>
                <span className="text-gray-700 truncate">{c.name}</span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-gray-400 text-xs">{c.orderCount} obj. · {c.lastOrder}</span>
                <span className="font-semibold text-gray-900 w-28 text-right">{formatPrice(c.revenue)}</span>
              </div>
            </div>
          ))}
          {!r && loading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
