'use client'

import { formatDate, formatPrice } from '@/lib/utils'
import type { ColumnDef } from '@/components/erp'
import type { EshopOrder } from '../types'
import { EshopOrderStatusBadge } from './EshopOrderStatusBadge'
import { getCustomerName, getCustomerEmail } from '../domain/eshopOrderMapper'

export function eshopOrderColumns(isVatPayer: boolean): ColumnDef<EshopOrder>[] {
  return [
    {
      key: 'number', header: 'Číslo',
      render: r => (
        <p className={`text-sm font-bold text-gray-700 ${['cancelled', 'storno'].includes(r.status) ? 'line-through' : ''}`}>
          {r.orderNumber}
        </p>
      ),
    },
    {
      key: 'date', header: 'Datum',
      render: r => (
        <>
          <p className="text-sm text-gray-900">{formatDate(r.orderDate)}</p>
          <p className="text-xs text-gray-400">
            {new Date(r.orderDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </>
      ),
    },
    {
      key: 'customer', header: 'Zákazník', width: '2fr',
      render: r => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{getCustomerName(r)}</p>
          {getCustomerEmail(r) && (
            <p className="text-xs text-gray-400 truncate">{getCustomerEmail(r)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'items', header: 'Položek',
      render: r => <p className="text-sm text-gray-700">{r.items.length}</p>,
    },
    {
      key: 'amount', header: 'Hodnota',
      render: r => (
        <>
          <p className="text-sm font-bold text-gray-900">{formatPrice(Number(r.totalAmount))}</p>
          {isVatPayer && Number(r.totalVatAmount) > 0 && (
            <p className="text-xs text-gray-400">DPH: {formatPrice(Number(r.totalVatAmount))}</p>
          )}
        </>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: r => <EshopOrderStatusBadge status={r.status} />,
    },
  ]
}
