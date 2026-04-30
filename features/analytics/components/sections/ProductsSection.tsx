'use client'

import { Package, Hash } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { KpiCard }    from '../KpiCard'
import { KpiGrid }    from '../KpiGrid'
import { ExportMenu } from '../ExportMenu'
import { formatPrice } from '@/lib/utils'
import type { ProductsReport }   from '../../types'
import type { AnalyticsFilters } from '../../types'

interface Props {
  report:  ProductsReport | null
  filters: AnalyticsFilters
  loading: boolean
}

function EmptyKpi(label: string) { return { label, value: 0, formatted: '—' } }

const COLORS = ['#2E7D32', '#4CAF50', '#81C784', '#A5D6A7', '#C8E6C9', '#66BB6A', '#388E3C']

export function ProductsSection({ report, filters, loading }: Props) {
  const r = report

  const topRevenueData = (r?.topByRevenue ?? []).slice(0, 10).map(p => ({
    name:    p.productName.length > 20 ? `${p.productName.slice(0, 18)}…` : p.productName,
    revenue: p.revenue,
  }))

  const catData = (r?.categoryBreakdown ?? []).map(c => ({
    name:  c.category,
    value: c.revenue,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Produkty</h2>
        <ExportMenu section="products" filters={filters} disabled={loading} />
      </div>

      <KpiGrid cols={2}>
        <KpiCard metric={r?.totalSold      ?? EmptyKpi('Prodáno celkem')}     icon={<Hash    className="h-5 w-5 text-emerald-600" />} accent="border-l-emerald-400" iconBg="bg-emerald-50" loading={loading} />
        <KpiCard metric={r?.uniqueProducts ?? EmptyKpi('Unikátní produkty')}  icon={<Package className="h-5 w-5 text-blue-600"    />} accent="border-l-blue-400"    iconBg="bg-blue-50"    loading={loading} />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Top produkty dle tržeb</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topRevenueData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={110} />
              <Tooltip formatter={(v: number) => [formatPrice(v), 'Tržby']} />
              <Bar dataKey="revenue" radius={[0, 3, 3, 0]}>
                {topRevenueData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Tržby dle kategorie</p>
          {catData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false} fontSize={10}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatPrice(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-gray-400">Žádná data</div>
          )}
        </div>
      </div>

      {/* Top by qty table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Top produkty dle množství</p>
        <div className="space-y-2">
          {(r?.topByQty ?? []).slice(0, 10).map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-gray-400 w-5">{i + 1}.</span>
                <span className="text-gray-700 truncate">{p.productName}</span>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-gray-400 text-xs">{p.quantity.toFixed(1)} ks</span>
                <span className="font-semibold text-gray-900 w-24 text-right">{formatPrice(p.revenue)}</span>
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
