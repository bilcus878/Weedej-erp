'use client'

import { TrendingUp, ShoppingCart, CreditCard, Users } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { KpiCard }    from '../KpiCard'
import { KpiGrid }    from '../KpiGrid'
import { formatPrice } from '@/lib/utils'
import type { OverviewReport }   from '../../types'

interface Props {
  report:  OverviewReport | null
  loading: boolean
}

function EmptyKpi(label: string) { return { label, value: 0, formatted: '—' } }

export function OverviewSection({ report, loading }: Props) {
  const r = report
  const chartData = (r?.revenueChart ?? []).map((pt, i) => ({
    date:    pt.date,
    revenue: pt.value,
    orders:  r?.ordersChart[i]?.value ?? 0,
  }))

  return (
    <div className="space-y-6">
      <KpiGrid cols={4}>
        <KpiCard metric={r?.revenue       ?? EmptyKpi('Tržby')}              icon={<TrendingUp   className="h-5 w-5 text-emerald-600" />} accent="border-l-emerald-400" iconBg="bg-emerald-50" loading={loading} />
        <KpiCard metric={r?.orders        ?? EmptyKpi('Objednávky')}         icon={<ShoppingCart className="h-5 w-5 text-blue-600"    />} accent="border-l-blue-400"    iconBg="bg-blue-50"    loading={loading} />
        <KpiCard metric={r?.avgOrderValue ?? EmptyKpi('Prům. objednávka')}   icon={<CreditCard   className="h-5 w-5 text-orange-600"  />} accent="border-l-orange-400"  iconBg="bg-orange-50"  loading={loading} />
        <KpiCard metric={r?.newCustomers  ?? EmptyKpi('Noví zákazníci')}     icon={<Users        className="h-5 w-5 text-purple-600"  />} accent="border-l-purple-400"  iconBg="bg-purple-50"  loading={loading} />
      </KpiGrid>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Tržby v čase</p>
        {loading ? (
          <div className="h-52 bg-gray-50 rounded-lg animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradOverview" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2E7D32" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2E7D32" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [formatPrice(v), 'Tržby']} />
              <Area type="monotone" dataKey="revenue" stroke="#2E7D32" fill="url(#gradOverview)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
