'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  value:        string
  onChange:     (v: string) => void
  options:      string[]
  placeholder?: string
  className?:   string
}

export function FilterCombobox({ value, onChange, options, placeholder, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const suggestions = value.trim()
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : options

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map(opt => (
            <div
              key={opt}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onChange(opt); setOpen(false) }}
              className="px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 cursor-pointer truncate"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
