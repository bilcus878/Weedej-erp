'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Download, FileText, FileSpreadsheet, Archive, Code2,
  Calendar, CheckSquare, Square, Play, Clock, AlertCircle,
  CheckCircle2, Loader2, ChevronDown, ChevronUp, RefreshCw,
  FileDown, Trash2, Info, BookOpen,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType =
  | 'issued_invoice' | 'received_invoice' | 'credit_note'
  | 'payment' | 'customer_order' | 'delivery_note'
  | 'receipt' | 'stock_movement'

type ExportFormat = 'csv' | 'xlsx' | 'zip' | 'pohoda_xml' | 'money_xml' | 'generic_csv'

interface JobRecord {
  id:            string
  dateFrom:      string
  dateTo:        string
  documentTypes: string  // JSON array
  exportFormat:  ExportFormat
  status:        'pending' | 'processing' | 'completed' | 'failed'
  fileName:      string | null
  fileSize:      number | null
  rowCount:      number | null
  errorMessage:  string | null
  completedAt:   string | null
  expiresAt:     string | null
  createdAt:     string
}

interface Preview {
  counts:    Partial<Record<DocType, number>>
  totalRows: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_TYPES: { id: DocType; label: string; description: string }[] = [
  { id: 'issued_invoice',   label: 'Vydané faktury',          description: 'Faktury vystavené odběratelům' },
  { id: 'received_invoice', label: 'Přijaté faktury',         description: 'Faktury přijaté od dodavatelů' },
  { id: 'credit_note',      label: 'Dobropisy',               description: 'Dobropisy k vydaným fakturám' },
  { id: 'payment',          label: 'Platby / transakce',      description: 'Hotovostní i bezhotovostní platby' },
  { id: 'customer_order',   label: 'Objednávky zákazníků',    description: 'Přijaté objednávky' },
  { id: 'delivery_note',    label: 'Výdejky',                 description: 'Výdejky ze skladu' },
  { id: 'receipt',          label: 'Příjemky',                description: 'Příjemky na sklad' },
  { id: 'stock_movement',   label: 'Pohyby skladu',           description: 'Všechny skladové pohyby' },
]

interface FormatOption {
  id:          ExportFormat
  label:       string
  description: string
  icon:        React.ReactNode
  badge?:      string
  badgeColor?: string
}

const FORMATS: FormatOption[] = [
  {
    id:          'csv',
    label:       'CSV',
    description: 'Jeden soubor, vhodný pro rychlý import',
    icon:        <FileText className="w-5 h-5" />,
  },
  {
    id:          'xlsx',
    label:       'Excel (XLSX)',
    description: 'Vícelistový sešit s DPH přehledem a barevným formátováním',
    icon:        <FileSpreadsheet className="w-5 h-5" />,
    badge:       'Doporučeno',
    badgeColor:  'bg-violet-100 text-violet-700',
  },
  {
    id:          'zip',
    label:       'ZIP balíček',
    description: 'CSV + XLSX + PDF originály dokladů v jednom archivu',
    icon:        <Archive className="w-5 h-5" />,
    badge:       'Kompletní',
    badgeColor:  'bg-emerald-100 text-emerald-700',
  },
  {
    id:          'pohoda_xml',
    label:       'Pohoda XML',
    description: 'Přímý import do Pohoda MDB / SQL / E1',
    icon:        <Code2 className="w-5 h-5" />,
    badge:       'Pohoda',
    badgeColor:  'bg-blue-100 text-blue-700',
  },
  {
    id:          'money_xml',
    label:       'Money S3 XML',
    description: 'Přímý import do Money S3 / S4 (Solitea)',
    icon:        <Code2 className="w-5 h-5" />,
    badge:       'Money S3',
    badgeColor:  'bg-orange-100 text-orange-700',
  },
  {
    id:          'generic_csv',
    label:       'Obecné CSV',
    description: 'Středníkový oddělovač, pro Helios, Abra a jiné SW',
    icon:        <FileText className="w-5 h-5" />,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('cs-CZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatLabel(format: ExportFormat): string {
  return FORMATS.find(f => f.id === format)?.label ?? format
}

// ─── Preset date ranges ───────────────────────────────────────────────────────

function getPresets(): { label: string; from: string; to: string }[] {
  const now  = new Date()
  const y    = now.getFullYear()
  const m    = now.getMonth()

  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const first = (year: number, month: number) => new Date(year, month, 1)
  const last  = (year: number, month: number) => new Date(year, month + 1, 0)

  return [
    { label: 'Tento měsíc',    from: iso(first(y, m)),     to: iso(now) },
    { label: 'Minulý měsíc',   from: iso(first(y, m - 1)), to: iso(last(y, m - 1)) },
    { label: 'Q1 ' + y,        from: `${y}-01-01`,          to: `${y}-03-31` },
    { label: 'Q2 ' + y,        from: `${y}-04-01`,          to: `${y}-06-30` },
    { label: 'Q3 ' + y,        from: `${y}-07-01`,          to: `${y}-09-30` },
    { label: 'Q4 ' + y,        from: `${y}-10-01`,          to: `${y}-12-31` },
    { label: 'Celý rok ' + y,  from: `${y}-01-01`,          to: `${y}-12-31` },
    { label: 'Celý rok ' + (y-1), from: `${y-1}-01-01`,    to: `${y-1}-12-31` },
  ]
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AccountingExportPage() {
  // Form state
  const today     = new Date().toISOString().slice(0, 10)
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const [dateFrom, setDateFrom]       = useState(firstOfMonth)
  const [dateTo,   setDateTo]         = useState(today)
  const [selected, setSelected]       = useState<Set<DocType>>(new Set(DOC_TYPES.map(d => d.id)))
  const [format,   setFormat]         = useState<ExportFormat>('xlsx')
  const [includePdfs, setIncludePdfs] = useState(true)

  // Preview
  const [preview,         setPreview]         = useState<Preview | null>(null)
  const [previewLoading,  setPreviewLoading]  = useState(false)

  // Export
  const [exporting,  setExporting]  = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  // History
  const [jobs,        setJobs]        = useState<JobRecord[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(true)

  // ── Load history ────────────────────────────────────────────────────────────

  const loadJobs = useCallback(async () => {
    setJobsLoading(true)
    try {
      const res  = await fetch('/api/accounting/exports')
      if (res.ok) setJobs(await res.json())
    } finally {
      setJobsLoading(false)
    }
  }, [])

  useEffect(() => { loadJobs() }, [loadJobs])

  // ── Toggle doc type ─────────────────────────────────────────────────────────

  function toggleType(id: DocType) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setPreview(null)
  }

  function selectAll()  { setSelected(new Set(DOC_TYPES.map(d => d.id))); setPreview(null) }
  function selectNone() { setSelected(new Set()); setPreview(null) }

  // ── Preview ─────────────────────────────────────────────────────────────────

  async function handlePreview() {
    if (selected.size === 0) return
    setPreviewLoading(true)
    setPreview(null)
    try {
      const res = await fetch('/api/accounting/exports/preview', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ dateFrom, dateTo, documentTypes: [...selected] }),
      })
      if (res.ok) setPreview(await res.json())
    } finally {
      setPreviewLoading(false)
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  async function handleExport() {
    if (selected.size === 0 || exporting) return
    setExporting(true)
    setExportError(null)

    try {
      const res = await fetch('/api/accounting/exports', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          dateFrom, dateTo,
          documentTypes: [...selected],
          format,
          includePdfs,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setExportError(data.message ?? data.error ?? 'Export selhal')
        return
      }

      // Auto-download
      window.location.href = `/api/accounting/exports/${data.jobId}/download`
      await loadJobs()

    } catch (err) {
      setExportError('Síťová chyba — zkuste znovu')
    } finally {
      setExporting(false)
    }
  }

  // ── Download existing job ────────────────────────────────────────────────────

  function downloadJob(jobId: string) {
    window.location.href = `/api/accounting/exports/${jobId}/download`
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const presets = getPresets()
  const canExport = selected.size > 0 && dateFrom && dateTo && !exporting

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
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

      {/* ── Main card ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Step 1 — Date range */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold">1</span>
            <h2 className="font-semibold text-gray-800">Vyberte období</h2>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {presets.map(p => (
              <button
                key={p.label}
                onClick={() => { setDateFrom(p.from); setDateTo(p.to); setPreview(null) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  dateFrom === p.from && dateTo === p.to
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <label className="text-sm text-gray-600">Od:</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPreview(null) }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <label className="text-sm text-gray-600">Do:</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPreview(null) }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>

        {/* Step 2 — Document types */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold">2</span>
              <h2 className="font-semibold text-gray-800">Typy dokladů</h2>
              <span className="text-xs text-gray-400">({selected.size}/{DOC_TYPES.length} vybráno)</span>
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll}  className="text-xs text-violet-600 hover:text-violet-800 font-medium">Vybrat vše</button>
              <span className="text-gray-300">|</span>
              <button onClick={selectNone} className="text-xs text-gray-500 hover:text-gray-700">Zrušit výběr</button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DOC_TYPES.map(dt => {
              const isChecked = selected.has(dt.id)
              const count     = preview?.counts[dt.id]
              return (
                <button
                  key={dt.id}
                  onClick={() => toggleType(dt.id)}
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

          {/* Preview button + result */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handlePreview}
              disabled={selected.size === 0 || previewLoading || !dateFrom || !dateTo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {previewLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Info className="w-3.5 h-3.5" />
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

        {/* Step 3 — Format */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold">3</span>
            <h2 className="font-semibold text-gray-800">Formát exportu</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
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

          {/* ZIP options */}
          {format === 'zip' && (
            <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <button
                onClick={() => setIncludePdfs(p => !p)}
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

          {/* XML warning */}
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

        {/* Step 4 — Export button */}
        <div className="p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExport}
              disabled={!canExport}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-all"
            >
              {exporting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generuji export…</>
                : <><Download className="w-4 h-4" /> Stáhnout export</>
              }
            </button>

            {exporting && (
              <p className="text-sm text-gray-500">
                Připravuji soubor, může to chvíli trvat…
              </p>
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
      </div>

      {/* ── Export history ───────────────────────────────────────────────── */}
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
              onClick={loadJobs}
              disabled={jobsLoading}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Obnovit"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${jobsLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowHistory(h => !h)}
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
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Období</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Formát</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dokladů</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Velikost</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stav</th>
                      <th className="px-4 py-3"></th>
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
                              onClick={() => downloadJob(job.id)}
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
    </div>
  )
}
