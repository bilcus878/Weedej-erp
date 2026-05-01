// Server-side export engine. Returns Buffer/string; streaming to NextResponse
// is handled by the calling API route.

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type ExportFormat = 'csv' | 'excel' | 'pdf'

export interface ExportColumn {
  header: string
  key:    string
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function escapeCell(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function buildCsv(columns: ExportColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map(c => escapeCell(c.header)).join(',')
  const body   = rows.map(row =>
    columns.map(c => escapeCell(row[c.key])).join(',')
  ).join('\n')
  return `${header}\n${body}`
}

// ── Excel (CSV + UTF-8 BOM so Excel recognises the encoding) ─────────────────

export function buildExcel(columns: ExportColumn[], rows: Record<string, unknown>[]): ArrayBuffer {
  const csv = buildCsv(columns, rows)
  const bom = new Uint8Array([0xef, 0xbb, 0xbf])
  const body = new TextEncoder().encode(csv)
  const out  = new Uint8Array(bom.length + body.length)
  out.set(bom, 0)
  out.set(body, bom.length)
  return out.buffer as ArrayBuffer
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export interface PdfOptions {
  title:    string
  subtitle?: string
  columns:  ExportColumn[]
  rows:     Record<string, unknown>[]
}

export function buildPdf({ title, subtitle, columns, rows }: PdfOptions): ArrayBuffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 18)

  if (subtitle) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text(subtitle, 14, 25)
    doc.setTextColor(0, 0, 0)
  }

  autoTable(doc, {
    startY:     subtitle ? 30 : 24,
    head:       [columns.map(c => c.header)],
    body:       rows.map(row => columns.map(c => String(row[c.key] ?? ''))),
    headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 247] },
    margin:     { left: 14, right: 14 },
  })

  return doc.output('arraybuffer')
}

// ── Content-Type helpers ──────────────────────────────────────────────────────

export function contentTypeFor(format: ExportFormat): string {
  switch (format) {
    case 'csv':   return 'text/csv; charset=utf-8'
    case 'excel': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'pdf':   return 'application/pdf'
  }
}

export function fileExtFor(format: ExportFormat): string {
  switch (format) {
    case 'csv':   return 'csv'
    case 'excel': return 'xlsx'
    case 'pdf':   return 'pdf'
  }
}
