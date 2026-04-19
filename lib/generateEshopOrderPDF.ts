// Generování PDF potvrzení eshop objednávky
// Dokument ESHORDER — odlišný od faktury, nevolá generateInvoicePDF

import type { TDocumentDefinitions, StyleDictionary } from 'pdfmake/interfaces'
import type { CompanySettings } from './pdfGenerator'

// ─── Typy ─────────────────────────────────────────────────────────────────────

export interface EshopOrderForPDF {
  orderNumber: string
  orderDate: string
  paidAt?: string | null
  shippedAt?: string | null
  note?: string | null
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  stripeSessionId?: string | null
  eshopOrderId?: string | null
  totalAmount: number
  totalAmountWithoutVat?: number
  totalVatAmount?: number
  items: Array<{
    productName?: string | null
    product?: { name: string } | null
    quantity: number
    unit: string
    price: number
    vatRate: number
    vatAmount: number
    priceWithVat: number
  }>
}

// ─── Barvy ────────────────────────────────────────────────────────────────────

const C = {
  accent:  '#059669',   // emerald-600 — eshop brand color
  muted:   '#6b7280',
  light:   '#f3f4f6',
  border:  '#e5e7eb',
  text:    '#111827',
  white:   '#ffffff',
  slate:   '#475569',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function czk(v: number): string {
  return v.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kč'
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '-'
  try { return new Date(d).toLocaleDateString('cs-CZ') } catch { return d }
}

async function getPdfMake(): Promise<any> {
  const pdfMake = (await import('pdfmake/build/pdfmake' as any)).default as any
  const vfs = (await import('pdfmake/build/vfs_fonts' as any)).default as any
  for (const [name, data] of Object.entries(vfs) as [string, string][]) {
    if (!pdfMake.virtualfs.existsSync(name)) {
      pdfMake.virtualfs.writeFileSync(name, Buffer.from(data, 'base64'))
    }
  }
  return pdfMake
}

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
}

function partyBlock(label: string, party: { name: string; address?: string; phone?: string; email?: string }) {
  return {
    stack: [
      { text: label.toUpperCase(), style: 'sectionLabel', color: C.accent, margin: [0, 0, 0, 3] },
      { text: party.name, style: 'partyName', margin: [0, 0, 0, 2] },
      ...(party.address ? [{ text: party.address, style: 'partyDetail' }] : []),
      ...(party.phone   ? [{ text: `Tel: ${party.phone}`, style: 'partyDetail' }] : []),
      ...(party.email   ? [{ text: `Email: ${party.email}`, style: 'partyDetail' }] : []),
    ],
  }
}

// ─── Hlavní funkce ────────────────────────────────────────────────────────────

