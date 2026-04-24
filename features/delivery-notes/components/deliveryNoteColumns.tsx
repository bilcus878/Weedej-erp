import { formatDate, formatPrice } from '@/lib/utils'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import { calcPackCount } from '@/lib/packQuantity'
import type { ColumnDef } from '@/components/erp'
import { DeliveryNoteStatusBadge } from './DeliveryNoteStatusBadge'
import type { DeliveryNote } from '../types'

export function deliveryNoteColumns(isVatPayer: boolean): ColumnDef<DeliveryNote>[] {
  return [
    {
      key: 'number', header: 'Číslo',
      render: r => (
        <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>
          {r.deliveryNumber}
        </p>
      ),
    },
    { key: 'date', header: 'Datum', render: r => <p className="text-sm text-gray-700">{formatDate(r.deliveryDate)}</p> },
    {
      key: 'customer', header: 'Odběratel',
      render: r => r.customer?.id
        ? <a href={`/customers?highlight=${r.customer.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{r.customer.name}</a>
        : <p className="text-sm text-gray-700 truncate">{r.customerName || 'Anonymní zákazník'}</p>,
    },
    { key: 'items', header: 'Položek', render: r => <p className="text-sm text-gray-600">{r.items.length}</p> },
    {
      key: 'value', header: 'Hodnota',
      render: r => (
        <p className="text-sm font-bold text-gray-900">
          {r.items.length > 0 ? formatPrice(r.items.reduce((sum, item) => {
            const hasSaved    = item.price != null && item.priceWithVat != null
            const unitPrice   = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
            const itemVatRate = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
            const nonVat      = isNonVatPayer(itemVatRate)
            const vatPer      = hasSaved ? Number(item.vatAmount ?? 0) : (nonVat ? 0 : unitPrice * itemVatRate / 100)
            const withVat     = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPer)
            const packs       = calcPackCount(Number(item.quantity), item.productName, item.unit)
            return sum + packs * (isVatPayer ? withVat : unitPrice)
          }, 0)) : '-'}
        </p>
      ),
    },
    { key: 'status', header: 'Status', render: r => <DeliveryNoteStatusBadge status={r.status} /> },
  ]
}
