'use client'

import { Globe, ShoppingBag, MousePointerClick, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { KpiCard }    from '../KpiCard'
import { KpiGrid }    from '../KpiGrid'
import { ExportMenu } from '../ExportMenu'
import type { MarketingReport }    from '../../types'
import type { AnalyticsFilters }  from '../../types'

const COLORS = ['#2E7D32', '#4CAF50', '#81C784', '#A5D6A7', '#C8E6C9', '#388E3C', '#66BB6A']

interface Props {
  report:  MarketingReport | null
  filters: AnalyticsFilters
  loading: boolean
}

export function MarketingSection({ report, filters, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 animate-pulse h-28" />
          ))}
        </div>
      </div>
    )
  }

  if (!report) return null

  const funnelMax = report.funnel[0]?.sessions ?? 1

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <KpiGrid cols={4}>
        <KpiCard metric={report.totalSessions}    icon={<Globe            size={20} />} accent="border-green-600"  iconBg="bg-green-50"  />
        <KpiCard metric={report.totalPageViews}   icon={<MousePointerClick size={20} />} accent="border-blue-500"   iconBg="bg-blue-50"   />
        <KpiCard metric={report.purchaseSessions} icon={<ShoppingBag      size={20} />} accent="border-purple-500" iconBg="bg-purple-50" />
        <KpiCard metric={report.overallConvRate}  icon={<TrendingUp       size={20} />} accent="border-orange-500" iconBg="bg-orange-50" />
      </KpiGrid>

      {/* Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Konverzní trychtýř</h3>
        </div>
        <div className="space-y-2">
          {report.funnel.map((step, idx) => (
            <div key={step.step} className="flex items-center gap-3">
              <div className="w-36 text-sm text-gray-600 text-right shrink-0">{step.step}</div>
              <div className="flex-1 relative h-8">
                <div
                  className="absolute inset-y-0 left-0 rounded flex items-center px-3 text-sm font-medium text-white"
                  style={{
                    width:      `${Math.max(4, (step.sessions / funnelMax) * 100)}%`,
                    background: idx === 0 ? '#2E7D32' : `hsl(${140 - idx * 18}, 60%, ${40 + idx * 5}%)`,
                  }}
                >
                  {step.sessions.toLocaleString('cs-CZ')}
                </div>
              </div>
              {step.dropoffPct !== undefined && (
                <div className="w-20 text-sm text-red-500 text-right shrink-0">
                  −{step.dropoffPct} %
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Traffic sources + pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Zdroje návštěvnosti</h3>
            <ExportMenu section="marketing" filters={filters} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-left">
                  <th className="pb-2 font-medium">Zdroj</th>
                  <th className="pb-2 font-medium text-right">Sessions</th>
                  <th className="pb-2 font-medium text-right">Nákupy</th>
                  <th className="pb-2 font-medium text-right">Tržby</th>
                  <th className="pb-2 font-medium text-right">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {report.trafficSources.map(ts => (
                  <tr key={ts.source} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-800">{ts.source}</td>
                    <td className="py-2 text-right text-gray-600">{ts.sessions.toLocaleString('cs-CZ')}</td>
                    <td className="py-2 text-right text-gray-600">{ts.purchases}</td>
                    <td className="py-2 text-right text-gray-600">
                      {ts.revenue.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
                    </td>
                    <td className="py-2 text-right text-gray-600">{ts.convRate} %</td>
                  </tr>
                ))}
                {report.trafficSources.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-gray-400">Žádná data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Podíl zdrojů (sessions)</h3>
          {report.trafficSources.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={report.trafficSources}
                  dataKey="sessions"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ source, percent }) => `${source} ${Math.round(percent * 100)}%`}
                  labelLine={false}
                >
                  {report.trafficSources.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => v.toLocaleString('cs-CZ')} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400">Žádná data</div>
          )}
        </div>
      </div>

      {/* Campaigns bar chart */}
      {report.campaigns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Výkonnost kampaní (tržby)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.campaigns.slice(0, 10)} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="campaign" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number, name: string) =>
                  name === 'revenue'
                    ? [`${v.toLocaleString('cs-CZ')} Kč`, 'Tržby']
                    : [v, name === 'sessions' ? 'Sessions' : 'Nákupy']
                }
              />
              <Legend formatter={(v) => v === 'revenue' ? 'Tržby' : v === 'sessions' ? 'Sessions' : 'Nákupy'} />
              <Bar dataKey="revenue"   name="revenue"   fill="#2E7D32" radius={[3,3,0,0]} />
              <Bar dataKey="sessions"  name="sessions"  fill="#81C784" radius={[3,3,0,0]} />
              <Bar dataKey="purchases" name="purchases" fill="#4CAF50" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Attribution table */}
      {report.attribution.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Atribuce zdrojů</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-left">
                  <th className="pb-2 font-medium">Zdroj</th>
                  <th className="pb-2 font-medium text-right">1. dotyk — tržby</th>
                  <th className="pb-2 font-medium text-right">1. dotyk — obj.</th>
                  <th className="pb-2 font-medium text-right">Posl. dotyk — tržby</th>
                  <th className="pb-2 font-medium text-right">Posl. dotyk — obj.</th>
                </tr>
              </thead>
              <tbody>
                {report.attribution.map(row => (
                  <tr key={row.source} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-800">{row.source}</td>
                    <td className="py-2 text-right text-gray-600">
                      {row.firstTouchRev.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
                    </td>
                    <td className="py-2 text-right text-gray-600">{row.firstTouchOrds}</td>
                    <td className="py-2 text-right text-gray-600">
                      {row.lastTouchRev.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
                    </td>
                    <td className="py-2 text-right text-gray-600">{row.lastTouchOrds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
