import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/invoices/received/[id]/complete
// Accounting-completion step: user supplies the real supplier invoice number
// and any missing payment details. Purchase-order data is never touched here.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      invoiceNumber,
      invoiceDate,
      dueDate,
      paymentType,
      variableSymbol,
      constantSymbol,
      specificSymbol,
      note,
    } = body

    if (!invoiceNumber?.trim()) {
      return NextResponse.json(
        { error: 'Číslo faktury od dodavatele je povinné' },
        { status: 400 }
      )
    }

    if (!invoiceDate) {
      return NextResponse.json(
        { error: 'Datum vystavení faktury je povinné' },
        { status: 400 }
      )
    }

    const invoice = await prisma.receivedInvoice.findUnique({
      where: { id: params.id },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Faktura nebyla nalezena' }, { status: 404 })
    }

    if (invoice.status === 'storno') {
      return NextResponse.json(
        { error: 'Stornovanou fakturu nelze upravovat' },
        { status: 409 }
      )
    }

    // Unique invoice number check — only when the number actually changes
    const newNumber = invoiceNumber.trim()
    if (newNumber !== invoice.invoiceNumber) {
      const conflict = await prisma.receivedInvoice.findUnique({
        where: { invoiceNumber: newNumber },
      })
      if (conflict) {
        return NextResponse.json(
          { error: 'Faktura s tímto číslem již existuje' },
          { status: 409 }
        )
      }
    }

    const updated = await prisma.receivedInvoice.update({
      where: { id: params.id },
      data: {
        invoiceNumber:  newNumber,
        isTemporary:    false,
        invoiceDate:    new Date(invoiceDate),
        dueDate:        dueDate ? new Date(dueDate) : null,
        paymentType:    paymentType || 'bank_transfer',
        variableSymbol: variableSymbol || null,
        constantSymbol: constantSymbol || null,
        specificSymbol: specificSymbol || null,
        note:           note || null,
      },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
            items: { include: { product: true } },
          },
        },
        receipts: {
          include: {
            supplier: true,
            items: { include: { product: true } },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Chyba při dokončení faktury:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Faktura s tímto číslem již existuje' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Nepodařilo se uložit fakturu' },
      { status: 500 }
    )
  }
}
