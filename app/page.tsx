'use client'

import { AlertTriangle } from 'lucide-react'
import {
  useDashboard,
  KpiCards, PaymentMethodsCard,
  UpcomingDueCard, RecentInvoicesCard,
  RecentOrdersCard, QuickNavCard,
} from '@/features/dashboard'

export default function DashboardPage() {
  const d = useDashboard()

  if (d.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Načítání dashboardu...</p>
        </div>
      </div>
    )
  }

  if (!d.stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 font-medium">Nepodařilo se načíst statistiky</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <KpiCards
        stats={d.stats}
        overdueInvoices={d.overdueInvoices}
        invoiceBalance={d.invoiceBalance}
        orderStats={d.orderStats}
        paymentBar={d.paymentBar}
      />

      <PaymentMethodsCard stats={d.stats} paymentBar={d.paymentBar} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingDueCard items={d.upcomingDue as Parameters<typeof UpcomingDueCard>[0]['items']} />
        <RecentInvoicesCard invoices={d.recentInvoices} />
      </div>

      <RecentOrdersCard orders={d.recentOrders} />

      <QuickNavCard />
    </div>
  )
}
