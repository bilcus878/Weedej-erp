'use client'

import { Calendar, CheckCircle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatPrice } from '@/lib/utils'
import type { ReceivedInvoice, IssuedInvoice } from '../types'

type UpcomingItem = (ReceivedInvoice | (IssuedInvoice & { invoiceDate: string })) & { type: 'received' | 'issued' }

interface Props {
  items: UpcomingItem[]
}

export function UpcomingDueCard({ items }: Props) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-600" />Blížící se splatnost
          <span className="text-xs font-normal text-gray-400 ml-1">(7 dní)</span>
        </h3>

        {items.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-green-600 font-medium text-sm">Žádné faktury se splatností v příštích 7 dnech</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(invoice => {
              const isReceived  = invoice.type === 'received'
              const daysUntilDue = Math.ceil((new Date(invoice.dueDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              return (
                <div
                  key={invoice.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${isReceived ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-blue-50 hover:bg-blue-100'}`}
                  onClick={() => { window.location.href = isReceived ? `/invoices/received?highlight=${invoice.id}` : `/invoices/issued?highlight=${invoice.id}` }}
                >
                  <div className="flex items-center gap-3">
                    {isReceived
                      ? <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
                      : <ArrowUpCircle   className="h-5 w-5 text-blue-600" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">{isReceived ? 'Přijatá' : 'Vydaná'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${daysUntilDue <= 2 ? 'text-red-600' : 'text-gray-700'}`}>
                      {daysUntilDue === 0 ? 'Dnes' : daysUntilDue === 1 ? 'Zítra' : `Za ${daysUntilDue} dní`}
                    </p>
                    <p className="text-xs text-gray-500">{formatPrice(invoice.totalAmount || 0)}</p>
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
