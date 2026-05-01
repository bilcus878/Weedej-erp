// ─── Accounting XLSX Renderer ─────────────────────────────────────────────────
// Generates a professional multi-sheet Excel workbook.
// Each document type = one sheet. Additional sheets: VAT summary + cover page.

import ExcelJS from 'exceljs'
import type { AccountingDocument, DocType, VatSummaryRow } from '../types'
import { DOC_TYPE_LABELS } from '../types'
import { buildVatSummary } from '../vatSummary'

// ─── Brand colours ────────────────────────────────────────────────────────────
const VIOLET      = '5B21B6'  // header bg
const VIOLET_LIGHT = 'EDE9FE' // alternating row
const GREEN        = '166534'
const RED          = '991B1B'
const GRAY_BG      = 'F9FAFB'
const WHITE        = 'FFFFFF'

// ─── Column specs per doc type ────────────────────────────────────────────────

interface ColSpec { header: string; key: string; width: number; numFmt?: string; style?: Partial<ExcelJS.Style> }

function colSpecs(docType: DocType): ColSpec[] {
  const money: Partial<ExcelJS.Style> = { numFmt: '#,##0.00', alignment: { horizontal: 'right' } }

  switch (docType) {
    case 'issued_invoice': return [
      { header: 'Číslo faktury',    key: 'docNumber',      width: 18 },
      { header: 'Datum',            key: 'docDate',        width: 12 },
      { header: 'Splatnost',        key: 'dueDate',        width: 12 },
      { header: 'DUZP',             key: 'taxPointDate',   width: 12 },
      { header: 'Odběratel',        key: 'partyName',      width: 28 },
      { header: 'IČO',              key: 'partyIco',       width: 12 },
      { header: 'DIČ',              key: 'partyDic',       width: 14 },
      { header: 'Základ 21%',       key: 'base21',         width: 14, style: money },
      { header: 'DPH 21%',          key: 'vat21',          width: 12, style: money },
      { header: 'Základ 12%',       key: 'base12',         width: 14, style: money },
      { header: 'DPH 12%',          key: 'vat12',          width: 12, style: money },
      { header: 'Základ 0%',        key: 'base0',          width: 12, style: money },
      { header: 'Celk. základ',     key: 'totalTaxBase',   width: 14, style: money },
      { header: 'Celk. DPH',        key: 'totalVat',       width: 12, style: money },
      { header: 'Celkem s DPH',     key: 'totalAmount',    width: 15, style: money },
      { header: 'Stav platby',      key: 'paymentStatus',  width: 14 },
      { header: 'Uhrazeno',         key: 'paidAmount',     width: 13, style: money },
      { header: 'Způsob platby',    key: 'paymentType',    width: 16 },
      { header: 'Var. symbol',      key: 'variableSymbol', width: 14 },
      { header: 'Poznámka',         key: 'note',           width: 30 },
    ]

    case 'received_invoice': return [
      { header: 'Číslo faktury',    key: 'docNumber',      width: 18 },
      { header: 'Datum',            key: 'docDate',        width: 12 },
      { header: 'Splatnost',        key: 'dueDate',        width: 12 },
      { header: 'Dodavatel',        key: 'partyName',      width: 28 },
      { header: 'IČO',              key: 'partyIco',       width: 12 },
      { header: 'DIČ',              key: 'partyDic',       width: 14 },
      { header: 'Základ bez DPH',   key: 'totalTaxBase',   width: 16, style: money },
      { header: 'DPH',              key: 'totalVat',       width: 12, style: money },
      { header: 'Celkem s DPH',     key: 'totalAmount',    width: 15, style: money },
      { header: 'Stav',             key: 'paymentStatus',  width: 12 },
      { header: 'Způsob platby',    key: 'paymentType',    width: 16 },
      { header: 'Var. symbol',      key: 'variableSymbol', width: 14 },
      { header: 'Poznámka',         key: 'note',           width: 30 },
    ]

    case 'credit_note': return [
      { header: 'Číslo dobropisu',  key: 'docNumber',      width: 18 },
      { header: 'Datum',            key: 'docDate',        width: 12 },
      { header: 'Odběratel',        key: 'partyName',      width: 28 },
      { header: 'IČO',              key: 'partyIco',       width: 12 },
      { header: 'Základ bez DPH',   key: 'totalTaxBase',   width: 16, style: money },
      { header: 'DPH',              key: 'totalVat',       width: 12, style: money },
      { header: 'Celkem',           key: 'totalAmount',    width: 14, style: money },
      { header: 'Původní faktura',  key: 'variableSymbol', width: 18 },
      { header: 'Důvod / poznámka', key: 'note',           width: 35 },
    ]

    case 'payment': return [
      { header: 'Číslo transakce',  key: 'docNumber',      width: 20 },
      { header: 'Datum',            key: 'docDate',        width: 12 },
      { header: 'Typ',              key: 'direction',      width: 18 },
      { header: 'Protistrana',      key: 'partyName',      width: 28 },
      { header: 'IČO',              key: 'partyIco',       width: 12 },
      { header: 'Základ bez DPH',   key: 'totalTaxBase',   width: 16, style: money },
      { header: 'DPH',              key: 'totalVat',       width: 12, style: money },
      { header: 'Celkem',           key: 'totalAmount',    width: 14, style: money },
      { header: 'Způsob platby',    key: 'paymentType',    width: 16 },
      { header: 'Poznámka',         key: 'note',           width: 30 },
    ]

    case 'customer_order': return [
      { header: 'Číslo objednávky', key: 'docNumber',      width: 20 },
      { header: 'Datum',            key: 'docDate',        width: 12 },
      { header: 'Zákazník',         key: 'partyName',      width: 28 },
      { header: 'Základ bez DPH',   key: 'totalTaxBase',   width: 16, style: money },
      { header: 'DPH',              key: 'totalVat',       width: 12, style: money },
      { header: 'Celkem',           key: 'totalAmount',    width: 14, style: money },
      { header: 'Stav platby',      key: 'paymentStatus',  width: 14 },
      { header: 'Stav',             key: 'status',         width: 16 },
      { header: 'Poznámka',         key: 'note',           width: 30 },
    ]

    case 'delivery_note': return [
      { header: 'Číslo výdejky',    key: 'docNumber',      width: 18 },
      { header: 'Datum',            key: 'docDate',        width: 12 },
      { header: 'Zákazník',         key: 'partyName',      width: 28 },
      { header: 'Hodnota celkem',   key: 'totalAmount',    width: 16, style: money },
      { header: 'Stav',             key: 'status',         width: 14 },
      { header: 'Poznámka',         key: 'note',           width: 30 },
    ]

    case 'receipt': return [
      { header: 'Číslo příjemky',   key: 'docNumber',      width: 18 },
      { header: 'Datum',            key: 'docDate',        width: 12 },
      { header: 'Dodavatel',        key: 'partyName',      width: 28 },
      { header: 'IČO',              key: 'partyIco',       width: 12 },
      { header: 'Základ bez DPH',   key: 'totalTaxBase',   width: 16, style: money },
      { header: 'DPH',              key: 'totalVat',       width: 12, style: money },
      { header: 'Celkem',           key: 'totalAmount',    width: 14, style: money },
      { header: 'Stav',             key: 'status',         width: 14 },
      { header: 'Poznámka',         key: 'note',           width: 30 },
    ]

    case 'stock_movement': return [
      { header: 'Datum',            key: 'docDate',        width: 12 },
      { header: 'Produkt / popis',  key: 'note',           width: 38 },
      { header: 'Dodavatel',        key: 'partyName',      width: 24 },
      { header: 'Základ bez DPH',   key: 'totalTaxBase',   width: 16, style: money },
      { header: 'DPH',              key: 'totalVat',       width: 12, style: money },
      { header: 'Hodnota celkem',   key: 'totalAmount',    width: 16, style: money },
    ]
  }
}

