// API Endpoint pro dobropisy (Credit Notes)
// URL: /api/credit-notes

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/credit-notes - Získat všechny dobropisy
export async function GET() {
  try {
    const creditNotes = await prisma.creditNote.findMany({
      include: {
        issuedInvoice: {
          include: {
            customer: true,
            customerOrder: true,
            transaction: true
          }
        },
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const mapped = creditNotes.map(cn => ({
      id: cn.id,
      creditNoteNumber: cn.creditNoteNumber,
      issuedInvoiceId: cn.issuedInvoiceId,
      invoiceNumber: cn.issuedInvoice.invoiceNumber,
      creditNoteDate: cn.creditNoteDate,
      totalAmount: cn.totalAmount,
      totalAmountWithoutVat: cn.totalAmountWithoutVat,
      totalVatAmount: cn.totalVatAmount,
      reason: cn.reason,
      note: cn.note,
      status: cn.status,
      stornoReason: cn.stornoReason,
      stornoAt: cn.stornoAt,
      stornoBy: cn.stornoBy,
      customer: cn.issuedInvoice.customer,
      customerName: cn.customerName || cn.issuedInvoice.customerName,
      customerEntityType: cn.customerEntityType,
      customerEmail: cn.customerEmail,
      customerPhone: cn.customerPhone,
      customerAddress: cn.customerAddress,
      customerIco: cn.customerIco,
      customerDic: cn.customerDic,
      items: cn.items,
      createdAt: cn.createdAt,
      // Propojení přes fakturu
      customerOrderId: cn.issuedInvoice.customerOrderId,
      customerOrderNumber: cn.issuedInvoice.customerOrder?.orderNumber,
      transactionId: cn.issuedInvoice.transactionId,
      transactionCode: cn.issuedInvoice.transaction?.transactionCode,
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Chyba při načítání dobropisů:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst dobropisy' },
      { status: 500 }
    )
  }
}

// POST /api/credit-notes - Vytvořit nový dobropis
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      issuedInvoiceId,
      reason,
      note,
      items // Array of { productName, quantity, unit, price, vatRate, vatAmount, priceWithVat }
    } = body

    // Validace
    if (!issuedInvoiceId) {
      return NextResponse.json(
        { error: 'Chybí povinné pole issuedInvoiceId' },
        { status: 400 }
      )
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Dobropis musí mít alespoň jednu položku' },
        { status: 400 }
      )
    }

    // Ověř existenci faktury
    const invoice = await prisma.issuedInvoice.findUnique({
      where: { id: issuedInvoiceId },
      include: { customer: true }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Faktura nebyla nalezena' },
        { status: 404 }
      )
    }

    // Vypočti celkové částky z položek
    let totalWithoutVat = 0
    let totalVat = 0
    let totalWithVat = 0

    const processedItems = items.map((item: any) => {
      const qty = Number(item.quantity)
      const unitPrice = Number(item.price)
      const vatRate = Number(item.vatRate || 21)
      const vatPerUnit = unitPrice * vatRate / 100
      const priceWithVatPerUnit = unitPrice + vatPerUnit

      totalWithoutVat += qty * unitPrice
      totalVat += qty * vatPerUnit
      totalWithVat += qty * priceWithVatPerUnit

      return {
        productName: item.productName || null,
        quantity: qty,
        unit: item.unit || 'ks',
        price: unitPrice,
        vatRate: vatRate,
        vatAmount: Math.round(vatPerUnit * 100) / 100,
        priceWithVat: Math.round(priceWithVatPerUnit * 100) / 100,
      }
    })

    // Zaokrouhlení
    totalWithoutVat = Math.round(totalWithoutVat * 100) / 100
    totalVat = Math.round(totalVat * 100) / 100
    totalWithVat = Math.round(totalWithVat * 100) / 100

    // ON-COMMIT číslování
    const { getNextDocumentNumber } = await import('@/lib/documentNumbering')

    const creditNote = await prisma.$transaction(async (tx) => {
      const creditNoteNumber = await getNextDocumentNumber('credit-note', tx)

      return await tx.creditNote.create({
        data: {
          creditNoteNumber,
          issuedInvoiceId,
          customerId: invoice.customerId,
          customerName: invoice.customerName || invoice.customer?.name || null,
          customerEntityType: invoice.customerEntityType || invoice.customer?.entityType || null,
          customerEmail: invoice.customerEmail || invoice.customer?.email || null,
          customerPhone: invoice.customerPhone || invoice.customer?.phone || null,
          customerAddress: invoice.customerAddress || invoice.customer?.address || null,
          customerIco: invoice.customerIco || invoice.customer?.ico || null,
          customerDic: invoice.customerDic || invoice.customer?.dic || null,
          creditNoteDate: new Date(),
          totalAmount: -totalWithVat, // Záporná hodnota
          totalAmountWithoutVat: -totalWithoutVat,
          totalVatAmount: -totalVat,
          reason: reason || null,
          note: note || null,
          items: {
            create: processedItems
          }
        },
        include: {
          items: true,
          issuedInvoice: true
        }
      })
    })

    return NextResponse.json(creditNote, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření dobropisu:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit dobropis' },
      { status: 500 }
    )
  }
}
