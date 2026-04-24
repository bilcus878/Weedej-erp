import { formatDate, formatPrice } from '@/lib/utils'
import { isNonVatPayer } from '@/lib/vatCalculation'
import type { ColumnDef } from '@/components/erp'
import { ReceiptStatusBadge } from './ReceiptStatusBadge'
import type { Receipt } from '../types'

export function receiptColumns(isVatPayer: boolean): ColumnDef<Receipt>[] {
  return [
    {
      key: 'number', header: 'Číslo',
      render: r => (
        <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' || r.status === 'cancelled' ? 'line-through' : ''}`}>
          {r.receiptNumber}
        </p>
      ),
    },
    { key: 'date',  header: 'Datum',    render: r => <p className="text-sm text-gray-700">{formatDate(r.receiptDate)}</p> },
    {
      key: 'supplier', header: 'Dodavatel',
      render: r => {
        const supplierId   = r.purchaseOrder?.supplier?.id || r.supplier?.id
        const supplierName = r.purchaseOrder?.supplier?.name || r.supplier?.name || r.supplierName || '-'
        return supplierId
          ? <a href={`/suppliers?highlight=${supplierId}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{supplierName}</a>
          : <p className="text-sm text-gray-700 truncate">{supplierName}</p>
      },
    },
    { key: 'items', header: 'Položek', render: r => <p className="text-sm text-gray-600">{r.items.length}</p> },
    {
      key: 'value', header: 'Hodnota',
      render: r => {
        const total = r.items.reduce((sum, item) => {
          const qty         = Number(item.receivedQuantity || item.quantity)
          const unitPrice   = Number(item.purchasePrice || 0)
          const itemVatRate = Number((item as any).vatRate || item.product?.vatRate || 21)
          const vatPerUnit  = isVatPayer && !isNonVatPayer(itemVatRate) ? unitPrice * itemVatRate / 100 : 0
          return sum + qty * (unitPrice + vatPerUnit)
        }, 0)
        return <p className="text-sm font-bold text-gray-900">{formatPrice(total)}</p>
      },
    },
    { key: 'status', header: 'Status', render: r => <ReceiptStatusBadge status={r.status} /> },
  ]
}
