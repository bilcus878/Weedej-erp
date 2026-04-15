// Generování PDF dokladů – Weedej ERP
// Podporuje: Objednávky, Příjemky, Výdejky
// Používá pdfmake s embedded Roboto fontem (plná česká diakritika)

import type { TDocumentDefinitions, StyleDictionary } from 'pdfmake/interfaces'

// ─── Typy ─────────────────────────────────────────────────────────────────────

export interface CompanySettings {
  companyName?: string
  ico?: string
  dic?: string
  address?: string
  phone?: string
  email?: string
  bankAccount?: string
  isVatPayer?: boolean
}

export interface PurchaseOrderData {
  orderNumber: string
  orderDate: string
  expectedDate?: string
  supplierName: string
  supplierAddress?: string
  supplierICO?: string
  supplierDIC?: string
  supplierPhone?: string
  supplierEmail?: string
  items: Array<{ productName: string; quantity: number; unit: string; price: number }>
  totalAmount: number
  note?: string
  status?: string
  stornoReason?: string
  stornoAt?: string
}

export interface ReceiptData {
  receiptNumber: string
  receiptDate: string
  supplierName: string
  supplierAddress?: string
  supplierICO?: string
  supplierDIC?: string
  supplierPhone?: string
  supplierEmail?: string
  items: Array<{ productName: string; quantity: number; unit: string; price: number }>
  totalAmount: number
  note?: string
  status?: string
  stornoReason?: string
  stornoAt?: string
}

export interface DeliveryNoteData {
  noteNumber: string
  noteDate: string
  customerName: string
  customerAddress?: string
  customerEmail?: string
  customerPhone?: string
  customerICO?: string
  customerDIC?: string
  items: Array<{ productName: string; quantity: number; unit: string; price: number }>
  totalAmount: number
  note?: string
  status?: string
  stornoReason?: string
  stornoAt?: string
}

// ─── Barvy ────────────────────────────────────────────────────────────────────

const COLORS = {
  order:    '#7c3aed',
  receipt:  '#16a34a',
  delivery: '#ea580c',
  muted:    '#6b7280',
  light:    '#f3f4f6',
  border:   '#e5e7eb',
  text:     '#111827',
  white:    '#ffffff',
  red:      '#dc2626',
  redLight: '#fee2e2',
}

// ─── Formátování ──────────────────────────────────────────────────────────────

function czk(value: number): string {
  return value.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč'
}

function fmtDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString('cs-CZ') } catch { return dateStr }
}

// ─── pdfmake loader ──────────────────────────────────────────────────────────

async function getPdfMake() {
  const pdfMake = (await import('pdfmake/build/pdfmake' as any)).default as any
  const vfs = (await import('pdfmake/build/vfs_fonts' as any)).default as any
  // pdfmake 0.3.x: virtualfs.writeFileSync expects Buffer (base64 → Buffer)
  for (const [name, data] of Object.entries(vfs) as [string, string][]) {
    if (!pdfMake.virtualfs.existsSync(name)) {
      pdfMake.virtualfs.writeFileSync(name, Buffer.from(data, 'base64'))
    }
  }
  return pdfMake
}

// ─── Sdílené bloky dokumentu ──────────────────────────────────────────────────

const STYLES: StyleDictionary = {
  docTitle: { fontSize: 26, bold: true, alignment: 'right' },
  docNumber: { fontSize: 8.5, color: '#6b7280', alignment: 'right' },
  companyName: { fontSize: 13, bold: true },
  companyDetail: { fontSize: 8, color: '#6b7280' },
  sectionLabel: { fontSize: 7, bold: true, characterSpacing: 1 },
  partyName: { fontSize: 9.5, bold: true },
  partyDetail: { fontSize: 8.5, color: '#6b7280' },
  tableHeader: { fontSize: 8, bold: true, color: '#ffffff' },
  tableCell: { fontSize: 8.5 },
  totalLabel: { fontSize: 10, bold: true },
  totalValue: { fontSize: 10, bold: true },
  note: { fontSize: 8.5, color: '#6b7280' },
  stornoText: { fontSize: 8.5, color: '#7f1d1d' },
}

