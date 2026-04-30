import Link from 'next/link'
import { format } from 'date-fns'
import { cs } from 'date-fns/locale'
import type { ColumnDef } from '@/components/erp/table/ColumnDef'
import type { FiltersResult } from '@/components/erp'
import { FilterInput, FilterSelect } from '@/components/erp'
import { RETURN_REASON_LABELS, type ReturnReason } from '@/lib/returns/returnWorkflow'
import { formatPrice } from '@/lib/utils'
import { ReturnStatusBadge } from './ReturnStatusBadge'
import { ReturnTypeBadge }   from './ReturnTypeBadge'
import type { ReturnRequestListItem } from '../types'

import type { SelectOption } from '@/components/erp/table/ColumnDef'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all',               label: 'Vše' },
  { value: 'submitted',         label: 'Podáno'              },
  { value: 'under_review',      label: 'Ve zpracování'        },
  { value: 'waiting_for_goods', label: 'Čeká na zboží'        },
  { value: 'goods_received',    label: 'Zboží přijato'        },
  { value: 'inspecting',        label: 'Kontrola'             },
  { value: 'approved',          label: 'Schváleno'            },
  { value: 'partially_approved',label: 'Částečně schváleno'   },
  { value: 'rejected',          label: 'Zamítnuto'            },
  { value: 'resolved',          label: 'Vyřešeno'             },
  { value: 'closed',            label: 'Uzavřeno'             },
  { value: 'cancelled',         label: 'Zrušeno'              },
]

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'all',            label: 'Vše'               },
  { value: 'return',         label: 'Vrácení'           },
  { value: 'warranty_claim', label: 'Záruční reklamace' },
  { value: 'complaint',      label: 'Stížnost'          },
  { value: 'exchange',       label: 'Výměna'            },
]

export function createReturnColumns(
  filters: FiltersResult<ReturnRequestListItem>
): ColumnDef<ReturnRequestListItem>[] {
  const v = filters.values
  const s = filters.set

  return [
    {
      key:    'returnNumber',
      header: 'Číslo',
      filterNode: <FilterInput value={v['number'] ?? ''} onChange={val => s('number', val)} placeholder="Číslo..." />,
      render: r => (
        <Link
          href={`/returns/${r.id}`}
          className="font-mono text-xs font-bold text-violet-600 hover:underline"
          onClick={e => e.stopPropagation()}
        >
          {r.returnNumber}
        </Link>
      ),
    },
    {
      key:    'type',
      header: 'Typ',
      filterNode: <FilterSelect value={v['type'] ?? 'all'} onChange={val => s('type', val)} options={TYPE_OPTIONS} />,
      render: r => <ReturnTypeBadge type={r.type} />,
    },
    {
      key:    'reason',
      header: 'Důvod',
      render: r => (
        <span className="text-xs text-gray-600">
          {RETURN_REASON_LABELS[r.reason as ReturnReason] ?? r.reason}
        </span>
      ),
    },
    {
      key:    'customer',
      header: 'Zákazník',
      filterNode: <FilterInput value={v['customer'] ?? ''} onChange={val => s('customer', val)} placeholder="Zákazník..." />,
      render: r => <span className="font-medium text-gray-900">{r.customerName ?? '—'}</span>,
    },
    {
      key:    'order',
      header: 'Objednávka',
      filterNode: <FilterInput value={v['order'] ?? ''} onChange={val => s('order', val)} placeholder="Objednávka..." />,
      render: r => r.customerOrderNumber
        ? (
          <Link
            href={`/customer-orders?highlight=${r.customerOrderId}`}
            className="font-mono text-xs text-indigo-600 hover:underline"
            onClick={e => e.stopPropagation()}
          >
            {r.customerOrderNumber}
          </Link>
        )
        : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key:    'status',
      header: 'Stav',
      filterNode: <FilterSelect value={v['status'] ?? 'all'} onChange={val => s('status', val)} options={STATUS_OPTIONS} />,
      render: r => <ReturnStatusBadge status={r.status} size="sm" />,
    },
    {
      key:    'requestDate',
      header: 'Datum',
      render: r => (
        <span className="text-xs text-gray-500">
          {format(new Date(r.requestDate), 'd. M. yyyy', { locale: cs })}
        </span>
      ),
    },
    {
      key:    'refundAmount',
      header: 'Refundace',
      render: r => r.refundAmount != null
        ? <span className="text-sm font-semibold text-green-700">{formatPrice(r.refundAmount)}</span>
        : <span className="text-gray-400 text-xs">—</span>,
    },
  ]
}
