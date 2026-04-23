'use client'

import { useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

export interface ProductOption {
  id: string
  name: string
  unit: string
  category?: { id: string; name: string } | null
}

interface Props {
  products: ProductOption[]
  value:    string
  onChange: (productId: string) => void
}

export function CascadingProductDropdown({ products, value, onChange }: Props) {
  const [open,         setOpen]         = useState(false)
  const [hoveredCat,   setHoveredCat]   = useState<string | null>(null)
  const [catRect,      setCatRect]      = useState<DOMRect | null>(null)
  const menuRef        = useRef<HTMLDivElement>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const categories = Array.from(
    new Set(products.filter(p => p.category).map(p => p.category!.name))
  ).sort()
  const selected = products.find(p => p.id === value)

  function clearHide() {
    if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null }
  }

  function scheduleHide(ms = 500) {
    hideTimeoutRef.current = setTimeout(() => { setHoveredCat(null); setCatRect(null) }, ms)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onBlur={e => {
          const t = e.currentTarget
          setTimeout(() => { if (!t.contains(document.activeElement)) { setOpen(false); setHoveredCat(null) } }, 200)
        }}
        className="w-full border rounded px-2 py-2 text-sm text-left bg-white hover:bg-gray-50 flex items-center justify-between"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {selected?.name ?? 'Vyberte produkt...'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {open && (
        <>
          <div
            ref={menuRef}
            className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-[500px] overflow-y-auto"
            onMouseLeave={() => scheduleHide()}
            onMouseEnter={clearHide}
          >
            {categories.map(cat => (
              <div
                key={cat}
                className="relative"
                onMouseEnter={e => { clearHide(); setHoveredCat(cat); setCatRect(e.currentTarget.getBoundingClientRect()) }}
                onMouseLeave={e => { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX > r.right) { clearHide(); return } scheduleHide() }}
              >
                <div className="px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center gap-2 select-none">
                  <span>{cat}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </div>
              </div>
            ))}
            {products.filter(p => !p.category).length > 0 && (
              <div
                className="relative"
                onMouseEnter={e => { clearHide(); setHoveredCat('__no_category__'); setCatRect(e.currentTarget.getBoundingClientRect()) }}
                onMouseLeave={e => { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX > r.right) { clearHide(); return } scheduleHide() }}
              >
                <div className="px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center gap-2 select-none">
                  <span className="italic text-gray-600">Bez kategorie</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </div>
              </div>
            )}
          </div>

          {hoveredCat && catRect && (() => {
            const filtered       = products.filter(p => hoveredCat === '__no_category__' ? !p.category : p.category?.name === hoveredCat)
            const maxLen         = Math.max(...filtered.map(p => p.name.length + (p.unit?.length || 0) + 3))
            const estimatedWidth = Math.min(Math.max(maxLen * 7 + 60, 250), 600)
            return (
              <div
                className="fixed bg-white border border-gray-300 rounded shadow-xl max-h-[500px] overflow-y-auto z-[60]"
                style={{ width: `${estimatedWidth}px`, left: `${catRect.right}px`, top: `${catRect.top}px` }}
                onMouseEnter={clearHide}
                onMouseLeave={() => scheduleHide(200)}
              >
                {filtered.map(p => (
                  <div
                    key={p.id}
                    onMouseDown={e => { e.preventDefault(); onChange(p.id); setOpen(false); setHoveredCat(null); setCatRect(null) }}
                    className="px-4 py-2.5 hover:bg-blue-100 cursor-pointer text-sm flex items-center gap-2"
                  >
                    <span>{p.name}</span>
                    <span className="text-xs text-gray-500">({p.unit})</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
