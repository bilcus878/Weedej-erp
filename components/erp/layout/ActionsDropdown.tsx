'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'

export interface PageAction {
  label:     string
  onClick:   () => void
  icon?:     ReactNode
  variant?:  'default' | 'destructive'
  disabled?: boolean
}

interface Props {
  items:  PageAction[]
  label?: string
}

export function ActionsDropdown({ items, label }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
        aria-label={label ?? 'Akce'}
      >
        <MoreHorizontal className="w-4 h-4" />
        {label && <span>{label}</span>}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
          {items.map((action, i) => (
            <button
              key={i}
              disabled={action.disabled}
              onClick={() => { setOpen(false); action.onClick() }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left transition-colors disabled:opacity-40 ${
                action.variant === 'destructive'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