// ─── Row extractor ────────────────────────────────────────────────────────────

function extractRow(doc: AccountingDocument, specs: ColSpec[]): Record<string, unknown> {
  const vatLine21 = doc.vatLines.find(l => l.vatRate === 21)
  const vatLine12 = doc.vatLines.find(l => l.vatRate === 12)
  const vatLine0  = doc.vatLines.find(l => l.vatRate === 0)

  const base: Record<string, unknown> = {
    docNumber:      doc.docNumber,
    docDate:        doc.docDate,
    dueDate:        doc.dueDate ?? '',
    taxPointDate:   doc.taxPointDate,
    partyName:      doc.partyName ?? '',
    partyIco:       doc.partyIco  ?? '',
    partyDic:       doc.partyDic  ?? '',
    partyAddress:   doc.partyAddress ?? '',
    base21:         vatLine21?.taxBase   ?? 0,
    vat21:          vatLine21?.vatAmount ?? 0,
    base12:         vatLine12?.taxBase   ?? 0,
    vat12:          vatLine12?.vatAmount ?? 0,
    base0:          vatLine0?.taxBase    ?? 0,
    totalTaxBase:   doc.totalTaxBase,
    totalVat:       doc.totalVat,
    totalAmount:    doc.totalAmount,
    paymentStatus:  doc.paymentStatus ?? '',
    paidAmount:     doc.paidAmount ?? 0,
    paymentType:    doc.paymentType  ?? '',
    variableSymbol: doc.variableSymbol ?? '',
    constantSymbol: doc.constantSymbol ?? '',
    note:           doc.note    ?? '',
    status:         doc.status,
    direction:      doc.partyType === 'supplier' ? 'Přijatá platba' : 'Vydaná platba',
  }
  return base
}

