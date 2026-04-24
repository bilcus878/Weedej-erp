'use client'

import { formatPrice } from '@/lib/utils'
import type { ColumnDef } from '@/components/erp'
import type { CreditNote } from '../types'

export const creditNoteColumns: ColumnDef<CreditNote>[] = [
  {
    key: 'number', header: 'Číslo',
    render: r => (
      <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>
        {r.creditNoteNumber}
      </p>
    ),
  },
  {
    key: 'date', header: 'Datum',
    render: r => <p className="text-sm text-gray-700">{new Date(r.creditNoteDate).toLocaleDateString('cs-CZ')}</p>,
  },
  {
    key: 'customer', header: 'Odběratel',
    render: r => r.customer?.id
      ? <a href={`/customers?highlight=${r.customer.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{r.customer.name}</a>
      : <p className="text-sm text-gray-700 truncate">{r.customerName || <em className="text-gray-400 not-italic">Bez odběratele</em>}</p>,
  },
  {
    key: 'invoice', header: 'Faktura',
    render: r => (
      <a href={`/invoices/issued?highlight=${r.issuedInvoiceId}`} className="text-sm text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
        {r.invoiceNumber}
      </a>
    ),
  },
  { key: 'items',  header: 'Položek', render: r => <p className="text-sm text-gray-600">{r.items.length}</p> },
  { key: 'value',  header: 'Hodnota', render: r => <p className="text-sm font-bold text-red-600">{formatPrice(r.totalAmount)}</p> },
  {
    key: 'status', header: 'Status',
    render: r => r.status === 'storno'
      ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">STORNO</span>
      : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Aktivní</span>,
  },
]
