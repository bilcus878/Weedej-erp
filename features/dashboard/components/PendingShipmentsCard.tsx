'use client'

import { Send, ArrowRight, Globe, CheckCircle } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import type { PendingShipmentOrder } from '../types'

function statusLabel(status: string) {
  if (status === 'paid')       return { label: 'Zaplacena',   cls: 'bg-emerald-100 text-emerald-700' }
  if (status === 'processing') return { label: 'Připravuje se', cls: 'bg-blue-100 text-blue-700' }
  return                              { label: status,         cls: 'bg-gray-100 text-gray-600' }
}

export function PendingShipmentsCard({ orders }: { orders: PendingShipmentOrder[] }) {
  const eshopCount = orders.filter(o => o.source === 'eshop').length

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${orders.length > 0 ? 'bg-orange-50' : 'bg-emerald-50'}`}>
            <Send className={`h-4 w-4 ${orders.length > 0 ? 'text-orange-600' : 'text-emerald-500'}`} />
          </div>
          <span className="text-sm font-semibold text-gray-900">Čeká na expedici</span>
          {orders.length > 0 && (
            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
              {orders.length}
            </span>
          )}
          {eshopCount > 0 && (
            <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Globe className="h-2.5 w-2.5" />{eshopCount} e-shop
            </span>
          )}
        </div>
        <a href="/delivery-notes" className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors">
          Výdejky <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-emerald-600">
          <CheckCircle className="h-8 w-8 mb-2 opacity-70" />
          <p className="text-sm font-medium">Žádné objednávky k expedici</p>
          <p className="text-xs text-gray-400 mt-0.5">Všechny objednávky jsou vyskladněné</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 overflow-y-auto max-h-80">
          {orders.map(order => {
            const customer  = order.customer?.name || order.customerName || 'Anonymní'
            const itemCount = order.items.filter(i => i.productId !== null).length
            const isEshop   = order.source === 'eshop'
            const st        = statusLabel(order.status)
            return (
              <a
                key={order.id}
                href={`/customer-orders?highlight=${order.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{order.orderNumber}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${st.cls}`}>
                      {st.label}
                    </span>
                    {isEshop && (
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Globe className="h-2.5 w-2.5" />E-shop
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {customer} · {itemCount} {itemCount === 1 ? 'položka' : itemCount < 5 ? 'položky' : 'položek'} · {formatDate(order.orderDate)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{formatPrice(Number(order.totalAmount || 0))}</p>
                  <p className="text-[10px] text-orange-500 font-medium mt-0.5">Vytvořit výdejku →</p>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
