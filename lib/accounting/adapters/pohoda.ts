// ─── Pohoda XML Adapter ───────────────────────────────────────────────────────
// Generates Pohoda XML (dataPack format, version 2.0) compatible with
// Pohoda MDB, SQL, E1 — the most common Czech accounting software.
//
// Encoding: Windows-1250 (required by Pohoda XML specification)
// Schema: http://www.stormware.cz/schema/version_2/
//
// Only issued and received invoices + credit notes are exported as Pohoda
// invoice records. Other document types are not supported by Pohoda XML import.

import type { AccountingDocument, CompanyInfo } from '../types'

// ─── Windows-1250 encoding ────────────────────────────────────────────────────
// Node.js does not natively support win-1250. We convert the string by replacing
// the most common Czech/Slovak diacritics with their win-1250 byte equivalents
// and return a Buffer with the correct encoding marker in the XML declaration.

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
      out.push(0x3f) // '?' fallback for unmapped characters
    }
  }
  return Buffer.from(out)
}

// ─── XML helpers ─────────────────────────────────────────────────────────────

function xmlEsc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function fmtAmt(n: number): string {
  return n.toFixed(2)
}

// ─── Invoice type mapping ──────────────────────────────────────────────────────

function pohodaInvoiceType(docType: string, partyType: string | null): string {
  if (docType === 'issued_invoice')   return 'issuedInvoice'
  if (docType === 'received_invoice') return 'receivedInvoice'
  if (docType === 'credit_note')      return 'issuedCreditNote'
  return 'issuedInvoice'
}

function paymentTypeCode(paymentType: string | null): string {
  switch (paymentType) {
    case 'card':     return 'card'
    case 'cash':     return 'cash'
    case 'transfer': return 'transfer'
    default:         return 'transfer'
  }
}

// ─── Single invoice → dataPack item ──────────────────────────────────────────

function invoiceItem(doc: AccountingDocument, index: number, companyIco: string): string {
  const invType  = pohodaInvoiceType(doc.docType, doc.partyType)
  const base21   = doc.vatLines.find(l => l.vatRate === 21)
  const base12   = doc.vatLines.find(l => l.vatRate === 12)
  const base0    = doc.vatLines.find(l => l.vatRate === 0)

  return `  <dat:dataPackItem id="${index}" version="2.0">
    <inv:invoice version="2.0">
      <inv:invoiceHeader>
        <inv:invoiceType>${invType}</inv:invoiceType>
        <inv:number>
          <typ:numberRequested>${xmlEsc(doc.docNumber)}</typ:numberRequested>
        </inv:number>
        <inv:symVar>${xmlEsc(doc.variableSymbol ?? doc.docNumber)}</inv:symVar>
        <inv:symConst>${xmlEsc(doc.constantSymbol ?? '')}</inv:symConst>
        <inv:date>${doc.docDate}</inv:date>
        <inv:dateTax>${doc.taxPointDate}</inv:dateTax>
        ${doc.dueDate ? `<inv:dateDue>${doc.dueDate}</inv:dateDue>` : ''}
        <inv:partnerIdentity>
          <typ:address>
            <typ:name>${xmlEsc(doc.partyName ?? '')}</typ:name>
            <typ:ico>${xmlEsc(doc.partyIco ?? '')}</typ:ico>
            <typ:dic>${xmlEsc(doc.partyDic ?? '')}</typ:dic>
            <typ:street>${xmlEsc(doc.partyAddress ?? '')}</typ:street>
          </typ:address>
        </inv:partnerIdentity>
        <inv:paymentType>
          <typ:paymentType>${paymentTypeCode(doc.paymentType)}</typ:paymentType>
        </inv:paymentType>
        <inv:note>${xmlEsc(doc.note ?? '')}</inv:note>
        <inv:intNote>Export: Weedej ERP</inv:intNote>
      </inv:invoiceHeader>
      <inv:invoiceSummary>
        <inv:roundingDocument>math2one</inv:roundingDocument>
        <inv:homeCurrency>
          <typ:priceNone>${fmtAmt(base0?.taxBase ?? 0)}</typ:priceNone>
          <typ:priceLow>${fmtAmt(base12?.taxBase ?? 0)}</typ:priceLow>
          <typ:priceLowVAT>${fmtAmt(base12?.vatAmount ?? 0)}</typ:priceLowVAT>
          <typ:priceLowSum>${fmtAmt(base12?.grossAmount ?? 0)}</typ:priceLowSum>
          <typ:priceHigh>${fmtAmt(base21?.taxBase ?? 0)}</typ:priceHigh>
          <typ:priceHighVAT>${fmtAmt(base21?.vatAmount ?? 0)}</typ:priceHighVAT>
          <typ:priceHighSum>${fmtAmt(base21?.grossAmount ?? 0)}</typ:priceHighSum>
          <typ:round><typ:priceRound>0</typ:priceRound></typ:round>
        </inv:homeCurrency>
      </inv:invoiceSummary>
    </inv:invoice>
  </dat:dataPackItem>`
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildPohodaXml(
  docs: Map<string, AccountingDocument[]>,
  company: CompanyInfo,
  dateFrom: string,
  dateTo: string,
): Buffer {
  const eligible: AccountingDocument[] = []
  for (const [type, rows] of docs) {
    if (['issued_invoice', 'received_invoice', 'credit_note'].includes(type)) {
      eligible.push(...rows)
    }
  }

  const items = eligible
    .map((doc, i) => invoiceItem(doc, i + 1, company.ico))
    .join('\n')

  const xml = `<?xml version="1.0" encoding="Windows-1250"?>
<dat:dataPack
  xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd"
  xmlns:inv="http://www.stormware.cz/schema/version_2/invoice.xsd"
  xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd"
  id="WeedejERP-${dateFrom}-${dateTo}"
  ico="${xmlEsc(company.ico)}"
  application="Weedej ERP"
  version="2.0"
  note="Export dokladů ${dateFrom} – ${dateTo}">
${items}
</dat:dataPack>`

  return toWin1250(xml)
}
