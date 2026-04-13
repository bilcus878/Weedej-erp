// API Endpoint pro zpracování výdejky (vyskladnění)
// URL: /api/delivery-notes/[id]/process
// Workflow: Změní status z "draft" na "active", odečte ze skladu, uvolní rezervace

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Typy pro request body
interface ProcessDeliveryNoteRequest {
  items: Array<{
    id: string // ID DeliveryNoteItem
    shippedQuantity: number // Skutečně vyskladněné množství
  }>
}

// POST /api/delivery-notes/[id]/process - Zpracovat výdejku (vyskladnit)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Parsuj request body
    const body: ProcessDeliveryNoteRequest = await request.json()

    // Validace
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Chybí položky k vyskladnění' },
        { status: 400 }
      )
    }

    // Načti výdejku s položkami
    const deliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true,
        customerOrder: {
          include: {
            reservations: {
              where: { status: 'active' }
            }
          }
        }
      }
    })

    if (!deliveryNote) {
      return NextResponse.json(
        { error: 'Výdejka nenalezena' },
        { status: 404 }
      )
    }

    // Kontrola statusu
    if (deliveryNote.status === 'delivered' || deliveryNote.status === 'active') {
      return NextResponse.json(
        { error: 'Výdejka již byla zpracována' },
        { status: 400 }
      )
    }

    if (deliveryNote.status === 'storno' || deliveryNote.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Výdejka je zrušena' },
        { status: 400 }
      )
    }

    // VALIDACE: Zkontroluj dostupnost skladu
    const { canDeliverQuantity } = await import('@/lib/stockCalculation')

    for (const itemData of body.items) {
      const deliveryItem = deliveryNote.items.find(i => i.id === itemData.id)
      if (!deliveryItem || !deliveryItem.productId) continue

      // Kontrola, že shippedQuantity není záporné nebo nula
      if (itemData.shippedQuantity <= 0) {
        const productName = deliveryItem.product?.name || deliveryItem.productName || 'Neznámý produkt'
        return NextResponse.json(
          {
            error: `Množství k vyskladnění musí být větší než 0 pro produkt "${productName}"`
          },
          { status: 400 }
        )
      }

      // Kontrola, že nepřekračujeme objednané množství
      if (itemData.shippedQuantity > Number(deliveryItem.quantity)) {
        const productName = deliveryItem.product?.name || deliveryItem.productName || 'Neznámý produkt'
        return NextResponse.json(
          {
            error: `❌ CHYBA: Nelze vyskladnit ${itemData.shippedQuantity} ${deliveryItem.unit} produktu "${productName}".\n\nObjednáno: ${deliveryItem.quantity}\n\nMaximum k vyskladnění: ${deliveryItem.quantity} ${deliveryItem.unit}`
          },
          { status: 400 }
        )
      }

      // Kontrola dostupnosti skladu
      const stockCheck = await canDeliverQuantity(
        deliveryItem.productId,
        itemData.shippedQuantity,
        false // nepovolujeme záporný sklad
      )

      if (!stockCheck.canDeliver) {
        return NextResponse.json(
          { error: stockCheck.message || 'Nedostatečný sklad' },
          { status: 400 }
        )
      }
    }

    // Zpracování v transakci
    const result = await prisma.$transaction(async (tx) => {
      // 1. Aktualizuj quantity u všech položek výdejky a vytvoř záporný inventoryItem
      for (const itemData of body.items) {
        const deliveryItem = deliveryNote.items.find(i => i.id === itemData.id)

        // Vytvoř záporný inventoryItem pro vyskladnění (jen pro položky z katalogu)
        if (deliveryItem?.productId) {
          const inventoryItem = await tx.inventoryItem.create({
            data: {
              productId: deliveryItem.productId,
              quantity: -itemData.shippedQuantity, // ZÁPORNÉ množství = vyskladnění
              unit: deliveryItem.unit,
              purchasePrice: 0, // Při vyskladnění neřešíme nákupní cenu
              date: new Date(),
              note: null // Poznámka není potřeba - výdejka se zobrazuje v detailu
            }
          })

          // Aktualizuj položku výdejky s odkazem na inventoryItem
          await tx.deliveryNoteItem.update({
            where: { id: itemData.id },
            data: {
              quantity: itemData.shippedQuantity, // Přepíšeme quantity na skutečně vyskladněné
              inventoryItemId: inventoryItem.id // Propojení se skladovým pohybem
            }
          })
        } else {
          // Pro manuální položky jen aktualizuj quantity
          await tx.deliveryNoteItem.update({
            where: { id: itemData.id },
            data: {
              quantity: itemData.shippedQuantity
            }
          })
        }
      }

      // 2. Změň status výdejky na "active" (vyskladněno)
      await tx.deliveryNote.update({
        where: { id: params.id },
        data: {
          status: 'active',
          processedAt: new Date()
        }
      })

      // 3. Aktualizuj shippedQuantity u položek objednávky (pokud existuje CustomerOrder)
      if (deliveryNote.customerOrder) {
        // Pro každou vyskladněnou položku přičti množství k shippedQuantity
        const updatedDeliveryNote = await tx.deliveryNote.findUnique({
          where: { id: params.id },
          include: {
            items: true,
            customerOrder: {
              include: {
                items: true
              }
            }
          }
        })

        if (updatedDeliveryNote?.customerOrder) {
          for (const deliveryItem of updatedDeliveryNote.items) {
            // Najdi odpovídající položku v objednávce
            const orderItem = updatedDeliveryNote.customerOrder.items.find(
              oi => oi.productId === deliveryItem.productId
            )

            if (orderItem) {
              // Přičti vyskladněné množství k celkovému shippedQuantity
              const newShippedQty = Number(orderItem.shippedQuantity) + Number(deliveryItem.quantity)

              await tx.customerOrderItem.update({
                where: { id: orderItem.id },
                data: {
                  shippedQuantity: newShippedQty
                }
              })
            }
          }

          // Zkontroluj, jestli jsou VŠECHNY položky KOMPLETNĚ vyskladněny
          // POZOR: Pokud je objednávka STORNO, NESMÍME měnit status!
          if (deliveryNote.customerOrder.status !== 'storno') {
            const allOrderItems = await tx.customerOrderItem.findMany({
              where: { customerOrderId: deliveryNote.customerOrder.id }
            })

            const allFullyShipped = allOrderItems.every(item =>
              Number(item.shippedQuantity) >= Number(item.quantity)
            )

            if (allFullyShipped) {
              // Všechny položky jsou vyskladněny → změň status na "shipped"
              await tx.customerOrder.update({
                where: { id: deliveryNote.customerOrder.id },
                data: {
                  status: 'shipped',
                  shippedAt: new Date()
                }
              })

              // Uvolni rezervace
              await tx.reservation.updateMany({
                where: {
                  customerOrderId: deliveryNote.customerOrder.id,
                  status: 'active'
                },
                data: {
                  status: 'fulfilled',
                  fulfilledAt: new Date()
                }
              })

              console.log(`✓ Objednávka ${deliveryNote.customerOrder.orderNumber} - KOMPLETNĚ vyskladněna → status: shipped`)
            } else {
              // Ještě nejsou všechny položky vyskladněny → status zůstane "processing"
              console.log(`✓ Objednávka ${deliveryNote.customerOrder.orderNumber} - částečně vyskladněna, status zůstává: processing`)
            }
          } else {
            console.log(`⚠ Objednávka ${deliveryNote.customerOrder.orderNumber} je STORNO - status se NEAKTUALIZUJE`)
          }
        }
      }

      return { success: true }
    })

    // Načti aktualizovanou výdejku
    const updated = await prisma.deliveryNote.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        customerOrder: true
      }
    })

    console.log(`✓ Výdejka ${deliveryNote.deliveryNumber} byla zpracována a vyskladněna`)

    // Vrať výdejku
    return NextResponse.json({
      deliveryNote: updated,
      customerOrder: updated?.customerOrder
    })
  } catch (error) {
    console.error('Chyba při zpracování výdejky:', error)
    return NextResponse.json(
      {
        error: 'Nepodařilo se zpracovat výdejku',
        details: error instanceof Error ? error.message : 'Neznámá chyba'
      },
      { status: 500 }
    )
  }
}
