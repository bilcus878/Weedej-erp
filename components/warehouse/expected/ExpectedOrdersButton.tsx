'use client'

import { useRef, useState } from 'react'
import { Package } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useClickOutside } from '../shared/useClickOutside'

export interface PopoverOrder {
  id: string
  orderNumber: string
  partyName: string
  orderDate: string
  badge?: string
}

interface ExpectedOrdersButtonProps {
  orders: PopoverOrder[]
  headerLabel: string
  actionLabel: string
  searchPlaceholder?: string
  onAction: (orderId: string) => void
  onExpandPanel: () => void
}

export function ExpectedOrdersButton({
  orders,
  headerLabel,
  actionLabel,
  searchPlaceholder = 'Hledat číslo obj...',
  onAction,
  onExpandPanel,
}: ExpectedOrdersButtonProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  const visible = search
    ? orders.filter(o => {
        const q = search.toLowerCase()
        return o.orderNumber.toLowerCase().includes(q) || o.partyName.toLowerCase().includes(q)
      })
    : orders

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(v => !v); setSearch('') }}
        title={open ? 'Zavřít přehled' : headerLabel}
        className={`w-6 h-6 flex items-center justify-center rounded font-bold text-xs transition-colors ${
          open ? 'bg-orange-600 text-white' : 'bg-orange-200 text-orange-800 hover:bg-orange-400'
        }`}
      >
        +
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[480px] max-h-[500px] flex flex-col bg-white border border-orange-200 rounded-xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50 border-b border-orange-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-orange-900">{headerLabel}</span>
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                orders.length > 0 ? 'bg-orange-600 text-white' : 'bg-orange-200 text-orange-700'
              }`}>
                {orders.length}
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-orange-400 hover:text-orange-700 text-xl leading-none transition-colors"
            >
              ×
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100 shrink-0">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-orange-400 focus:border-orange-400 outline-none"
              autoFocus
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400 italic">
                {search ? 'Žádné výsledky.' : 'Žádné objednávky čekající na zpracování.'}
              </div>
            ) : (
              visible.map(order => (
                <div key={order.id} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                      {order.badge && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[10px] rounded-full font-semibold shrink-0">
                          {order.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{order.partyName}</p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0 tabular-nums">{formatDate(order.orderDate)}</p>
                  <button
                    onClick={() => { onAction(order.id); setOpen(false) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                  >
                    <Package className="w-3 h-3" />{actionLabel}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 shrink-0 flex items-center justify-between">
            <span className="text-xs text-gray-400">{orders.length} celkem</span>
            <button
              onClick={() => { onExpandPanel(); setOpen(false) }}
              className="text-xs text-orange-600 hover:text-orange-800 hover:underline transition-colors"
            >
              Rozbalit panel níže →
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
