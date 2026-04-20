'use client'

import { useRef, useState, useEffect } from 'react'
import type { SelectOption } from '../table/ColumnDef'

interface Props {
  value:     string
  onChange:  (v: string) => void
  options:   SelectOption[]
  className?: string
}

export function FilterSelect({ value, onChange, options, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value) ?? options[0]

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div
        onClick={() => setOpen(v => !v)}
        className={`px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-blue-500 flex items-center justify-center select-none ${selected?.className ?? ''}`}
      >
        {selected?.label ?? value}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 right-0 min-w-full bg-white border border-gray-300 rounded shadow-lg">
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center whitespace-nowrap ${opt.className ?? ''}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
