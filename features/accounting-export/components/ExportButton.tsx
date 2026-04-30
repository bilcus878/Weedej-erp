'use client'

import { Download, Loader2, AlertCircle } from 'lucide-react'

interface Props {
  canExport:   boolean
  exporting:   boolean
  exportError: string | null
  onExport:    () => void
}

export function ExportButton({ canExport, exporting, exportError, onExport }: Props) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onExport}
          disabled={!canExport}
          className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-all"
        >
          {exporting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generuji export…</>
            : <><Download className="w-4 h-4" /> Stáhnout export</>
          }
        </button>

        {exporting && (
          <p className="text-sm text-gray-500">Připravuji soubor, může to chvíli trvat…</p>
        )}

        {exportError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {exportError}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Export se stáhne přímo do vašeho prohlížeče. Soubory jsou dostupné 7 dní v historii níže.
      </p>
    </div>
  )
}