function headerBlock(
  title: string,
  docLabel: string,
  docValue: string,
  color: string,
  settings: CompanySettings
) {
  const ids: string[] = []
  if (settings.ico) ids.push(`IČO: ${settings.ico}`)
  if (settings.dic) ids.push(`DIČ: ${settings.dic}`)
  const contacts: string[] = []
  if (settings.phone) contacts.push(settings.phone)
  if (settings.email) contacts.push(settings.email)

  return [
    // Barevný pruh
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 525, h: 7, color }], margin: [0, 0, 0, 6] },
    {
      columns: [
        // Levá strana – firma
        {
          stack: [
            { text: settings.companyName || '', style: 'companyName' },
            ...(settings.address ? [{ text: settings.address, style: 'companyDetail', margin: [0, 1, 0, 0] }] : []),
            ...(ids.length ? [{ text: ids.join('   '), style: 'companyDetail' }] : []),
            ...(contacts.length ? [{ text: contacts.join('   '), style: 'companyDetail' }] : []),
          ],
          width: '*',
        },
        // Pravá strana – název dokumentu
        {
          stack: [
            { text: title, style: 'docTitle', color },
            { text: `${docLabel}: ${docValue}`, style: 'docNumber', margin: [0, 2, 0, 0] },
          ],
          width: 'auto',
          alignment: 'right',
        },
      ],
    },
    // Oddělovací čára
    { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 525, y2: 4, lineWidth: 0.4, lineColor: color }], margin: [0, 4, 0, 6] },
  ]
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
      ...(ids.length ? [{ text: ids.join('   '), style: 'partyDetail' }] : []),
      ...(party.phone ? [{ text: `Tel: ${party.phone}`, style: 'partyDetail' }] : []),
      ...(party.email ? [{ text: `Email: ${party.email}`, style: 'partyDetail' }] : []),
    ],
  }
}

function itemsTable(
  items: Array<{ productName: string; quantity: number; unit: string; price: number }>,
  headColor: string,
  headerLabels: string[]
) {
  const rows = items.map((item, idx) => [
    { text: String(idx + 1), style: 'tableCell', alignment: 'center' },
    { text: item.productName, style: 'tableCell' },
    { text: `${item.quantity} ${item.unit}`, style: 'tableCell', alignment: 'center' },
    { text: czk(item.price), style: 'tableCell', alignment: 'right' },
    { text: czk(item.quantity * item.price), style: 'tableCell', alignment: 'right', bold: true },
  ])

  return {
    table: {
      headerRows: 1,
      widths: [20, '*', 55, 60, 65],
      body: [
        headerLabels.map(l => ({ text: l, style: 'tableHeader', fillColor: headColor })),
        ...rows,
      ],
    },
    layout: {
      hLineWidth: () => 0.4,
      vLineWidth: () => 0.4,
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
      fillColor: (_i: number, _node: any, _col: number, row: number) =>
        row % 2 === 0 ? null : COLORS.light,
    },
  }
}

function totalBox(label: string, value: string, color: string) {
  return {
    columns: [
      { text: '', width: '*' },
      {
        table: {
          widths: [130, 90],
          body: [[
            { text: label, fillColor: color, color: COLORS.white, bold: true, fontSize: 10, alignment: 'left', margin: [6, 5, 0, 5] },
            { text: value, fillColor: color, color: COLORS.white, bold: true, fontSize: 10, alignment: 'right', margin: [0, 5, 6, 5] },
          ]],
        },
        layout: 'noBorders',
      },
    ],
    margin: [0, 6, 0, 0],
  }
}

function stornoBlock(reason?: string, date?: string) {
  let msg = 'STORNOVÁNO'
  if (date) msg += ` dne ${fmtDate(date)}`
  if (reason) msg += ` | Důvod: ${reason}`
  return {
    table: {
      widths: ['*'],
      body: [[{ text: msg, style: 'stornoText', fillColor: COLORS.redLight, alignment: 'center', margin: [0, 4, 0, 4] }]],
    },
    layout: 'noBorders',
    margin: [0, 8, 0, 0],
  }
}

function footerFn(color: string) {
  return ((_currentPage: number, _pageCount: number) => ({
    stack: [
      { canvas: [{ type: 'rect', x: 0, y: 0, w: 595, h: 20, color }] },
      {
        text: 'Vygenerováno systémem Weedej ERP',
        fontSize: 6.5,
        color: COLORS.white,
        alignment: 'center',
        absolutePosition: { x: 0, y: 10 },
      },
    ],
    margin: [0, 10, 0, 0],
  })) as any
}

function buildDoc(
  content: any[],
  color: string,
  header: any[]
): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageMargins: [40, 20, 40, 30],
    content: [...header, ...content],
    footer: footerFn(color),
    styles: STYLES,
    defaultStyle: { font: 'Roboto', fontSize: 9 },
  }
}

// ─── Veřejné API ──────────────────────────────────────────────────────────────

