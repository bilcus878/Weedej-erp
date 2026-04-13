// Generování PDF dokladů
// Podporuje: Objednávky, Příjemky, Výdejky, Faktury
// Včetně STORNO vodoznaku

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Company {
  name: string
  address: string
  ico: string
  dic: string
  phone?: string
  email?: string
}

interface PurchaseOrderData {
  orderNumber: string
  orderDate: string
  expectedDate?: string
  supplierName: string
  supplierAddress?: string
  supplierICO?: string
  supplierDIC?: string
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

interface ReceiptData {
  receiptNumber: string
  receiptDate: string
  supplierName: string
  supplierAddress?: string
  supplierICO?: string
  supplierDIC?: string
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

interface DeliveryNoteData {
  noteNumber: string
  noteDate: string
  customerName: string
  customerAddress?: string
  customerEmail?: string
  customerPhone?: string
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

// Naše společnost (statická data)
const COMPANY: Company = {
  name: 'Vaše Firma s.r.o.',
  address: 'Hlavní 123, 100 00 Praha 1',
  ico: '12345678',
  dic: 'CZ12345678',
  phone: '+420 123 456 789',
  email: 'info@firma.cz'
}

/**
 * Přidá vodoznak STORNO přes celou stránku
 */
function addStornoWatermark(doc: jsPDF, reason?: string, date?: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Velký šedý nápis STORNO uprostřed stránky
  doc.saveGraphicsState()
  doc.setGState(new (doc.GState as any)({ opacity: 0.2 }))
  doc.setTextColor(255, 0, 0)
  doc.setFontSize(80)

  // Rotace textu o 45 stupňů
  const centerX = pageWidth / 2
  const centerY = pageHeight / 2
  doc.text('STORNO', centerX, centerY, {
    angle: 45,
    align: 'center'
  })

  doc.restoreGraphicsState()

  // Červený box v patičce s detaily storna
  if (reason || date) {
    const footerY = pageHeight - 20
    doc.setFillColor(254, 226, 226) // bg-red-100
    doc.rect(10, footerY - 15, pageWidth - 20, 20, 'F')

    doc.setTextColor(127, 29, 29) // text-red-900
    doc.setFontSize(10)
    let footerText = 'STORNOVÁNO'
    if (date) {
      footerText += ` dne ${new Date(date).toLocaleDateString('cs-CZ')}`
    }
    if (reason) {
      footerText += ` | Důvod: ${reason}`
    }
    doc.text(footerText, pageWidth / 2, footerY - 5, { align: 'center' })
  }
}

/**
 * Přidá hlavičku s informacemi o firmě
 */
function addHeader(doc: jsPDF, title: string) {
  doc.setFontSize(20)
  doc.setTextColor(0, 0, 0)
  doc.text(title, 105, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(COMPANY.name, 105, 28, { align: 'center' })
  doc.text(COMPANY.address, 105, 33, { align: 'center' })
  doc.text(`IČO: ${COMPANY.ico} | DIČ: ${COMPANY.dic}`, 105, 38, { align: 'center' })

  if (COMPANY.phone || COMPANY.email) {
    const contact = [COMPANY.phone, COMPANY.email].filter(Boolean).join(' | ')
    doc.text(contact, 105, 43, { align: 'center' })
  }

  // Čára pod hlavičkou
  doc.setLineWidth(0.5)
  doc.line(10, 48, 200, 48)

  return 55 // Vrátí Y pozici pro další obsah
}

/**
 * Generuje PDF pro objednávku
 */
export function generatePurchaseOrderPDF(data: PurchaseOrderData): Blob {
  const doc = new jsPDF()

  // Hlavička
  let yPos = addHeader(doc, 'OBJEDNÁVKA')

  // Informace o objednávce
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text(`Číslo objednávky: ${data.orderNumber}`, 10, yPos)
  yPos += 7
  doc.text(`Datum objednání: ${new Date(data.orderDate).toLocaleDateString('cs-CZ')}`, 10, yPos)
  yPos += 7

  if (data.expectedDate) {
    doc.text(`Očekávané dodání: ${new Date(data.expectedDate).toLocaleDateString('cs-CZ')}`, 10, yPos)
    yPos += 7
  }

  yPos += 5

  // Dodavatel
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Dodavatel:', 10, yPos)
  doc.setFont('helvetica', 'normal')
  yPos += 6
  doc.text(data.supplierName, 10, yPos)
  yPos += 5

  if (data.supplierAddress) {
    doc.text(data.supplierAddress, 10, yPos)
    yPos += 5
  }

  if (data.supplierICO || data.supplierDIC) {
    const ids = []
    if (data.supplierICO) ids.push(`IČO: ${data.supplierICO}`)
    if (data.supplierDIC) ids.push(`DIČ: ${data.supplierDIC}`)
    doc.text(ids.join(' | '), 10, yPos)
    yPos += 5
  }

  yPos += 5

  // Tabulka položek
  const tableData = data.items.map(item => [
    item.productName,
    `${item.quantity}`,
    item.unit,
    `${item.price.toLocaleString('cs-CZ')} Kč`,
    `${(item.quantity * item.price).toLocaleString('cs-CZ')} Kč`
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Zboží', 'Množství', 'Jednotka', 'Cena/ks', 'Celkem']],
    body: tableData,
    foot: [['', '', '', 'CELKEM:', `${data.totalAmount.toLocaleString('cs-CZ')} Kč`]],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' }
  })

  // Poznámka
  if (data.note) {
    yPos = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Poznámka: ${data.note}`, 10, yPos)
  }

  // STORNO vodoznak (pokud je stornováno)
  if (data.status === 'storno') {
    addStornoWatermark(doc, data.stornoReason, data.stornoAt)
  }

  return doc.output('blob')
}

/**
 * Generuje PDF pro příjemku
 */
export function generateReceiptPDF(data: ReceiptData): Blob {
  const doc = new jsPDF()

  // Hlavička
  let yPos = addHeader(doc, 'PŘÍJEMKA')

  // Informace o příjemce
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text(`Číslo příjemky: ${data.receiptNumber}`, 10, yPos)
  yPos += 7
  doc.text(`Datum příjmu: ${new Date(data.receiptDate).toLocaleDateString('cs-CZ')}`, 10, yPos)
  yPos += 10

  // Dodavatel
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Dodavatel:', 10, yPos)
  doc.setFont('helvetica', 'normal')
  yPos += 6
  doc.text(data.supplierName, 10, yPos)
  yPos += 5

  if (data.supplierAddress) {
    doc.text(data.supplierAddress, 10, yPos)
    yPos += 5
  }

  if (data.supplierICO || data.supplierDIC) {
    const ids = []
    if (data.supplierICO) ids.push(`IČO: ${data.supplierICO}`)
    if (data.supplierDIC) ids.push(`DIČ: ${data.supplierDIC}`)
    doc.text(ids.join(' | '), 10, yPos)
    yPos += 5
  }

  yPos += 5

  // Tabulka položek
  const tableData = data.items.map(item => [
    item.productName,
    `${item.quantity}`,
    item.unit,
    `${item.price.toLocaleString('cs-CZ')} Kč`,
    `${(item.quantity * item.price).toLocaleString('cs-CZ')} Kč`
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Zboží', 'Množství', 'Jednotka', 'Nákupní cena', 'Celkem']],
    body: tableData,
    foot: [['', '', '', 'CELKEM:', `${data.totalAmount.toLocaleString('cs-CZ')} Kč`]],
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] },
    footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' }
  })

  // Poznámka
  if (data.note) {
    yPos = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Poznámka: ${data.note}`, 10, yPos)
  }

  // STORNO vodoznak (pokud je stornováno)
  if (data.status === 'storno') {
    addStornoWatermark(doc, data.stornoReason, data.stornoAt)
  }

  return doc.output('blob')
}

/**
 * Generuje PDF pro výdejku
 */
export function generateDeliveryNotePDF(data: DeliveryNoteData): Blob {
  const doc = new jsPDF()

  // Hlavička
  let yPos = addHeader(doc, 'VÝDEJKA')

  // Informace o výdejce
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.text(`Číslo výdejky: ${data.noteNumber}`, 10, yPos)
  yPos += 7
  doc.text(`Datum výdeje: ${new Date(data.noteDate).toLocaleDateString('cs-CZ')}`, 10, yPos)
  yPos += 10

  // Zákazník
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Zákazník:', 10, yPos)
  doc.setFont('helvetica', 'normal')
  yPos += 6
  doc.text(data.customerName, 10, yPos)
  yPos += 5

  if (data.customerAddress) {
    doc.text(data.customerAddress, 10, yPos)
    yPos += 5
  }

  if (data.customerEmail || data.customerPhone) {
    const contact = []
    if (data.customerEmail) contact.push(data.customerEmail)
    if (data.customerPhone) contact.push(data.customerPhone)
    doc.text(contact.join(' | '), 10, yPos)
    yPos += 5
  }

  yPos += 5

  // Tabulka položek
  const tableData = data.items.map(item => [
    item.productName,
    `${item.quantity}`,
    item.unit,
    `${item.price.toLocaleString('cs-CZ')} Kč`,
    `${(item.quantity * item.price).toLocaleString('cs-CZ')} Kč`
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Zboží', 'Množství', 'Jednotka', 'Cena/ks', 'Celkem']],
    body: tableData,
    foot: [['', '', '', 'CELKEM:', `${data.totalAmount.toLocaleString('cs-CZ')} Kč`]],
    theme: 'striped',
    headStyles: { fillColor: [249, 115, 22] }, // Orange color
    footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' }
  })

  // Poznámka
  if (data.note) {
    yPos = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Poznámka: ${data.note}`, 10, yPos)
  }

  // STORNO vodoznak (pokud je stornováno)
  if (data.status === 'storno') {
    addStornoWatermark(doc, data.stornoReason, data.stornoAt)
  }

  return doc.output('blob')
}

/**
 * Otevře PDF v nové záložce prohlížeče
 */
export function openPDFInNewTab(blob: Blob) {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  // URL se automaticky uvolní po zavření záložky
}
