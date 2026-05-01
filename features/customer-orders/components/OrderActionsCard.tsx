'use client'

import Link from 'next/link'
import { FileDown, Package, CheckCircle, XCircle, ShoppingCart, ExternalLink } from 'lucide-react'
import type { CustomerOrder } from '../types'

interface Props {
  order:                 CustomerOrder
  hasActiveDeliveryNote: boolean
  onMarkPaid:            (id: string) => void
  onUpdateStatus:        (id: string, status: string) => void
  onPrintPDF:            (order: CustomerOrder) => void
}

export function OrderActionsCard({ order, hasActiveDeliveryNote, onMarkPaid, onUpdateStatus, onPrintPDF }: Props) {
  const isCancelled = ['cancelled', 'storno'].includes(order.status)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-800">Akce</p>
      </div>
      <div className="px-5 py-4 space-y-2">

        {/* PDF */}
        <button
          onClick={() => onPrintPDF(order)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
        >
          <FileDown className="w-4 h-4 shrink-0 text-gray-500" />
          Zobrazit PDF
        </button>

        {/* Zaplaceno — only for new orders */}
        {order.status === 'new' && (
          <button
            onClick={() => onMarkPaid(order.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            Označit jako zaplaceno
          </button>
        )}

        {/* Vyskladnit */}
        {!isCancelled && (order.status === 'paid' || order.status === 'processing') && !hasActiveDeliveryNote && (
          <Link
            href="/delivery-notes"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
          >
            <Package className="w-4 h-4 shrink-0" />
            Vyskladnit
            <ExternalLink className="w-3.5 h-3.5 ml-auto text-blue-400" />
          </Link>
        )}

        {/* Doručeno */}
        {!isCancelled && order.status === 'shipped' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'delivered')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
          >
            <CheckCircle className="w-4 h-4 shrink-0" />
            Označit jako doručeno
          </button>
        )}

        {/* Storno — always last, red, separated */}
        {!isCancelled && (
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => onUpdateStatus(order.id, 'cancelled')}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
            >
              <XCircle className="w-4 h-4 shrink-0" />
              Storno
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
