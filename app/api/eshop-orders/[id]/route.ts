// PATCH /api/eshop-orders/[id]
// Aktualizace statusu eshop objednávky (shipped, delivered, cancelled)
//
// Při přechodu na 'shipped':
//   1. Najde nebo vytvoří draft výdejku
//   2. Zpracuje ji (InventoryItem, shippedQuantity, rezervace)
//   3. Pošle webhook do e-shopu
//
// Ostatní přechody (delivered, cancelled) jen aktualizují status.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = ['paid', 'shipped', 'delivered', 'cancelled']

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status } = body

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Neplatný status. Povolené hodnoty: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Načti objednávku i s draft výdejkami a rezervacemi
    const existing = await prisma.customerOrder.findFirst({
      where: { id: params.id, source: 'eshop' },
      include: {
        items: true,
        deliveryNotes: {
          where: { status: 'draft' },
          include: { items: true },
          take: 1,
        },
        reservations: { where: { status: 'active' } },
        issuedInvoice: { select: { id: true } },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      )
    }

    // ── Přechod na 'shipped' → zpracuj draft výdejku ──────────────────────
    if (status === 'shipped') {
      let draftNote = existing.deliveryNotes[0]

      // Draft chybí → vytvoř ho (fallback pro starší objednávky bez auto-výdejky)
      if (!draftNote) {
        const { createDeliveryNoteFromCustomerOrder } = await import('@/lib/createDeliveryNote')
        await createDeliveryNoteFromCustomerOrder(existing.id)
        draftNote = await prisma.deliveryNote.findFirst({
          where: { customerOrderId: existing.id, status: 'draft' },
          include: { items: true },
        }) as any

        if (!draftNote) {
          return NextResponse.json(
            { error: 'Nepodařilo se vytvořit výdejku — zkontroluj položky objednávky' },
            { status: 500 }
          )
        }
      }

      // Zpracuj výdejku v Prisma transakci — stejná logika jako process/route.ts
      await prisma.$transaction(async (tx) => {
        // 1. Vytvoř záporné InventoryItem a aktualizuj výdejkové položky
        for (const deliveryItem of draftNote.items) {
          if (deliveryItem.productId) {
            const inventoryItem = await tx.inventoryItem.create({
              data: {
                productId:     deliveryItem.productId,
                quantity:      -Number(deliveryItem.quantity), // záporné = vyskladnění
                unit:          deliveryItem.unit,
                purchasePrice: 0,
                date:          new Date(),
              },
            })
            await tx.deliveryNoteItem.update({
              where: { id: deliveryItem.id },
              data:  { inventoryItemId: inventoryItem.id },
            })
          }
        }

        // 2. Označ výdejku jako zpracovanou
        await tx.deliveryNote.update({
          where: { id: draftNote.id },
          data:  { status: 'active', processedAt: new Date() },
        })

        // 3. Aktualizuj shippedQuantity na položkách objednávky
        for (const deliveryItem of draftNote.items) {
          const orderItem = existing.items.find(oi => oi.productId === deliveryItem.productId)
          if (orderItem) {
            await tx.customerOrderItem.update({
              where: { id: orderItem.id },
              data:  { shippedQuantity: Number(orderItem.shippedQuantity) + Number(deliveryItem.quantity) },
            })
          }
        }

        // 4. Objednávka → shipped, uvolni rezervace
        await tx.customerOrder.update({
          where: { id: existing.id },
          data:  { status: 'shipped', shippedAt: new Date() },
        })
        await tx.reservation.updateMany({
          where: { customerOrderId: existing.id, status: 'active' },
          data:  { status: 'fulfilled', fulfilledAt: new Date() },
        })
      })

      // 5. Webhook do e-shopu — fire-and-forget
      if (existing.eshopOrderId) {
        const erpUrl     = process.env.ERP_PUBLIC_URL || process.env.NEXTAUTH_URL || ''
        const invoiceId  = existing.issuedInvoice?.id ?? null
        const { enqueueOrderShippedWebhook } = await import('@/lib/eshopWebhook')
        enqueueOrderShippedWebhook(existing.id, {
          eshopOrderId:   existing.eshopOrderId,
          erpOrderNumber: existing.orderNumber,
          shippedAt:      new Date().toISOString(),
          trackingNumber: existing.trackingNumber ?? null,
          carrier:        existing.carrier        ?? null,
          invoiceUrl:     invoiceId ? `${erpUrl}/api/invoices/${invoiceId}/pdf` : null,
        }).catch((err: any) => {
          console.error(`[EshopOrders] Webhook failed for orderId=${existing.id}:`, err?.message)
        })
      }

      return NextResponse.json({ id: existing.id, status: 'shipped' })
    }

    // ── Ostatní přechody (delivered, cancelled) — jen aktualizuj status ───
    const updated = await prisma.customerOrder.update({
      where: { id: params.id },
      data: { status },
      select: { id: true, orderNumber: true, status: true, shippedAt: true, updatedAt: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[EshopOrders] Chyba při aktualizaci statusu:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat objednávku' },
      { status: 500 }
    )
  }
}
