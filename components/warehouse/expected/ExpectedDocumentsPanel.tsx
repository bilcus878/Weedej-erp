'use client'

import { useRef, useCallback, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useClickOutside } from '../shared/useClickOutside'

interface ExpectedDocumentsPanelProps {
  label: string
  createLabel?: string
  count: number
  error?: string | null
  listOpen: boolean
  formOpen: boolean
  onToggleList: () => void
  onCloseForm: () => void
  listContent?: ReactNode
  formContent?: ReactNode
}

export function ExpectedDocumentsPanel({
  label,
  createLabel = 'OV',
  count,
  error,
  listOpen,
  formOpen,
  onToggleList,
  onCloseForm,
  listContent,
  formContent,
}: ExpectedDocumentsPanelProps) {
  const hasError = !!error
  const panelRef = useRef<HTMLDivElement>(null)

  const stableClose = useCallback(onCloseForm, [onCloseForm])
  useClickOutside(panelRef, stableClose)

  return (
    <div
      ref={panelRef}
      className={`relative rounded-lg border-2 bg-white ${
        hasError ? 'border-red-300' : 'border-orange-200'
      }`}
    >
      {/* ── Always-visible strip ── */}
      <div
        className={`flex items-stretch ${
          hasError ? 'bg-red-50' : 'bg-orange-50'
        } rounded-lg`}
      >
        {/* Label + count — clicking toggles list */}
        <button
          onClick={onToggleList}
          className="flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-100 transition-colors min-w-0"
        >
          <span
            className={`text-sm font-semibold truncate ${
              hasError ? 'text-red-800' : 'text-orange-900'
            }`}
          >
            {hasError
              ? '⚠️ Chyba načítání očekávaných dokladů'
              : `Očekávané ${label}`}
          </span>

          {!hasError && (
            <span
              className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold shrink-0 ${
                count > 0
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-200 text-orange-700'
              }`}
            >
              {count}
            </span>
          )}

          {hasError && (
            <span className="text-xs text-red-600 truncate">{error}</span>
          )}
        </button>

        {/* Expand / collapse chevron */}
        <button
          onClick={onToggleList}
          title={listOpen ? 'Sbalit seznam' : 'Rozbalit seznam'}
          className={`px-3 border-l transition-colors shrink-0 ${
            hasError
              ? 'border-red-200 hover:bg-red-100'
              : listOpen
              ? 'bg-orange-100 border-orange-200 hover:bg-orange-200'
              : 'border-orange-200 hover:bg-orange-100'
          }`}
        >
          {listOpen ? (
            <ChevronDown className={`h-5 w-5 ${hasError ? 'text-red-600' : 'text-orange-600'}`} />
          ) : (
            <ChevronRight className={`h-5 w-5 ${hasError ? 'text-red-600' : 'text-orange-600'}`} />
          )}
        </button>
      </div>

      {/* ── Floating create popover — triggered from list header, anchored to panel ── */}
      {formOpen && !hasError && (
        <div className="absolute top-full left-0 z-50 mt-1 w-80 bg-white border border-orange-200 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50 border-b border-orange-200">
            <span className="text-xs font-semibold text-orange-800 uppercase tracking-wide">
              +{createLabel} — Nový doklad
            </span>
            <button
              onClick={onCloseForm}
              className="text-orange-400 hover:text-orange-700 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="p-4">
            {formContent ?? (
              <p className="text-sm text-gray-500 italic">
                Formulář není k dispozici.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Expanded list panel ── */}
      {listOpen && (
        <div className="border-t-2 border-orange-200 rounded-b-lg overflow-hidden">
          {hasError ? (
            <div className="px-5 py-4 text-sm text-red-700 bg-red-50">
              {error}
            </div>
          ) : count === 0 ? (
            <div className="px-5 py-5 text-sm text-gray-500 italic text-center">
              Žádné očekávané doklady čekající na zpracování.
            </div>
          ) : (
            listContent
          )}
        </div>
      )}
    </div>
  )
}
