'use client'

import { Clock, Package, Truck, XCircle } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { KpiCard }    from '../KpiCard'
import { KpiGrid }    from '../KpiGrid'
import { ExportMenu } from '../ExportMenu'
import type { OperationsReport } from '../../types'
import type { AnalyticsFilters } from '../../types'

interface Props {
  report:  OperationsReport | null
  filters: AnalyticsFilters
  loading: boolean
}

function EmptyKpi(label: string) { return { label, value: 0, formatted: '—' } }

const STATUS_LABELS: Record<string, string> = {
  new:        'Nová',
  processing: 'Zpracovává se',
  shipped:    'Expedováno',
  completed:  'Dokončeno',
  storno:     'Storno',
}

export function OperationsSection({ report, filters, loading }: Props) {
  const r = report

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Operace</h2>
        <ExportMenu section="operations" filters={filters} disabled={loading} />
      </div>

      <KpiGrid cols={4}>
        <KpiCard metric={r?.pendingOrders   ?? EmptyKpi('Čekající objednávky')} icon={<Package  className="h-5 w-5 text-orange-600"  />} accent="border-l-orange-400"  iconBg="bg-orange-50"  loading={loading} />
        <KpiCard metric={r?.avgFulfillmentH ?? EmptyKpi('Průměrná expedice')}   icon={<Clock    className="h-5 w-5 text-blue-600"    />} accent="border-l-blue-400"    iconBg="bg-blue-50"    loading={loading} />
        <KpiCard metric={r?.shippedInPeriod ?? EmptyKpi('Expedováno')}          icon={<Truck    className="h-5 w-5 text-emerald-600" />} accent="border-l-emerald-400" iconBg="bg-emerald-50" loading={loading} />
        <KpiCard metric={r?.cancelledOrders ?? EmptyKpi('Stornováno')}          icon={<XCircle  className="h-5 w-5 text-red-500"     />} accent="border-l-red-400"     iconBg="bg-red-50"     loading={loading} invertColors />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Expedice dle dne</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={r?.fulfillmentChart ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v: number) => [v, 'Expedováno']} />
              <Bar dataKey="value" fill="#2E7D32" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Stav objednávek v období</p>
          <div className="space-y-3 mt-2">
            {(r?.ordersByStatus ?? []).map(s => {
              const total = r?.ordersByStatus.reduce((a, b) => a + b.count, 0) ?? 1
              const pct   = total > 0 ? (s.count / total) * 100 : 0
              return (
                <div key={s.status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{STATUS_LABELS[s.status] ?? s.status}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{pct.toFixed(0)} %</span>
                      <span className="font-medium text-gray-900 w-8 text-right">{s.count}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {!r && loading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
