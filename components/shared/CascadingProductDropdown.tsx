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
  const [menuPos,      setMenuPos]      = useState<{ left: number; top: number; width: number } | null>(null)
  const triggerRef     = useRef<HTMLButtonElement>(null)
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

  function handleOpen() {
    if (open) { setOpen(false); setHoveredCat(null); setCatRect(null); return }
    // Capture button rect so the menu uses fixed positioning — avoids clipping by overflow:auto parents
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setMenuPos({ left: r.left, top: r.bottom + 4, width: Math.max(r.width, 260) })
    }
    setOpen(true)
  }

  function close() { setOpen(false); setHoveredCat(null); setCatRect(null) }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-left bg-white hover:bg-gray-50 flex items-center justify-between gap-2 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
      >
        <span className={`truncate ${value ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected?.name ?? 'Vyberte produkt…'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {open && menuPos && (
        <>
          {/* Transparent backdrop — closes menu on outside click */}
          <div className="fixed inset-0 z-[98]" onClick={close} />

          {/* Category list — fixed so it escapes any overflow:hidden/auto parent */}
          <div
            className="fixed bg-white border border-gray-200 rounded-xl shadow-xl z-[99] overflow-y-auto"
            style={{ left: menuPos.left, top: menuPos.top, width: menuPos.width, maxHeight: 320 }}
            onMouseLeave={() => scheduleHide()}
            onMouseEnter={clearHide}
          >
            {categories.map(cat => (
              <div
                key={cat}
                className="relative"
                onMouseEnter={e => {
                  clearHide()
                  setHoveredCat(cat)
                  setCatRect(e.currentTarget.getBoundingClientRect())
                }}
                onMouseLeave={e => {
                  const r = e.currentTarget.getBoundingClientRect()
                  if (e.clientX > r.right) { clearHide(); return }
                  scheduleHide()
                }}
              >
                <div className="px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center justify-between gap-2 cursor-default select-none">
                  <span className="text-gray-800">{cat}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
              </div>
            ))}

            {products.filter(p => !p.category).length > 0 && (
              <div
                className="relative"
                onMouseEnter={e => {
                  clearHide()
                  setHoveredCat('__no_category__')
                  setCatRect(e.currentTarget.getBoundingClientRect())
                }}
                onMouseLeave={e => {
                  const r = e.currentTarget.getBoundingClientRect()
                  if (e.clientX > r.right) { clearHide(); return }
                  scheduleHide()
                }}
              >
                <div className="px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center justify-between gap-2 cursor-default select-none border-t border-gray-100">
                  <span className="italic text-gray-500">Bez kategorie</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
              </div>
            )}

            {categories.length === 0 && products.filter(p => !p.category).length === 0 && (
              <p className="px-4 py-4 text-sm text-gray-400 italic text-center">Žádné produkty</p>
            )}
          </div>

          {/* Submenu — also fixed, appears to the right of the hovered category */}
          {hoveredCat && catRect && (() => {
            const filtered = products.filter(p =>
              hoveredCat === '__no_category__' ? !p.category : p.category?.name === hoveredCat
            )
            const maxLen = Math.max(0, ...filtered.map(p => p.name.length + (p.unit?.length || 0) + 3))
            const estimatedWidth = Math.min(Math.max(maxLen * 7 + 60, 240), 600)
            return (
              <div
                className="fixed bg-white border border-gray-200 rounded-xl shadow-xl z-[100] overflow-y-auto"
                style={{ width: estimatedWidth, left: catRect.right + 4, top: catRect.top, maxHeight: 400 }}
                onMouseEnter={clearHide}
                onMouseLeave={() => scheduleHide(200)}
              >
                {filtered.map(p => (
                  <div
                    key={p.id}
                    onMouseDown={e => {
                      e.preventDefault()
                      onChange(p.id)
                      close()
                    }}
                    className="px-4 py-2.5 hover:bg-blue-100 cursor-pointer text-sm flex items-center gap-2"
                  >
                    <span className="text-gray-900">{p.name}</span>
                    <span className="text-xs text-gray-400 ml-auto shrink-0">({p.unit})</span>
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
