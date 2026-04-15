// Generování PDF dokladů – Weedej ERP
// Podporuje: Objednávky, Příjemky, Výdejky
// Jednotný design, česká diakritika (Roboto), dynamické firemní údaje

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

interface Party {
  name: string
  address?: string
  ico?: string
  dic?: string
  phone?: string
  email?: string
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
  items: Array<{
    productName: string
    quantity: number
    unit: string
    price: number
  }>
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
  items: Array<{
    productName: string
    quantity: number
    unit: string
    price: number
  }>
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
  items: Array<{
    productName: string
    quantity: number
    unit: string
    price: number
  }>
  totalAmount: number
  note?: string
  status?: string
  stornoReason?: string
  stornoAt?: string
}

// ─── Barvy ────────────────────────────────────────────────────────────────────

const C = {
  order:        [124, 58, 237] as [number, number, number],  // violet
  receipt:      [22, 163, 74]  as [number, number, number],  // green
  delivery:     [234, 88, 12]  as [number, number, number],  // orange
  text:         [17, 24, 39]   as [number, number, number],  // gray-900
  muted:        [107, 114, 128] as [number, number, number], // gray-500
  light:        [243, 244, 246] as [number, number, number], // gray-100
  white:        [255, 255, 255] as [number, number, number],
  red:          [220, 38, 38]  as [number, number, number],
  redLight:     [254, 226, 226] as [number, number, number],
  redDark:      [127, 29, 29]  as [number, number, number],
}

// ─── Font loading ─────────────────────────────────────────────────────────────

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
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal', 'Identity-H')
  doc.addFileToVFS('Roboto-Bold.ttf', font.bold)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold', 'Identity-H')
  doc.setFont('Roboto', 'normal')
}

// ─── Pomocné funkce ───────────────────────────────────────────────────────────

/**
 * Nakreslí záhlaví dokumentu.
 * Vrátí Y pozici pro další obsah.
 */
function drawHeader(
  doc: jsPDF,
  title: string,
  docLabel: string,
  docValue: string,
  color: [number, number, number],
  settings: CompanySettings
): number {
  const W = doc.internal.pageSize.getWidth()

  // Barevný pruh nahoře
  doc.setFillColor(...color)
  doc.rect(0, 0, W, 7, 'F')

  // Název firmy
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...C.text)
  doc.text(settings.companyName || '', 15, 17)

  // Firemní detaily pod názvem
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

  // Název dokumentu vpravo (velký)
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...color)
  doc.text(title, W - 15, 19, { align: 'right' })

  // Číslo dokumentu pod názvem
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.muted)
  doc.text(`${docLabel}: ${docValue}`, W - 15, 26, { align: 'right' })

  // Oddělovací čára
  const lineY = 36
  doc.setDrawColor(...color)
  doc.setLineWidth(0.4)
  doc.line(15, lineY, W - 15, lineY)

  return lineY + 7
}

/**
 * Nakreslí sekci s informacemi o straně (dodavatel/zákazník).
 * Vrátí nejvyšší Y po sekci.
 */
function drawPartyBlock(
  doc: jsPDF,
  label: string,
  party: Party,
  x: number,
  startY: number,
  blockWidth: number,
  color: [number, number, number]
): number {
  let y = startY

  // Nadpis bloku
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...color)
  doc.text(label.toUpperCase(), x, y)
  y += 4.5

  // Jméno/název
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...C.text)
  if (party.name) {
    const nameLines = doc.splitTextToSize(party.name, blockWidth)
    nameLines.forEach((line: string) => { doc.text(line, x, y); y += 4.5 })
  }

  // Detaily
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

/**
 * Nakreslí patičku stránky.
 */
function drawFooter(doc: jsPDF, color: [number, number, number]) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  doc.setFillColor(...color)
  doc.rect(0, H - 8, W, 8, 'F')
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.white)
  doc.text('Vygenerováno systémem Weedej ERP', W / 2, H - 3, { align: 'center' })
}

/**
 * Přidá vodoznak STORNO přes celou stránku.
 */
function addStornoWatermark(doc: jsPDF, reason?: string, date?: string) {
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  doc.saveGraphicsState()
  doc.setGState(new (doc as any).GState({ opacity: 0.1 }))
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(72)
  doc.setTextColor(...C.red)
  doc.text('STORNO', W / 2, H / 2, { align: 'center', angle: 45 })
  doc.restoreGraphicsState()

  if (reason || date) {
    const fy = H - 18
    doc.setFillColor(...C.redLight)
    doc.rect(15, fy - 7, W - 30, 12, 'F')
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.redDark)
    let msg = 'STORNOVÁNO'
    if (date) msg += ` dne ${new Date(date).toLocaleDateString('cs-CZ')}`
    if (reason) msg += ` | Důvod: ${reason}`
    doc.text(msg, W / 2, fy, { align: 'center' })
  }
}

