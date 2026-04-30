import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import {
  RETURN_CONDITION_LABELS,
  type ReturnItemCondition,
} from '@/lib/returns/returnWorkflow'
import { formatPrice } from '@/lib/utils'
import type { ReturnRequestItem } from '../types'

const ITEM_STATUS_CONFIG = {
  pending:  { label: 'Čeká',        color: 'text-gray-500',  icon: Clock          },
  approved: { label: 'Schváleno',   color: 'text-green-600', icon: CheckCircle    },
  rejected: { label: 'Zamítnuto',   color: 'text-red-600',   icon: XCircle        },
  partial:  { label: 'Částečné',    color: 'text-amber-600', icon: AlertTriangle  },
}

interface Props {
  items: ReturnRequestItem[]
}

export function ReturnItemsTable({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Produkt</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Požad.</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Schváleno</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cena/ks</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Refundace</th>
            <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stav</th>
            <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stav zboží</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const config = ITEM_STATUS_CONFIG[item.itemStatus] ?? ITEM_STATUS_CONFIG.pending
            const Icon   = config.icon
            const approvedQty = item.approvedQuantity ?? item.returnedQuantity
            const refundLine  = approvedQty * item.unitPriceWithVat
            const condLabel   = item.condition
              ? RETURN_CONDITION_LABELS[item.condition as ReturnItemCondition]
              : null

            return (
              <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="py-2.5 px-3 font-medium text-gray-900">
                  {item.productName ?? '—'}
                  {item.conditionNote && (
                    <p className="text-[11px] text-gray-400 font-normal mt-0.5">{item.conditionNote}</p>
                  )}
                  {item.itemRejectionReason && (
                    <p className="text-[11px] text-red-500 font-normal mt-0.5">{item.itemRejectionReason}</p>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">
                  {item.returnedQuantity} {item.unit}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums">
                  {item.itemStatus === 'approved' || item.itemStatus === 'partial'
                    ? <span className="text-green-700 font-medium">{item.approvedQuantity ?? '—'} {item.unit}</span>
                    : <span className="text-gray-400">—</span>
                  }
                </td>
                <td className="py-2.5 px-3 text-right text-gray-700 tabular-nums">
                  {formatPrice(item.unitPriceWithVat)}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                  {item.itemStatus !== 'rejected'
                    ? <span className="text-green-700">{formatPrice(refundLine)}</span>
                    : <span className="text-gray-400">—</span>
                  }
                </td>
                <td className="py-2.5 px-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${config.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  {condLabel
                    ? <span className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{condLabel}</span>
                    : <span className="text-gray-300 text-xs">—</span>
                  }
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
