// ─── Accounting ZIP Packager ──────────────────────────────────────────────────
// Builds a structured ZIP archive with CSVs, XLSX summary, PDF originals and
// a human-readable README for the accountant.

import JSZip from 'jszip'
import path from 'path'
import fs from 'fs/promises'
import type { AccountingDocument, DocType, ExportParams } from '../types'
import { DOC_TYPE_LABELS } from '../types'
import { buildAccountingCsv, buildVatSummaryCsv } from './csv'
import { buildAccountingXlsx } from './xlsx'
import { buildVatSummary } from '../vatSummary'

const STORAGE_ROOT = process.env.DOCUMENT_STORAGE_PATH
  ?? path.join(process.cwd(), 'storage', 'documents')

// ─── Folder names per doc type ────────────────────────────────────────────────

const FOLDER_NAMES: Record<DocType, string> = {
  issued_invoice:   '01_vydane_faktury',
  received_invoice: '02_prijate_faktury',
  credit_note:      '03_dobropisy',
  payment:          '04_platby',
  customer_order:   '05_objednavky',
  delivery_note:    '06_vydejky',
  receipt:          '07_prijemky',
  stock_movement:   '08_pohyby_skladu',
}

const FILE_NAMES: Record<DocType, string> = {
  issued_invoice:   'vydane_faktury.csv',
  received_invoice: 'prijate_faktury.csv',
  credit_note:      'dobropisy.csv',
  payment:          'platby.csv',
  customer_order:   'objednavky.csv',
  delivery_note:    'vydejky.csv',
  receipt:          'prijemky.csv',
  stock_movement:   'pohyby_skladu.csv',
}

// ─── README content ───────────────────────────────────────────────────────────

function buildReadme(
  dateFrom: string,
  dateTo: string,
  counts: Map<DocType, AccountingDocument[]>,
  totalAmount: number,
  totalVat: number,
): string {
  const generated = new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })

  const countLines = [...counts.entries()]
    .filter(([, docs]) => docs.length > 0)
    .map(([dt, docs]) => `  ${FOLDER_NAMES[dt]}/  — ${DOC_TYPE_LABELS[dt]} (${docs.length} dokladů)`)
    .join('\n')

  return `ÚČETNÍ EXPORT — Weedej ERP
==========================================
Vygenerováno:  ${generated}
Období:        ${dateFrom} — ${dateTo}
Základní měna: CZK

OBSAH ARCHIVU
-------------------------------------------
${countLines}
  souhrn/            — DPH přehled + XLSX rekapitulace

INSTRUKCE PRO ZPRACOVÁNÍ
-------------------------------------------
1. CSV soubory jsou kódovány UTF-8 s BOM — Excel je otevře správně
   přímo dvojklikem. Oddělovač: čárka (,)

2. Datum DUZP (datum uskutečnění zdanitelného plnění) je rozhodující
   pro zařazení dokladu do správného DPH přiznání.

3. PDF originály dokladů jsou v podsložkách pdf_originaly/
   (pokud byly dostupné v archivu systému).

4. Soubor souhrn/ucetni_prehled.xlsx obsahuje přehled všech typů
   dokladů v jednom sešitě s více listy včetně DPH přehledu.

5. Soubor souhrn/dph_souhrn.csv je vhodný pro import do tabulky
   DPH přiznání.

FINANČNÍ SOUHRN OBDOBÍ
-------------------------------------------
Celkové obraty (bez DPH):  ${(totalAmount - totalVat).toFixed(2)} Kč
Celková DPH:               ${totalVat.toFixed(2)} Kč
Celkové obraty (s DPH):    ${totalAmount.toFixed(2)} Kč

Weedej ERP — https://weedej.cz
`
}

// ─── Try to read a PDF from disk ──────────────────────────────────────────────

async function tryReadPdf(pdfPath: string | null): Promise<Buffer | null> {
  if (!pdfPath) return null
  try {
    const full = path.join(STORAGE_ROOT, pdfPath)
    return await fs.readFile(full)
  } catch {
    return null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildAccountingZip(
  docs: Map<DocType, AccountingDocument[]>,
  params: ExportParams,
): Promise<Buffer> {
  const zip      = new JSZip()
  const dateFrom = params.dateFrom.toISOString().slice(0, 10)
  const dateTo   = params.dateTo.toISOString().slice(0, 10)
  const rootDir  = `export_${dateFrom}_${dateTo}`

  const allDocs     = [...docs.values()].flat()
  const totalAmount = allDocs.reduce((s, d) => s + d.totalAmount, 0)
  const totalVat    = allDocs.reduce((s, d) => s + d.totalVat, 0)

  // README.txt
  zip.file(
    `${rootDir}/README.txt`,
    buildReadme(dateFrom, dateTo, docs, totalAmount, totalVat),
  )

  // Per-type folders
  const docOrder: DocType[] = [
    'issued_invoice', 'received_invoice', 'credit_note',
    'payment', 'customer_order', 'delivery_note', 'receipt', 'stock_movement',
  ]

  for (const docType of docOrder) {
    const rows = docs.get(docType)
    if (!rows || rows.length === 0) continue

    const folder = `${rootDir}/${FOLDER_NAMES[docType]}`

    // CSV data file
    const csvBuf = buildAccountingCsv(docType, rows)
    zip.file(`${folder}/${FILE_NAMES[docType]}`, csvBuf)

    // PDF originals (best-effort — skip if not on disk)
    if (params.includePdfs) {
      for (const doc of rows) {
        if (!doc.pdfPath) continue
        const pdfBuf = await tryReadPdf(doc.pdfPath)
        if (!pdfBuf) continue
        const pdfFileName = path.basename(doc.pdfPath)
        zip.file(`${folder}/pdf_originaly/${doc.docNumber.replace(/[\/\\]/g, '-')}_${pdfFileName}`, pdfBuf)
      }
    }
  }

  // Summary folder
  const summaryDir = `${rootDir}/souhrn`

  // VAT summary CSV
  const vatRows    = buildVatSummary(docs)
  const vatCsvBuf  = buildVatSummaryCsv(vatRows)
  zip.file(`${summaryDir}/dph_souhrn.csv`, vatCsvBuf)

  // Full XLSX workbook
  const xlsxBuf = await buildAccountingXlsx(docs, dateFrom, dateTo)
  zip.file(`${summaryDir}/ucetni_prehled.xlsx`, xlsxBuf)

  // manifest.json
  const manifest = {
    version:        '1.0',
    generatedAt:    new Date().toISOString(),
    generatedBy:    'Weedej ERP',
    period:         { from: dateFrom, to: dateTo },
    currency:       'CZK',
    documentCounts: Object.fromEntries([...docs.entries()].map(([k, v]) => [k, v.length])),
    totals:         { taxBase: totalAmount - totalVat, vat: totalVat, gross: totalAmount },
  }
  zip.file(`${rootDir}/manifest.json`, JSON.stringify(manifest, null, 2))

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}