/**
 * Naformátuje číslo jako českou cenu.
 */
function czk(value: number): string {
  return `${value.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`
}

// ─── Veřejné API ──────────────────────────────────────────────────────────────

/**
 * Generuje PDF pro objednávku (Purchase Order).
 */
export async function generatePurchaseOrderPDF(
  data: PurchaseOrderData,
  settings: CompanySettings
): Promise<Blob> {
  const font = await loadFont()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  registerFont(doc, font)

  const color = C.order

  // Záhlaví
  let yPos = drawHeader(doc, 'OBJEDNÁVKA', 'Č. objednávky', data.orderNumber, color, settings)

  // Datum objednávky a očekávané dodání
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.muted)
  doc.text(`Datum objednání: ${new Date(data.orderDate).toLocaleDateString('cs-CZ')}`, 15, yPos)
  if (data.expectedDate) {
    doc.text(
      `Očekávané dodání: ${new Date(data.expectedDate).toLocaleDateString('cs-CZ')}`,
      W - 15, yPos, { align: 'right' }
    )
  }
  yPos += 8

  // Sekce stran – naše firma vlevo, dodavatel vpravo
  const ourCompany: Party = {
    name: settings.companyName || '',
    address: settings.address,
    ico: settings.ico,
    dic: settings.dic,
    phone: settings.phone,
    email: settings.email,
  }
  const supplier: Party = {
    name: data.supplierName,
    address: data.supplierAddress,
    ico: data.supplierICO,
    dic: data.supplierDIC,
    phone: data.supplierPhone,
    email: data.supplierEmail,
  }

  const blockW = (W - 30 - 10) / 2
  const yLeft = drawPartyBlock(doc, 'Odběratel (naše firma)', ourCompany, 15, yPos, blockW, color)
  const yRight = drawPartyBlock(doc, 'Dodavatel', supplier, 15 + blockW + 10, yPos, blockW, color)
  yPos = Math.max(yLeft, yRight) + 6

  // Tabulka položek
  const tableRows = data.items.map((item, idx) => [
    String(idx + 1),
    item.productName,
    `${item.quantity} ${item.unit}`,
    czk(item.price),
    czk(item.quantity * item.price),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Zboží / Služba', 'Množství', 'Cena/ks bez DPH', 'Celkem bez DPH']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      textColor: C.text,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: color,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: C.light },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 36 },
      4: { halign: 'right', cellWidth: 36 },
    },
    margin: { left: 15, right: 15 },
  })

  yPos = (doc as any).lastAutoTable.finalY + 5

  // Celková částka
  doc.setFillColor(...C.light)
  doc.rect(W - 15 - 80, yPos, 80, 9, 'F')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.text)
  doc.text('Celkem bez DPH:', W - 15 - 80 + 4, yPos + 6)
  doc.setTextColor(...color)
  doc.text(czk(data.totalAmount), W - 15, yPos + 6, { align: 'right' })
  yPos += 14

  // Poznámka
  if (data.note) {
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text(`Poznámka: ${data.note}`, 15, yPos)
    yPos += 6
  }

  // STORNO vodoznak
  if (data.status === 'storno') {
    addStornoWatermark(doc, data.stornoReason, data.stornoAt)
  }

  drawFooter(doc, color)
  return doc.output('blob')
}

/**
 * Generuje PDF pro příjemku.
 */
