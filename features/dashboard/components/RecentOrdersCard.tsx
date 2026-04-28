'use client'

import { ShoppingCart, ArrowRight } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import type { CustomerOrder } from '../types'

const STATUS: Record<string, { label: string; cls: string }> = {
  new:        { label: 'Nová',        cls: 'bg-amber-100 text-amber-700' },
  paid:       { label: 'Zaplacena',   cls: 'bg-emerald-100 text-emerald-700' },
  processing: { label: 'K expedici',  cls: 'bg-blue-100 text-blue-700' },
  shipped:    { label: 'Odesláno',    cls: 'bg-teal-100 text-teal-700' },
  storno:     { label: 'Storno',      cls: 'bg-red-100 text-red-500' },
}

export function RecentOrdersCard({ orders }: { orders: CustomerOrder[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-orange-50 rounded-lg">
            <ShoppingCart className="h-4 w-4 text-orange-600" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Poslední objednávky</span>
        </div>
        <a href="/customer-orders" className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors">
          Zobrazit vše <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">Žádné objednávky</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {orders.map(order => {
            const s = STATUS[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-600' }
            const customer = order.customer?.name || order.customerName || 'Anonymní'
            return (
              <a
                key={order.id}
                href={`/customer-orders?highlight=${order.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${s.cls}`}>
                      {s.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{customer}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{formatPrice(Number(order.totalAmount || 0))}</p>
                  <p className="text-xs text-gray-400">{formatDate(order.orderDate)}</p>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
