// POST /api/eshop-orders/[id]/invoice
// Vytvoří vystavenou fakturu pro eshop objednávku
// Pokud faktura již existuje, vrátí ji (idempotentní)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createIssuedInvoiceFromCustomerOrder } from '@/lib/createIssuedInvoice'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ověř, že objednávka existuje a je eshop objednávka
    const order = await prisma.customerOrder.findFirst({
      where: { id: params.id, source: 'eshop' },
      select: { id: true, orderNumber: true, status: true }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Eshop objednávka nenalezena' },
        { status: 404 }
      )
    }

    // Vytvoř fakturu (lib funkce je idempotentní – vrátí existující pokud již existuje)
    const invoice = await createIssuedInvoiceFromCustomerOrder(params.id, {
      paymentType: 'card',  // Platba přes Stripe = karta
    })

    console.log(`[EshopOrders] Faktura ${invoice.invoiceNumber} pro objednávku ${order.orderNumber}`)

    return NextResponse.json(invoice, { status: 201 })
  } catch (error: any) {
    console.error('[EshopOrders] Chyba při vytváření faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit fakturu' },
      { status: 500 }
    )
  }
}
