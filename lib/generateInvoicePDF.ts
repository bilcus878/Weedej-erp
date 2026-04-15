// Generování PDF faktur – Weedej ERP
// Daňový doklad dle § 26–35 zákona č. 235/2004 Sb. (zákon o DPH)
// Používá pdfmake s embedded Roboto fontem (plná česká diakritika)

import type { TDocumentDefinitions, StyleDictionary } from 'pdfmake/interfaces'
import type { CompanySettings } from './pdfGenerator'

// ─── Typy ─────────────────────────────────────────────────────────────────────

export interface InvoiceCustomer {
  name: string
  ico?: string
  dic?: string
  address?: string
  phone?: string
  email?: string
}

export interface InvoiceItem {
  product?: { name: string } | null
  productName?: string
  quantity: number
  unit: string
  price: number | null
  vatRate?: number
  vatAmount?: number
  priceWithVat?: number
}

export interface Invoice {
  transactionCode: string
  transactionDate: string
  duzp?: string
  dueDate?: string
  totalAmount: number
  totalAmountWithoutVat?: number
  totalVatAmount?: number
  paymentType: string
  status?: string
  customer?: InvoiceCustomer | null
  customerName?: string
  customerICO?: string
  customerDIC?: string
  customerAddress?: string
  customerPhone?: string
  customerEmail?: string
  items: InvoiceItem[]
}

// ─── Barvy ────────────────────────────────────────────────────────────────────

