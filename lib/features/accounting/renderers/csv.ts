// ─── Accounting CSV Renderer ──────────────────────────────────────────────────
// Generates UTF-8 with BOM CSV — required for correct diacritic rendering in Excel.
// Each document type gets its own sheet/file with accounting-friendly columns.

import type { AccountingDocument, DocType, VatSummaryRow } from '../types'
import { DOC_TYPE_LABELS } from '../types'

// ─── Utilities ────────────────────────────────────────────────────────────────

function esc(value: unknown): string {
  const s = value == null ? '' : String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes(';')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function fmt(n: number | null | undefined): string {
  if (n == null) return ''
  return n.toFixed(2)
}

function row(...cols: unknown[]): string {
  return cols.map(esc).join(',')
}

// UTF-8 BOM prefix — Excel reads this without "Text Import Wizard"
const BOM = '﻿'

// ─── Per-type column definitions ──────────────────────────────────────────────

function headerIssuedInvoice(): string {
  return row(
    'Číslo dokladu', 'Datum vystavení', 'Datum splatnosti', 'DUZP',
    'Odběratel', 'IČO', 'DIČ', 'Adresa',
    'Základ DPH 21%', 'DPH 21%', 'Základ DPH 12%', 'DPH 12%', 'Základ DPH 0%',
    'Celkem základ', 'Celkem DPH', 'Celkem s DPH',
    'Stav platby', 'Uhrazeno', 'Způsob platby', 'Var. symbol', 'Konst. symbol',
    'Poznámka', 'Stav'
  )
}

function headerReceivedInvoice(): string {
  return row(
    'Číslo dokladu', 'Datum vystavení', 'Datum splatnosti', 'DUZP',
    'Dodavatel', 'IČO', 'DIČ', 'Adresa',
    'Základ DPH', 'DPH', 'Základ DPH 0%',
    'Celkem základ', 'Celkem DPH', 'Celkem s DPH',
    'Stav platby', 'Způsob platby', 'Var. symbol', 'Konst. symbol',
    'Poznámka', 'Stav'
  )
}

function headerCreditNote(): string {
  return row(
    'Číslo dobropisu', 'Datum', 'Odběratel', 'IČO', 'DIČ',
    'Základ DPH', 'DPH', 'Celkem',
    'Původní faktura', 'Důvod / poznámka', 'Stav'
  )
}

function headerPayment(): string {
  return row(
    'Číslo transakce', 'Datum', 'Typ', 'Protistrana', 'IČO', 'DIČ',
    'Základ bez DPH', 'DPH', 'Celkem s DPH',
    'Způsob platby', 'Stav', 'Poznámka'
  )
}

function headerCustomerOrder(): string {
  return row(
    'Číslo objednávky', 'Datum', 'Zákazník', 'Adresa',
    'Základ DPH', 'DPH', 'Celkem',
    'Stav platby', 'Uhrazeno', 'Stav objednávky', 'Poznámka'
  )
}

function headerDeliveryNote(): string {
  return row(
    'Číslo výdejky', 'Datum', 'Zákazník',
    'Celková hodnota',
    'Stav', 'Poznámka'
  )
}

function headerReceipt(): string {
  return row(
    'Číslo příjemky', 'Datum', 'Dodavatel', 'IČO', 'DIČ',
    'Základ DPH', 'DPH', 'Celkem',
    'Stav', 'Poznámka'
  )
}

function headerStockMovement(): string {
  return row(
    'ID pohybu', 'Datum', 'Produkt / popis', 'Dodavatel',
    'Základ bez DPH', 'DPH', 'Hodnota celkem',
    'Poznámka'
  )
}

// ─── Per-type row serializers ─────────────────────────────────────────────────

function docVatBase(doc: AccountingDocument, rate: number): string {
  const line = doc.vatLines.find(l => l.vatRate === rate)
  return fmt(line?.taxBase ?? 0)
}

function docVatAmount(doc: AccountingDocument, rate: number): string {
  const line = doc.vatLines.find(l => l.vatRate === rate)
  return fmt(line?.vatAmount ?? 0)
}

function serializeDoc(doc: AccountingDocument): string {
  switch (doc.docType) {
    case 'issued_invoice':
      return row(
        doc.docNumber, doc.docDate, doc.dueDate ?? '', doc.taxPointDate,
        doc.partyName ?? '', doc.partyIco ?? '', doc.partyDic ?? '', doc.partyAddress ?? '',
        docVatBase(doc, 21), docVatAmount(doc, 21),
        docVatBase(doc, 12), docVatAmount(doc, 12),
        docVatBase(doc, 0),
        fmt(doc.totalTaxBase), fmt(doc.totalVat), fmt(doc.totalAmount),
        doc.paymentStatus ?? '', fmt(doc.paidAmount), doc.paymentType ?? '',
        doc.variableSymbol ?? '', doc.constantSymbol ?? '',
        doc.note ?? '', doc.status
      )
    case 'received_invoice':
      return row(
        doc.docNumber, doc.docDate, doc.dueDate ?? '', doc.taxPointDate,
        doc.partyName ?? '', doc.partyIco ?? '', doc.partyDic ?? '', doc.partyAddress ?? '',
        fmt(doc.totalTaxBase), fmt(doc.totalVat), docVatBase(doc, 0),
        fmt(doc.totalTaxBase), fmt(doc.totalVat), fmt(doc.totalAmount),
        doc.paymentStatus ?? '', doc.paymentType ?? '',
        doc.variableSymbol ?? '', doc.constantSymbol ?? '',
        doc.note ?? '', doc.status
      )
    case 'credit_note':
      return row(
        doc.docNumber, doc.docDate,
        doc.partyName ?? '', doc.partyIco ?? '', doc.partyDic ?? '',
        fmt(doc.totalTaxBase), fmt(doc.totalVat), fmt(doc.totalAmount),
        doc.variableSymbol ?? '',
        doc.note ?? '', doc.status
      )
    case 'payment':
      return row(
        doc.docNumber, doc.docDate,
        doc.partyType === 'supplier' ? 'Přijatá platba' : 'Vydaná platba',
        doc.partyName ?? '', doc.partyIco ?? '', doc.partyDic ?? '',
        fmt(doc.totalTaxBase), fmt(doc.totalVat), fmt(doc.totalAmount),
        doc.paymentType ?? '', doc.paymentStatus ?? '', doc.note ?? ''
      )
    case 'customer_order':
      return row(
        doc.docNumber, doc.docDate,
        doc.partyName ?? '', doc.partyAddress ?? '',
        fmt(doc.totalTaxBase), fmt(doc.totalVat), fmt(doc.totalAmount),
        doc.paymentStatus ?? '', fmt(doc.paidAmount),
        doc.status, doc.note ?? ''
      )
    case 'delivery_note':
      return row(
        doc.docNumber, doc.docDate, doc.partyName ?? '',
        fmt(doc.totalAmount),
        doc.status, doc.note ?? ''
      )
    case 'receipt':
      return row(
        doc.docNumber, doc.docDate,
        doc.partyName ?? '', doc.partyIco ?? '', doc.partyDic ?? '',
        fmt(doc.totalTaxBase), fmt(doc.totalVat), fmt(doc.totalAmount),
        doc.status, doc.note ?? ''
      )
    case 'stock_movement':
      return row(
        doc.docNumber, doc.docDate,
        doc.note ?? '', doc.partyName ?? '',
        fmt(doc.totalTaxBase), fmt(doc.totalVat), fmt(doc.totalAmount),
        doc.note ?? ''
      )
  }
}

function getHeader(docType: DocType): string {
  switch (docType) {
    case 'issued_invoice':   return headerIssuedInvoice()
    case 'received_invoice': return headerReceivedInvoice()
    case 'credit_note':      return headerCreditNote()
    case 'payment':          return headerPayment()
    case 'customer_order':   return headerCustomerOrder()
    case 'delivery_note':    return headerDeliveryNote()
    case 'receipt':          return headerReceipt()
    case 'stock_movement':   return headerStockMovement()
  }
}

// ─── Public: build single-type CSV ────────────────────────────────────────────

export function buildAccountingCsv(docType: DocType, docs: AccountingDocument[]): Buffer {
  const lines: string[] = [getHeader(docType)]
  for (const doc of docs) lines.push(serializeDoc(doc))
  return Buffer.from(BOM + lines.join('\r\n'), 'utf8')
}

// ─── Public: build VAT summary CSV ───────────────────────────────────────────

export function buildVatSummaryCsv(rows: VatSummaryRow[]): Buffer {
  const header = row('Období', 'Sazba DPH %', 'Typ dokladu', 'Počet dokladů',
                     'Základ DPH', 'DPH', 'Celkem s DPH')
  const body = rows.map(r =>
    row(r.period, r.vatRate, DOC_TYPE_LABELS[r.docType], r.docCount,
        fmt(r.totalTaxBase), fmt(r.totalVat), fmt(r.totalGross))
  )
  return Buffer.from(BOM + [header, ...body].join('\r\n'), 'utf8')
}

// ─── Public: build combined single-file CSV (all types, labelled sections) ───

export function buildCombinedCsv(docs: Map<DocType, AccountingDocument[]>): Buffer {
  const sections: string[] = []
  for (const [docType, rows] of docs) {
    if (rows.length === 0) continue
    sections.push(`# ${DOC_TYPE_LABELS[docType]}`)
    sections.push(getHeader(docType))
    rows.forEach(doc => sections.push(serializeDoc(doc)))
    sections.push('')
  }
  return Buffer.from(BOM + sections.join('\r\n'), 'utf8')
}
