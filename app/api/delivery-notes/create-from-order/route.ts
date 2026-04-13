// API Endpoint pro vytvoření a zpracování výdejky z objednávky zákazníka
// URL: /api/delivery-notes/create-from-order
// Workflow: Vytvoří výdejku, nastaví status "active", odečte ze skladu, aktualizuje shippedQuantity

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentNumbering'

interface CreateDeliveryNoteItem {
  productId: string | null
  productName: string | null
  quantity: number
  unit: string
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

    // Validace
    if (!customerOrderId) {
      return NextResponse.json(
        { error: 'Chybí ID objednávky' },
        { status: 400 }
      )
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Chybí položky k vyskladnění' },
        { status: 400 }
      )
    }

    // Načti objednávku
    const order = await prisma.customerOrder.findUnique({
      where: { id: customerOrderId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        reservations: {
          where: { status: 'active' }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      )
    }

    // Kontrola dostupnosti skladu
    const { canDeliverQuantity } = await import('@/lib/stockCalculation')

    for (const item of items) {
      if (item.productId && item.quantity > 0) {
        const stockCheck = await canDeliverQuantity(
          item.productId,
          item.quantity,
          false // nepovolujeme záporný sklad
        )

        if (!stockCheck.canDeliver) {
          return NextResponse.json(
            { error: stockCheck.message || 'Nedostatečný sklad' },
            { status: 400 }
          )
        }
      }
    }

    // Zpracování v transakci
    const result = await prisma.$transaction(async (tx) => {
      // 1. Vygeneruj číslo výdejky
      const deliveryNumber = await getNextDocumentNumber('delivery-note', tx)

      // 2. Vytvoř výdejku se statusem "active" (rovnou vyskladněná)
      const deliveryNote = await tx.deliveryNote.create({
        data: {
          deliveryNumber,
          customerOrderId: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          deliveryDate: new Date(),
          status: 'active', // ✅ Rovnou active (vyskladněno)
          processedAt: new Date(),
          note: null, // Poznámka se nevyplňuje automaticky
          items: {
            create: items.map(item => {
              // Najdi odpovídající položku v objednávce pro získání původního množství
              const orderItem = order.items.find(
                oi => oi.productId === item.productId
              )

              return {
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity, // Vyskladněné množství
                orderedQuantity: orderItem ? Number(orderItem.quantity) : null, // Původně objednané množství
                unit: item.unit
              }
            })
          }
        },
        include: {
          items: true
        }
      })

      // 2b. Vytvoř záporné InventoryItems pro vyskladnění a propoj je s DeliveryNoteItems
      for (const deliveryItem of deliveryNote.items) {
        if (deliveryItem.productId) {
          // Vytvoř záporný inventoryItem pro vyskladnění
          const inventoryItem = await tx.inventoryItem.create({
            data: {
              productId: deliveryItem.productId,
              quantity: -Number(deliveryItem.quantity), // ZÁPORNÉ množství = vyskladnění
              unit: deliveryItem.unit,
              purchasePrice: 0, // Při vyskladnění neřešíme nákupní cenu
              date: new Date(),
              note: null // Poznámka není potřeba - výdejka se zobrazuje v detailu
            }
          })

          // Propoj DeliveryNoteItem s InventoryItem
          await tx.deliveryNoteItem.update({
            where: { id: deliveryItem.id },
            data: {
              inventoryItemId: inventoryItem.id
            }
          })
        }
      }

      // 3. Aktualizuj shippedQuantity u položek objednávky
      for (const deliveryItem of items) {
        // Najdi odpovídající položku v objednávce
        const orderItem = order.items.find(
          oi => oi.productId === deliveryItem.productId
        )

        if (orderItem) {
          // Přičti vyskladněné množství k celkovému shippedQuantity
          const newShippedQty = Number(orderItem.shippedQuantity || 0) + Number(deliveryItem.quantity)

          await tx.customerOrderItem.update({
            where: { id: orderItem.id },
            data: {
              shippedQuantity: newShippedQty
            }
          })
        }
      }

      // 4. Zkontroluj, jestli jsou VŠECHNY položky KOMPLETNĚ vyskladněny
      // POZOR: Pokud je objednávka STORNO, NESMÍME měnit status!
      if (order.status !== 'storno') {
        const allOrderItems = await tx.customerOrderItem.findMany({
          where: { customerOrderId: order.id }
        })

        const allFullyShipped = allOrderItems.every(item =>
          Number(item.shippedQuantity || 0) >= Number(item.quantity)
        )

        if (allFullyShipped) {
          // Všechny položky jsou vyskladněny → změň status na "shipped"
          await tx.customerOrder.update({
            where: { id: order.id },
            data: {
              status: 'shipped',
              shippedAt: new Date()
            }
          })

          // Uvolni rezervace
          await tx.reservation.updateMany({
            where: {
              customerOrderId: order.id,
              status: 'active'
            },
            data: {
              status: 'fulfilled',
              fulfilledAt: new Date()
            }
          })

          console.log(`✓ Objednávka ${order.orderNumber} - KOMPLETNĚ vyskladněna → status: shipped`)
        } else {
          // Částečně vyskladněno → status "processing"
          await tx.customerOrder.update({
            where: { id: order.id },
            data: {
              status: 'processing'
            }
          })

          console.log(`✓ Objednávka ${order.orderNumber} - částečně vyskladněna → status: processing`)
        }
      } else {
        console.log(`⚠ Objednávka ${order.orderNumber} je STORNO - status se NEAKTUALIZUJE`)
      }

      return deliveryNote
    })

    console.log(`✓ Výdejka ${result.deliveryNumber} byla vytvořena a zpracována`)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Chyba při vytváření výdejky z objednávky:', error)
    return NextResponse.json(
      {
        error: 'Nepodařilo se vytvořit výdejku',
        details: error instanceof Error ? error.message : 'Neznámá chyba'
      },
      { status: 500 }
    )
  }
}
