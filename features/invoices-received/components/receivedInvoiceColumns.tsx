'use client'

import type { ColumnDef } from '@/components/erp'
import type { ReceivedInvoice, Supplier } from '../types'
import { ReceivedInvoiceStatusBadge } from './ReceivedInvoiceStatusBadge'

const PAYMENT_LABELS: Record<string, string> = { cash: 'Hotovost', card: 'Karta', transfer: 'Převod' }

export function receivedInvoiceColumns(suppliers: Supplier[]): ColumnDef<ReceivedInvoice>[] {
  return [
    {
      key: 'number', header: 'Číslo',
      render: r => (
        <div>
          <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>
            {r.invoiceNumber}
          </p>
          {r.isTemporary && r.status !== 'storno' && (
            <p className="text-xs text-orange-600 mt-0.5">Doplň údaje o faktuře</p>
          )}
        </div>
      ),
    },
    {
      key: 'date', header: 'Datum',
      render: r => <p className="text-sm text-gray-700">{new Date(r.invoiceDate).toLocaleDateString('cs-CZ')}</p>,
    },
    {
      key: 'supplier', header: 'Dodavatel',
      render: r => {
        let supplier = r.receipts?.[0]?.supplier || r.purchaseOrder?.supplier
        if (!supplier && r.supplierName) supplier = suppliers.find(s => s.name === r.supplierName)
        if (supplier?.id) return (
          <a href={`/suppliers?highlight=${supplier.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>
            {supplier.name}
          </a>
        )
        return <p className="text-sm text-gray-700 truncate">{r.supplierName || r.purchaseOrder?.supplierName || '-'}</p>
      },
    },
    {
      key: 'payment', header: 'Typ platby',
      render: r => <p className="text-sm text-gray-700">{PAYMENT_LABELS[r.paymentType] || '-'}</p>,
    },
    {
      key: 'items', header: 'Položek',
      render: r => {
        const count = r.purchaseOrder?.items?.length
          || r.receipts?.reduce((s, rc) => s + (rc.items?.length || 0), 0)
          || 0
        return <p className="text-sm text-gray-600">{count}</p>
      },
    },
    {
      key: 'value', header: 'Hodnota',
      render: r => <p className="text-sm font-bold text-gray-900">{Number(r.totalAmount).toLocaleString('cs-CZ')} Kč</p>,
    },
    {
      key: 'status', header: 'Status',
      render: r => <ReceivedInvoiceStatusBadge status={r.status || 'pending'} />,
    },
  ]
}
