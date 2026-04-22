'use client'

import { useState } from 'react'
import { Package, ShoppingCart } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { PopupButton } from '@/components/ui/PopupButton'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityOrdersEntityType = 'customer' | 'supplier'

export interface EntityOrder {
  id:          string
  orderNumber: string
  orderDate:   string
  status:      string
  totalAmount?: number
  badge?:      string
}

interface EntityOrdersButtonProps {
  entityType:         EntityOrdersEntityType
  entityId:           string
  orders:             EntityOrder[]
  searchPlaceholder?: string
  onAction:           (orderId: string) => void
  actionLabel?:       string
}

// ─── Status badge helper ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new:               { label: 'Nová',         className: 'bg-yellow-100 text-yellow-800' },
  paid:              { label: 'Zaplacená',     className: 'bg-green-100 text-green-800'  },
  pending:           { label: 'Čeká',         className: 'bg-yellow-100 text-yellow-700' },
  confirmed:         { label: 'Potvrzena',    className: 'bg-blue-100 text-blue-800'    },
  partially_received:{ label: 'Částečně',     className: 'bg-orange-100 text-orange-800'},
  received:          { label: 'Přijata',      className: 'bg-green-100 text-green-800'  },
  shipped:           { label: 'Odeslaná',     className: 'bg-purple-100 text-purple-800'},
  cancelled:         { label: 'Zrušená',      className: 'bg-red-100 text-red-800'      },
  storno:            { label: 'Storno',       className: 'bg-red-100 text-red-800'      },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${s.className}`}>
      {s.label}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EntityOrdersButton({
  entityType,
  entityId,
  orders,
  searchPlaceholder,
  onAction,
  actionLabel,
}: EntityOrdersButtonProps) {
  const [search, setSearch] = useState('')

  const isCustomer     = entityType === 'customer'
  const headerLabel    = isCustomer ? 'Objednávky zákazníka' : 'Objednávky dodavateli'
  const defaultAction  = isCustomer ? 'Otevřít' : 'Otevřít'
  const Icon           = isCustomer ? ShoppingCart : Package
  const color          = isCustomer ? 'blue' : 'emerald' as const
  const placeholder    = searchPlaceholder ?? (isCustomer ? 'Hledat objednávku...' : 'Hledat objednávku...')

  const visible = search
    ? orders.filter(o => o.orderNumber.toLowerCase().includes(search.toLowerCase()))
    : orders

  return (
    <PopupButton
      color={color}
      headerLabel={headerLabel}
      headerBadge={orders.length}
      triggerCount={orders.length}
      triggerTitle={headerLabel}
      variant="dropdown"
      width="w-[440px]"
      maxHeight="max-h-[480px]"
      footer={<span className="text-xs text-gray-400">{orders.length} celkem</span>}
    >
      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-100">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-400 focus:border-blue-400 outline-none"
          autoFocus
        />
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100">
        {visible.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-400 italic">
            {search ? 'Žádné výsledky.' : 'Žádné objednávky.'}
          </div>
        ) : (
          visible.map(order => (
            <div key={order.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <Icon className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                  <StatusBadge status={order.status} />
                  {order.badge && (
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[10px] rounded-full font-semibold shrink-0">
                      {order.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 tabular-nums mt-0.5">{formatDate(order.orderDate)}</p>
              </div>
              <button
                onClick={() => onAction(order.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-900 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
              >
                {actionLabel ?? defaultAction}
              </button>
            </div>
          ))
        )}
      </div>
    </PopupButton>
  )
}
