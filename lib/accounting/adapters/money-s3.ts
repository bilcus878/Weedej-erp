// ─── Money S3 XML Adapter ─────────────────────────────────────────────────────
// Generates XML compatible with Money S3 / Money S4 (Solitea).
// Money S3 is widely used by Czech SMBs as an alternative to Pohoda.
//
// Encoding: Windows-1250
// Format: flat <Invoice> elements inside <Invoices> container

import type { AccountingDocument, CompanyInfo } from '../types'

// ─── Windows-1250 encoding (same approach as Pohoda adapter) ─────────────────

const WIN1250_MAP: Record<string, string> = {
  'á': '\xe1', 'Á': '\xc1', 'č': '\xe8', 'Č': '\xc8',
  'ď': '\xef', 'Ď': '\xcf', 'é': '\xe9', 'É': '\xc9',
  'ě': '\xec', 'Ě': '\xcc', 'í': '\xed', 'Í': '\xcd',
  'ň': '\xf2', 'Ň': '\xd2', 'ó': '\xf3', 'Ó': '\xd3',
  'ř': '\xf8', 'Ř': '\xd8', 'š': '\x9a', 'Š': '\x8a',
  'ť': '\x9d', 'Ť': '\x8d', 'ú': '\xfa', 'Ú': '\xda',
  'ů': '\xf9', 'Ů': '\xd9', 'ý': '\xfd', 'Ý': '\xdd',
  'ž': '\x9e', 'Ž': '\x8e',
}

function toWin1250(s: string): Buffer {
  const out: number[] = []
  for (const ch of s) {
    const mapped = WIN1250_MAP[ch]
    if (mapped) {
      out.push(mapped.charCodeAt(0))
    } else if (ch.charCodeAt(0) < 256) {
      out.push(ch.charCodeAt(0))
    } else {
      out.push(0x3f)
    }
  }
  return Buffer.from(out)
}

function xmlEsc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDate(iso: string): string {
  // Money S3 uses DD.MM.YYYY
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function fmtAmt(n: number): string {
  return n.toFixed(2)
}

// ─── Invoice type in Money S3 ─────────────────────────────────────────────────

function moneyInvoiceType(docType: string): string {
  switch (docType) {
    case 'issued_invoice':   return 'IssFA'   // Issued (vydaná) invoice
    case 'received_invoice': return 'RecFA'   // Received (přijatá) invoice
    case 'credit_note':      return 'IssCN'   // Issued credit note (dobropis)
    default:                 return 'IssFA'
  }
}

function moneyPaymentType(paymentType: string | null): string {
  switch (paymentType) {
    case 'transfer': return 'Příkaz'
    case 'cash':     return 'Hotovost'
    case 'card':     return 'Karta'
    default:         return 'Příkaz'
  }
}

// ─── Single invoice element ───────────────────────────────────────────────────

function invoiceElement(doc: AccountingDocument): string {
  const base21 = doc.vatLines.find(l => l.vatRate === 21)
  const base12 = doc.vatLines.find(l => l.vatRate === 12)
  const base0  = doc.vatLines.find(l => l.vatRate === 0)

  const tagName = doc.docType === 'received_invoice' ? 'ReceivedInvoice' : 'IssuedInvoice'

  return `    <${tagName}>
      <InvoiceType>${moneyInvoiceType(doc.docType)}</InvoiceType>
      <NumberOrder>${xmlEsc(doc.docNumber)}</NumberOrder>
      <VariableSymbol>${xmlEsc(doc.variableSymbol ?? doc.docNumber)}</VariableSymbol>
      <ConstantSymbol>${xmlEsc(doc.constantSymbol ?? '')}</ConstantSymbol>
      <Date>${fmtDate(doc.docDate)}</Date>
      <DateTax>${fmtDate(doc.taxPointDate)}</DateTax>
      ${doc.dueDate ? `<DateDue>${fmtDate(doc.dueDate)}</DateDue>` : '<DateDue></DateDue>'}
      <CompanyName>${xmlEsc(doc.partyName ?? '')}</CompanyName>
      <ICO>${xmlEsc(doc.partyIco ?? '')}</ICO>
      <DIC>${xmlEsc(doc.partyDic ?? '')}</DIC>
      <Street>${xmlEsc(doc.partyAddress ?? '')}</Street>
      <PaymentType>${xmlEsc(moneyPaymentType(doc.paymentType))}</PaymentType>
      <SumBase0>${fmtAmt(base0?.taxBase ?? 0)}</SumBase0>
      <SumBase12>${fmtAmt(base12?.taxBase ?? 0)}</SumBase12>
      <SumTax12>${fmtAmt(base12?.vatAmount ?? 0)}</SumTax12>
      <SumBase21>${fmtAmt(base21?.taxBase ?? 0)}</SumBase21>
      <SumTax21>${fmtAmt(base21?.vatAmount ?? 0)}</SumTax21>
      <SumWithoutTax>${fmtAmt(doc.totalTaxBase)}</SumWithoutTax>
      <SumTax>${fmtAmt(doc.totalVat)}</SumTax>
      <SumTotal>${fmtAmt(doc.totalAmount)}</SumTotal>
      <Note>${xmlEsc(doc.note ?? '')}</Note>
    </${tagName}>`
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildMoneyS3Xml(
  docs: Map<string, AccountingDocument[]>,
  company: CompanyInfo,
  dateFrom: string,
  dateTo: string,
): Buffer {
  const issued: AccountingDocument[]   = []
  const received: AccountingDocument[] = []

  for (const [type, rows] of docs) {
    if (type === 'issued_invoice' || type === 'credit_note') issued.push(...rows)
    if (type === 'received_invoice') received.push(...rows)
  }

  const issuedXml   = issued.length   > 0 ? `  <IssuedInvoices>\n${issued.map(invoiceElement).join('\n')}\n  </IssuedInvoices>` : ''
  const receivedXml = received.length > 0 ? `  <ReceivedInvoices>\n${received.map(invoiceElement).join('\n')}\n  </ReceivedInvoices>` : ''

  const xml = `<?xml version="1.0" encoding="windows-1250"?>
<!-- Money S3 / Money S4 — Import soubor faktur -->
<!-- Exportováno: ${new Date().toISOString()} -->
<!-- Dodavatel / Odběratel ICO: ${xmlEsc(company.ico)} -->
<!-- Období: ${dateFrom} – ${dateTo} -->
<S3>
  <Version>1.0</Version>
  <Application>Weedej ERP</Application>
${issuedXml}
${receivedXml}
</S3>`

  return toWin1250(xml)
}
