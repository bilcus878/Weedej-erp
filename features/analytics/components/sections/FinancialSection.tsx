'use client'

import { DollarSign, FileText, AlertTriangle } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts'
import { KpiCard }    from '../KpiCard'
import { KpiGrid }    from '../KpiGrid'
import { ExportMenu } from '../ExportMenu'
import { formatPrice } from '@/lib/utils'
import type { FinancialReport }  from '../../types'
import type { AnalyticsFilters } from '../../types'

interface Props {
  report:  FinancialReport | null
  filters: AnalyticsFilters
  loading: boolean
}

function EmptyKpi(label: string) { return { label, value: 0, formatted: '—' } }

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid:      'Zaplaceno',
  pending:   'Čeká',
  overdue:   'Po splatnosti',
  cancelled: 'Zrušeno',
}

const PIE_COLORS = ['#2E7D32', '#93c5fd']

export function FinancialSection({ report, filters, loading }: Props) {
  const r = report

  const cashCardData = r
    ? [{ name: 'Hotovost', value: r.cashVsCard.cash }, { name: 'Karta', value: r.cashVsCard.card }]
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Finance</h2>
        <ExportMenu section="financial" filters={filters} disabled={loading} />
      </div>

      <KpiGrid cols={3}>
        <KpiCard metric={r?.cashRevenue    ?? EmptyKpi('Tržby (cash)')}     icon={<DollarSign     className="h-5 w-5 text-emerald-600" />} accent="border-l-emerald-400" iconBg="bg-emerald-50" loading={loading} />
        <KpiCard metric={r?.accrualRevenue ?? EmptyKpi('Tržby (faktury)')}  icon={<FileText       className="h-5 w-5 text-blue-600"    />} accent="border-l-blue-400"    iconBg="bg-blue-50"    loading={loading} />
        <KpiCard metric={r?.overdueAmount  ?? EmptyKpi('Po splatnosti')}    icon={<AlertTriangle  className="h-5 w-5 text-red-500"     />} accent="border-l-red-400"     iconBg="bg-red-50"     loading={loading} invertColors />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Denní tržby (transakce)</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={r?.revenueByDay ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradFin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2E7D32" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2E7D32" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [formatPrice(v), 'Tržby']} />
              <Area type="monotone" dataKey="value" stroke="#2E7D32" fill="url(#gradFin)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
          <p className="text-sm font-semibold text-gray-700">Hotovost vs karta</p>
          {cashCardData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={cashCardData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                  {cashCardData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatPrice(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Žádná data</div>
          )}

          {/* Invoice status breakdown */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Faktury dle stavu</p>
            <div className="space-y-1.5">
              {(r?.invoicesByStatus ?? []).map(s => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{PAYMENT_STATUS_LABELS[s.status] ?? s.status}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{s.count} ks</span>
                    <span className="font-medium text-gray-900 w-24 text-right">{formatPrice(s.amount)}</span>
                  </div>
                </div>
              ))}
              {!r && loading && <div className="h-4 bg-gray-100 rounded animate-pulse" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