// ─── Cell colouring based on payment status ───────────────────────────────────

function rowFill(doc: AccountingDocument, rowIndex: number): ExcelJS.Fill {
  if (doc.paymentStatus === 'paid')     return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
  if (doc.paymentStatus === 'unpaid')   return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
  if (doc.paymentStatus === 'overdue')  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
  return rowIndex % 2 === 0
    ? { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${WHITE}` } }
    : { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${VIOLET_LIGHT}` } }
}

// ─── Build sheet for one document type ────────────────────────────────────────

function addDocSheet(wb: ExcelJS.Workbook, docType: DocType, docs: AccountingDocument[]) {
  const specs  = colSpecs(docType)
  const sheet  = wb.addWorksheet(DOC_TYPE_LABELS[docType], {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { defaultColWidth: 14 },
  })

  sheet.columns = specs.map(s => ({ header: s.header, key: s.key, width: s.width }))

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.eachCell(cell => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${VIOLET}` } }
    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF4C1D95' } } }
    cell.alignment = { vertical: 'middle', wrapText: false }
  })
  headerRow.height = 20

  // Data rows
  for (let i = 0; i < docs.length; i++) {
    const doc    = docs[i]
    const values = extractRow(doc, specs)
    const dr     = sheet.addRow(values)

    const fill = rowFill(doc, i)
    dr.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const spec = specs[colNum - 1]
      cell.fill  = fill
      cell.font  = { size: 9 }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
      if (spec?.style?.numFmt) cell.numFmt = spec.style.numFmt as string
      if (spec?.style?.alignment) cell.alignment = spec.style.alignment as ExcelJS.Alignment
    })
  }

  // Totals row
  if (docs.length > 0 && specs.some(s => s.style?.numFmt)) {
    const totalRow = sheet.addRow([])
    const totalFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${VIOLET_LIGHT}` } }
    totalRow.eachCell({ includeEmpty: true }, cell => {
      cell.fill = totalFill
      cell.font = { bold: true, size: 9 }
    })

    // Sum money columns
    specs.forEach((spec, idx) => {
      if (spec.style?.numFmt && docs.some(d => typeof extractRow(d, specs)[spec.key] === 'number')) {
        const col  = idx + 1
        const last = docs.length + 1
        const cell = totalRow.getCell(col)
        cell.value = { formula: `SUM(${sheet.getColumn(col).letter}2:${sheet.getColumn(col).letter}${last})` }
        cell.numFmt = '#,##0.00'
      }
    })
  }

  // Auto-filter on header row
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: specs.length },
  }
}

// ─── VAT summary sheet ────────────────────────────────────────────────────────

