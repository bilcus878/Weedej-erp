/**
 * Server-side PDF generators — Weedej ERP Document Archive
 *
 * All functions return a Buffer via pdfmake's Node.js PdfPrinter API.
 * The visual design (colors, layout, typography) lives in the buildXxxDocDef()
 * functions — change look there and every future PDF reflects it instantly.
 * Already-archived PDFs remain frozen (legal compliance).
 *
 * To change the look of any document type:
 *   1. Find the buildXxxDocDef() function below
 *   2. Edit colors, layout, add logo, change fonts
 *   3. Done — no changes needed in storage or routing code
 */

import type { TDocumentDefinitions, StyleDictionary } from 'pdfmake/interfaces'
import type { CompanySettings } from '@/lib/pdfGenerator'

// ─── Shared colours ──────────────────────────────────────────────────────────
// Change these to retheme every document at once.

export const BRAND = {
  issuedInvoice:   '#2563eb',   // blue
  receivedInvoice: '#0f766e',   // teal
  customerOrder:   '#7c3aed',   // violet
  purchaseOrder:   '#7c3aed',   // violet
  receipt:         '#16a34a',   // green
  deliveryNote:    '#ea580c',   // orange
  creditNote:      '#dc2626',   // red
  muted:           '#6b7280',
  light:           '#f3f4f6',
  border:          '#e5e7eb',
  text:            '#111827',
  white:           '#ffffff',
  slate:           '#475569',
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const STYLES: StyleDictionary = {
  docTitle:      { fontSize: 26, bold: true, alignment: 'right' },
  docNumber:     { fontSize: 8.5, color: BRAND.muted, alignment: 'right' },
  companyName:   { fontSize: 13, bold: true },
  companyDetail: { fontSize: 8, color: BRAND.muted },
  sectionLabel:  { fontSize: 7, bold: true, characterSpacing: 1 },
  partyName:     { fontSize: 9.5, bold: true },
  partyDetail:   { fontSize: 8.5, color: BRAND.muted },
  tableHeader:   { fontSize: 7.5, bold: true, color: BRAND.white },
  tableCell:     { fontSize: 8 },
  note:          { fontSize: 8.5, color: BRAND.muted },
  stornoText:    { fontSize: 8.5, color: '#7f1d1d' },
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function czk(v: number): string {
  return v.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč'
}

function fmtDate(d: string | Date): string {
  try { return new Date(d).toLocaleDateString('cs-CZ') } catch { return String(d) }
}

function headerBlock(
  title: string,
  docLabel: string,
  docValue: string,
  accentColor: string,
  settings: CompanySettings,
): any[] {
  const ids: string[] = []
  if (settings.ico) ids.push(`IČO: ${settings.ico}`)
  if (settings.dic) ids.push(`DIČ: ${settings.dic}`)
  const contacts: string[] = []
  if (settings.phone) contacts.push(settings.phone)
  if (settings.email) contacts.push(settings.email)

  return [
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 525, h: 7, color: accentColor }], margin: [0, 0, 0, 6] },
    {
      columns: [
        {
          stack: [
            { text: settings.companyName || '', style: 'companyName' },
            ...(settings.address  ? [{ text: settings.address,         style: 'companyDetail', margin: [0, 1, 0, 0] }] : []),
            ...(ids.length        ? [{ text: ids.join('   '),           style: 'companyDetail' }] : []),
            ...(contacts.length   ? [{ text: contacts.join('   '),      style: 'companyDetail' }] : []),
          ],
          width: '*',
        },
        {
          stack: [
            { text: title,                                  style: 'docTitle', color: accentColor },
            { text: `${docLabel}: ${docValue}`,             style: 'docNumber', margin: [0, 2, 0, 0] },
          ],
          width: 'auto',
        },
      ],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 525, y2: 4, lineWidth: 0.4, lineColor: accentColor }], margin: [0, 4, 0, 6] },
  ]
}

