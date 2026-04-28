'use client'

import { TrendingUp, Warehouse, AlertCircle, CheckCircle, DollarSign, ShoppingCart } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { DashboardStats, OverdueSummary, OrderStats } from '../types'

interface Props {
  stats:           DashboardStats
  overdueInvoices: OverdueSummary
  orderStats:      OrderStats
}

interface StatCardProps {
  label:   string
  value:   string
  sub:     string
  icon:    React.ReactNode
  accent:  string
  iconBg:  string
}

function StatCard({ label, value, sub, icon, accent, iconBg }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm flex gap-4 items-start p-5 border-l-4 ${accent}`}>
      <div className={`flex-shrink-0 p-2.5 rounded-lg ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight truncate">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  )
}

export function KpiCards({ stats, overdueInvoices, orderStats }: Props) {
  const alertCount = stats.lowStockCount + stats.outOfStockCount + overdueInvoices.total

  const alertSub = alertCount > 0
    ? [
        stats.outOfStockCount > 0 && `${stats.outOfStockCount} vyprodáno`,
        stats.lowStockCount   > 0 && `${stats.lowStockCount} nízký stav`,
        overdueInvoices.total > 0 && `${overdueInvoices.total} po splatnosti`,
      ].filter(Boolean).join(' · ')
    : 'Vše v pořádku'

  const orderSub = [
    orderStats.newCount        > 0 && `${orderStats.newCount} nových`,
    orderStats.processingCount > 0 && `${orderStats.processingCount} k expedici`,
  ].filter(Boolean).join(' · ') || `${orderStats.total} celkem`

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        label="Tržby dnes"
        value={formatPrice(stats.todayRevenue)}
        sub={`${stats.todayTransactionCount} transakcí`}
        icon={<DollarSign className="h-5 w-5 text-orange-600" />}
        accent="border-l-orange-400"
        iconBg="bg-orange-50"
      />
      <StatCard
        label="Tržby tento měsíc"
        value={formatPrice(stats.monthRevenue)}
        sub={`${stats.monthTransactionCount} transakcí`}
        icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
        accent="border-l-emerald-400"
        iconBg="bg-emerald-50"
      />
      <StatCard
        label="Hodnota skladu"
        value={formatPrice(stats.totalInventoryValue)}
        sub={`${stats.productCount} produktů`}
        icon={<Warehouse className="h-5 w-5 text-slate-600" />}
        accent="border-l-slate-400"
        iconBg="bg-slate-50"
      />
      <StatCard
        label="Objednávky"
        value={String(orderStats.total)}
        sub={orderSub}
        icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
        accent="border-l-blue-400"
        iconBg="bg-blue-50"
      />
    </div>
  )
}

export function AlertKpiCard({ stats, overdueInvoices }: Pick<Props, 'stats' | 'overdueInvoices'>) {
  const alertCount = stats.lowStockCount + stats.outOfStockCount + overdueInvoices.total
  const alertSub = alertCount > 0
    ? [
        stats.outOfStockCount > 0 && `${stats.outOfStockCount} vyprodáno`,
        stats.lowStockCount   > 0 && `${stats.lowStockCount} nízký stav`,
        overdueInvoices.total > 0 && `${overdueInvoices.total} po splatnosti`,
      ].filter(Boolean).join(' · ')
    : 'Vše v pořádku'

  return (
    <StatCard
      label="Upozornění"
      value={alertCount > 0 ? String(alertCount) : 'OK'}
      sub={alertSub}
      icon={alertCount > 0
        ? <AlertCircle className="h-5 w-5 text-red-500" />
        : <CheckCircle className="h-5 w-5 text-emerald-500" />}
      accent={alertCount > 0 ? 'border-l-red-400' : 'border-l-emerald-400'}
      iconBg={alertCount > 0 ? 'bg-red-50' : 'bg-emerald-50'}
    />
  )
}
