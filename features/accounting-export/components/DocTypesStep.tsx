'use client'

import { CheckSquare, Square, Info, Loader2, CheckCircle2 } from 'lucide-react'
import { DOC_TYPES } from '../constants'
import type { DocType, Preview } from '../types'

interface Props {
  selected:       Set<DocType>
  preview:        Preview | null
  previewLoading: boolean
  canPreview:     boolean
  onToggle:       (id: DocType) => void
  onSelectAll:    () => void
  onSelectNone:   () => void
  onPreview:      () => void
}

export function DocTypesStep({
  selected, preview, previewLoading, canPreview,
  onToggle, onSelectAll, onSelectNone, onPreview,
}: Props) {
  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold">2</span>
          <h2 className="font-semibold text-gray-800">Typy dokladů</h2>
          <span className="text-xs text-gray-400">({selected.size}/{DOC_TYPES.length} vybráno)</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onSelectAll}  className="text-xs text-violet-600 hover:text-violet-800 font-medium">Vybrat vše</button>
          <span className="text-gray-300">|</span>
          <button onClick={onSelectNone} className="text-xs text-gray-500 hover:text-gray-700">Zrušit výběr</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {DOC_TYPES.map(dt => {
          const isChecked = selected.has(dt.id)
          const count     = preview?.counts[dt.id]
          return (
            <button
              key={dt.id}
              onClick={() => onToggle(dt.id)}
              className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                isChecked
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-2">
                {isChecked
                  ? <CheckSquare className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                  : <Square      className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                }
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isChecked ? 'text-violet-800' : 'text-gray-700'}`}>
                    {dt.label}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{dt.description}</p>
                </div>
              </div>
              {count != null && (
                <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  count > 0 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400'
                }`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onPreview}
          disabled={!canPreview || previewLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {previewLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Info    className="w-3.5 h-3.5" />
          }
          Zobrazit počty dokladů
        </button>

        {preview && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-gray-700">
              Celkem <strong>{preview.totalRows}</strong> dokladů k exportu
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
