'use client'

import { formatDate, formatPrice } from '@/lib/utils'
import { isNonVatPayer } from '@/lib/vatCalculation'
import type { ColumnDef } from '@/components/erp'
import type { PurchaseOrder, Supplier } from '../types'
import { PurchaseOrderStatusBadge } from './PurchaseOrderStatusBadge'

const PAYMENT_LABELS: Record<string, string> = { cash: 'Hotovost', card: 'Karta', transfer: 'Převod' }

export function purchaseOrderColumns(suppliers: Supplier[], isVatPayer: boolean): ColumnDef<PurchaseOrder>[] {
  return [
    {
      key: 'number', header: 'Číslo',
      render: r => (
        <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>
          {r.orderNumber}
        </p>
      ),
    },
    {
      key: 'date', header: 'Datum',
      render: r => <p className="text-sm text-gray-700">{formatDate(r.orderDate)}</p>,
    },
    {
      key: 'supplier', header: 'Dodavatel',
      render: r => {
        let s = r.supplier
        if (!s && r.supplierName) s = suppliers.find(x => x.name === r.supplierName)
        return s?.id
          ? <a href={`/suppliers?highlight=${s.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{s.name}</a>
          : <p className="text-sm text-gray-700 truncate">{r.supplierName || '-'}</p>
      },
    },
    {
      key: 'payment', header: 'Typ platby',
      render: r => <p className="text-sm text-gray-700">{PAYMENT_LABELS[r.invoice?.paymentType ?? ''] || '-'}</p>,
    },
    {
      key: 'items', header: 'Položek',
      render: r => <p className="text-sm text-gray-600">{r.items.length}</p>,
    },
    {
      key: 'value', header: 'Hodnota',
      render: r => (
        <p className="text-sm font-bold text-gray-900">
          {formatPrice(r.items.reduce((sum, item) => {
            const up     = Number(item.expectedPrice || 0)
            const vr     = Number(item.vatRate || 21)
            const nonVat = isNonVatPayer(vr)
            return sum + Number(item.quantity) * (isVatPayer ? up + (nonVat ? 0 : up * vr / 100) : up)
          }, 0))}
        </p>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: r => <PurchaseOrderStatusBadge status={r.status} />,
    },
  ]
}
