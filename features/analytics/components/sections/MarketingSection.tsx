'use client'

import { useState } from 'react'
import {
  Globe, ShoppingBag, MousePointerClick, TrendingUp,
  CreditCard, BarChart3, ChevronUp, ChevronDown, Minus,
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import { KpiCard }     from '../KpiCard'
import { KpiGrid }     from '../KpiGrid'
import { ExportMenu }  from '../ExportMenu'
import { formatPrice } from '@/lib/utils'
import type { MarketingReport } from '../../types'
import type { AnalyticsFilters } from '../../types'

// Brand-consistent palette — matches the ERP color system
const SOURCE_COLORS = [
  '#2E7D32', '#1976D2', '#F57C00', '#7B1FA2',
  '#C62828', '#00838F', '#558B2F', '#4527A0',
]
function sourceColor(idx: number) {
  return SOURCE_COLORS[idx % SOURCE_COLORS.length]
}

type SortKey = 'sessions' | 'purchases' | 'revenue' | 'convRate'

interface Props {
  report:  MarketingReport | null
  filters: AnalyticsFilters
  loading: boolean
}

export function MarketingSection({ report, filters, loading }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('sessions')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Marketing</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 animate-pulse h-[88px]" />
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse h-52" />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse h-48" />
      </div>
    )
  }

  if (!report) return null

  // ── Derived values ───────────────────────────────────────────────────────────
  const sorted = [...report.trafficSources].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey]
    return sortDir === 'asc' ? diff : -diff
  })
  const maxRevenue     = Math.max(...report.trafficSources.map(s => s.revenue), 0)
  const funnelMax      = report.funnel[0]?.sessions ?? 1
  const totalSessions  = report.trafficSources.reduce((s, ts) => s + ts.sessions, 0)

  // ── Auto-insights ────────────────────────────────────────────────────────────
  const insights: string[] = []

  const drops = report.funnel.slice(1).map((s, idx) => ({
    from: report.funnel[idx].step,
    to:   s.step,
    pct:  s.stepConvPct ?? 100,
  }))
  const worstDrop = [...drops].sort((a, b) => a.pct - b.pct)[0]
  if (worstDrop) {
    insights.push(
      `Největší pokles nastává mezi „${worstDrop.from}" → „${worstDrop.to}" — pouze ${worstDrop.pct} % uživatelů postoupilo dál.`
    )
  }

  const qualifiedSources = report.trafficSources.filter(s => s.sessions >= 5)
  const bestSource  = [...qualifiedSources].sort((a, b) => b.convRate - a.convRate)[0]
  const worstSource = [...qualifiedSources].sort((a, b) => a.convRate - b.convRate)[0]

  if (bestSource) {
    insights.push(
      `Nejlépe konvertující zdroj je „${bestSource.source}" s ${bestSource.convRate.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} % konverzí (${bestSource.purchases} nákupů z ${bestSource.sessions.toLocaleString('cs-CZ')} sessions).`
    )
  }
  if (report.avgOrderValue.comparison) {
    const c   = report.avgOrderValue.comparison
    const dir = c.direction === 'up' ? 'vzrostla' : c.direction === 'down' ? 'klesla' : 'zůstala stejná'
    insights.push(
      `Průměrná hodnota objednávky ${dir} oproti předchozímu období — aktuálně ${report.avgOrderValue.formatted}.`
    )
  }
  if (worstSource && bestSource && worstSource.source !== bestSource.source) {
    insights.push(
      `Nejnižší konverzní poměr má zdroj „${worstSource.source}" (${worstSource.convRate.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} %) — zvažte optimalizaci nebo pozastavení kampaní z tohoto zdroje.`
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Section header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Marketing</h2>
        <ExportMenu section="marketing" filters={filters} />
      </div>

      {/* ── 6 KPI cards ────────────────────────────────────────────────────── */}
      <KpiGrid cols={3}>
        <KpiCard
          metric={report.totalSessions}
          icon={<Globe className="h-5 w-5 text-emerald-600" />}
          accent="border-l-emerald-400" iconBg="bg-emerald-50"
        />
        <KpiCard
          metric={report.totalPageViews}
          icon={<MousePointerClick className="h-5 w-5 text-blue-600" />}
          accent="border-l-blue-400" iconBg="bg-blue-50"
        />
        <KpiCard
          metric={report.purchaseSessions}
          icon={<ShoppingBag className="h-5 w-5 text-purple-600" />}
          accent="border-l-purple-400" iconBg="bg-purple-50"
        />
        <KpiCard
          metric={report.overallConvRate}
          icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
          accent="border-l-orange-400" iconBg="bg-orange-50"
        />
        <KpiCard
          metric={report.avgOrderValue}
          icon={<CreditCard className="h-5 w-5 text-teal-600" />}
          accent="border-l-teal-400" iconBg="bg-teal-50"
        />
        <KpiCard
          metric={report.totalRevenue}
          icon={<BarChart3 className="h-5 w-5 text-indigo-600" />}
          accent="border-l-indigo-400" iconBg="bg-indigo-50"
        />
      </KpiGrid>

      {/* ── Funnel ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-5">Konverzní trychtýř</h3>
        <div className="space-y-3">
          {report.funnel.map((step, idx) => {
            const barPct   = funnelMax > 0 ? Math.max(3, (step.sessions / funnelMax) * 100) : 3
            const convPct  = step.stepConvPct ?? 100
            const convCls  =
              idx === 0   ? 'text-emerald-600 font-semibold' :
              convPct >= 50 ? 'text-emerald-600' :
              convPct >= 25 ? 'text-orange-500'  : 'text-red-500'

            return (
              <div key={step.step} className="flex items-center gap-3">
                <div className="w-44 text-sm text-gray-500 text-right shrink-0">{step.step}</div>
                <div className="flex-1 h-8 bg-gray-50 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg flex items-center px-3"
                    style={{
                      width:      `${barPct}%`,
                      background: 'linear-gradient(90deg, #2E7D32 0%, #4CAF50 100%)',
                      transition: 'width 0.5s ease',
                    }}
                  >
                    <span className="text-white text-xs font-semibold whitespace-nowrap">
                      {step.sessions.toLocaleString('cs-CZ')}
                    </span>
                  </div>
                </div>
                <div className={`w-16 text-sm text-right shrink-0 ${convCls}`}>
                  {idx === 0 ? '100 %' : `${convPct} %`}
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          % = podíl uživatelů, kteří postoupili z předchozího kroku
        </p>
      </div>

      {/* ── Traffic table + donut ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Sortable table */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Zdroje návštěvnosti</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide text-left">
                  <th className="pb-2 font-semibold">Zdroj</th>
                  {([
                    { key: 'sessions'  as SortKey, label: 'Sessions' },
                    { key: 'purchases' as SortKey, label: 'Nákupy'   },
                    { key: 'revenue'   as SortKey, label: 'Tržby'    },
                    { key: 'convRate'  as SortKey, label: 'Conv. %'  },
                  ]).map(col => (
                    <th
                      key={col.key}
                      className="pb-2 font-semibold text-right cursor-pointer hover:text-gray-600 select-none"
                      onClick={() => toggleSort(col.key)}
                    >
                      <span className="inline-flex items-center justify-end gap-0.5">
                        {col.label}
                        {sortKey === col.key
                          ? sortDir === 'desc'
                            ? <ChevronDown className="h-3 w-3" />
                            : <ChevronUp   className="h-3 w-3" />
                          : <Minus className="h-3 w-3 opacity-20" />
                        }
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(ts => {
                  const originalIdx = report.trafficSources.findIndex(s => s.source === ts.source)
                  const color       = sourceColor(originalIdx)
                  const isBest      = ts.revenue === maxRevenue && maxRevenue > 0
                  return (
                    <tr
                      key={ts.source}
                      className={`border-b border-gray-50 transition-colors hover:bg-gray-50 ${isBest ? 'bg-emerald-50/50' : ''}`}
                    >
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ background: color }}
                          />
                          <span className="font-medium text-gray-800">{ts.source}</span>
                          {isBest && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-full leading-none">
                              top
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-gray-600">{ts.sessions.toLocaleString('cs-CZ')}</td>
                      <td className="py-2.5 text-right text-gray-600">{ts.purchases.toLocaleString('cs-CZ')}</td>
                      <td className="py-2.5 text-right text-gray-600">
                        {ts.revenue.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
                      </td>
                      <td className="py-2.5 text-right text-gray-600">
                        {ts.convRate.toLocaleString('cs-CZ', { maximumFractionDigits: 2 })} %
                      </td>
                    </tr>
                  )
                })}
                {report.trafficSources.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400 text-sm">
                      Žádná data pro vybrané období
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Donut + legend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Podíl zdrojů</h3>
          {report.trafficSources.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={report.trafficSources}
                    dataKey="sessions"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={78}
                    strokeWidth={2}
                    stroke="#fff"
                    paddingAngle={2}
                  >
                    {report.trafficSources.map((_, idx) => (
                      <Cell key={idx} fill={sourceColor(idx)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${v.toLocaleString('cs-CZ')} sessions`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {report.trafficSources.map((ts, idx) => {
                  const pct = totalSessions > 0
                    ? Math.round((ts.sessions / totalSessions) * 100)
                    : 0
                  return (
                    <div key={ts.source} className="flex items-center justify-between text-sm gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: sourceColor(idx) }}
                        />
                        <span className="text-gray-600 truncate">{ts.source}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-400 text-xs">{ts.sessions.toLocaleString('cs-CZ')}</span>
                        <span className="text-gray-700 font-medium text-xs w-9 text-right">{pct} %</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
              Žádná data
            </div>
          )}
        </div>
      </div>

      {/* ── Campaign performance bar chart ─────────────────────────────────── */}
      {report.campaigns.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Výkonnost kampaní</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={report.campaigns.slice(0, 10)}
              margin={{ left: 8, right: 8, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="campaign" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
              />
              <Tooltip
                formatter={(v: number, name: string) =>
                  name === 'revenue'
                    ? [formatPrice(v), 'Tržby']
                    : [v.toLocaleString('cs-CZ'), name === 'sessions' ? 'Sessions' : 'Nákupy']
                }
              />
              <Legend
                formatter={v => v === 'revenue' ? 'Tržby' : v === 'sessions' ? 'Sessions' : 'Nákupy'}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="revenue"   name="revenue"   fill="#2E7D32" radius={[3, 3, 0, 0]} />
              <Bar dataKey="sessions"  name="sessions"  fill="#81C784" radius={[3, 3, 0, 0]} />
              <Bar dataKey="purchases" name="purchases" fill="#4CAF50" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Attribution table ───────────────────────────────────────────────── */}
      {report.attribution.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Atribuce zdrojů</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide text-left">
                  <th className="pb-2 font-semibold">Zdroj</th>
                  <th className="pb-2 font-semibold text-right">1. dotyk — tržby</th>
                  <th className="pb-2 font-semibold text-right">1. dotyk — obj.</th>
                  <th className="pb-2 font-semibold text-right">Posl. dotyk — tržby</th>
                  <th className="pb-2 font-semibold text-right">Posl. dotyk — obj.</th>
                </tr>
              </thead>
              <tbody>
                {report.attribution.map(row => (
                  <tr key={row.source} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-800">{row.source}</td>
                    <td className="py-2.5 text-right text-gray-600">
                      {row.firstTouchRev.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
                    </td>
                    <td className="py-2.5 text-right text-gray-600">{row.firstTouchOrds}</td>
                    <td className="py-2.5 text-right text-gray-600">
                      {row.lastTouchRev.toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} Kč
                    </td>
                    <td className="py-2.5 text-right text-gray-600">{row.lastTouchOrds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Auto insights panel ─────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Automatické poznatky</h3>
          <ul className="space-y-3">
            {insights.map((text, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  )
}