export async function generateReceiptPDF(
  data: ReceiptData,
  settings: CompanySettings
): Promise<Blob> {
  const font = await loadFont()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  registerFont(doc, font)

  const color = C.receipt

  // Záhlaví
  let yPos = drawHeader(doc, 'PŘÍJEMKA', 'Č. příjemky', data.receiptNumber, color, settings)

  // Datum
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.muted)
  doc.text(`Datum příjmu: ${new Date(data.receiptDate).toLocaleDateString('cs-CZ')}`, 15, yPos)
  yPos += 8

  // Sekce stran
  const ourCompany: Party = {
    name: settings.companyName || '',
    address: settings.address,
    ico: settings.ico,
    dic: settings.dic,
    phone: settings.phone,
    email: settings.email,
  }
  const supplier: Party = {
    name: data.supplierName,
    address: data.supplierAddress,
    ico: data.supplierICO,
    dic: data.supplierDIC,
    phone: data.supplierPhone,
    email: data.supplierEmail,
  }

  const blockW = (W - 30 - 10) / 2
  const yLeft = drawPartyBlock(doc, 'Příjemce (naše firma)', ourCompany, 15, yPos, blockW, color)
  const yRight = drawPartyBlock(doc, 'Dodavatel', supplier, 15 + blockW + 10, yPos, blockW, color)
  yPos = Math.max(yLeft, yRight) + 6

  // Tabulka položek
  const tableRows = data.items.map((item, idx) => [
    String(idx + 1),
    item.productName,
    `${item.quantity} ${item.unit}`,
    czk(item.price),
    czk(item.quantity * item.price),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Zboží / Služba', 'Množství', 'Nákupní cena/ks', 'Celkem']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      textColor: C.text,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: color,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: C.light },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 36 },
      4: { halign: 'right', cellWidth: 36 },
    },
    margin: { left: 15, right: 15 },
  })

  yPos = (doc as any).lastAutoTable.finalY + 5

  // Celková částka
  doc.setFillColor(...C.light)
  doc.rect(W - 15 - 80, yPos, 80, 9, 'F')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.text)
  doc.text('Celkem:', W - 15 - 80 + 4, yPos + 6)
  doc.setTextColor(...color)
  doc.text(czk(data.totalAmount), W - 15, yPos + 6, { align: 'right' })
  yPos += 14

  // Poznámka
  if (data.note) {
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text(`Poznámka: ${data.note}`, 15, yPos)
    yPos += 6
  }

  // STORNO vodoznak
  if (data.status === 'storno') {
    addStornoWatermark(doc, data.stornoReason, data.stornoAt)
  }

  drawFooter(doc, color)
  return doc.output('blob')
}

/**
 * Generuje PDF pro výdejku.
 */
export async function generateDeliveryNotePDF(
  data: DeliveryNoteData,
  settings: CompanySettings
): Promise<Blob> {
  const font = await loadFont()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  registerFont(doc, font)

  const color = C.delivery

  // Záhlaví
  let yPos = drawHeader(doc, 'VÝDEJKA', 'Č. výdejky', data.noteNumber, color, settings)

  // Datum
  doc.setFont('Roboto', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.muted)
  doc.text(`Datum výdeje: ${new Date(data.noteDate).toLocaleDateString('cs-CZ')}`, 15, yPos)
  yPos += 8

  // Sekce stran
  const ourCompany: Party = {
    name: settings.companyName || '',
    address: settings.address,
    ico: settings.ico,
    dic: settings.dic,
    phone: settings.phone,
    email: settings.email,
  }
  const customer: Party = {
    name: data.customerName,
    address: data.customerAddress,
    ico: data.customerICO,
    dic: data.customerDIC,
    phone: data.customerPhone,
    email: data.customerEmail,
  }

  const blockW = (W - 30 - 10) / 2
  const yLeft = drawPartyBlock(doc, 'Vydávající (naše firma)', ourCompany, 15, yPos, blockW, color)
  const yRight = drawPartyBlock(doc, 'Odběratel', customer, 15 + blockW + 10, yPos, blockW, color)
  yPos = Math.max(yLeft, yRight) + 6

  // Tabulka položek
  const tableRows = data.items.map((item, idx) => [
    String(idx + 1),
    item.productName,
    `${item.quantity} ${item.unit}`,
    czk(item.price),
    czk(item.quantity * item.price),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Zboží / Služba', 'Množství', 'Cena/ks', 'Celkem']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      textColor: C.text,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: color,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: C.light },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 36 },
      4: { halign: 'right', cellWidth: 36 },
    },
    margin: { left: 15, right: 15 },
  })

  yPos = (doc as any).lastAutoTable.finalY + 5

  // Celková částka
  doc.setFillColor(...C.light)
  doc.rect(W - 15 - 80, yPos, 80, 9, 'F')
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.text)
  doc.text('Celkem:', W - 15 - 80 + 4, yPos + 6)
  doc.setTextColor(...color)
  doc.text(czk(data.totalAmount), W - 15, yPos + 6, { align: 'right' })
  yPos += 14

  // Poznámka
  if (data.note) {
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text(`Poznámka: ${data.note}`, 15, yPos)
    yPos += 6
  }

  // STORNO vodoznak
  if (data.status === 'storno') {
    addStornoWatermark(doc, data.stornoReason, data.stornoAt)
  }

  drawFooter(doc, color)
  return doc.output('blob')
}

/**
 * Otevře PDF blob v nové záložce prohlížeče.
 */
export function openPDFInNewTab(blob: Blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
