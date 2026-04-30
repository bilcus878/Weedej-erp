'use client'

import {
  Clock, RefreshCw, ChevronUp, ChevronDown,
  Loader2, FileDown, CheckCircle2, AlertCircle, Download,
} from 'lucide-react'
import type { JobRecord } from '../types'
import { formatDate, formatBytes, formatLabel } from '../utils'

interface Props {
  jobs:            JobRecord[]
  jobsLoading:     boolean
  showHistory:     boolean
  onToggleHistory: () => void
  onRefresh:       () => void
  onDownload:      (jobId: string) => void
}

export function ExportHistoryTable({ jobs, jobsLoading, showHistory, onToggleHistory, onRefresh, onDownload }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-800">Historie exportů</h2>
          {jobs.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{jobs.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={jobsLoading}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Obnovit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${jobsLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onToggleHistory}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
          >
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {showHistory && (
        <>
          {jobsLoading && jobs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileDown className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Zatím žádné exporty</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Datum', 'Období', 'Formát', 'Dokladů', 'Velikost', 'Stav', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide first:px-6">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {jobs.map((job, i) => (
                    <tr key={job.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-6 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {formatDate(job.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-mono text-xs">
                        {job.dateFrom.slice(0, 10)} – {job.dateTo.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-50 text-violet-700 text-xs font-medium">
                          {formatLabel(job.exportFormat)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {job.rowCount != null ? `${job.rowCount} řádků` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {job.fileSize != null ? formatBytes(job.fileSize) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {job.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Hotovo
                          </span>
                        )}
                        {job.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Zpracovávám
                          </span>
                        )}
                        {job.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600" title={job.errorMessage ?? ''}>
                            <AlertCircle className="w-3.5 h-3.5" /> Chyba
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {job.status === 'completed' && (
                          <button
                            onClick={() => onDownload(job.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            Stáhnout
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {jobs.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-50">
              <p className="text-xs text-gray-400">Exporty jsou dostupné ke stažení po dobu 7 dní od vytvoření.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
