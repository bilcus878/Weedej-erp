// API Endpoint pro přijaté faktury (Received Invoices)
// URL: /api/received-invoices

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { archiveReceivedInvoice, archiveAsync } from '@/lib/documents/DocumentArchiveService'

export const dynamic = 'force-dynamic'

// GET /api/received-invoices - Získat všechny přijaté faktury
export async function GET() {
  try {
    const invoices = await prisma.receivedInvoice.findMany({
      include: {
        receipts: { // NOVĚ: více příjemek
          include: {
            supplier: true,
            items: {
              include: {
                product: true
              }
            }
          },
          orderBy: {
            receiptDate: 'asc' // Nejstarší první
          }
        },
        purchaseOrder: {
          include: {
            supplier: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Nejnovější vytvořená nahoře
      }
    })

    // Mapuj status z purchaseOrder
    const mappedInvoices = invoices.map(invoice => ({
      ...invoice,
      // Pokud má purchaseOrder, převezmi status z něj
      status: invoice.purchaseOrder?.status || invoice.status
    }))

    return NextResponse.json(mappedInvoices)
  } catch (error) {
    console.error('Chyba při načítání přijatých faktur:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst přijaté faktury' },
      { status: 500 }
    )
  }
}

// POST /api/received-invoices - Přiřadit fakturu k příjemce
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      invoiceNumber,
      receiptId,
      invoiceDate,
      dueDate,
      totalAmount,
      paymentType,
      attachmentUrl,
      note
    } = body

    // Validace
    if (!invoiceNumber || !receiptId || !invoiceDate || !totalAmount) {
      return NextResponse.json(
        { error: 'Chybí povinná pole (invoiceNumber, receiptId, invoiceDate, totalAmount)' },
        { status: 400 }
      )
    }

    // Zkontroluj, že příjemka existuje a nemá už fakturu
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { receivedInvoice: true }
    })

    if (!receipt) {
      return NextResponse.json(
        { error: 'Příjemka nenalezena' },
        { status: 404 }
      )
    }

    if (receipt.receivedInvoice) {
      return NextResponse.json(
        { error: 'Příjemka již má přiřazenou fakturu' },
        { status: 400 }
      )
    }

    // Vytvoř fakturu
    const invoice = await prisma.receivedInvoice.create({
      data: {
        invoiceNumber,
        invoiceDate: new Date(invoiceDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        totalAmount: Number(totalAmount),
        paymentType: paymentType || 'transfer',
        attachmentUrl: attachmentUrl || null,
        note: note || null
      },
      include: {
        receipts: {
          include: {
            supplier: true,
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })

    // Connect receipt to invoice
    await prisma.receipt.update({
      where: { id: receiptId },
      data: {
        receivedInvoiceId: invoice.id
      }
    })

    archiveAsync(() => archiveReceivedInvoice(invoice.id), `ReceivedInvoice ${invoice.invoiceNumber}`)
    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření přijaté faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit přijatou fakturu' },
      { status: 500 }
    )
  }
}
