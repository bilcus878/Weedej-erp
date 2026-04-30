'use client'

import { CheckSquare, Square, CheckCircle2, Info } from 'lucide-react'
import { FORMATS } from '../constants'
import type { ExportFormat } from '../types'

interface Props {
  format:           ExportFormat
  includePdfs:      boolean
  onFormatChange:   (f: ExportFormat) => void
  onIncludePdfsChange: (v: boolean) => void
}

export function FormatStep({ format, includePdfs, onFormatChange, onIncludePdfsChange }: Props) {
  return (
    <div className="p-6 border-b border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold">3</span>
        <h2 className="font-semibold text-gray-800">Formát exportu</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {FORMATS.map(f => (
          <button
            key={f.id}
            onClick={() => onFormatChange(f.id)}
            className={`relative text-left p-4 rounded-xl border-2 transition-all ${
              format === f.id
                ? 'border-violet-500 bg-violet-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className={`flex items-center gap-2 mb-1.5 ${format === f.id ? 'text-violet-700' : 'text-gray-600'}`}>
              {f.icon}
              <span className="font-semibold text-sm">{f.label}</span>
            </div>
            <p className="text-xs text-gray-500 leading-snug">{f.description}</p>
            {f.badge && (
              <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${f.badgeColor}`}>
                {f.badge}
              </span>
            )}
            {format === f.id && (
              <div className="absolute bottom-2 right-2">
                <CheckCircle2 className="w-4 h-4 text-violet-500" />
              </div>
            )}
          </button>
        ))}
      </div>

      {format === 'zip' && (
        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <button
            onClick={() => onIncludePdfsChange(!includePdfs)}
            className="flex items-center gap-2 text-sm text-emerald-800"
          >
            {includePdfs
              ? <CheckSquare className="w-4 h-4 text-emerald-600" />
              : <Square      className="w-4 h-4 text-emerald-400" />
            }
            Zahrnout PDF originály dokladů (pokud jsou dostupné v archivu)
          </button>
        </div>
      )}

      {(format === 'pohoda_xml' || format === 'money_xml') && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            XML import podporuje pouze <strong>vydané faktury, přijaté faktury a dobropisy</strong>.
            Ostatní typy dokladů budou ze souboru vynechány.
            Soubor je kódován <strong>Windows-1250</strong> dle specifikace {format === 'pohoda_xml' ? 'Pohoda' : 'Money S3'}.
          </p>
        </div>
      )}
    </div>
  )
}