export async function generateEshopOrderPDF(
  order: EshopOrderForPDF,
  settings: CompanySettings
): Promise<void> {
  const pdfMake = await getPdfMake()
  const isVatPayer = settings.isVatPayer !== false

  const orderDate  = fmtDate(order.orderDate)
  const paidDate   = fmtDate(order.paidAt)
  const shippedDate = fmtDate(order.shippedAt)

  const ourParty = {
    name:    settings.companyName || '',
    address: settings.address    ?? undefined,
    phone:   settings.phone      ?? undefined,
    email:   settings.email      ?? undefined,
  }

  const customer = {
    name:    order.customerName    || 'Zákazník',
    address: order.customerAddress ?? undefined,
    phone:   order.customerPhone   ?? undefined,
    email:   order.customerEmail   ?? undefined,
  }

  // ── Záhlaví ────────────────────────────────────────────────────────────────
  const ids: string[] = []
  if (settings.ico) ids.push(`IČO: ${settings.ico}`)
  if (settings.dic) ids.push(`DIČ: ${settings.dic}`)
  const contacts: string[] = []
  if (settings.phone) contacts.push(settings.phone)
  if (settings.email) contacts.push(settings.email)

  const header: any[] = [
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 525, h: 7, color: C.accent }], margin: [0, 0, 0, 6] },
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
            { text: 'OBJEDNÁVKA', style: 'docTitle', color: C.accent },
            { text: `Č. objednávky: ${order.orderNumber}`, style: 'docNumber', margin: [0, 2, 0, 0] },
          ],
          width: 'auto',
        },
      ],
    },
    { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 525, y2: 4, lineWidth: 0.4, lineColor: C.accent }], margin: [0, 4, 0, 6] },
  ]

  // ── Datum ──────────────────────────────────────────────────────────────────
  const dateParts: any[] = [
    { text: 'Datum objednávky: ', color: C.muted, fontSize: 8.5 },
    { text: orderDate, fontSize: 8.5 },
    { text: '     Zaplaceno: ', color: C.muted, fontSize: 8.5 },
    { text: paidDate, fontSize: 8.5 },
  ]
  if (order.shippedAt) {
    dateParts.push({ text: '     Odesláno: ', color: C.muted, fontSize: 8.5 })
    dateParts.push({ text: shippedDate, fontSize: 8.5 })
  }

  // ── Tabulka položek ────────────────────────────────────────────────────────
  // Doprava vždy jako poslední řádek — stejné pořadí jako ve web UI
  const isShippingItem = (item: EshopOrderForPDF['items'][number]) =>
    /(doprav|shipping)/i.test(item.productName || '')

  const sortedItems = [...order.items].sort((a, b) => {
    const aShip = isShippingItem(a) ? 1 : 0
    const bShip = isShippingItem(b) ? 1 : 0
    return aShip - bShip
  })

  const itemRows = sortedItems.map((item, idx) => {
    // Název z ERP katalogu má přednost před složeným eshop názvem
    const storedName = item.productName || ''
    const baseName   = item.product?.name
      || (storedName.includes(' — ') ? storedName.split(' — ')[0] : storedName)
      || '(Neznámý produkt)'
    const variantPart = storedName.includes(' — ') ? storedName.split(' — ').slice(1).join(' — ') : null
    const qty = variantPart
      ? (/^\d+[xX×]/.test(variantPart) ? variantPart : `${item.quantity}x ${variantPart}`)
      : `${item.quantity} ${item.unit}`

    const vatRate   = item.vatRate ?? 0
    const lineGross = (item.priceWithVat != null && item.priceWithVat > 0)
      ? item.priceWithVat * item.quantity
      : (item.price ?? 0) * item.quantity * (1 + vatRate / 100)

    // Pro plátce DPH: zobraz netto cenu (bez DPH). Pro neplátce: zobraz brutto (co zákazník platí).
    const unitNet = isVatPayer
      ? ((item.price != null && item.price > 0)
          ? item.price
          : (item.priceWithVat != null && vatRate > 0 ? item.priceWithVat / (1 + vatRate / 100) : 0))
      : (item.priceWithVat != null && item.priceWithVat > 0 ? item.priceWithVat : (item.price ?? 0))
    const lineNet = unitNet * item.quantity
    const vatAmt  = item.vatAmount != null && item.vatAmount > 0
      ? item.vatAmount * item.quantity
      : (lineGross - lineNet)

    if (isVatPayer) {
      return [
        { text: String(idx + 1), style: 'tableCell', alignment: 'center' },
        { text: baseName,        style: 'tableCell' },
        { text: qty,             style: 'tableCell', alignment: 'center' },
        { text: czk(unitNet),    style: 'tableCell', alignment: 'right' },
        { text: `${vatRate} %`,  style: 'tableCell', alignment: 'center' },
        { text: czk(vatAmt),     style: 'tableCell', alignment: 'right' },
        { text: czk(lineGross),  style: 'tableCell', alignment: 'right', bold: true },
      ]
    } else {
      return [
        { text: String(idx + 1), style: 'tableCell', alignment: 'center' },
        { text: baseName,        style: 'tableCell' },
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
          ? ['#', 'Zboží / Produkt', 'Množství', 'Jedn. cena bez DPH', 'Sazba', 'DPH', 'Celkem s DPH']
              .map(t => ({ text: t, style: 'tableHeader', fillColor: C.accent }))
          : ['#', 'Zboží / Produkt', 'Množství', 'Cena/ks', 'Celkem']
              .map(t => ({ text: t, style: 'tableHeader', fillColor: C.accent })),
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

  // ── Celková částka ─────────────────────────────────────────────────────────
  const totalSection: any[] = []
  if (isVatPayer) {
    const totalNet   = order.totalAmountWithoutVat ?? 0
    const totalVat   = order.totalVatAmount ?? 0
    const totalGross = order.totalAmount

    totalSection.push({
      columns: [
        { text: '', width: '*' },
        {
          width: 220,
          stack: [
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
                  { text: 'Celková cena s DPH:', fillColor: C.accent, color: C.white, bold: true, fontSize: 11, margin: [6, 6, 0, 6] },
                  { text: czk(totalGross),        fillColor: C.accent, color: C.white, bold: true, fontSize: 11, alignment: 'right', margin: [0, 6, 6, 6] },
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
    totalSection.push({
      columns: [
        { text: '', width: '*' },
        {
          width: 220,
          stack: [
            {
              table: {
                widths: ['*', 'auto'],
                body: [[
                  { text: 'Celková cena:', fillColor: C.accent, color: C.white, bold: true, fontSize: 11, margin: [6, 6, 0, 6] },
                  { text: czk(order.totalAmount), fillColor: C.accent, color: C.white, bold: true, fontSize: 11, alignment: 'right', margin: [0, 6, 6, 6] },
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

  // ── Poznámka ───────────────────────────────────────────────────────────────
  const noteSection: any[] = []
  if (order.note) {
    noteSection.push({
      text: [{ text: 'Poznámka: ', bold: true, fontSize: 8.5 }, { text: order.note, style: 'note' }],
      margin: [0, 4, 0, 0],
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
          partyBlock('Prodejce', ourParty),
          { width: 20, text: '' },
          partyBlock('Zákazník / Doručení', customer),
        ],
        margin: [0, 0, 0, 14],
      },
      itemsTable,
      ...totalSection,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 525, y2: 0, lineWidth: 0.3, lineColor: C.border }] },
      { text: [{ text: 'Způsob platby: ', bold: true, fontSize: 8.5 }, { text: 'Stripe (online platební karta)', fontSize: 8.5 }], margin: [0, 6, 0, 2] },
      ...noteSection,
    ],
    footer: ((_currentPage: number, _pageCount: number) => ({
      stack: [
        { canvas: [{ type: 'rect', x: 0, y: 0, w: 595, h: 20, color: C.accent }] },
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

  const blob: Blob = await (pdfMake.createPdf(dd).getBlob() as Promise<Blob>)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
