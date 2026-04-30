'use client'

import { ShoppingCart, TrendingUp, CreditCard } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend,
} from 'recharts'
import { KpiCard }    from '../KpiCard'
import { KpiGrid }    from '../KpiGrid'
import { ExportMenu } from '../ExportMenu'
import { formatPrice } from '@/lib/utils'
import type { SalesReport }        from '../../types'
import type { AnalyticsFilters }   from '../../types'

interface Props {
  report:  SalesReport | null
  filters: AnalyticsFilters
  loading: boolean
}

function EmptyKpi(label: string) {
  return { label, value: 0, formatted: '—' }
}

const STATUS_LABELS: Record<string, string> = {
  new:        'Nová',
  processing: 'Zpracovává se',
  shipped:    'Expedováno',
  completed:  'Dokončeno',
  storno:     'Storno',
}

export function SalesSection({ report, filters, loading }: Props) {
  const r = report

  const revenueData = r?.revenueChart ?? []
  const ordersData  = r?.ordersChart  ?? []
  const merged      = revenueData.map((pt, i) => ({ date: pt.date, revenue: pt.value, orders: ordersData[i]?.value ?? 0 }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Prodeje</h2>
        <ExportMenu section="sales" filters={filters} disabled={loading} />
      </div>

      <KpiGrid cols={3}>
        <KpiCard metric={r?.revenue       ?? EmptyKpi('Tržby')}               icon={<TrendingUp   className="h-5 w-5 text-emerald-600" />} accent="border-l-emerald-400" iconBg="bg-emerald-50" loading={loading} />
        <KpiCard metric={r?.orders        ?? EmptyKpi('Objednávky')}          icon={<ShoppingCart className="h-5 w-5 text-blue-600"    />} accent="border-l-blue-400"    iconBg="bg-blue-50"    loading={loading} />
        <KpiCard metric={r?.avgOrderValue ?? EmptyKpi('Průměrná objednávka')} icon={<CreditCard   className="h-5 w-5 text-orange-600"  />} accent="border-l-orange-400"  iconBg="bg-orange-50"  loading={loading} />
      </KpiGrid>

      {/* Revenue + Orders combo chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Tržby a objednávky</p>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={merged} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2E7D32" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2E7D32" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis yAxisId="rev" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v: number, name: string) => name === 'revenue' ? [formatPrice(v), 'Tržby'] : [v, 'Objednávky']} />
            <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#2E7D32" fill="url(#gradRevenue)" strokeWidth={2} dot={false} />
            <Bar  yAxisId="ord" dataKey="orders"  fill="#93c5fd" radius={[2, 2, 0, 0]} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Stav objednávek</p>
          <div className="space-y-2">
            {(r?.byStatus ?? []).map(s => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{STATUS_LABELS[s.status] ?? s.status}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{s.count} ks</span>
                  <span className="font-medium text-gray-900 w-24 text-right">{formatPrice(s.revenue)}</span>
                </div>
              </div>
            ))}
            {!r && loading && <div className="h-4 bg-gray-100 rounded animate-pulse" />}
          </div>
        </div>

        {/* Top customers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Top zákazníci</p>
          <div className="space-y-2">
            {(r?.topCustomers ?? []).slice(0, 8).map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate max-w-[160px]">{c.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">{c.orderCount}×</span>
                  <span className="font-medium text-gray-900 w-24 text-right">{formatPrice(c.revenue)}</span>
                </div>
              </div>
            ))}
            {!r && loading && <div className="h-4 bg-gray-100 rounded animate-pulse" />}
          </div>
        </div>
      </div>
    </div>
  )
}