const C = {
  invoice:  '#2563eb',
  muted:    '#6b7280',
  light:    '#f3f4f6',
  border:   '#e5e7eb',
  text:     '#111827',
  white:    '#ffffff',
  red:      '#dc2626',
  redLight: '#fee2e2',
  slate:    '#475569',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function czk(v: number): string {
  return v.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč'
}

function fmtDate(d: string): string {
  try { return new Date(d).toLocaleDateString('cs-CZ') } catch { return d }
}

async function getPdfMake(): Promise<any> {
  const pdfMake = (await import('pdfmake/build/pdfmake' as any)).default as any
  const pdfFonts = (await import('pdfmake/build/vfs_fonts' as any)).default as any
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts
  return pdfMake
}

// ─── Sdílené styly ────────────────────────────────────────────────────────────

const STYLES: StyleDictionary = {
  docTitle:     { fontSize: 26, bold: true, alignment: 'right' },
  docNumber:    { fontSize: 8.5, color: C.muted, alignment: 'right' },
  companyName:  { fontSize: 13, bold: true },
  companyDetail:{ fontSize: 8, color: C.muted },
  sectionLabel: { fontSize: 7, bold: true, characterSpacing: 1 },
  partyName:    { fontSize: 9.5, bold: true },
  partyDetail:  { fontSize: 8.5, color: C.muted },
  tableHeader:  { fontSize: 7.5, bold: true, color: C.white },
  tableCell:    { fontSize: 8 },
  note:         { fontSize: 8.5, color: C.muted },
  stornoText:   { fontSize: 8.5, color: '#7f1d1d' },
}

function partyBlock(label: string, party: InvoiceCustomer, color: string) {
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

// ─── Hlavní funkce ────────────────────────────────────────────────────────────

export async function generateInvoicePDF(
  invoice: Invoice,
  settings: CompanySettings
): Promise<void> {
  const pdfMake = await getPdfMake()
  const color = C.invoice
  const isVatPayer = settings.isVatPayer !== false

  const issueDate = fmtDate(invoice.transactionDate)
  const duzpDate  = invoice.duzp ? fmtDate(invoice.duzp) : issueDate
  const dueDate   = invoice.dueDate ? fmtDate(invoice.dueDate) : null

  const customer: InvoiceCustomer = {
    name:    invoice.customer?.name    || invoice.customerName    || '',
    address: invoice.customer?.address || invoice.customerAddress,
    ico:     invoice.customer?.ico     || invoice.customerICO,
    dic:     invoice.customer?.dic     || invoice.customerDIC,
    phone:   invoice.customer?.phone   || invoice.customerPhone,
    email:   invoice.customer?.email   || invoice.customerEmail,
  }

  const ourParty: InvoiceCustomer = {
    name:    settings.companyName || '',
    address: settings.address,
    ico:     settings.ico,
    dic:     settings.dic,
    phone:   settings.phone,
    email:   settings.email,
  }

  // ── Záhlaví ────────────────────────────────────────────────────────────────
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
            { text: `Č. faktury: ${invoice.transactionCode}`, style: 'docNumber', margin: [0, 2, 0, 0] },
          ],
          width: 'auto',
        },
      ],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 525, y2: 4, lineWidth: 0.4, lineColor: color }], margin: [0, 4, 0, 6] },
  ]

  // ── Data ───────────────────────────────────────────────────────────────────
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

  // ── Tabulka položek ────────────────────────────────────────────────────────
  const itemRows = invoice.items.map((item, idx) => {
    const name      = item.product?.name || item.productName || '(Neznámý produkt)'
    const qty       = `${item.quantity} ${item.unit}`
    const unitNet   = item.price ?? 0
    const vatRate   = item.vatRate ?? 0
    const lineNet   = unitNet * item.quantity
    const vatAmt    = item.vatAmount ?? (lineNet * vatRate / 100)
    const lineGross = item.priceWithVat != null
      ? item.priceWithVat * item.quantity
      : lineNet + vatAmt

    if (isVatPayer) {
      return [
        { text: String(idx + 1), style: 'tableCell', alignment: 'center' },
        { text: name,            style: 'tableCell' },
        { text: qty,             style: 'tableCell', alignment: 'center' },
        { text: czk(unitNet),    style: 'tableCell', alignment: 'right' },
        { text: `${vatRate} %`,  style: 'tableCell', alignment: 'center' },
        { text: czk(vatAmt),     style: 'tableCell', alignment: 'right' },
        { text: czk(lineGross),  style: 'tableCell', alignment: 'right', bold: true },
      ]
    } else {
      return [
        { text: String(idx + 1), style: 'tableCell', alignment: 'center' },
        { text: name,            style: 'tableCell' },
        { text: qty,             style: 'tableCell', alignment: 'center' },
        { text: czk(unitNet),    style: 'tableCell', alignment: 'right' },
        { text: czk(lineNet),    style: 'tableCell', alignment: 'right', bold: true },
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

  // ── VAT rekapitulace ───────────────────────────────────────────────────────
  const vatSection: any[] = []

  if (isVatPayer) {
    const vatByRate: Record<number, { base: number; vat: number; total: number }> = {}
    invoice.items.forEach(item => {
      const rate      = item.vatRate ?? 0
      const unitNet   = item.price ?? 0
      const lineNet   = unitNet * item.quantity
      const vatAmt    = item.vatAmount ?? (lineNet * rate / 100)
      const lineGross = item.priceWithVat != null ? item.priceWithVat * item.quantity : lineNet + vatAmt
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
              layout: {
                hLineWidth: () => 0.4,
                vLineWidth: () => 0.4,
                hLineColor: () => C.border,
                vLineColor: () => C.border,
              },
            },
            // Souhrn
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
            // Celkem k úhradě — velký box
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
    // Neplátce DPH
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

  // ── Platební údaje ─────────────────────────────────────────────────────────
  const paymentLabel =
    invoice.paymentType === 'card'     ? 'Platební karta' :
    invoice.paymentType === 'transfer' ? 'Bankovní převod' :
    invoice.paymentType === 'cash'     ? 'Hotovost' :
    invoice.paymentType || 'Neuvedeno'

  const paymentLines: any[] = [
    { text: [{ text: 'Způsob platby: ', color: C.muted }, paymentLabel], fontSize: 8.5, margin: [0, 1, 0, 1] },
  ]
  if (settings.bankAccount && (invoice.paymentType === 'transfer' || invoice.paymentType === 'card')) {
    paymentLines.push({ text: [{ text: 'Číslo účtu: ', color: C.muted }, settings.bankAccount], fontSize: 8.5, margin: [0, 1, 0, 1] })
  }
  if (invoice.paymentType === 'transfer') {
    paymentLines.push({ text: [{ text: 'Variabilní symbol: ', color: C.muted }, invoice.transactionCode], fontSize: 8.5, margin: [0, 1, 0, 1] })
  }

  // ── Podpis ─────────────────────────────────────────────────────────────────
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

  // ── Storno ─────────────────────────────────────────────────────────────────
  const stornoSection: any[] = []
  if (invoice.status === 'storno') {
    stornoSection.push({
      table: {
        widths: ['*'],
        body: [[{
          text: 'TENTO DOKLAD BYL STORNOVÁN',
          style: 'stornoText',
          bold: true,
          fillColor: '#fee2e2',
          alignment: 'center',
          margin: [0, 6, 0, 6],
        }]],
      },
      layout: 'noBorders',
      margin: [0, 10, 0, 0],
    })
  }

  // ── Sestavení dokumentu ────────────────────────────────────────────────────
  const dd: TDocumentDefinitions = {
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
      ...stornoSection,
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

  return new Promise<void>(resolve => {
    pdfMake.createPdf(dd).open()
    resolve()
  })
}
