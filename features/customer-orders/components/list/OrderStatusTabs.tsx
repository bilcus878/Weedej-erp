'use client'

import { useMemo } from 'react'
import type { CustomerOrder } from '../../types'

interface Tab {
  value:      string
  label:      string
  defaultCls: string
  activeCls:  string
}

// Tabs shown even when count=0 only while active; hidden otherwise to keep the strip clean.
const TABS: Tab[] = [
  { value: '',          label: 'Vše',           defaultCls: 'bg-gray-100 text-gray-600',    activeCls: 'bg-gray-800 text-white'    },
  { value: 'new',       label: 'Nové',          defaultCls: 'bg-yellow-50 text-yellow-700', activeCls: 'bg-yellow-500 text-white'  },
  { value: 'paid',      label: 'Zaplacené',     defaultCls: 'bg-green-50 text-green-700',   activeCls: 'bg-green-600 text-white'   },
  { value: 'processing',label: 'Ve zpracování', defaultCls: 'bg-blue-50 text-blue-700',     activeCls: 'bg-blue-600 text-white'    },
  { value: 'shipped',   label: 'Odesláno',      defaultCls: 'bg-purple-50 text-purple-700', activeCls: 'bg-purple-600 text-white'  },
  { value: 'delivered', label: 'Doručeno',      defaultCls: 'bg-teal-50 text-teal-700',     activeCls: 'bg-teal-600 text-white'    },
  { value: 'cancelled', label: 'Zrušeno',       defaultCls: 'bg-red-50 text-red-700',       activeCls: 'bg-red-600 text-white'     },
]

interface Props {
  value:    string
  onChange: (status: string) => void
  allRows:  CustomerOrder[]
}

export function OrderStatusTabs({ value, onChange, allRows }: Props) {
  const counts = useMemo(() => {
    const map: Record<string, number> = { '': allRows.length }
    for (const row of allRows) map[row.status] = (map[row.status] ?? 0) + 1
    return map
  }, [allRows])

  return (
    // Tailwind arbitrary CSS — hides scrollbar cross-browser without a plugin
    <div className="flex gap-1.5 overflow-x-auto px-4 py-2.5 border-b bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map(tab => {
        const isActive = value === tab.value
        const count    = counts[tab.value] ?? 0
        // Hide non-active tabs when they have no orders, except "Vše"
        if (!isActive && count === 0 && tab.value !== '') return null
        return (
          <button
            key={tab.value}
            onClick={() => onChange(isActive && tab.value !== '' ? '' : tab.value)}
            className={[
              'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-all',
              isActive ? tab.activeCls : tab.defaultCls,
            ].join(' ')}
          >
            {tab.label}
            <span className="tabular-nums text-xs opacity-70">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
