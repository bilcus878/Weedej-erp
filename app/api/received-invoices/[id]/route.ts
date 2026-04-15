// API Endpoint pro jednu přijatou fakturu
// URL: /api/received-invoices/[id]

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/received-invoices/[id] - Získat detail faktury
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await prisma.receivedInvoice.findUnique({
      where: { id: params.id },
      include: {
        receipts: {
          include: {
            supplier: true,
            purchaseOrder: true,
            items: {
              include: {
                product: true
              }
            },
            inventoryItems: true
          }
        },
        purchaseOrder: {
          include: {
            supplier: true
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Faktura nenalezena' },
        { status: 404 }
      )
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Chyba při načítání faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst fakturu' },
      { status: 500 }
    )
  }
}

// PATCH /api/received-invoices/[id] - Upravit fakturu
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { invoiceNumber, invoiceDate, dueDate, totalAmount, paymentType, attachmentUrl, note } = body

    // Pokud měníme číslo faktury, zkontroluj duplicitu
    if (invoiceNumber) {
      const existing = await prisma.receivedInvoice.findFirst({
        where: {
          invoiceNumber,
          id: { not: params.id }
        }
      })

      if (existing) {
        return NextResponse.json(
          { error: `Faktura s číslem ${invoiceNumber} již existuje` },
          { status: 400 }
        )
      }
    }

    const invoice = await prisma.receivedInvoice.update({
      where: { id: params.id },
      data: {
        invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : undefined,
        isTemporary: invoiceNumber !== undefined ? false : undefined, // Pokud měníme číslo, už to není temporary
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        totalAmount: totalAmount ? Number(totalAmount) : undefined,
        paymentType: paymentType !== undefined ? paymentType : undefined,
        attachmentUrl: attachmentUrl !== undefined ? attachmentUrl : undefined,
        note: note !== undefined ? note : undefined
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
        },
        purchaseOrder: {
          include: {
            supplier: true
          }
        }
      }
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Chyba při aktualizaci faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat fakturu' },
      { status: 500 }
    )
  }
}

// DELETE /api/received-invoices/[id] - Smazat fakturu
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.receivedInvoice.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Faktura smazána' })
  } catch (error) {
    console.error('Chyba při mazání faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat fakturu' },
      { status: 500 }
    )
  }
}
