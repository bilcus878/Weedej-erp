// Generování PDF faktur pomocí jsPDF
import { jsPDF } from 'jspdf'

interface InvoiceSettings {
  companyName: string
  ico: string
  dic: string
  address: string
  phone: string
  email: string
  bankAccount: string
}

interface InvoiceCustomer {
  name: string
  ico?: string
  dic?: string
  address?: string
  phone?: string
  email?: string
}

interface InvoiceItem {
  product?: {
    name: string
  } | null
  productName?: string
  quantity: number
  unit: string
  price: number | null
}

interface Invoice {
  transactionCode: string
  transactionDate: string
  totalAmount: number
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

// Helper funkce pro bezpečný výpis textu s fallback pokud není diakritika
function safeText(doc: jsPDF, text: string, x: number, y: number, options?: any) {
  try {
    doc.text(text, x, y, options)
  } catch (e) {
    // Fallback: nahraď problematické znaky
    const fallback = text
      .replace(/č/g, 'c').replace(/Č/g, 'C')
      .replace(/ď/g, 'd').replace(/Ď/g, 'D')
      .replace(/ě/g, 'e').replace(/Ě/g, 'E')
      .replace(/ň/g, 'n').replace(/Ň/g, 'N')
      .replace(/ř/g, 'r').replace(/Ř/g, 'R')
      .replace(/š/g, 's').replace(/Š/g, 'S')
      .replace(/ť/g, 't').replace(/Ť/g, 'T')
      .replace(/ů/g, 'u').replace(/Ů/g, 'U')
      .replace(/ý/g, 'y').replace(/Ý/g, 'Y')
      .replace(/ž/g, 'z').replace(/Ž/g, 'Z')
      .replace(/á/g, 'a').replace(/Á/g, 'A')
      .replace(/é/g, 'e').replace(/É/g, 'E')
      .replace(/í/g, 'i').replace(/Í/g, 'I')
      .replace(/ó/g, 'o').replace(/Ó/g, 'O')
      .replace(/ú/g, 'u').replace(/Ú/g, 'U')
    doc.text(fallback, x, y, options)
  }
}

export function generateInvoicePDF(invoice: Invoice, settings: InvoiceSettings) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Použij Courier font který podporuje širší znakovou sadu
    doc.setFont('courier', 'normal')

    // ========== HLAVIČKA ==========
    doc.setFontSize(22)
    doc.setFont('courier', 'bold')
    doc.text('FAKTURA', 105, 20, { align: 'center' })

    // Číslo faktury a datum
    doc.setFontSize(10)
    doc.setFont('courier', 'normal')
    const date = new Date(invoice.transactionDate)
    const formattedDate = date.toLocaleDateString('cs-CZ')
    doc.text(`Cislo faktury: ${invoice.transactionCode}`, 105, 30, { align: 'center' })
    doc.text(`Datum vystaveni: ${formattedDate}`, 105, 36, { align: 'center' })

    // ========== DODAVATEL (vlevo) ==========
    let yLeft = 50
    doc.setFontSize(11)
    doc.setFont('courier', 'bold')
    doc.text('Dodavatel:', 15, yLeft)

    yLeft += 6
    doc.setFontSize(9)
    doc.setFont('courier', 'normal')

    if (settings.companyName) {
      doc.text(settings.companyName, 15, yLeft)
      yLeft += 5
    }
    if (settings.address) {
      const addressLines = doc.splitTextToSize(settings.address, 85)
      addressLines.forEach((line: string) => {
        doc.text(line, 15, yLeft)
        yLeft += 4
      })
    }
    if (settings.ico) {
      doc.text(`IC: ${settings.ico}`, 15, yLeft)
      yLeft += 4
    }
    if (settings.dic) {
      doc.text(`DIC: ${settings.dic}`, 15, yLeft)
      yLeft += 4
    }
    if (settings.phone) {
      doc.text(`Tel: ${settings.phone}`, 15, yLeft)
      yLeft += 4
    }
    if (settings.email) {
      doc.text(`Email: ${settings.email}`, 15, yLeft)
    }

    // ========== ODBĚRATEL (vpravo) ==========
    if (invoice.customer || invoice.customerName) {
      let yRight = 50
      doc.setFontSize(11)
      doc.setFont('courier', 'bold')
      doc.text('Odberatel:', 110, yRight)

      yRight += 6
      doc.setFontSize(9)
      doc.setFont('courier', 'normal')

      const customerName = invoice.customer?.name || invoice.customerName || ''
      const customerAddress = invoice.customer?.address || invoice.customerAddress
      const customerICO = invoice.customer?.ico || invoice.customerICO
      const customerDIC = invoice.customer?.dic || invoice.customerDIC
      const customerPhone = invoice.customer?.phone || invoice.customerPhone
      const customerEmail = invoice.customer?.email || invoice.customerEmail

      if (customerName) {
        doc.text(customerName, 110, yRight)
        yRight += 5
      }
      if (customerAddress) {
        const addressLines = doc.splitTextToSize(customerAddress, 85)
        addressLines.forEach((line: string) => {
          doc.text(line, 110, yRight)
          yRight += 4
        })
      }
      if (customerICO) {
        doc.text(`IC: ${customerICO}`, 110, yRight)
        yRight += 4
      }
      if (customerDIC) {
        doc.text(`DIC: ${customerDIC}`, 110, yRight)
        yRight += 4
      }
      if (customerPhone) {
        doc.text(`Tel: ${customerPhone}`, 110, yRight)
        yRight += 4
      }
      if (customerEmail) {
        doc.text(`Email: ${customerEmail}`, 110, yRight)
      }
    }

