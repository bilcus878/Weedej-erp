/**
 * Server-side invoice PDF generator — Weedej ERP
 * Daňový doklad dle § 26–35 zákona č. 235/2004 Sb. (zákon o DPH)
 *
 * Uses pdfmake's Node.js PdfPrinter API (NOT the browser build).
 * Safe to call from any Next.js API route (Node.js runtime only).
 */

import type { TDocumentDefinitions, StyleDictionary } from 'pdfmake/interfaces'
import type { CompanySettings } from './pdfGenerator'

// ─── Shared types (mirrored from generateInvoicePDF.ts) ────────────────────

export interface InvoiceForPdf {
  invoiceNumber: string
  invoiceDate: string       // ISO string
  duzp?: string             // ISO string — DUZP = taxable supply date
  dueDate?: string          // ISO string
  totalAmount: number
  totalAmountWithoutVat?: number
  totalVatAmount?: number
  paymentType: string
  status?: string
  customerName?: string
  customerICO?: string
  customerDIC?: string
  customerAddress?: string
  customerPhone?: string
  customerEmail?: string
  items: Array<{
    productName?: string
    quantity: number
    unit: string
    price: number | null      // unit price excl. VAT
    vatRate?: number
    vatAmount?: number
    priceWithVat?: number
  }>
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const C = {
  invoice:  '#2563eb',
  muted:    '#6b7280',
  light:    '#f3f4f6',
  border:   '#e5e7eb',
  text:     '#111827',
  white:    '#ffffff',
  slate:    '#475569',
}

function czk(v: number): string {
  return v.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč'
}

function fmtDate(d: string): string {
  try { return new Date(d).toLocaleDateString('cs-CZ') } catch { return d }
}

function partyBlock(label: string, party: {
  name: string; address?: string; ico?: string; dic?: string; phone?: string; email?: string
}, color: string) {
  const ids: string[] = []
  if (party.ico) ids.push(`IČO: ${party.ico}`)
  if (party.dic) ids.push(`DIČ: ${party.dic}`)
  return {
    stack: [
      { text: label.toUpperCase(), style: 'sectionLabel', color, margin: [0, 0, 0, 3] },
      { text: party.name, style: 'partyName', margin: [0, 0, 0, 2] },
      ...(party.address ? [{ text: party.address, style: 'partyDetail' }] : []),
      ...(ids.length    ? [{ text: ids.join('   '), style: 'partyDetail' }] : []),
      ...(party.phone   ? [{ text: `Tel: ${party.phone}`, style: 'partyDetail' }] : []),
      ...(party.email   ? [{ text: `Email: ${party.email}`, style: 'partyDetail' }] : []),
    ],
  }
}

const STYLES: StyleDictionary = {
  docTitle:      { fontSize: 26, bold: true, alignment: 'right' },
  docNumber:     { fontSize: 8.5, color: C.muted, alignment: 'right' },
  companyName:   { fontSize: 13, bold: true },
  companyDetail: { fontSize: 8, color: C.muted },
  sectionLabel:  { fontSize: 7, bold: true, characterSpacing: 1 },
  partyName:     { fontSize: 9.5, bold: true },
  partyDetail:   { fontSize: 8.5, color: C.muted },
  tableHeader:   { fontSize: 7.5, bold: true, color: C.white },
  tableCell:     { fontSize: 8 },
}

// ─── Document definition builder ────────────────────────────────────────────

function buildDocDefinition(
  invoice: InvoiceForPdf,
  settings: CompanySettings,
): TDocumentDefinitions {
  const color = C.invoice
  const isVatPayer = settings.isVatPayer !== false

  const issueDate = fmtDate(invoice.invoiceDate)
  const duzpDate  = invoice.duzp ? fmtDate(invoice.duzp) : issueDate
  const dueDate   = invoice.dueDate ? fmtDate(invoice.dueDate) : null

  const customer = {
    name:    invoice.customerName    || 'Neznámý zákazník',
    address: invoice.customerAddress,
    ico:     invoice.customerICO,
    dic:     invoice.customerDIC,
    phone:   invoice.customerPhone,
    email:   invoice.customerEmail,
  }

  const ourParty = {
    name:    settings.companyName || '',
    address: settings.address,
    ico:     settings.ico,
    dic:     settings.dic,
    phone:   settings.phone,
    email:   settings.email,
  }

  // Header
  const ids: string[] = []
  if (settings.ico) ids.push(`IČO: ${settings.ico}`)
  if (settings.dic) ids.push(`DIČ: ${settings.dic}`)
  const contacts: string[] = []
  if (settings.phone) contacts.push(settings.phone)
  if (settings.email) contacts.push(settings.email)

  const header: any[] = [
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 525, h: 7, color }], margin: [0, 0, 0, 6] },
    {
      columns: [
        {
          stack: [
            { text: settings.companyName || '', style: 'companyName' },
            ...(settings.address ? [{ text: settings.address, style: 'companyDetail', margin: [0, 1, 0, 0] }] : []),
            ...(ids.length       ? [{ text: ids.join('   '), style: 'companyDetail' }] : []),
            ...(contacts.length  ? [{ text: contacts.join('   '), style: 'companyDetail' }] : []),
          ],
          width: '*',
        },
        {
          stack: [
            { text: 'FAKTURA', style: 'docTitle', color },
            { text: `Č. faktury: ${invoice.invoiceNumber}`, style: 'docNumber', margin: [0, 2, 0, 0] },
          ],
          width: 'auto',
        },
      ],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 525, y2: 4, lineWidth: 0.4, lineColor: color }], margin: [0, 4, 0, 6] },
  ]

  // Date line
  const dateParts: any[] = [
    { text: 'Datum vystavení: ', color: C.muted, fontSize: 8.5 },
    { text: issueDate, fontSize: 8.5 },
    { text: '     DUZP: ', color: C.muted, fontSize: 8.5 },
    { text: duzpDate, fontSize: 8.5 },
  ]
  if (dueDate) {
    dateParts.push({ text: '     Datum splatnosti: ', color: C.muted, fontSize: 8.5 })
    dateParts.push({ text: dueDate, fontSize: 8.5 })
  }

  // Items table
  const itemRows = invoice.items.map((item, idx) => {
    const name        = item.productName || '(Neznámý produkt)'
    const storedName  = item.productName || ''
    const variantPart = storedName.includes(' — ') ? storedName.split(' — ').slice(1).join(' — ') : null
    const qty         = variantPart
      ? (/^\d+[xX×]/.test(variantPart) ? variantPart : `${item.quantity}x ${variantPart}`)
      : `${item.quantity} ${item.unit}`
    const unitNet     = item.price ?? 0
    const vatRate     = item.vatRate ?? 0
    const lineNet     = unitNet * item.quantity
    // vatAmount is stored per-unit; multiply to get line total
    const vatPerUnit  = item.vatAmount != null ? item.vatAmount : (unitNet * vatRate / 100)
    const lineVat     = vatPerUnit * item.quantity
    // backward-compat: old records stored row total in priceWithVat instead of per-unit price
    const rawLineGross = item.priceWithVat != null
      ? item.priceWithVat * item.quantity
      : lineNet + lineVat
    const lineGross   = rawLineGross > invoice.totalAmount * 1.05
      ? (item.priceWithVat ?? (lineNet + lineVat))
      : rawLineGross
    const vatAmt      = lineGross - lineNet

    if (isVatPayer) {
      return [
        { text: String(idx + 1),  style: 'tableCell', alignment: 'center' },
        { text: name,              style: 'tableCell' },
        { text: qty,               style: 'tableCell', alignment: 'center' },
        { text: czk(unitNet),      style: 'tableCell', alignment: 'right' },
        { text: `${vatRate} %`,    style: 'tableCell', alignment: 'center' },
        { text: czk(vatAmt),       style: 'tableCell', alignment: 'right' },
        { text: czk(lineGross),    style: 'tableCell', alignment: 'right', bold: true },
      ]
    } else {
      return [
        { text: String(idx + 1),  style: 'tableCell', alignment: 'center' },
        { text: name,              style: 'tableCell' },
        { text: qty,               style: 'tableCell', alignment: 'center' },
        { text: czk(unitNet),      style: 'tableCell', alignment: 'right' },
        { text: czk(lineNet),      style: 'tableCell', alignment: 'right', bold: true },
      ]
    }
  })

  const itemsTable: any = {
    table: {
      headerRows: 1,
      widths: isVatPayer
        ? [16, '*', 44, 58, 30, 44, 50]
        : [20, '*', 55, 60, 65],
      body: [
        isVatPayer
          ? ['#', 'Zboží / Služba', 'Množství', 'Jedn. cena bez DPH', 'Sazba', 'DPH', 'Celkem s DPH']
              .map(t => ({ text: t, style: 'tableHeader', fillColor: color }))
          : ['#', 'Zboží / Služba', 'Množství', 'Cena/ks', 'Celkem']
              .map(t => ({ text: t, style: 'tableHeader', fillColor: color })),
        ...itemRows,
      ],
    },
    layout: {
      hLineWidth: () => 0.4,
      vLineWidth: () => 0.4,
      hLineColor: () => C.border,
      vLineColor: () => C.border,
      fillColor: (_i: number, _node: any, _col: number, row: number) =>
        row % 2 === 0 ? null : C.light,
    },
    margin: [0, 0, 0, 8],
  }

  // VAT summary
  const vatSection: any[] = []

  if (isVatPayer) {
    const vatByRate: Record<number, { base: number; vat: number; total: number }> = {}
    invoice.items.forEach(item => {
      const rate        = item.vatRate ?? 0
      const unitNet     = item.price ?? 0
      const lineNet     = unitNet * item.quantity
      const vatPerUnit  = item.vatAmount != null ? item.vatAmount : (unitNet * rate / 100)
      const lineVat     = vatPerUnit * item.quantity
      const rawLineGross = item.priceWithVat != null
        ? item.priceWithVat * item.quantity
        : lineNet + lineVat
      const lineGross   = rawLineGross > invoice.totalAmount * 1.05
        ? (item.priceWithVat ?? (lineNet + lineVat))
        : rawLineGross
      const vatAmt      = lineGross - lineNet
      if (!vatByRate[rate]) vatByRate[rate] = { base: 0, vat: 0, total: 0 }
      vatByRate[rate].base  += lineNet
      vatByRate[rate].vat   += vatAmt
      vatByRate[rate].total += lineGross
    })

    const totalNet   = invoice.totalAmountWithoutVat ?? Object.values(vatByRate).reduce((s, r) => s + r.base, 0)
    const totalVat   = invoice.totalVatAmount        ?? Object.values(vatByRate).reduce((s, r) => s + r.vat, 0)
    const totalGross = invoice.totalAmount

    const vatRows = Object.entries(vatByRate).map(([rate, v]) => [
      { text: `${rate} %`,   style: 'tableCell', alignment: 'center' },
      { text: czk(v.base),  style: 'tableCell', alignment: 'right' },
      { text: czk(v.vat),   style: 'tableCell', alignment: 'right' },
      { text: czk(v.total), style: 'tableCell', alignment: 'right', bold: true },
    ])

    vatSection.push({
      columns: [
        { text: '', width: '*' },
        {
          width: 220,
          stack: [
            { text: 'REKAPITULACE DPH', fontSize: 7, bold: true, color: C.muted, characterSpacing: 1, margin: [0, 0, 0, 3] },
            {
              table: {
                headerRows: 1,
                widths: [36, 56, 56, 62],
                body: [
                  ['Sazba DPH', 'Základ daně', 'Výše DPH', 'Celkem s DPH']
                    .map(t => ({ text: t, style: 'tableHeader', fillColor: C.slate })),
                  ...vatRows,
                ],
              },
              layout: { hLineWidth: () => 0.4, vLineWidth: () => 0.4, hLineColor: () => C.border, vLineColor: () => C.border },
            },
            { canvas: [{ type: 'rect', x: 0, y: 0, w: 220, h: 0.4, color: C.border }], margin: [0, 4, 0, 2] },
            {
              columns: [
                { text: 'Základ daně celkem:', fontSize: 8.5, color: C.muted, width: '*' },
                { text: czk(totalNet), fontSize: 8.5, alignment: 'right', width: 'auto' },
              ],
              margin: [0, 1, 0, 1],
            },
            {
              columns: [
                { text: 'DPH celkem:', fontSize: 8.5, color: C.muted, width: '*' },
                { text: czk(totalVat), fontSize: 8.5, alignment: 'right', width: 'auto' },
              ],
              margin: [0, 1, 0, 4],
            },
            {
              table: {
                widths: ['*', 'auto'],
                body: [[
                  { text: 'Celkem k úhradě:', fillColor: color, color: C.white, bold: true, fontSize: 11, margin: [6, 6, 0, 6] },
                  { text: czk(totalGross),    fillColor: color, color: C.white, bold: true, fontSize: 11, alignment: 'right', margin: [0, 6, 6, 6] },
                ]],
              },
              layout: 'noBorders',
            },
          ],
        },
      ],
      margin: [0, 0, 0, 10],
    })
  } else {
    vatSection.push({
      columns: [
        { text: '', width: '*' },
        {
          width: 220,
          stack: [
            {
              table: {
                widths: ['*', 'auto'],
                body: [[
                  { text: 'Celkem k úhradě:', fillColor: color, color: C.white, bold: true, fontSize: 11, margin: [6, 6, 0, 6] },
                  { text: czk(invoice.totalAmount), fillColor: color, color: C.white, bold: true, fontSize: 11, alignment: 'right', margin: [0, 6, 6, 6] },
                ]],
              },
              layout: 'noBorders',
            },
            { text: 'Osoba/firma není plátcem DPH.', fontSize: 7.5, color: C.muted, margin: [0, 4, 0, 0] },
          ],
        },
      ],
      margin: [0, 0, 0, 10],
    })
  }

  // Payment details
  const paymentLabel =
    invoice.paymentType === 'card'     ? 'Platební karta' :
    invoice.paymentType === 'transfer' ? 'Bankovní převod' :
    invoice.paymentType === 'cash'     ? 'Hotovost' :
    invoice.paymentType || 'Neuvedeno'

  const paymentLines: any[] = [
    { text: [{ text: 'Způsob platby: ', color: C.muted }, paymentLabel], fontSize: 8.5, margin: [0, 1, 0, 1] },
    { text: [{ text: 'Variabilní symbol: ', color: C.muted }, invoice.invoiceNumber], fontSize: 8.5, margin: [0, 1, 0, 1] },
  ]
  if (settings.bankAccount) {
    paymentLines.push({ text: [{ text: 'Číslo účtu: ', color: C.muted }, settings.bankAccount], fontSize: 8.5, margin: [0, 1, 0, 1] })
  }

  const signatureBlock: any = {
    columns: [
      {
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 0.4, lineColor: C.muted }] },
          { text: 'Podpis a razítko dodavatele', fontSize: 7.5, color: C.muted, margin: [0, 3, 0, 0] },
        ],
        width: 140,
      },
      { text: '', width: '*' },
    ],
    margin: [0, 16, 0, 0],
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 20, 40, 30],
    content: [
      ...header,
      { text: dateParts, margin: [0, 0, 0, 10] },
      {
        columns: [
          partyBlock('Dodavatel', ourParty, color),
          { width: 20, text: '' },
          partyBlock('Odběratel', customer, color),
        ],
        margin: [0, 0, 0, 14],
      },
      itemsTable,
      ...vatSection,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 525, y2: 0, lineWidth: 0.3, lineColor: C.border }] },
      { text: [{ text: 'Platební údaje', bold: true, fontSize: 8.5 }], margin: [0, 6, 0, 4] },
      ...paymentLines,
      signatureBlock,
    ],
    footer: ((_currentPage: number, _pageCount: number) => ({
      stack: [
        { canvas: [{ type: 'rect', x: 0, y: 0, w: 595, h: 20, color }] },
        {
          text: 'Vygenerováno systémem Weedej ERP',
          fontSize: 6.5, color: C.white, alignment: 'center',
          absolutePosition: { x: 0, y: 10 },
        },
      ],
      margin: [0, 10, 0, 0],
    })) as any,
    styles: STYLES,
    defaultStyle: { font: 'Roboto', fontSize: 9 },
  }
}

