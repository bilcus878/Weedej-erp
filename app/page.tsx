'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  useDashboard,
  KpiCards,
  UpcomingDueCard,
  RecentOrdersCard,
  LowStockCard,
  QuickNavCard,
} from '@/features/dashboard'

export default function DashboardPage() {
  const d = useDashboard()

  if (d.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          <p className="text-sm text-gray-500">Načítání dashboardu…</p>
        </div>
      </div>
    )
  }

  if (!d.stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-500 font-medium">Nepodařilo se načíst statistiky</p>
        </div>
      </div>
    )
  }

  const upcomingItems = d.upcomingDue as Parameters<typeof UpcomingDueCard>[0]['items']

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto">

      {/* KPI row */}
      <KpiCards
        stats={d.stats}
        overdueInvoices={d.overdueInvoices}
        orderStats={d.orderStats}
      />

      {/* Recent orders + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <RecentOrdersCard orders={d.recentOrders} />
        </div>
        <div className="lg:col-span-2">
          <UpcomingDueCard items={upcomingItems} overdueInvoices={d.overdueInvoices} />
        </div>
      </div>

      {/* Low stock + quick nav */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <LowStockCard items={d.lowStockItems} />
        <div className="lg:hidden">
          <QuickNavCard />
        </div>
      </div>

      {/* Quick navigation — full width on large screens */}
      <div className="hidden lg:block">
        <QuickNavCard />
      </div>

    </div>
  )
}
