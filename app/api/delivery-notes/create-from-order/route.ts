// API Endpoint pro vytvoření a zpracování výdejky z objednávky zákazníka
// URL: /api/delivery-notes/create-from-order
// Workflow: Vytvoří výdejku, nastaví status "active", odečte ze skladu, aktualizuje shippedQuantity
//
// CENY: výdejka vždy přebírá ceny z faktury (IssuedInvoiceItem) — §28 ZDPH.
// Fallback: CustomerOrderItem → Product.price (jen pokud faktura ještě neexistuje).

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentNumbering'
import { isItemFullyShipped } from '@/lib/variantConversion'

export const dynamic = 'force-dynamic'

interface CreateDeliveryNoteItem {
  productId:    string | null
  productName:  string | null
  quantity:     number          // packs for non-variant, base units (g/ml) for variant
  unit:         string          // 'ks' for non-variant, 'g'/'ml' for variant
  baseQuantity?: number         // explicit base quantity (optional, equals quantity for variant items)
  baseUnit?:     string         // explicit base unit (optional)
}

interface CreateDeliveryNoteRequest {
  customerOrderId: string
  items: CreateDeliveryNoteItem[]
}

// POST /api/delivery-notes/create-from-order - Vytvořit a zpracovat výdejku z objednávky
export async function POST(request: Request) {
  try {
    const body: CreateDeliveryNoteRequest = await request.json()
    const { customerOrderId, items } = body

    if (!customerOrderId) {
      return NextResponse.json({ error: 'Chybí ID objednávky' }, { status: 400 })
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Chybí položky k vyskladnění' }, { status: 400 })
    }

    // Načti objednávku včetně faktury (source of truth pro ceny)
    const order = await prisma.customerOrder.findUnique({
      where: { id: customerOrderId },
      include: {
        items: {
          include: { product: true },
        },
        reservations: { where: { status: 'active' } },
        issuedInvoice: {
          include: { items: true },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Objednávka nenalezena' }, { status: 404 })
    }

    // Kontrola dostupnosti skladu
    const { canDeliverQuantity } = await import('@/lib/stockCalculation')
    for (const item of items) {
      if (item.productId && item.quantity > 0) {
        const stockCheck = await canDeliverQuantity(item.productId, item.quantity, false)
        if (!stockCheck.canDeliver) {
          return NextResponse.json(
            { error: stockCheck.message || 'Nedostatečný sklad' },
            { status: 400 }
          )
        }
      }
    }

    // Sestav cenový index: productId → cena z faktury nebo objednávky
    // Priorita: faktura (IssuedInvoiceItem) > objednávka (CustomerOrderItem) > produkt (Product.price)
    type PriceRecord = {
      price: number
      priceWithVat: number
      vatAmount: number
      vatRate: number
      source: 'invoice' | 'order_item' | 'product'
    }
    const priceIndex = new Map<string, PriceRecord>()

    // 1. Z faktury — absolutní priorita (§28 ZDPH — faktura je zdroj pravdy)
    if (order.issuedInvoice) {
      for (const inv of order.issuedInvoice.items) {
        if (inv.productId) {
          priceIndex.set(inv.productId, {
            price:        Number(inv.price),
            priceWithVat: Number(inv.priceWithVat),
            vatAmount:    Number(inv.vatAmount),
            vatRate:      Number(inv.vatRate),
            source:       'invoice',
          })
        }
      }
    }

    // 2. Z objednávky — pokud faktura pro daný produkt chybí
    for (const oi of order.items) {
      if (oi.productId && !priceIndex.has(oi.productId)) {
        priceIndex.set(oi.productId, {
          price:        Number(oi.price),
          priceWithVat: Number(oi.priceWithVat),
          vatAmount:    Number(oi.vatAmount),
          vatRate:      Number(oi.vatRate),
          source:       'order_item',
        })
      }
    }

    // 3. Z produktu — fallback (aktuální cena, pokud nic jiného není k dispozici)
    for (const item of items) {
      if (item.productId && !priceIndex.has(item.productId)) {
        const orderItem = order.items.find(oi => oi.productId === item.productId)
        const product   = orderItem?.product
        if (product) {
          const vatRate     = Number(product.vatRate ?? 21)
          const price       = Number(product.price)
          const priceWithVat = Math.round(price * (1 + vatRate / 100) * 100) / 100
          const vatAmount    = Math.round((priceWithVat - price) * 100) / 100
          priceIndex.set(item.productId, { price, priceWithVat, vatAmount, vatRate, source: 'product' })
        }
      }
    }

    // Zpracování v transakci
    const result = await prisma.$transaction(async (tx) => {
      const deliveryNumber = await getNextDocumentNumber('delivery-note', tx)

      const deliveryNote = await tx.deliveryNote.create({
        data: {
          deliveryNumber,
          customerOrderId: order.id,
          customerId:      order.customerId,
          customerName:    order.customerName,
          deliveryDate:    new Date(),
          status:          'active',
          processedAt:     new Date(),
          note:            null,
          items: {
            create: items.map(item => {
              const orderItem = order.items.find(oi => oi.productId === item.productId)
              const p = item.productId ? priceIndex.get(item.productId) : undefined

              const bq = item.baseQuantity ?? item.quantity
              const bu = item.baseUnit    ?? item.unit

              return {
                productId:       item.productId,
                productName:     item.productName,
                quantity:        item.quantity,
                orderedQuantity: orderItem ? Number(orderItem.quantity) : null,
                unit:            item.unit,
                baseQuantity:    bq !== item.quantity ? bq : null,
                baseUnit:        bu !== item.unit     ? bu : null,
                // Ceny z faktury — zdroj pravdy
                price:           p?.price        ?? null,
                priceWithVat:    p?.priceWithVat ?? null,
                vatAmount:       p?.vatAmount    ?? null,
                vatRate:         p?.vatRate      ?? null,
                priceSource:     p?.source       ?? null,
              }
            }),
          },
        },
        include: { items: true },
      })

      // Vytvoř záporné InventoryItems a propoj s DeliveryNoteItems
      for (const deliveryItem of deliveryNote.items) {
        if (deliveryItem.productId) {
          const inventoryItem = await tx.inventoryItem.create({
            data: {
              productId:     deliveryItem.productId,
              quantity:      -Number(deliveryItem.quantity),
              unit:          deliveryItem.unit,
              purchasePrice: 0,
              date:          new Date(),
              note:          null,
            },
          })
          await tx.deliveryNoteItem.update({
            where: { id: deliveryItem.id },
            data:  { inventoryItemId: inventoryItem.id },
          })
        }
      }

      // Aktualizuj shippedQuantity + shippedBaseQty
      for (const deliveryItem of items) {
        const orderItem = order.items.find(oi => oi.productId === deliveryItem.productId)
        if (!orderItem) continue

        const isVariantItem = orderItem.unit === 'ks' && orderItem.variantValue != null && orderItem.variantUnit != null
        const vv            = isVariantItem ? Number(orderItem.variantValue) : 1

        // qty shipped in this delivery, in base units (g/ml) or packs
        const baseShipped   = Number(deliveryItem.baseQuantity ?? deliveryItem.quantity)
        const newShippedBase = Number(orderItem.shippedBaseQty ?? 0) + baseShipped
        // Pack-level count: for variant items, compute fractional packs; for ks items, just add quantity
        const newShippedQty  = isVariantItem
          ? newShippedBase / vv
          : Number(orderItem.shippedQuantity ?? 0) + Number(deliveryItem.quantity)

        await tx.customerOrderItem.update({
          where: { id: orderItem.id },
          data:  {
            shippedBaseQty:  newShippedBase,
            shippedQuantity: newShippedQty,
          },
        })
      }

      // Zkontroluj kompletnost expedice
      if (order.status !== 'storno') {
        const allOrderItems = await tx.customerOrderItem.findMany({
          where: { customerOrderId: order.id },
        })
        const allFullyShipped = allOrderItems.every(item => isItemFullyShipped({
          quantity:        Number(item.quantity),
          shippedQuantity: Number(item.shippedQuantity),
          shippedBaseQty:  Number(item.shippedBaseQty),
          variantValue:    item.variantValue != null ? Number(item.variantValue) : null,
          variantUnit:     item.variantUnit,
          unit:            item.unit,
        }))

        if (allFullyShipped) {
          await tx.customerOrder.update({
            where: { id: order.id },
            data:  { status: 'shipped', shippedAt: new Date() },
          })
          await tx.reservation.updateMany({
            where: { customerOrderId: order.id, status: 'active' },
            data:  { status: 'fulfilled', fulfilledAt: new Date() },
          })
          console.log(`✓ Objednávka ${order.orderNumber} — KOMPLETNĚ vyskladněna → shipped`)
        } else {
          await tx.customerOrder.update({
            where: { id: order.id },
            data:  { status: 'processing' },
          })
          console.log(`✓ Objednávka ${order.orderNumber} — částečně vyskladněna → processing`)
        }
      }

      return deliveryNote
    })

    console.log(`✓ Výdejka ${result.deliveryNumber} vytvořena`)

    // Webhook: notifikuj e-shop
    if (order.source === 'eshop' && order.eshopOrderId) {
      const finalOrder = await prisma.customerOrder.findUnique({
        where:   { id: order.id },
        include: { issuedInvoice: { select: { id: true } } },
      })
      if (finalOrder?.status === 'shipped') {
        const erpUrl = process.env.ERP_PUBLIC_URL || process.env.NEXTAUTH_URL || ''
        import('@/lib/eshopWebhook').then(({ enqueueOrderShippedWebhook }) =>
          enqueueOrderShippedWebhook(order.id, {
            eshopOrderId:   order.eshopOrderId!,
            erpOrderNumber: order.orderNumber,
            shippedAt:      new Date().toISOString(),
            trackingNumber: null,
            carrier:        null,
            invoiceUrl:     finalOrder.issuedInvoice?.id
              ? `${erpUrl}/api/invoices/${finalOrder.issuedInvoice.id}/pdf`
              : null,
          })
        ).catch((err: any) =>
          console.error(`[Webhook] Failed to enqueue for orderId=${order.id}:`, err?.message)
        )
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Chyba při vytváření výdejky z objednávky:', error)
    return NextResponse.json(
      {
        error:   'Nepodařilo se vytvořit výdejku',
        details: error instanceof Error ? error.message : 'Neznámá chyba',
      },
      { status: 500 }
    )
  }
}
