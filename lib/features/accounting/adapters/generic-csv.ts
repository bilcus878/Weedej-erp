// ─── Generic CSV Adapter ──────────────────────────────────────────────────────
// Generates a flat, maximally-compatible CSV suitable for import into any
// accounting software that accepts a generic tabular format (Abra, Helios, SAP, etc.)
//
// Differences from the standard accounting CSV:
// - Single file, all document types combined
// - Semicolon (;) as delimiter — more common in Czech/EU regional settings
// - ISO date format (YYYY-MM-DD)
// - Explicit debit/credit sign (+ for income, - for expense)
// - "Accounting type" column maps doc type to common Czech accounting codes

import type { AccountingDocument, DocType } from '../types'
import { DOC_TYPE_LABELS } from '../types'

const BOM = '﻿'

function esc(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(...cols: unknown[]): string {
  return cols.map(esc).join(';')
}

function fmt(n: number | null | undefined): string {
  if (n == null) return ''
  return n.toFixed(2)
}

// ─── Czech accounting document codes ──────────────────────────────────────────
// These codes roughly correspond to Czech accounting document type notation.

const ACCOUNTING_CODE: Record<DocType, string> = {
  issued_invoice:   'FV',   // Faktura vydaná
  received_invoice: 'FP',   // Faktura přijatá
  credit_note:      'DV',   // Dobropis vydaný
  payment:          'PL',   // Platba
  customer_order:   'OBJ',  // Objednávka
  delivery_note:    'VYD',  // Výdejka
  receipt:          'PRIJ', // Příjemka
  stock_movement:   'SKL',  // Skladový pohyb
}

// Sign convention: +1 for income, -1 for expense
const SIGN: Record<DocType, number> = {
  issued_invoice:   1,
  received_invoice: -1,
  credit_note:      -1,
  payment:          1,
  customer_order:   1,
  delivery_note:    1,
  receipt:          -1,
  stock_movement:   -1,
}

function buildHeader(): string {
  return row(
    'TypDokladu',
    'KodTypu',
    'CisloDokladu',
    'DatumDokladu',
    'DatumSplatnosti',
    'DUZP',
    'Protistrana',
    'ICO',
    'DIC',
    'Adresa',
    'ZnaménkoPlnění',
    'ZakladDPH21',
    'DPH21',
    'ZakladDPH12',
    'DPH12',
    'ZakladDPH0',
    'CelkemZakladBezDPH',
    'CelkemDPH',
    'CelkemSDPH',
    'StavPlatby',
    'Uhrazeno',
    'ZpusobPlatby',
    'VariabilniSymbol',
    'KonstantniSymbol',
    'Mena',
    'Poznamka',
    'Stav',
  )
}

function buildRow(doc: AccountingDocument): string {
  const base21 = doc.vatLines.find(l => l.vatRate === 21)
  const base12 = doc.vatLines.find(l => l.vatRate === 12)
  const base0  = doc.vatLines.find(l => l.vatRate === 0)
  const sign   = SIGN[doc.docType]

  return row(
    DOC_TYPE_LABELS[doc.docType],
    ACCOUNTING_CODE[doc.docType],
    doc.docNumber,
    doc.docDate,
    doc.dueDate ?? '',
    doc.taxPointDate,
    doc.partyName ?? '',
    doc.partyIco  ?? '',
    doc.partyDic  ?? '',
    doc.partyAddress ?? '',
    sign > 0 ? '+' : '-',
    fmt(base21?.taxBase   ?? 0),
    fmt(base21?.vatAmount ?? 0),
    fmt(base12?.taxBase   ?? 0),
    fmt(base12?.vatAmount ?? 0),
    fmt(base0?.taxBase    ?? 0),
    fmt(doc.totalTaxBase),
    fmt(doc.totalVat),
    fmt(doc.totalAmount),
    doc.paymentStatus ?? '',
    fmt(doc.paidAmount),
    doc.paymentType  ?? '',
    doc.variableSymbol ?? '',
    doc.constantSymbol ?? '',
    'CZK',
    doc.note  ?? '',
    doc.status,
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildGenericCsv(docs: Map<DocType, AccountingDocument[]>): Buffer {
  const lines: string[] = [buildHeader()]

  const docOrder: DocType[] = [
    'issued_invoice', 'received_invoice', 'credit_note',
    'payment', 'customer_order', 'delivery_note', 'receipt', 'stock_movement',
  ]

  for (const docType of docOrder) {
    const rows = docs.get(docType)
    if (!rows || rows.length === 0) continue
    for (const doc of rows) lines.push(buildRow(doc))
  }

  return Buffer.from(BOM + lines.join('\r\n'), 'utf8')
}
