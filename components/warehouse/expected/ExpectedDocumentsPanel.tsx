'use client'

import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'

interface ExpectedDocumentsPanelProps {
  label: string
  createLabel?: string
  count: number
  error?: string | null
  listOpen: boolean
  formOpen: boolean
  onToggleList: () => void
  onToggleForm: () => void
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
  onToggleForm,
  listContent,
  formContent,
}: ExpectedDocumentsPanelProps) {
  const hasError = !!error

  return (
    <div
      className={`rounded-lg overflow-hidden border-2 bg-white ${
        hasError ? 'border-red-300' : 'border-orange-200'
      }`}
    >
      {/* ── Compact strip ── always visible, ~48px tall */}
      <div
        className={`flex items-stretch ${
          hasError ? 'bg-red-50' : 'bg-orange-50'
        }`}
      >
        {/* +OV button — creates a new expected document */}
        <button
          onClick={onToggleForm}
          title={formOpen ? 'Zavřít formulář' : 'Vytvořit nový očekávaný doklad (+OV)'}
          className={`flex items-center gap-1 px-3 text-xs font-bold border-r transition-colors shrink-0 ${
            hasError
              ? 'border-red-200'
              : formOpen
              ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700'
              : 'border-orange-200 text-orange-700 hover:bg-orange-100'
          }`}
        >
          <Plus className="w-3 h-3" />
          <span>{createLabel}</span>
        </button>

        {/* Label + count — clicking anywhere on the label also toggles the list */}
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

        {/* Expand arrow — toggles list only */}
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

      {/* ── Create form panel — opens when +OV is clicked ── */}
      {formOpen && (
        <div className="border-t-2 border-orange-200 bg-white">
          {formContent ?? (
            <div className="px-5 py-4 text-sm text-gray-500 italic">
              Formulář není k dispozici.
            </div>
          )}
        </div>
      )}

      {/* ── List panel — opens when arrow is clicked ── */}
      {listOpen && (
        <div className="border-t-2 border-orange-200">
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
