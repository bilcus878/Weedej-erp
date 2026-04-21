'use client'

import { type ReactNode } from 'react'

interface CreateOrderPopupProps {
  title: string
  orderNumber?: string
  open: boolean
  onOpen: () => void
  onClose: () => void
  children: ReactNode
}

export function CreateOrderPopup({
  title,
  orderNumber,
  open,
  onOpen,
  onClose,
  children,
}: CreateOrderPopupProps) {
  return (
    <>
      <button
        onClick={() => open ? onClose() : onOpen()}
        title={open ? 'Zavřít formulář' : title}
        className={`w-7 h-7 flex items-center justify-center rounded font-bold text-base transition-colors ${
          open ? 'bg-blue-600 text-white' : 'bg-blue-200 text-blue-800 hover:bg-blue-400'
        }`}
      >
        +
      </button>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40" onClick={onClose} />

          {/* Panel */}
          <div className="relative min-h-full flex items-start justify-center px-4 pt-12 pb-16">
            <div className="w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-blue-50 border-b border-blue-200">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-blue-900">{title}</span>
                  {orderNumber && (
                    <span className="text-xs font-mono bg-blue-700 text-white px-2.5 py-1 rounded">
                      #{orderNumber}
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="text-blue-400 hover:text-blue-700 text-xl leading-none transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