function partyBlock(label: string, party: {
  name: string; address?: string; ico?: string; dic?: string; phone?: string; email?: string
}, accentColor: string): any {
  const ids: string[] = []
  if (party.ico) ids.push(`IČO: ${party.ico}`)
  if (party.dic) ids.push(`DIČ: ${party.dic}`)
  return {
    stack: [
      { text: label.toUpperCase(), style: 'sectionLabel', color: accentColor, margin: [0, 0, 0, 3] },
      { text: party.name,          style: 'partyName',    margin: [0, 0, 0, 2] },
      ...(party.address ? [{ text: party.address,      style: 'partyDetail' }] : []),
      ...(ids.length    ? [{ text: ids.join('   '),    style: 'partyDetail' }] : []),
      ...(party.phone   ? [{ text: `Tel: ${party.phone}`, style: 'partyDetail' }] : []),
      ...(party.email   ? [{ text: `Email: ${party.email}`, style: 'partyDetail' }] : []),
    ],
  }
}

function simpleItemsTable(
  items: Array<{ productName: string; quantity: number; unit: string; price: number }>,
  accentColor: string,
  col3Label = 'Množství',
  col4Label = 'Cena/ks',
  col5Label = 'Celkem',
): any {
  const rows = items.map((item, idx) => [
    { text: String(idx + 1),                   style: 'tableCell', alignment: 'center' },
    { text: item.productName,                  style: 'tableCell' },
    { text: `${item.quantity} ${item.unit}`,   style: 'tableCell', alignment: 'center' },
    { text: czk(item.price),                   style: 'tableCell', alignment: 'right' },
    { text: czk(item.quantity * item.price),   style: 'tableCell', alignment: 'right', bold: true },
  ])
  return {
    table: {
      headerRows: 1,
      widths: [20, '*', 55, 60, 65],
      body: [
        ['#', 'Zboží / Služba', col3Label, col4Label, col5Label]
          .map(t => ({ text: t, style: 'tableHeader', fillColor: accentColor })),
        ...rows,
      ],
    },
    layout: {
      hLineWidth: () => 0.4,
      vLineWidth: () => 0.4,
      hLineColor: () => BRAND.border,
      vLineColor: () => BRAND.border,
      fillColor: (_i: number, _n: any, _c: number, row: number) => row % 2 === 0 ? null : BRAND.light,
    },
    margin: [0, 0, 0, 8],
  }
}

function totalBox(label: string, value: string, accentColor: string): any {
  return {
    columns: [
      { text: '', width: '*' },
      {
        table: {
          widths: [130, 90],
          body: [[
            { text: label, fillColor: accentColor, color: BRAND.white, bold: true, fontSize: 10, alignment: 'left',  margin: [6, 5, 0, 5] },
            { text: value, fillColor: accentColor, color: BRAND.white, bold: true, fontSize: 10, alignment: 'right', margin: [0, 5, 6, 5] },
          ]],
        },
        layout: 'noBorders',
      },
    ],
    margin: [0, 6, 0, 0],
  }
}

function stornoBlock(reason?: string | null, date?: string | Date | null): any {
  let msg = 'STORNOVÁNO'
  if (date) msg += ` dne ${fmtDate(date)}`
  if (reason) msg += ` | Důvod: ${reason}`
  return {
    table: {
      widths: ['*'],
      body: [[{ text: msg, style: 'stornoText', fillColor: '#fee2e2', alignment: 'center', margin: [0, 4, 0, 4] }]],
    },
    layout: 'noBorders',
    margin: [0, 8, 0, 0],
  }
}

function footerFn(accentColor: string): any {
  return ((_p: number, _t: number) => ({
    stack: [
      { canvas: [{ type: 'rect', x: 0, y: 0, w: 595, h: 20, color: accentColor }] },
      { text: 'Vygenerováno systémem Weedej ERP', fontSize: 6.5, color: BRAND.white, alignment: 'center', absolutePosition: { x: 0, y: 10 } },
    ],
    margin: [0, 10, 0, 0],
  })) as any
}

function wrapDoc(content: any[], header: any[], accentColor: string): TDocumentDefinitions {
  return {
    pageSize:     'A4',
    pageMargins:  [40, 20, 40, 30],
    content:      [...header, ...content],
    footer:       footerFn(accentColor),
    styles:       STYLES,
    defaultStyle: { font: 'Roboto', fontSize: 9 },
  }
}

// ─── Singleton printer (shared across all generators) ─────────────────────────