export async function generatePurchaseOrderPDF(
  data: PurchaseOrderData,
  settings: CompanySettings
): Promise<Blob> {
  const pdfMake = await getPdfMake()
  const color = COLORS.order

  const header = headerBlock('OBJEDNÁVKA', 'Č. objednávky', data.orderNumber, color, settings)

  const content: any[] = [
    // Datum
    {
      text: [
        { text: `Datum objednání: `, color: COLORS.muted, fontSize: 8.5 },
        { text: fmtDate(data.orderDate), fontSize: 8.5 },
        ...(data.expectedDate ? [
          { text: `     Očekávané dodání: `, color: COLORS.muted, fontSize: 8.5 },
          { text: fmtDate(data.expectedDate), fontSize: 8.5 },
        ] : []),
      ],
      margin: [0, 0, 0, 10],
    },
    // Strany
    {
      columns: [
        partyBlock('Odběratel (naše firma)', {
          name: settings.companyName || '',
          address: settings.address, ico: settings.ico, dic: settings.dic,
          phone: settings.phone, email: settings.email,
        }, color),
        { width: 20, text: '' },
        partyBlock('Dodavatel', {
          name: data.supplierName, address: data.supplierAddress,
          ico: data.supplierICO, dic: data.supplierDIC,
          phone: data.supplierPhone, email: data.supplierEmail,
        }, color),
      ],
      margin: [0, 0, 0, 14],
    },
    // Tabulka
    itemsTable(data.items, color, ['#', 'Zboží / Služba', 'Množství', 'Cena/ks bez DPH', 'Celkem bez DPH']),
    // Celkem
    totalBox('Celkem bez DPH:', czk(data.totalAmount), color),
    // Poznámka
    ...(data.note ? [{ text: `Poznámka: ${data.note}`, style: 'note', margin: [0, 8, 0, 0] }] : []),
    // Storno
    ...(data.status === 'storno' ? [stornoBlock(data.stornoReason, data.stornoAt)] : []),
  ]

  const dd = buildDoc(content, color, header)
  return pdfMake.createPdf(dd).getBlob() as Promise<Blob>
}

export async function generateReceiptPDF(
  data: ReceiptData,
  settings: CompanySettings
): Promise<Blob> {
  const pdfMake = await getPdfMake()
  const color = COLORS.receipt

  const header = headerBlock('PŘÍJEMKA', 'Č. příjemky', data.receiptNumber, color, settings)

  const content: any[] = [
    {
      text: [
        { text: 'Datum příjmu: ', color: COLORS.muted, fontSize: 8.5 },
        { text: fmtDate(data.receiptDate), fontSize: 8.5 },
      ],
      margin: [0, 0, 0, 10],
    },
    {
      columns: [
        partyBlock('Příjemce (naše firma)', {
          name: settings.companyName || '',
          address: settings.address, ico: settings.ico, dic: settings.dic,
          phone: settings.phone, email: settings.email,
        }, color),
        { width: 20, text: '' },
        partyBlock('Dodavatel', {
          name: data.supplierName, address: data.supplierAddress,
          ico: data.supplierICO, dic: data.supplierDIC,
          phone: data.supplierPhone, email: data.supplierEmail,
        }, color),
      ],
      margin: [0, 0, 0, 14],
    },
    itemsTable(data.items, color, ['#', 'Zboží / Služba', 'Množství', 'Nákupní cena/ks', 'Celkem']),
    totalBox('Celkem:', czk(data.totalAmount), color),
    ...(data.note ? [{ text: `Poznámka: ${data.note}`, style: 'note', margin: [0, 8, 0, 0] }] : []),
    ...(data.status === 'storno' ? [stornoBlock(data.stornoReason, data.stornoAt)] : []),
  ]

  const dd = buildDoc(content, color, header)
  return pdfMake.createPdf(dd).getBlob() as Promise<Blob>
}

export async function generateDeliveryNotePDF(
  data: DeliveryNoteData,
  settings: CompanySettings
): Promise<Blob> {
  const pdfMake = await getPdfMake()
  const color = COLORS.delivery

  const header = headerBlock('VÝDEJKA', 'Č. výdejky', data.noteNumber, color, settings)

  const content: any[] = [
    {
      text: [
        { text: 'Datum výdeje: ', color: COLORS.muted, fontSize: 8.5 },
        { text: fmtDate(data.noteDate), fontSize: 8.5 },
      ],
      margin: [0, 0, 0, 10],
    },
    {
      columns: [
        partyBlock('Vydávající (naše firma)', {
          name: settings.companyName || '',
          address: settings.address, ico: settings.ico, dic: settings.dic,
          phone: settings.phone, email: settings.email,
        }, color),
        { width: 20, text: '' },
        partyBlock('Odběratel', {
          name: data.customerName, address: data.customerAddress,
          ico: data.customerICO, dic: data.customerDIC,
          phone: data.customerPhone, email: data.customerEmail,
        }, color),
      ],
      margin: [0, 0, 0, 14],
    },
    itemsTable(data.items, color, ['#', 'Zboží / Služba', 'Množství', 'Cena/ks', 'Celkem']),
    totalBox('Celkem:', czk(data.totalAmount), color),
    ...(data.note ? [{ text: `Poznámka: ${data.note}`, style: 'note', margin: [0, 8, 0, 0] }] : []),
    ...(data.status === 'storno' ? [stornoBlock(data.stornoReason, data.stornoAt)] : []),
  ]

  const dd = buildDoc(content, color, header)
  return pdfMake.createPdf(dd).getBlob() as Promise<Blob>
}

export function openPDFInNewTab(blob: Blob, filename = 'dokument.pdf') {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
