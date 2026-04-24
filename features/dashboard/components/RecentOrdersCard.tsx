'use client'

import { ShoppingCart, ExternalLink, Clock, DollarSign, Package, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatPrice, formatDate } from '@/lib/utils'
import type { CustomerOrder } from '../types'

interface Props {
  orders: CustomerOrder[]
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'new':        return { icon: Clock,        color: 'text-yellow-600', bg: 'bg-yellow-100',  label: 'Nová' }
    case 'paid':       return { icon: DollarSign,   color: 'text-green-600',  bg: 'bg-green-100',   label: 'Zaplacena' }
    case 'processing': return { icon: Package,      color: 'text-blue-600',   bg: 'bg-blue-100',    label: 'Připravuje se' }
    case 'shipped':    return { icon: CheckCircle,  color: 'text-emerald-600',bg: 'bg-emerald-100', label: 'Odesláno' }
    case 'storno':     return { icon: XCircle,      color: 'text-red-600',    bg: 'bg-red-100',     label: 'Storno' }
    default:           return { icon: Clock,        color: 'text-gray-600',   bg: 'bg-gray-100',    label: status }
  }
}

export function RecentOrdersCard({ orders }: Props) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />Poslední objednávky zákazníků
          </h3>
          <a href="/customer-orders" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline">
            Zobrazit vše <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">Žádné objednávky</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {orders.map(order => {
              const status       = getStatusBadge(order.status)
              const StatusIcon   = status.icon
              const customerName = order.customer?.name || order.customerName || 'Anonymní'
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                  onClick={() => { window.location.href = `/customer-orders?highlight=${order.id}` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${status.bg}`}>
                      <StatusIcon className={`h-4 w-4 ${status.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{customerName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatPrice(Number(order.totalAmount || 0))}</p>
                    <p className="text-xs text-gray-500">{formatDate(order.orderDate)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
