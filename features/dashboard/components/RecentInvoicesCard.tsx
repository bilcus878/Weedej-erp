'use client'

import { FileText, ArrowRight, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import type { NormalizedInvoice } from '../types'

export function RecentInvoicesCard({ invoices }: { invoices: NormalizedInvoice[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Poslední faktury</span>
        </div>
        <a href="/invoices/received" className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium transition-colors">
          Zobrazit vše <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <FileText className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-sm">Žádné faktury</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {invoices.map(invoice => (
            <a
              key={invoice.id}
              href={invoice.type === 'received'
                ? `/invoices/received?highlight=${invoice.id}`
                : `/invoices/issued?highlight=${invoice.id}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              {invoice.type === 'received'
                ? <ArrowDownCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                : <ArrowUpCircle   className="h-4 w-4 text-blue-500 flex-shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{invoice.number}</p>
                <p className="text-xs text-gray-500 truncate">{invoice.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold ${invoice.type === 'received' ? 'text-emerald-700' : 'text-blue-700'}`}>
                  {invoice.type === 'received' ? '−' : '+'}{formatPrice(invoice.amount)}
                </p>
                <p className="text-xs text-gray-400">{formatDate(invoice.date)}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