    // ========== TABULKA POLOŽEK ==========
    const tableStartY = 110
    doc.setFontSize(9)
    doc.setFont('courier', 'bold')

    // Hlavička tabulky
    doc.text('Polozka', 15, tableStartY)
    doc.text('Mnozstvi', 100, tableStartY)
    doc.text('Cena/ks', 135, tableStartY)
    doc.text('Celkem', 195, tableStartY, { align: 'right' })

    // Čára pod hlavičkou
    doc.setLineWidth(0.3)
    doc.line(15, tableStartY + 1, 195, tableStartY + 1)

    // Položky
    doc.setFont('courier', 'normal')
    doc.setFontSize(8)
    let itemY = tableStartY + 6

    invoice.items.forEach((item) => {
      const itemName = item.product?.name || item.productName || '(Nezname)'
      const quantity = `${item.quantity} ${item.unit}`
      const pricePerUnit = item.price ? `${Number(item.price).toFixed(2)} Kc` : '-'
      const itemTotal = item.price ? item.quantity * item.price : 0
      const totalPrice = itemTotal > 0 ? `${itemTotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kc` : '-'

      // Zabal dlouhé názvy
      const nameLines = doc.splitTextToSize(itemName, 80)
      doc.text(nameLines[0], 15, itemY)
      doc.text(quantity, 100, itemY)
      doc.text(pricePerUnit, 135, itemY)
      doc.text(totalPrice, 195, itemY, { align: 'right' })

      itemY += 6
    })

    // Čára před celkovou cenou
    itemY += 3
    doc.setLineWidth(0.5)
    doc.line(15, itemY, 195, itemY)

    // ========== CELKOVÁ ČÁSTKA ==========
    itemY += 8
    doc.setFontSize(12)
    doc.setFont('courier', 'bold')
    doc.text('Celkem k uhrade:', 110, itemY)
    const totalAmount = Number(invoice.totalAmount).toLocaleString('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    doc.text(`${totalAmount} Kc`, 195, itemY, { align: 'right' })

    // ========== PLATEBNÍ ÚDAJE ==========
    itemY += 12
    doc.setFontSize(10)
    doc.setFont('courier', 'bold')
    doc.text('Platebni udaje:', 15, itemY)

    itemY += 6
    doc.setFont('courier', 'normal')
    doc.setFontSize(9)
    const paymentText =
      invoice.paymentType === 'card' ? 'Karta' :
      invoice.paymentType === 'transfer' ? 'Bankovni prevod' :
      'Hotovost'
    doc.text(`Zpusob platby: ${paymentText}`, 15, itemY)

    // Číslo účtu (pokud je karta nebo bankovní převod)
    if (settings.bankAccount && (invoice.paymentType === 'card' || invoice.paymentType === 'transfer')) {
      itemY += 5
      doc.text(`Cislo uctu: ${settings.bankAccount}`, 15, itemY)
    }

    // Variabilní symbol (jen pro bankovní převod)
    if (invoice.paymentType === 'transfer') {
      // Číslo faktury je přímo variabilní symbol (např. 2024001)
      itemY += 5
      doc.text(`Variabilni symbol: ${invoice.transactionCode}`, 15, itemY)
    }

    // ========== PODPIS ==========
    doc.setFontSize(8)
    doc.text('___________________________', 15, 260)
    doc.text('Podpis dodavatele', 15, 266)

    // ========== FOOTER ==========
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(
      'Vygenerovano pomoci ucetniho systemu',
      105,
      285,
      { align: 'center' }
    )

    // ========== STORNO VODOZNAK ==========
    if (invoice.status === 'storno') {
      // Uložení stavu grafiky
      doc.saveGraphicsState()

      // Nastavení průhlednosti
      const gState = new (doc as any).GState({ opacity: 0.15 })
      doc.setGState(gState)

      // Červená barva pro text
      doc.setTextColor(220, 38, 38) // red-600

      // Velké písmo
      doc.setFontSize(80)
      doc.setFont('courier', 'bold')

      // Diagonální text přes celou stránku
      // Střed stránky A4: 105mm x 148.5mm
      doc.text('STORNO', 105, 148.5, {
        align: 'center',
        angle: 45
      })

      // Obnovení stavu grafiky
      doc.restoreGraphicsState()
    }

    // Otevřít PDF v novém okně
    doc.output('dataurlnewwindow', { filename: `${invoice.transactionCode}.pdf` })
  } catch (error) {
    console.error('Kriticka chyba v generateInvoicePDF:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    throw error
  }
}
