// Generování PDF faktur – Weedej ERP
// Daňový doklad dle § 26–35 zákona č. 235/2004 Sb. (zákon o DPH)
// Česká diakritika (Roboto), plný VAT rozptyl, DUZP, legální náležitosti

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
  price: number | null           // cena bez DPH na kus
  vatRate?: number               // sazba DPH v % (0, 12, 21)
  vatAmount?: number             // DPH částka na řádek
  priceWithVat?: number          // cena s DPH na kus
}

export interface Invoice {
  transactionCode: string
  transactionDate: string
  duzp?: string                  // Datum uskutečnění zdanitelného plnění
  dueDate?: string               // Datum splatnosti
  totalAmount: number            // celkem s DPH
  totalAmountWithoutVat?: number // celkem bez DPH
  totalVatAmount?: number        // celkem DPH
  paymentType: string            // 'card' | 'transfer' | 'cash'
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
  invoice:  [37, 99, 235]   as [number, number, number],  // blue-600
  text:     [17, 24, 39]    as [number, number, number],
  muted:    [107, 114, 128] as [number, number, number],
  light:    [243, 244, 246] as [number, number, number],
  white:    [255, 255, 255] as [number, number, number],
  red:      [220, 38, 38]   as [number, number, number],
  redLight: [254, 226, 226] as [number, number, number],
  redDark:  [127, 29, 29]   as [number, number, number],
}

// ─── Font loading (stejná logika jako pdfGenerator) ───────────────────────────

let fontCache: { regular: string; bold: string } | null = null

async function loadFont(): Promise<{ regular: string; bold: string }> {
  if (fontCache) return fontCache
  const toBase64 = (buf: ArrayBuffer): string => {
    const bytes = new Uint8Array(buf)
    let bin = ''
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i])
    return btoa(bin)
  }
  const [r, b] = await Promise.all([
    fetch('/fonts/Roboto-Regular.ttf').then(res => {
      if (!res.ok) throw new Error('Roboto-Regular.ttf nenalezeno v /public/fonts/')
      return res.arrayBuffer()
    }),
    fetch('/fonts/Roboto-Bold.ttf').then(res => {
      if (!res.ok) throw new Error('Roboto-Bold.ttf nenalezeno v /public/fonts/')
      return res.arrayBuffer()
    }),
  ])
  fontCache = { regular: toBase64(r), bold: toBase64(b) }
  return fontCache
}

function registerFont(doc: jsPDF, font: { regular: string; bold: string }) {
  doc.addFileToVFS('Roboto-Regular.ttf', font.regular)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', font.bold)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  doc.setFont('Roboto', 'normal')
}

// ─── Pomocné funkce ───────────────────────────────────────────────────────────

function czk(value: number): string {
  return `${value.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`
}

function drawHeader(
  doc: jsPDF,
  invoice: Invoice,
  settings: CompanySettings
): number {
  const W = doc.internal.pageSize.getWidth()
  const color = C.invoice

  // Barevný pruh nahoře
  doc.setFillColor(...color)
  doc.rect(0, 0, W, 7, 'F')

  // Název firmy vlevo
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...C.text)
  doc.text(settings.companyName || '', 15, 17)

  // Firemní detaily
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.muted)
  let y = 22
  if (settings.address) { doc.text(settings.address, 15, y); y += 4 }
  const ids: string[] = []
  if (settings.ico) ids.push(`IČO: ${settings.ico}`)
  if (settings.dic) ids.push(`DIČ: ${settings.dic}`)
  if (ids.length) { doc.text(ids.join('   '), 15, y); y += 4 }
  const contacts: string[] = []
  if (settings.phone) contacts.push(settings.phone)
  if (settings.email) contacts.push(settings.email)
  if (contacts.length) { doc.text(contacts.join('   '), 15, y) }

  // Název dokumentu vpravo
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...color)
  doc.text('FAKTURA', W - 15, 19, { align: 'right' })

  // Číslo faktury
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.muted)
  doc.text(`Č. faktury: ${invoice.transactionCode}`, W - 15, 26, { align: 'right' })

  // Oddělovací čára
  const lineY = 36
  doc.setDrawColor(...color)
  doc.setLineWidth(0.4)
  doc.line(15, lineY, W - 15, lineY)

  return lineY + 7
}