function addVatSheet(wb: ExcelJS.Workbook, rows: VatSummaryRow[]) {
  const sheet = wb.addWorksheet('Souhrn DPH', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = [
    { header: 'Období',          key: 'period',       width: 12 },
    { header: 'Sazba DPH %',     key: 'vatRate',      width: 12 },
    { header: 'Typ dokladu',     key: 'docTypeLabel', width: 24 },
    { header: 'Počet dokladů',   key: 'docCount',     width: 14 },
    { header: 'Základ DPH',      key: 'totalTaxBase', width: 16 },
    { header: 'DPH',             key: 'totalVat',     width: 14 },
    { header: 'Celkem s DPH',    key: 'totalGross',   width: 16 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${VIOLET}` } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }
  })
  headerRow.height = 20

  let lastPeriod = ''
  rows.forEach((r, i) => {
    const dr = sheet.addRow({
      period:       r.period,
      vatRate:      r.vatRate,
      docTypeLabel: DOC_TYPE_LABELS[r.docType],
      docCount:     r.docCount,
      totalTaxBase: r.totalTaxBase,
      totalVat:     r.totalVat,
      totalGross:   r.totalGross,
    })

    const bg = r.period !== lastPeriod ? 'FFE0E7FF' : (i % 2 === 0 ? `FF${WHITE}` : `FF${VIOLET_LIGHT}`)
    lastPeriod = r.period
    dr.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      cell.font   = { size: 9 }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } }
      if (col >= 5) { cell.numFmt = '#,##0.00'; cell.alignment = { horizontal: 'right' } }
    })
  })

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 7 } }
}

// ─── Cover / overview sheet ───────────────────────────────────────────────────

function addCoverSheet(
  wb: ExcelJS.Workbook,
  dateFrom: string,
  dateTo: string,
  docCounts: Map<DocType, number>,
  totalAmount: number,
  totalVat: number,
) {
  const sheet = wb.addWorksheet('Přehled', { properties: { tabColor: { argb: `FF${VIOLET}` } } })
  sheet.getColumn(1).width = 30
  sheet.getColumn(2).width = 22

  const title = sheet.getCell('A1')
  title.value     = 'ÚČETNÍ EXPORT'
  title.font      = { bold: true, size: 16, color: { argb: `FF${VIOLET}` } }

  sheet.getCell('A2').value = `Období: ${dateFrom} – ${dateTo}`
  sheet.getCell('A2').font  = { size: 11, color: { argb: 'FF374151' } }
  sheet.getCell('A3').value = `Vygenerováno: ${new Date().toLocaleString('cs-CZ')}`
  sheet.getCell('A3').font  = { size: 9, color: { argb: 'FF6B7280' } }

  let rowIdx = 5
  sheet.getCell(`A${rowIdx}`).value = 'POČTY DOKLADŮ'
  sheet.getCell(`A${rowIdx}`).font  = { bold: true, size: 10, color: { argb: `FF${VIOLET}` } }
  rowIdx++

  for (const [dt, count] of docCounts) {
    sheet.getCell(`A${rowIdx}`).value = DOC_TYPE_LABELS[dt]
    sheet.getCell(`B${rowIdx}`).value = count
    sheet.getCell(`A${rowIdx}`).font  = { size: 9 }
    sheet.getCell(`B${rowIdx}`).font  = { size: 9, bold: true }
    rowIdx++
  }

  rowIdx++
  sheet.getCell(`A${rowIdx}`).value = 'FINANČNÍ SOUHRN'
  sheet.getCell(`A${rowIdx}`).font  = { bold: true, size: 10, color: { argb: `FF${VIOLET}` } }
  rowIdx++
  sheet.getCell(`A${rowIdx}`).value = 'Celkové obraty (bez DPH)'
  sheet.getCell(`B${rowIdx}`).value = totalAmount - totalVat
  sheet.getCell(`B${rowIdx}`).numFmt = '#,##0.00 "Kč"'
  rowIdx++
  sheet.getCell(`A${rowIdx}`).value = 'Celková DPH'
  sheet.getCell(`B${rowIdx}`).value = totalVat
  sheet.getCell(`B${rowIdx}`).numFmt = '#,##0.00 "Kč"'
  rowIdx++
  sheet.getCell(`A${rowIdx}`).value = 'Celkové obraty (s DPH)'
  sheet.getCell(`B${rowIdx}`).value = totalAmount
  sheet.getCell(`B${rowIdx}`).numFmt = '#,##0.00 "Kč"'
  sheet.getCell(`A${rowIdx}`).font  = { bold: true }
  sheet.getCell(`B${rowIdx}`).font  = { bold: true }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function buildAccountingXlsx(
  docs: Map<DocType, AccountingDocument[]>,
  dateFrom: string,
  dateTo: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'Weedej ERP'
  wb.created  = new Date()
  wb.modified = new Date()

  // Cover sheet first
  const allDocs      = [...docs.values()].flat()
  const totalAmount  = allDocs.reduce((s, d) => s + d.totalAmount, 0)
  const totalVat     = allDocs.reduce((s, d) => s + d.totalVat, 0)
  const docCounts    = new Map<DocType, number>([...docs.entries()].map(([k, v]) => [k, v.length]))
  addCoverSheet(wb, dateFrom, dateTo, docCounts, totalAmount, totalVat)

  // One sheet per doc type
  const docOrder: DocType[] = [
    'issued_invoice', 'received_invoice', 'credit_note',
    'payment', 'customer_order', 'delivery_note', 'receipt', 'stock_movement',
  ]
  for (const dt of docOrder) {
    const rows = docs.get(dt)
    if (!rows || rows.length === 0) continue
    addDocSheet(wb, dt, rows)
  }

  // VAT summary sheet
  const vatRows = buildVatSummary(docs)
  if (vatRows.length > 0) addVatSheet(wb, vatRows)

  const ab = await wb.xlsx.writeBuffer()
  return Buffer.from(ab as ArrayBuffer)
}
