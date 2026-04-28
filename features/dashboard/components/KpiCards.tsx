'use client'

import { TrendingUp, TrendingDown, Minus, Warehouse, ShoppingCart, DollarSign } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { DashboardStats, OrderStats } from '../types'

interface Props {
  stats:          DashboardStats
  orderStats:     OrderStats
  revenueContext: { pct: number; label: string; dir: 'up' | 'down' | 'flat' } | null
}

function StatCard({
  label, value, sub, icon, accent, iconBg, badge,
}: {
  label:   string
  value:   string
  sub:     string
  icon:    React.ReactNode
  accent:  string
  iconBg:  string
  badge?:  React.ReactNode
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm flex gap-4 items-start p-5 border-l-4 ${accent}`}>
      <div className={`flex-shrink-0 p-2.5 rounded-lg ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
          {badge}
        </div>
        <p className="text-2xl font-bold text-gray-900 leading-tight truncate">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  )
}

function RevenueBadge({ ctx }: { ctx: NonNullable<Props['revenueContext']> }) {
  const cls =
    ctx.dir === 'up'   ? 'bg-emerald-50 text-emerald-600' :
    ctx.dir === 'down' ? 'bg-red-50 text-red-500' :
                         'bg-gray-100 text-gray-500'
  const Icon = ctx.dir === 'up' ? TrendingUp : ctx.dir === 'down' ? TrendingDown : Minus
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>
      <Icon className="h-2.5 w-2.5" />
      {ctx.label}
    </span>
  )
}

export function KpiCards({ stats, orderStats, revenueContext }: Props) {
  const orderSub = [
    orderStats.newCount        > 0 && `${orderStats.newCount} nových`,
    orderStats.processingCount > 0 && `${orderStats.processingCount} k expedici`,
  ].filter(Boolean).join(' · ') || `celkem ${orderStats.total}`

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Tržby dnes"
        value={formatPrice(stats.todayRevenue)}
        sub={`${stats.todayTransactionCount} transakcí`}
        icon={<DollarSign className="h-5 w-5 text-orange-600" />}
        accent="border-l-orange-400"
        iconBg="bg-orange-50"
        badge={revenueContext ? <RevenueBadge ctx={revenueContext} /> : undefined}
      />
      <StatCard
        label="Tržby tento měsíc"
        value={formatPrice(stats.monthRevenue)}
        sub={`${stats.monthTransactionCount} transakcí · průměr ${formatPrice(stats.avgDailyRevenue)}/den`}
        icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
        accent="border-l-emerald-400"
        iconBg="bg-emerald-50"
      />
      <StatCard
        label="Hodnota skladu"
        value={formatPrice(stats.totalInventoryValue)}
        sub={`${stats.productCount} produktů · ${stats.outOfStockCount} vyprodáno · ${stats.lowStockCount} nízký stav`}
        icon={<Warehouse className="h-5 w-5 text-slate-600" />}
        accent="border-l-slate-400"
        iconBg="bg-slate-50"
      />
      <StatCard
        label="Objednávky zákazníků"
        value={String(orderStats.total)}
        sub={orderSub}
        icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
        accent="border-l-blue-400"
        iconBg="bg-blue-50"
      />
    </div>
  )
}