function drawPartyBlock(
  doc: jsPDF,
  label: string,
  party: InvoiceCustomer,
  x: number,
  startY: number,
  blockWidth: number,
  color: [number, number, number]
): number {
  let y = startY

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...color)
  doc.text(label.toUpperCase(), x, y)
  y += 4.5

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...C.text)
  if (party.name) {
    const nameLines = doc.splitTextToSize(party.name, blockWidth)
    nameLines.forEach((line: string) => { doc.text(line, x, y); y += 4.5 })
  }

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.muted)

  if (party.address) {
    const addrLines = doc.splitTextToSize(party.address, blockWidth)
    addrLines.forEach((line: string) => { doc.text(line, x, y); y += 4 })
  }
  const ids: string[] = []
  if (party.ico) ids.push(`IČO: ${party.ico}`)
  if (party.dic) ids.push(`DIČ: ${party.dic}`)
  if (ids.length) { doc.text(ids.join('   '), x, y); y += 4 }
  if (party.phone) { doc.text(`Tel: ${party.phone}`, x, y); y += 4 }
  if (party.email) { doc.text(`Email: ${party.email}`, x, y); y += 4 }

  return y
}

function drawFooter(doc: jsPDF) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  doc.setFillColor(...C.invoice)
  doc.rect(0, H - 8, W, 8, 'F')
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.white)
  doc.text('Vygenerováno systémem Weedej ERP', W / 2, H - 3, { align: 'center' })
}

function addStornoWatermark(doc: jsPDF) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  doc.saveGraphicsState()
  doc.setGState(new (doc as any).GState({ opacity: 0.1 }))
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(72)
  doc.setTextColor(...C.red)
  doc.text('STORNO', W / 2, H / 2, { align: 'center', angle: 45 })
  doc.restoreGraphicsState()
}

// ─── Hlavní funkce ────────────────────────────────────────────────────────────

/**
 * Generuje PDF faktury / daňového dokladu.
 * Splňuje náležitosti dle § 26–35 zákona č. 235/2004 Sb. (zákon o DPH).
 */