// ─── Singleton printer to avoid re-loading fonts on every call ─────────────

let _printer: any = null

function getPrinter() {
  if (_printer) return _printer
  // pdfmake main export is the Node.js PdfPrinter class — require() needed (no ESM export)
  /* eslint-disable */
  const PdfPrinter = require('pdfmake')
  const vfsFonts = require('pdfmake/build/vfs_fonts').pdfMake.vfs as Record<string, string>
  /* eslint-enable */

  const fonts = {
    Roboto: {
      normal:      Buffer.from(vfsFonts['Roboto-Regular.ttf'],      'base64'),
      bold:        Buffer.from(vfsFonts['Roboto-Medium.ttf'],       'base64'),
      italics:     Buffer.from(vfsFonts['Roboto-Italic.ttf'],       'base64'),
      bolditalics: Buffer.from(vfsFonts['Roboto-MediumItalic.ttf'], 'base64'),
    },
  }
  _printer = new PdfPrinter(fonts)
  return _printer
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generates an invoice PDF server-side and returns a Buffer.
 * Czech-legal compliant: includes DUZP, VAT breakdown, all required fields (§ 28 ZDPH).
 */
export async function generateInvoicePdfBuffer(
  invoice: InvoiceForPdf,
  settings: CompanySettings,
): Promise<Buffer> {
  const docDef = buildDocDefinition(invoice, settings)
  const printer = getPrinter()

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDef, {})
      const chunks: Buffer[] = []
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk))
      pdfDoc.on('end',  () => resolve(Buffer.concat(chunks)))
      pdfDoc.on('error', reject)
      pdfDoc.end()
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Convenience: returns base64-encoded PDF string.
 */
export async function generateInvoicePdfBase64(
  invoice: InvoiceForPdf,
  settings: CompanySettings,
): Promise<string> {
  const buf = await generateInvoicePdfBuffer(invoice, settings)
  return buf.toString('base64')
}
