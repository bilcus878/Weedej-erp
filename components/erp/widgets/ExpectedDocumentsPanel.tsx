'use client'

import { type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface ExpectedDocumentsPanelProps {
  label: string
  count: number
  error?: string | null
  listOpen: boolean
  onToggleList: () => void
  listContent?: ReactNode
}

export function ExpectedDocumentsPanel({
  label,
  count,
  error,
  listOpen,
  onToggleList,
  listContent,
}: ExpectedDocumentsPanelProps) {
  const hasError = !!error

  return (
    <div
      className={`rounded-lg border-2 bg-white ${
        hasError ? 'border-red-300' : 'border-orange-200'
      }`}
    >
      {/* ── Always-visible strip ── */}
      <div
        className={`flex items-stretch ${
          hasError ? 'bg-red-50' : 'bg-orange-50'
        } rounded-lg`}
      >
        <button
          onClick={onToggleList}
          className="flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-orange-100 transition-colors min-w-0"
        >
          <span
            className={`text-sm font-semibold truncate ${
              hasError ? 'text-red-800' : 'text-orange-900'
            }`}
          >
            {hasError ? '⚠️ Chyba načítání očekávaných dokladů' : `Očekávané ${label}`}
          </span>

          {!hasError && (
            <span
              className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold shrink-0 ${
                count > 0 ? 'bg-orange-600 text-white' : 'bg-orange-200 text-orange-700'
              }`}
            >
              {count}
            </span>
          )}

          {hasError && (
            <span className="text-xs text-red-600 truncate">{error}</span>
          )}
        </button>

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

      {/* ── Expanded list ── */}
      {listOpen && (
        <div className="border-t-2 border-orange-200 rounded-b-lg overflow-hidden">
          {hasError ? (
            <div className="px-5 py-4 text-sm text-red-700 bg-red-50">{error}</div>
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
