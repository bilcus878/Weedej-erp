'use client'

import { BookOpen } from 'lucide-react'
import {
  useAccountingExport,
  DateRangeStep,
  DocTypesStep,
  FormatStep,
  ExportButton,
  ExportHistoryTable,
} from '@/features/accounting-export'

export default function AccountingExportPage() {
  const s = useAccountingExport()

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Účetní export</h1>
          <p className="mt-1 text-sm text-gray-500">
            Export dokladů pro zpracování účetním. Formáty CSV, Excel, ZIP i přímý import do Pohoda / Money S3.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">DUZP = rozhodující datum pro DPH přiznání</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <DateRangeStep
          dateFrom={s.dateFrom}
          dateTo={s.dateTo}
          presets={s.presets}
          onDateFromChange={s.updateDateFrom}
          onDateToChange={s.updateDateTo}
          onApplyPreset={s.applyPreset}
        />
        <DocTypesStep
          selected={s.selected}
          preview={s.preview}
          previewLoading={s.previewLoading}
          canPreview={s.canPreview}
          onToggle={s.toggleType}
          onSelectAll={s.selectAll}
          onSelectNone={s.selectNone}
          onPreview={s.handlePreview}
        />
        <FormatStep
          format={s.format}
          includePdfs={s.includePdfs}
          onFormatChange={s.setFormat}
          onIncludePdfsChange={s.setIncludePdfs}
        />
        <ExportButton
          canExport={s.canExport}
          exporting={s.exporting}
          exportError={s.exportError}
          onExport={s.handleExport}
        />
      </div>

      <ExportHistoryTable
        jobs={s.jobs}
        jobsLoading={s.jobsLoading}
        showHistory={s.showHistory}
        onToggleHistory={() => s.setShowHistory(h => !h)}
        onRefresh={s.loadJobs}
        onDownload={s.downloadJob}
      />
    </div>
  )
}
