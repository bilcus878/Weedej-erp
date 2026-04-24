'use client'

import { CreditCard, Banknote } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatPrice } from '@/lib/utils'
import type { DashboardStats } from '../types'

interface Props {
  stats:      DashboardStats
  paymentBar: { cash: number; card: number }
}

export function PaymentMethodsCard({ stats, paymentBar }: Props) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />Platební metody tento měsíc
          </h3>
          <p className="text-sm text-gray-500">Celkem: {formatPrice(stats.cashRevenue + stats.cardRevenue)}</p>
        </div>

        <div className="relative h-8 rounded-full overflow-hidden bg-gray-100 mb-3">
          <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700 flex items-center justify-center"
            style={{ width: `${paymentBar.card}%` }}>
            {paymentBar.card > 15 && <span className="text-white text-xs font-medium">Karta {paymentBar.card.toFixed(0)}%</span>}
          </div>
          <div className="absolute right-0 top-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 flex items-center justify-center"
            style={{ width: `${paymentBar.cash}%` }}>
            {paymentBar.cash > 15 && <span className="text-white text-xs font-medium">Hotovost {paymentBar.cash.toFixed(0)}%</span>}
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-blue-500" />
            <span className="text-gray-600">Karta:</span>
            <span className="font-semibold text-gray-900">{formatPrice(stats.cardRevenue)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-emerald-500" />
            <span className="text-gray-600">Hotovost:</span>
            <span className="font-semibold text-gray-900">{formatPrice(stats.cashRevenue)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