export async function generateInvoicePDF(
  invoice: Invoice,
  settings: CompanySettings
): Promise<void> {
  const font = await loadFont()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  registerFont(doc, font)

  const color = C.invoice
  const isVatPayer = settings.isVatPayer !== false

  // ── Záhlaví ────────────────────────────────────────────────────────────────
  let yPos = drawHeader(doc, invoice, settings)

  // ── Daty dokumentu ─────────────────────────────────────────────────────────
  const issueDate = new Date(invoice.transactionDate).toLocaleDateString('cs-CZ')
  const duzpDate = invoice.duzp
    ? new Date(invoice.duzp).toLocaleDateString('cs-CZ')
    : issueDate
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString('cs-CZ')
    : null

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.muted)
  const dateFields: string[] = [
    `Datum vystavení: ${issueDate}`,
    `DUZP: ${duzpDate}`,
  ]
  if (dueDate) dateFields.push(`Datum splatnosti: ${dueDate}`)
  doc.text(dateFields.join('     '), 15, yPos)
  yPos += 9

  // ── Sekce stran ────────────────────────────────────────────────────────────
  const ourParty: InvoiceCustomer = {
    name: settings.companyName || '',
    address: settings.address,
    ico: settings.ico,
    dic: settings.dic,
    phone: settings.phone,
    email: settings.email,
  }

  const customerData: InvoiceCustomer = {
    name:    invoice.customer?.name    || invoice.customerName    || '',
    address: invoice.customer?.address || invoice.customerAddress,
    ico:     invoice.customer?.ico     || invoice.customerICO,
    dic:     invoice.customer?.dic     || invoice.customerDIC,
    phone:   invoice.customer?.phone   || invoice.customerPhone,
    email:   invoice.customer?.email   || invoice.customerEmail,
  }

  const blockW = (W - 30 - 10) / 2
  const yLeft  = drawPartyBlock(doc, 'Dodavatel', ourParty, 15, yPos, blockW, color)
  const yRight = drawPartyBlock(doc, 'Odběratel', customerData, 15 + blockW + 10, yPos, blockW, color)
  yPos = Math.max(yLeft, yRight) + 6

  // ── Tabulka položek ────────────────────────────────────────────────────────
  const tableRows = invoice.items.map((item, idx) => {
    const name     = item.product?.name || item.productName || '(Neznámý produkt)'
    const qty      = `${item.quantity} ${item.unit}`
    const unitNet  = item.price ?? 0
    const vatRate  = item.vatRate ?? 0
    const lineNet  = unitNet * item.quantity
    const vatAmt   = item.vatAmount ?? (lineNet * vatRate / 100)
    const lineGross = item.priceWithVat != null
      ? item.priceWithVat * item.quantity
      : lineNet + vatAmt

    if (isVatPayer) {
      return [
        String(idx + 1),
        name,
        qty,
        czk(unitNet),
        `${vatRate} %`,
        czk(vatAmt),
        czk(lineGross),
      ]
    } else {
      return [
        String(idx + 1),
        name,
        qty,
        czk(unitNet),
        czk(lineNet),
      ]
    }
  })

  const headVat  = ['#', 'Zboží / Služba', 'Množství', 'Jedn. cena bez DPH', 'Sazba DPH', 'DPH', 'Celkem s DPH']
  const headNoVat = ['#', 'Zboží / Služba', 'Množství', 'Cena/ks', 'Celkem']

  const colStylesVat = {
    0: { halign: 'center' as const, cellWidth: 8 },
    2: { halign: 'center' as const, cellWidth: 22 },
    3: { halign: 'right'  as const, cellWidth: 34 },
    4: { halign: 'center' as const, cellWidth: 18 },
    5: { halign: 'right'  as const, cellWidth: 26 },
    6: { halign: 'right'  as const, cellWidth: 30 },
  }
  const colStylesNoVat = {
    0: { halign: 'center' as const, cellWidth: 10 },
    2: { halign: 'center' as const, cellWidth: 28 },
    3: { halign: 'right'  as const, cellWidth: 36 },
    4: { halign: 'right'  as const, cellWidth: 36 },
  }

  autoTable(doc, {
    startY: yPos,
    head: [isVatPayer ? headVat : headNoVat],
    body: tableRows,
    theme: 'grid',
    styles: {
      font: 'Roboto',
      fontSize: 8,
      textColor: C.text,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: color,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: C.light },
    columnStyles: isVatPayer ? colStylesVat : colStylesNoVat,
    margin: { left: 15, right: 15 },
  })

  yPos = (doc as any).lastAutoTable.finalY + 5

  // ── Rekapitulace DPH (jen pro plátce) ─────────────────────────────────────
  if (isVatPayer) {
    // Spočítej souhrn DPH dle sazeb
    const vatByRate: Record<number, { base: number; vat: number; total: number }> = {}
    invoice.items.forEach(item => {
      const rate    = item.vatRate ?? 0
      const unitNet = item.price ?? 0
      const lineNet = unitNet * item.quantity
      const vatAmt  = item.vatAmount ?? (lineNet * rate / 100)
      const lineGross = item.priceWithVat != null
        ? item.priceWithVat * item.quantity
        : lineNet + vatAmt
      if (!vatByRate[rate]) vatByRate[rate] = { base: 0, vat: 0, total: 0 }
      vatByRate[rate].base  += lineNet
      vatByRate[rate].vat   += vatAmt
      vatByRate[rate].total += lineGross
    })

    const totalNet   = invoice.totalAmountWithoutVat
      ?? Object.values(vatByRate).reduce((s, r) => s + r.base, 0)
    const totalVat   = invoice.totalVatAmount
      ?? Object.values(vatByRate).reduce((s, r) => s + r.vat, 0)
    const totalGross = invoice.totalAmount

    // Tabulka rekapitulace DPH
    const vatRows = Object.entries(vatByRate).map(([rate, v]) => [
      `${rate} %`,
      czk(v.base),
      czk(v.vat),
      czk(v.total),
    ])

    // Nadpis rekapitulace
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...C.muted)
    doc.text('REKAPITULACE DPH', W - 15 - 105, yPos + 4)
    yPos += 2

    autoTable(doc, {
      startY: yPos,
      head: [['Sazba DPH', 'Základ daně', 'Výše DPH', 'Celkem s DPH']],
      body: vatRows,
      theme: 'grid',
      styles: {
        font: 'Roboto',
        fontSize: 8,
        textColor: C.text,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [71, 85, 105] as [number, number, number],
        textColor: C.white,
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 22 },
        1: { halign: 'right',  cellWidth: 27 },
        2: { halign: 'right',  cellWidth: 27 },
        3: { halign: 'right',  cellWidth: 29 },
      },
      margin: { left: W - 15 - 105, right: 15 },
      tableWidth: 105,
    })

    yPos = (doc as any).lastAutoTable.finalY + 3

    // Souhrny vpravo
    const summaryRows: [string, string, boolean][] = [
      ['Základ daně celkem:', czk(totalNet), false],
      ['DPH celkem:', czk(totalVat), false],
      ['Celkem k úhradě:', czk(totalGross), true],
    ]

    summaryRows.forEach(([label, value, bold]) => {
      const boxH = bold ? 10 : 8
      if (bold) {
        doc.setFillColor(...color)
        doc.rect(W - 15 - 105, yPos, 105, boxH, 'F')
        doc.setTextColor(...C.white)
      } else {
        doc.setFillColor(...C.light)
        doc.rect(W - 15 - 105, yPos, 105, boxH, 'F')
        doc.setTextColor(...C.text)
      }
      doc.setFont('Roboto', bold ? 'bold' : 'normal')
      doc.setFontSize(bold ? 10 : 8.5)
      doc.text(label, W - 15 - 105 + 4, yPos + (bold ? 6.5 : 5.5))
      doc.text(value, W - 15, yPos + (bold ? 6.5 : 5.5), { align: 'right' })
      yPos += boxH + 1
    })

    yPos += 3
  } else {
    // Neplátce DPH – jen celková částka
    doc.setFillColor(...color)
    doc.rect(W - 15 - 105, yPos, 105, 10, 'F')
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...C.white)
    doc.text('Celkem k úhradě:', W - 15 - 105 + 4, yPos + 6.5)
    doc.text(czk(invoice.totalAmount), W - 15, yPos + 6.5, { align: 'right' })
    yPos += 15

    doc.setFont('Roboto', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text('Fyzická/právnická osoba není plátcem DPH.', 15, yPos)
    yPos += 6
  }

  // ── Platební údaje ─────────────────────────────────────────────────────────
  doc.setDrawColor(...C.light)
  doc.setLineWidth(0.3)
  doc.line(15, yPos, W - 15, yPos)
  yPos += 5

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.text)
  doc.text('Platební údaje', 15, yPos)
  yPos += 5

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.muted)

  const paymentLabel =
    invoice.paymentType === 'card'     ? 'Platební karta' :
    invoice.paymentType === 'transfer' ? 'Bankovní převod' :
    invoice.paymentType === 'cash'     ? 'Hotovost' :
    invoice.paymentType || 'Neuvedeno'

  doc.text(`Způsob platby: ${paymentLabel}`, 15, yPos)
  yPos += 4.5

  if (settings.bankAccount && (invoice.paymentType === 'transfer' || invoice.paymentType === 'card')) {
    doc.text(`Číslo účtu: ${settings.bankAccount}`, 15, yPos)
    yPos += 4.5
  }

  if (invoice.paymentType === 'transfer') {
    doc.text(`Variabilní symbol: ${invoice.transactionCode}`, 15, yPos)
    yPos += 4.5
  }

  // ── Podpisová linie ────────────────────────────────────────────────────────
  yPos += 8
  doc.setDrawColor(...C.muted)
  doc.setLineWidth(0.3)
  doc.line(15, yPos, 70, yPos)
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  doc.text('Podpis a razítko dodavatele', 15, yPos + 4)

  // ── STORNO vodoznak ────────────────────────────────────────────────────────
  if (invoice.status === 'storno') {
    addStornoWatermark(doc)
    // Červený rámeček s oznámením
    const H = doc.internal.pageSize.getHeight()
    const fy = H - 18
    doc.setFillColor(...C.redLight)
    doc.rect(15, fy - 7, W - 30, 12, 'F')
    doc.setFont('Roboto', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.redDark)
    doc.text('TENTO DOKLAD BYL STORNOVÁN', W / 2, fy, { align: 'center' })
  }

  drawFooter(doc)
  doc.output('dataurlnewwindow', { filename: `${invoice.transactionCode}.pdf` })
}
