'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Eye, X } from 'lucide-react'
import { useClickOutside } from '../shared/useClickOutside'

interface QuickPreviewCardProps {
  cardContent: ReactNode
}

export function QuickPreviewCard({ cardContent }: QuickPreviewCardProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(false))

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`p-1 rounded transition-colors ${
          open
            ? 'text-orange-600 bg-orange-100'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
        title="Rychlý náhled"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Rychlý náhled
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">{cardContent}</div>
        </div>
      )}
    </div>
  )
}
