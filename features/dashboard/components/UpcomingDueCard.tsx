'use client'

import { Bell, ArrowRight, ArrowDownCircle, ArrowUpCircle, CheckCircle, AlertCircle } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import type { ReceivedInvoice, IssuedInvoice, OverdueSummary } from '../types'

type UpcomingItem =
  | (ReceivedInvoice & { type: 'received' })
  | (IssuedInvoice   & { type: 'issued'; invoiceDate: string })

interface Props {
  items:           UpcomingItem[]
  overdueInvoices: OverdueSummary
}

export function UpcomingDueCard({ items, overdueInvoices }: Props) {
  const hasAlerts = items.length > 0 || overdueInvoices.total > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${hasAlerts ? 'bg-red-50' : 'bg-emerald-50'}`}>
            <Bell className={`h-4 w-4 ${hasAlerts ? 'text-red-500' : 'text-emerald-500'}`} />
          </div>
          <span className="text-sm font-semibold text-gray-900">Upozornění</span>
          {hasAlerts && (
            <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
              {items.length + overdueInvoices.total}
            </span>
          )}
        </div>
        <a href="/invoices/received" className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors">
          Faktury <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {!hasAlerts ? (
        <div className="flex flex-col items-center justify-center py-10 text-emerald-600">
          <CheckCircle className="h-8 w-8 mb-2 opacity-70" />
          <p className="text-sm font-medium">Vše v pořádku</p>
          <p className="text-xs text-gray-400 mt-0.5">Žádné faktury po splatnosti</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 overflow-y-auto max-h-72">
          {overdueInvoices.total > 0 && (
            <div className="px-5 py-2.5 bg-red-50">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Po splatnosti ({overdueInvoices.total})
              </p>
            </div>
          )}

          {items.map(inv => {
            const isReceived  = inv.type === 'received'
            const dueDate     = new Date(inv.dueDate!)
            const daysLeft    = Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000)
            const isOverdue   = daysLeft < 0
            const dueLabelCls = isOverdue ? 'text-red-600 font-semibold' : daysLeft <= 2 ? 'text-amber-600 font-semibold' : 'text-gray-600'
            const dueLabel    = isOverdue
              ? `${Math.abs(daysLeft)} dní po splat.`
              : daysLeft === 0 ? 'Dnes'
              : daysLeft === 1 ? 'Zítra'
              : `Za ${daysLeft} dní`

            return (
              <a
                key={inv.id}
                href={isReceived ? `/invoices/received?highlight=${inv.id}` : `/invoices/issued?highlight=${inv.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                {isReceived
                  ? <ArrowDownCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  : <ArrowUpCircle   className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-400">{isReceived ? 'Přijatá' : 'Vydaná'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs ${dueLabelCls}`}>{dueLabel}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatPrice(inv.totalAmount || 0)}</p>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