let _printer: any = null
function getPrinter() {
  if (_printer) return _printer
  /* eslint-disable @typescript-eslint/no-require-imports */
  const PdfPrinter = require('pdfmake')
  const vfs        = require('pdfmake/build/vfs_fonts').pdfMake.vfs as Record<string, string>
  /* eslint-enable */
  _printer = new PdfPrinter({
    Roboto: {
      normal:      Buffer.from(vfs['Roboto-Regular.ttf'],      'base64'),
      bold:        Buffer.from(vfs['Roboto-Medium.ttf'],       'base64'),
      italics:     Buffer.from(vfs['Roboto-Italic.ttf'],       'base64'),
      bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
    },
  })
  return _printer
}

function toBuffer(docDef: TDocumentDefinitions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc    = getPrinter().createPdfKitDocument(docDef, {})
      const chunks: Buffer[] = []
      doc.on('data',  (c: Buffer) => chunks.push(c))
      doc.on('end',   () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SimpleItem {
  productName: string
  quantity:    number
  unit:        string
  price:       number
}

export interface CustomerOrderForPdf {
  orderNumber:     string
  orderDate:       string | Date
  status?:         string
  customerName?:   string
  customerAddress?: string
  customerEmail?:  string
  customerPhone?:  string
  customerIco?:    string
  customerDic?:    string
  shippingMethod?: string
  trackingNumber?: string
  carrier?:        string
  note?:           string
  totalAmount:     number
  items: Array<{
    productName?: string | null
    quantity:     number
    unit:         string
    price:        number
    vatRate?:     number
    priceWithVat?: number
  }>
  stornoReason?: string | null
  stornoAt?:     string | Date | null
}

export interface PurchaseOrderForPdf {
  orderNumber:      string
  orderDate:        string | Date
  expectedDate?:    string | Date | null
  supplierName:     string
  supplierAddress?: string
  supplierICO?:     string
  supplierDIC?:     string
  supplierPhone?:   string
  supplierEmail?:   string
  items:            SimpleItem[]
  totalAmount:      number
  note?:            string | null
  status?:          string
  stornoReason?:    string | null
  stornoAt?:        string | Date | null
}

export interface ReceiptForPdf {
  receiptNumber:    string
  receiptDate:      string | Date
  supplierName:     string
  supplierAddress?: string
  supplierICO?:     string
  supplierDIC?:     string
  supplierPhone?:   string
  supplierEmail?:   string
  items:            SimpleItem[]
  totalAmount:      number
  note?:            string | null
  status?:          string
  stornoReason?:    string | null
  stornoAt?:        string | Date | null
}

export interface DeliveryNoteForPdf {
  noteNumber:       string
  noteDate:         string | Date
  customerName:     string
  customerAddress?: string
  customerEmail?:   string
  customerPhone?:   string
  customerICO?:     string
  customerDIC?:     string
  items:            SimpleItem[]
  totalAmount:      number
  note?:            string | null
  status?:          string
  stornoReason?:    string | null
  stornoAt?:        string | Date | null
}

export interface CreditNoteForPdf {
  creditNoteNumber:      string
  creditNoteDate:        string | Date
  originalInvoiceNumber: string
  customerName?:         string
  customerAddress?:      string
  customerEmail?:        string
  customerPhone?:        string
  customerIco?:          string
  customerDic?:          string
  reason?:               string | null
  note?:                 string | null
  totalAmount:           number
  totalAmountWithoutVat: number
  totalVatAmount:        number
  items: Array<{
    productName?: string | null
    quantity:     number
    unit:         string
    price:        number
    vatRate:      number
    priceWithVat: number
  }>
}

export interface ReceivedInvoiceForPdf {
  invoiceNumber:    string
  invoiceDate:      string | Date
  dueDate?:         string | Date | null
  supplierName?:    string
  supplierAddress?: string
  supplierIco?:     string
  supplierDic?:     string
  supplierEmail?:   string
  supplierPhone?:   string
  paymentType:      string
  totalAmount:      number
  totalAmountWithoutVat: number
  totalVatAmount:   number
  note?:            string | null
  variableSymbol?:  string | null
  isTemporary?:     boolean
}

// ─── 1. Customer Order ────────────────────────────────────────────────────────

function buildCustomerOrderDocDef(
  data: CustomerOrderForPdf,
  settings: CompanySettings,
): TDocumentDefinitions {
  const color  = BRAND.customerOrder
  const header = headerBlock('OBJEDNÁVKA', 'Č. objednávky', data.orderNumber, color, settings)

  const statusLabel: Record<string, string> = {
    new:        'Nová',
    paid:       'Zaplacená',
    processing: 'Zpracovává se',
    shipped:    'Odesláno',
    completed:  'Dokončeno',
    storno:     'Stornováno',
  }

  const shippingLabel: Record<string, string> = {
    DPD_HOME:           'DPD – doručení domů',
    DPD_PICKUP:         'DPD – výdejní místo',
    ZASILKOVNA_HOME:    'Zásilkovna – doručení domů',
    ZASILKOVNA_PICKUP:  'Zásilkovna – výdejní místo',
    COURIER:            'Kurýr',
    PICKUP_IN_STORE:    'Osobní odběr',
  }

  const dateParts: any[] = [
    { text: 'Datum objednávky: ', color: BRAND.muted, fontSize: 8.5 },
    { text: fmtDate(data.orderDate), fontSize: 8.5 },
    { text: '     Status: ',       color: BRAND.muted, fontSize: 8.5 },
    { text: statusLabel[data.status ?? ''] ?? data.status ?? 'Neznámý', fontSize: 8.5 },
  ]
  if (data.shippingMethod) {
    dateParts.push({ text: '     Doprava: ', color: BRAND.muted, fontSize: 8.5 })
    dateParts.push({ text: shippingLabel[data.shippingMethod] ?? data.shippingMethod, fontSize: 8.5 })
  }
  if (data.trackingNumber) {
    dateParts.push({ text: '     Tracking: ', color: BRAND.muted, fontSize: 8.5 })
    dateParts.push({ text: data.trackingNumber, fontSize: 8.5 })
    if (data.carrier) {
      dateParts.push({ text: ` (${data.carrier})`, color: BRAND.muted, fontSize: 8.5 })
    }
  }

  const customer = {
    name:    data.customerName    || 'Anonymní odběratel',
    address: data.customerAddress,
    ico:     data.customerIco,
    dic:     data.customerDic,
    phone:   data.customerPhone,
    email:   data.customerEmail,
  }

  const ourParty = {
    name:    settings.companyName || '',
    address: settings.address,
    ico:     settings.ico,
    dic:     settings.dic,
    phone:   settings.phone,
    email:   settings.email,
  }

  // Items table with VAT columns when available
  const hasVat = data.items.some(i => i.vatRate != null && i.vatRate > 0)
  const itemRows = data.items.map((item, idx) => {
    const name  = item.productName || '(Neznámý produkt)'
    const qty   = item.quantity
    const net   = item.price
    if (hasVat) {
      const vat  = item.vatRate ?? 0
      const gross = item.priceWithVat ?? (net * (1 + vat / 100))
      return [
        { text: String(idx + 1),       style: 'tableCell', alignment: 'center' },
        { text: name,                  style: 'tableCell' },
        { text: `${qty} ${item.unit}`, style: 'tableCell', alignment: 'center' },
        { text: czk(net),              style: 'tableCell', alignment: 'right' },
        { text: `${vat} %`,            style: 'tableCell', alignment: 'center' },
        { text: czk(gross * qty),      style: 'tableCell', alignment: 'right', bold: true },
      ]
    }
    return [
      { text: String(idx + 1),       style: 'tableCell', alignment: 'center' },
      { text: name,                  style: 'tableCell' },
      { text: `${qty} ${item.unit}`, style: 'tableCell', alignment: 'center' },
      { text: czk(net),              style: 'tableCell', alignment: 'right' },
      { text: czk(net * qty),        style: 'tableCell', alignment: 'right', bold: true },
    ]
  })

  const itemsTable: any = {
    table: {
      headerRows: 1,
      widths: hasVat ? [20, '*', 44, 58, 30, 65] : [20, '*', 55, 60, 65],
      body: [
        (hasVat
          ? ['#', 'Zboží / Služba', 'Množství', 'Cena bez DPH', 'Sazba', 'Celkem s DPH']
          : ['#', 'Zboží / Služba', 'Množství', 'Cena/ks', 'Celkem']
        ).map(t => ({ text: t, style: 'tableHeader', fillColor: color })),
        ...itemRows,
      ],
    },
    layout: {
      hLineWidth: () => 0.4, vLineWidth: () => 0.4,
      hLineColor: () => BRAND.border, vLineColor: () => BRAND.border,
      fillColor:  (_i: number, _n: any, _c: number, row: number) => row % 2 === 0 ? null : BRAND.light,
    },
    margin: [0, 0, 0, 8],
  }

  const content: any[] = [
    { text: dateParts, margin: [0, 0, 0, 10] },
    {
      columns: [
        partyBlock('Dodavatel (naše firma)', ourParty, color),
        { width: 20, text: '' },
        partyBlock('Odběratel', customer, color),
      ],
      margin: [0, 0, 0, 14],
    },
    itemsTable,
    totalBox('Celkem k úhradě:', czk(data.totalAmount), color),
    ...(data.note ? [{ text: `Poznámka: ${data.note}`, style: 'note', margin: [0, 8, 0, 0] }] : []),
    ...(data.status === 'storno' ? [stornoBlock(data.stornoReason, data.stornoAt)] : []),
  ]

  return wrapDoc(content, header, color)
}

// ─── 2. Purchase Order ────────────────────────────────────────────────────────

function buildPurchaseOrderDocDef(
  data: PurchaseOrderForPdf,
  settings: CompanySettings,
): TDocumentDefinitions {
  const color  = BRAND.purchaseOrder
  const header = headerBlock('OBJEDNÁVKA', 'Č. objednávky', data.orderNumber, color, settings)

  const dateParts: any[] = [
    { text: 'Datum objednání: ', color: BRAND.muted, fontSize: 8.5 },
    { text: fmtDate(data.orderDate), fontSize: 8.5 },
    ...(data.expectedDate ? [
      { text: '     Očekávané dodání: ', color: BRAND.muted, fontSize: 8.5 },
      { text: fmtDate(data.expectedDate), fontSize: 8.5 },
    ] : []),
  ]

  const content: any[] = [
    { text: dateParts, margin: [0, 0, 0, 10] },
    {
      columns: [
        partyBlock('Odběratel (naše firma)', {
          name:    settings.companyName || '', address: settings.address,
          ico:     settings.ico,               dic:     settings.dic,
          phone:   settings.phone,             email:   settings.email,
        }, color),
        { width: 20, text: '' },
        partyBlock('Dodavatel', {
          name:    data.supplierName,  address: data.supplierAddress,
          ico:     data.supplierICO,   dic:     data.supplierDIC,
          phone:   data.supplierPhone, email:   data.supplierEmail,
        }, color),
      ],
      margin: [0, 0, 0, 14],
    },
    simpleItemsTable(data.items, color, 'Množství', 'Cena/ks bez DPH', 'Celkem bez DPH'),
    totalBox('Celkem bez DPH:', czk(data.totalAmount), color),
    ...(data.note   ? [{ text: `Poznámka: ${data.note}`, style: 'note', margin: [0, 8, 0, 0] }] : []),
    ...(data.status === 'storno' ? [stornoBlock(data.stornoReason, data.stornoAt)] : []),
  ]

  return wrapDoc(content, header, color)
}

// ─── 3. Stock Receipt (Příjemka) ──────────────────────────────────────────────

function buildReceiptDocDef(
  data: ReceiptForPdf,
  settings: CompanySettings,
): TDocumentDefinitions {
  const color  = BRAND.receipt
  const header = headerBlock('PŘÍJEMKA', 'Č. příjemky', data.receiptNumber, color, settings)

  const content: any[] = [
    {
      text: [
        { text: 'Datum příjmu: ', color: BRAND.muted, fontSize: 8.5 },
        { text: fmtDate(data.receiptDate), fontSize: 8.5 },
      ],
      margin: [0, 0, 0, 10],
    },
    {
      columns: [
        partyBlock('Příjemce (naše firma)', {
          name:    settings.companyName || '', address: settings.address,
          ico:     settings.ico,               dic:     settings.dic,
          phone:   settings.phone,             email:   settings.email,
        }, color),
        { width: 20, text: '' },
        partyBlock('Dodavatel', {
          name:    data.supplierName,  address: data.supplierAddress,
          ico:     data.supplierICO,   dic:     data.supplierDIC,
          phone:   data.supplierPhone, email:   data.supplierEmail,
        }, color),
      ],
      margin: [0, 0, 0, 14],
    },
    simpleItemsTable(data.items, color, 'Množství', 'Nákupní cena/ks', 'Celkem'),
    totalBox('Celkem:', czk(data.totalAmount), color),
    ...(data.note   ? [{ text: `Poznámka: ${data.note}`, style: 'note', margin: [0, 8, 0, 0] }] : []),
    ...(data.status === 'storno' ? [stornoBlock(data.stornoReason, data.stornoAt)] : []),
  ]

  return wrapDoc(content, header, color)
}

// ─── 4. Delivery Note (Výdejka) ───────────────────────────────────────────────

function buildDeliveryNoteDocDef(
  data: DeliveryNoteForPdf,
  settings: CompanySettings,
): TDocumentDefinitions {
  const color  = BRAND.deliveryNote
  const header = headerBlock('VÝDEJKA', 'Č. výdejky', data.noteNumber, color, settings)

  const content: any[] = [
    {
      text: [
        { text: 'Datum výdeje: ', color: BRAND.muted, fontSize: 8.5 },
        { text: fmtDate(data.noteDate), fontSize: 8.5 },
      ],
      margin: [0, 0, 0, 10],
    },
    {
      columns: [
        partyBlock('Vydávající (naše firma)', {
          name:    settings.companyName || '', address: settings.address,
          ico:     settings.ico,               dic:     settings.dic,
          phone:   settings.phone,             email:   settings.email,
        }, color),
        { width: 20, text: '' },
        partyBlock('Odběratel', {
          name:    data.customerName,  address: data.customerAddress,
          ico:     data.customerICO,   dic:     data.customerDIC,
          phone:   data.customerPhone, email:   data.customerEmail,
        }, color),
      ],
      margin: [0, 0, 0, 14],
    },
    simpleItemsTable(data.items, color, 'Množství', 'Cena/ks', 'Celkem'),
    totalBox('Celkem:', czk(data.totalAmount), color),
    ...(data.note   ? [{ text: `Poznámka: ${data.note}`, style: 'note', margin: [0, 8, 0, 0] }] : []),
    ...(data.status === 'storno' ? [stornoBlock(data.stornoReason, data.stornoAt)] : []),
  ]

  return wrapDoc(content, header, color)
}

// ─── 5. Credit Note (Dobropis) ────────────────────────────────────────────────

function buildCreditNoteDocDef(
  data: CreditNoteForPdf,
  settings: CompanySettings,
): TDocumentDefinitions {
  const color  = BRAND.creditNote
  const header = headerBlock('DOBROPIS', 'Č. dobropisu', data.creditNoteNumber, color, settings)

  const customer = {
    name:    data.customerName    || 'Neznámý zákazník',
    address: data.customerAddress,
    ico:     data.customerIco,
    dic:     data.customerDic,
    phone:   data.customerPhone,
    email:   data.customerEmail,
  }

  const ourParty = {
    name:    settings.companyName || '',
    address: settings.address,
    ico:     settings.ico,
    dic:     settings.dic,
    phone:   settings.phone,
    email:   settings.email,
  }

  const itemRows = data.items.map((item, idx) => {
    const qty   = item.quantity
    const net   = item.price
    const vat   = item.vatRate
    const gross = item.priceWithVat
    return [
      { text: String(idx + 1),       style: 'tableCell', alignment: 'center' },
      { text: item.productName || '(Neznámá položka)', style: 'tableCell' },
      { text: `${qty} ${item.unit}`, style: 'tableCell', alignment: 'center' },
      { text: czk(net),              style: 'tableCell', alignment: 'right' },
      { text: `${vat} %`,            style: 'tableCell', alignment: 'center' },
      { text: czk(gross * qty),      style: 'tableCell', alignment: 'right', bold: true },
    ]
  })

  const itemsTable: any = {
    table: {
      headerRows: 1,
      widths: [20, '*', 44, 58, 30, 65],
      body: [
        ['#', 'Zboží / Služba', 'Množství', 'Cena bez DPH', 'Sazba', 'Celkem s DPH']
          .map(t => ({ text: t, style: 'tableHeader', fillColor: color })),
        ...itemRows,
      ],
    },
    layout: {
      hLineWidth: () => 0.4, vLineWidth: () => 0.4,
      hLineColor: () => BRAND.border, vLineColor: () => BRAND.border,
      fillColor:  (_i: number, _n: any, _c: number, row: number) => row % 2 === 0 ? null : BRAND.light,
    },
    margin: [0, 0, 0, 8],
  }

  const content: any[] = [
    {
      text: [
        { text: 'Datum dobropisu: ',       color: BRAND.muted, fontSize: 8.5 },
        { text: fmtDate(data.creditNoteDate), fontSize: 8.5 },
        { text: '     Původní faktura: ',  color: BRAND.muted, fontSize: 8.5 },
        { text: data.originalInvoiceNumber, fontSize: 8.5 },
      ],
      margin: [0, 0, 0, 10],
    },
    {
      columns: [
        partyBlock('Dodavatel', ourParty, color),
        { width: 20, text: '' },
        partyBlock('Odběratel', customer, color),
      ],
      margin: [0, 0, 0, 14],
    },
    ...(data.reason ? [{
      text: [{ text: 'Důvod dobropisu: ', color: BRAND.muted, fontSize: 8.5 }, { text: data.reason, fontSize: 8.5 }],
      margin: [0, 0, 0, 8],
    }] : []),
    itemsTable,
    {
      columns: [
        { text: '', width: '*' },
        {
          width: 220,
          stack: [
            {
              columns: [
                { text: 'Základ daně celkem:', fontSize: 8.5, color: BRAND.muted, width: '*' },
                { text: czk(Math.abs(data.totalAmountWithoutVat)), fontSize: 8.5, alignment: 'right', width: 'auto' },
              ],
              margin: [0, 1, 0, 1],
            },
            {
              columns: [
                { text: 'DPH celkem:', fontSize: 8.5, color: BRAND.muted, width: '*' },
                { text: czk(Math.abs(data.totalVatAmount)), fontSize: 8.5, alignment: 'right', width: 'auto' },
              ],
              margin: [0, 1, 0, 4],
            },
            {
              table: {
                widths: ['*', 'auto'],
                body: [[
                  { text: 'Celkem k vrácení:', fillColor: color, color: BRAND.white, bold: true, fontSize: 11, margin: [6, 6, 0, 6] },
                  { text: czk(Math.abs(data.totalAmount)), fillColor: color, color: BRAND.white, bold: true, fontSize: 11, alignment: 'right', margin: [0, 6, 6, 6] },
                ]],
              },
              layout: 'noBorders',
            },
          ],
        },
      ],
      margin: [0, 0, 0, 10],
    },
    ...(data.note ? [{ text: `Poznámka: ${data.note}`, style: 'note', margin: [0, 8, 0, 0] }] : []),
  ]

  return wrapDoc(content, header, color)
}

// ─── 6. Received Invoice (Přijatá faktura — ledger copy) ──────────────────────

function buildReceivedInvoiceDocDef(
  data: ReceivedInvoiceForPdf,
  settings: CompanySettings,
): TDocumentDefinitions {
  const color  = BRAND.receivedInvoice
  const title  = data.isTemporary ? 'PŘIJATÁ FAKTURA (DOČASNÁ)' : 'PŘIJATÁ FAKTURA'
  const header = headerBlock(title, 'Č. faktury', data.invoiceNumber, color, settings)

  const paymentLabel: Record<string, string> = {
    transfer:     'Bankovní převod',
    bank_transfer: 'Bankovní převod',
    cash:         'Hotovost',
    card:         'Platební karta',
  }

  const dateParts: any[] = [
    { text: 'Datum faktury: ', color: BRAND.muted, fontSize: 8.5 },
    { text: fmtDate(data.invoiceDate), fontSize: 8.5 },
  ]
  if (data.dueDate) {
    dateParts.push({ text: '     Datum splatnosti: ', color: BRAND.muted, fontSize: 8.5 })
    dateParts.push({ text: fmtDate(data.dueDate), fontSize: 8.5 })
  }

  const supplier = {
    name:    data.supplierName    || 'Neznámý dodavatel',
    address: data.supplierAddress,
    ico:     data.supplierIco,
    dic:     data.supplierDic,
    phone:   data.supplierPhone,
    email:   data.supplierEmail,
  }

  const ourParty = {
    name:    settings.companyName || '',
    address: settings.address,
    ico:     settings.ico,
    dic:     settings.dic,
  }

  const content: any[] = [
    { text: dateParts, margin: [0, 0, 0, 10] },
    {
      columns: [
        partyBlock('Odběratel (naše firma)', ourParty, color),
        { width: 20, text: '' },
        partyBlock('Dodavatel', supplier, color),
      ],
      margin: [0, 0, 0, 14],
    },
    {
      columns: [
        { text: '', width: '*' },
        {
          width: 220,
          stack: [
            ...(data.totalAmountWithoutVat > 0 ? [{
              columns: [
                { text: 'Základ daně:', fontSize: 8.5, color: BRAND.muted, width: '*' },
                { text: czk(data.totalAmountWithoutVat), fontSize: 8.5, alignment: 'right', width: 'auto' },
              ],
              margin: [0, 1, 0, 1],
            }] : []),
            ...(data.totalVatAmount > 0 ? [{
              columns: [
                { text: 'DPH:', fontSize: 8.5, color: BRAND.muted, width: '*' },
                { text: czk(data.totalVatAmount), fontSize: 8.5, alignment: 'right', width: 'auto' },
              ],
              margin: [0, 1, 0, 4],
            }] : []),
            {
              table: {
                widths: ['*', 'auto'],
                body: [[
                  { text: 'Celkem k úhradě:', fillColor: color, color: BRAND.white, bold: true, fontSize: 11, margin: [6, 6, 0, 6] },
                  { text: czk(data.totalAmount), fillColor: color, color: BRAND.white, bold: true, fontSize: 11, alignment: 'right', margin: [0, 6, 6, 6] },
                ]],
              },
              layout: 'noBorders',
            },
          ],
        },
      ],
      margin: [0, 0, 0, 10],
    },
    {
      text: [
        { text: 'Způsob platby: ', color: BRAND.muted, fontSize: 8.5 },
        { text: paymentLabel[data.paymentType] ?? data.paymentType, fontSize: 8.5 },
        ...(data.variableSymbol ? [
          { text: '     Variabilní symbol: ', color: BRAND.muted, fontSize: 8.5 },
          { text: data.variableSymbol, fontSize: 8.5 },
        ] : []),
      ],
      margin: [0, 0, 0, 4],
    },
    ...(data.note ? [{ text: `Poznámka: ${data.note}`, style: 'note', margin: [0, 8, 0, 0] }] : []),
    ...(data.isTemporary ? [{
      text: 'Toto je dočasný záznam faktury. Vyčkejte na obdržení skutečné faktury od dodavatele.',
      style: 'note',
      margin: [0, 12, 0, 0],
      italics: true,
    }] : []),
  ]

  return wrapDoc(content, header, color)
}

// ─── Public Buffer generators ─────────────────────────────────────────────────

export async function generateCustomerOrderPdfBuffer(
  data: CustomerOrderForPdf,
  settings: CompanySettings,
): Promise<Buffer> {
  return toBuffer(buildCustomerOrderDocDef(data, settings))
}

export async function generatePurchaseOrderPdfBuffer(
  data: PurchaseOrderForPdf,
  settings: CompanySettings,
): Promise<Buffer> {
  return toBuffer(buildPurchaseOrderDocDef(data, settings))
}

export async function generateReceiptPdfBuffer(
  data: ReceiptForPdf,
  settings: CompanySettings,
): Promise<Buffer> {
  return toBuffer(buildReceiptDocDef(data, settings))
}

export async function generateDeliveryNotePdfBuffer(
  data: DeliveryNoteForPdf,
  settings: CompanySettings,
): Promise<Buffer> {
  return toBuffer(buildDeliveryNoteDocDef(data, settings))
}

export async function generateCreditNotePdfBuffer(
  data: CreditNoteForPdf,
  settings: CompanySettings,
): Promise<Buffer> {
  return toBuffer(buildCreditNoteDocDef(data, settings))
}

export async function generateReceivedInvoicePdfBuffer(
  data: ReceivedInvoiceForPdf,
  settings: CompanySettings,
): Promise<Buffer> {
  return toBuffer(buildReceivedInvoiceDocDef(data, settings))
}
