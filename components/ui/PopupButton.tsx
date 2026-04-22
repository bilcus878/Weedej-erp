'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'
import { useClickOutside } from '@/components/warehouse/shared/useClickOutside'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PopupVariant = 'dropdown' | 'modal'
export type PopupColor   = 'orange' | 'blue' | 'emerald' | 'gray'

interface PopupButtonProps {
  // Trigger
  triggerLabel?:   ReactNode          // custom trigger content; defaults to '+'
  triggerCount?:   number             // shows (N) badge next to trigger
  triggerTitle?:   string             // tooltip on hover
  color?:          PopupColor         // trigger button color theme

  // Popup header
  headerLabel:     string             // title shown in popup header
  headerBadge?:    number             // optional count badge in header

  // Popup layout
  variant?:        PopupVariant       // 'dropdown' = absolute; 'modal' = fixed centered
  width?:          string             // tailwind width class, e.g. 'w-[480px]'
  maxHeight?:      string             // tailwind max-height, e.g. 'max-h-[500px]'

  // Controlled vs uncontrolled
  open?:           boolean            // controlled: parent owns state
  onOpenChange?:   (open: boolean) => void
  onOpen?:         () => void         // called once when popup opens (fetch, reset, etc.)

  // Content
  children:        ReactNode
  footer?:         ReactNode
}

// ─── Color map ────────────────────────────────────────────────────────────────

const colorMap: Record<PopupColor, { closed: string; open: string; header: string; border: string; badge: string }> = {
  orange:  {
    closed: 'bg-orange-200 text-orange-800 hover:bg-orange-400',
    open:   'bg-orange-600 text-white',
    header: 'bg-orange-50 border-orange-200',
    border: 'border-orange-200',
    badge:  'bg-orange-600 text-white',
  },
  blue:    {
    closed: 'bg-blue-200 text-blue-800 hover:bg-blue-400',
    open:   'bg-blue-600 text-white',
    header: 'bg-blue-50 border-blue-200',
    border: 'border-blue-200',
    badge:  'bg-blue-600 text-white',
  },
  emerald: {
    closed: 'bg-emerald-200 text-emerald-800 hover:bg-emerald-400',
    open:   'bg-emerald-600 text-white',
    header: 'bg-emerald-50 border-emerald-200',
    border: 'border-emerald-200',
    badge:  'bg-emerald-600 text-white',
  },
  gray:    {
    closed: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    open:   'bg-gray-600 text-white',
    header: 'bg-gray-50 border-gray-200',
    border: 'border-gray-200',
    badge:  'bg-gray-600 text-white',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PopupButton({
  triggerLabel,
  triggerCount,
  triggerTitle,
  color        = 'orange',
  headerLabel,
  headerBadge,
  variant      = 'dropdown',
  width        = 'w-[480px]',
  maxHeight    = 'max-h-[500px]',
  open:        controlledOpen,
  onOpenChange,
  onOpen,
  children,
  footer,
}: PopupButtonProps) {
  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen

  const ref = useRef<HTMLDivElement>(null)
  const c   = colorMap[color]

  useClickOutside(ref, () => {
    if (variant === 'dropdown') handleClose()
  })

  function handleOpen() {
    if (!isControlled) setInternalOpen(true)
    onOpenChange?.(true)
    onOpen?.()
  }

  function handleClose() {
    if (!isControlled) setInternalOpen(false)
    onOpenChange?.(false)
  }

  function handleToggle() {
    open ? handleClose() : handleOpen()
  }

  if (variant === 'modal') {
    return (
      <>
        {/* Trigger */}
        <button
          onClick={handleToggle}
          title={triggerTitle}
          className={`w-7 h-7 flex items-center justify-center rounded font-bold text-base transition-colors ${
            open ? c.open : c.closed
          }`}
        >
          {triggerLabel ?? '+'}
        </button>
        {triggerCount !== undefined && triggerCount > 0 && (
          <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
            ({triggerCount})
          </span>
        )}

        {/* Modal */}
        {open && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
            <div className="relative min-h-full flex items-start justify-center px-4 pt-12 pb-16">
              <div className={`w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden`}>
                <ModalHeader label={headerLabel} badge={headerBadge} c={c} onClose={handleClose} />
                <div className="p-6">{children}</div>
                {footer && <div className="px-6 pb-6">{footer}</div>}
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Dropdown variant
  return (
    <div ref={ref} className="relative flex items-center gap-1">
      <button
        onClick={handleToggle}
        title={open ? 'Zavřít' : (triggerTitle ?? headerLabel)}
        className={`w-7 h-7 flex items-center justify-center rounded font-bold text-base transition-colors ${
          open ? c.open : c.closed
        }`}
      >
        {triggerLabel ?? '+'}
      </button>
      {triggerCount !== undefined && triggerCount > 0 && (
        <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'inherit' }}>
          ({triggerCount})
        </span>
      )}

      {open && (
        <div className={`absolute left-0 top-full z-50 mt-2 ${width} ${maxHeight} flex flex-col bg-white border ${c.border} rounded-xl shadow-2xl overflow-hidden`}>
          <DropdownHeader label={headerLabel} badge={headerBadge} c={c} onClose={handleClose} />
          <div className="overflow-y-auto flex-1">{children}</div>
          {footer && (
            <div className={`px-4 py-2 bg-gray-50 border-t border-gray-200 shrink-0`}>
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Internal sub-components ──────────────────────────────────────────────────

function DropdownHeader({ label, badge, c, onClose }: { label: string; badge?: number; c: ReturnType<typeof colorMap[PopupColor]>; onClose: () => void }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${c.header} border-b shrink-0`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        {badge !== undefined && (
          <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
            badge > 0 ? c.badge : 'bg-gray-200 text-gray-600'
          }`}>{badge}</span>
        )}
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none transition-colors">×</button>
    </div>
  )
}

function ModalHeader({ label, badge, c, onClose }: { label: string; badge?: number; c: ReturnType<typeof colorMap[PopupColor]>; onClose: () => void }) {
  return (
    <div className={`sticky top-0 z-10 flex items-center justify-between px-5 py-3 ${c.header} border-b`}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-900">{label}</span>
        {badge !== undefined && (
          <span className={`text-xs font-mono px-2.5 py-1 rounded ${c.badge}`}>{badge}</span>
        )}
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none transition-colors">×</button>
    </div>
  )
}
