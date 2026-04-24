'use client'

import { FileText, ExternalLink, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatPrice, formatDate } from '@/lib/utils'
import type { NormalizedInvoice } from '../types'

interface Props {
  invoices: NormalizedInvoice[]
}

export function RecentInvoicesCard({ invoices }: Props) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />Poslední faktury
          </h3>
          <a href="/invoices/dashboard" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline">
            Zobrazit vše <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {invoices.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Žádné faktury</p>
        ) : (
          <div className="space-y-2">
            {invoices.map(invoice => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                onClick={() => { window.location.href = invoice.type === 'received' ? `/invoices/received?highlight=${invoice.id}` : `/invoices/issued?highlight=${invoice.id}` }}
              >
                <div className="flex items-center gap-3">
                  {invoice.type === 'received'
                    ? <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
                    : <ArrowUpCircle   className="h-5 w-5 text-blue-600" />}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invoice.number}</p>
                    <p className="text-xs text-gray-500">{invoice.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${invoice.type === 'received' ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {invoice.type === 'received' ? '-' : '+'}{formatPrice(invoice.amount)}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(invoice.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
