/**
 * STORNO Logika - České Účetní Standardy
 *
 * Doklady se NIKDY nemažou - pouze se stornují.
 * Storno automaticky provede inverzní operaci na skladě.
 */

import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

/**
 * Stornuje příjemku
 *
 * Co se stane:
 * 1. Příjemka se označí jako "storno"
 * 2. Zboží se ODEČTE ze skladu (inverzní operace k naskladnění)
 * 3. Status objednávky se přepočítá
 *
 * @param receiptId - ID příjemky ke stornování
 * @param reason - Důvod storna (povinný!)
 * @param userId - Kdo stornuje (volitelné)
 */
export async function stornoReceipt(
  receiptId: string,
  reason: string,
  userId?: string
): Promise<void> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Důvod storna je povinný')
  }

  await prisma.$transaction(async (tx) => {
    // 1. Načti příjemku
    const receipt = await tx.receipt.findUnique({
      where: { id: receiptId },
      include: {
        items: true,
        inventoryItems: true,
        purchaseOrder: true,
        receivedInvoice: true, // ReceivedInvoice (nová relace)
      },
    })

    if (!receipt) {
      throw new Error('Příjemka nenalezena')
    }

    // 2. Kontrola - lze stornovat pouze aktivní příjemky
    if (receipt.status === 'storno') {
      throw new Error('Příjemka je již stornována')
    }

    if (receipt.status === 'draft') {
      throw new Error('Nelze stornovat koncept - ten lze smazat')
    }

    // 3. Označ příjemku jako storno
    await tx.receipt.update({
      where: { id: receiptId },
      data: {
        status: 'storno',
        stornoReason: reason,
        stornoAt: new Date(),
        stornoBy: userId || 'system',
      },
    })

    // 4. INVERZNÍ OPERACE: Odeber zboží ze skladu
    // (Příjemka naskladnila → storno musí vyskladnit)
    for (const invItem of receipt.inventoryItems) {
      // 4a. Označ původní inventoryItem jako STORNO
      await tx.inventoryItem.update({
        where: { id: invItem.id },
        data: {
          note: `STORNO ${receipt.receiptNumber} - ${reason}${invItem.note ? ' | Původní note: ' + invItem.note : ''}`
        }
      })

      // 4b. Vytvoř zápornou skladovou položku (inverzní záznam = protipohyb)
      await tx.inventoryItem.create({
        data: {
          productId:     invItem.productId,
          quantity:      -Number(invItem.quantity), // ZÁPORNÉ množství!
          unit:          invItem.unit,
          purchasePrice: invItem.purchasePrice,
          supplierId:    invItem.supplierId,
          receiptId:     receipt.id,
          date:          new Date(),
          note:          `STORNO ${receipt.receiptNumber} - ${reason}`,
          batchId:       invItem.batchId ?? undefined,
        },
      })
    }

    // 5. VRAŤ alreadyReceivedQuantity zpět (odečti stornované množství)
    if (receipt.purchaseOrderId) {
      for (const receiptItem of receipt.items) {
        if (!receiptItem.productId) continue

        const orderItem = await tx.purchaseOrderItem.findFirst({
          where: {
            purchaseOrderId: receipt.purchaseOrderId,
            productId: receiptItem.productId
          }
        })

        if (orderItem && receiptItem.receivedQuantity) {
          // Odečti stornované množství z alreadyReceivedQuantity
          await tx.purchaseOrderItem.update({
            where: { id: orderItem.id },
            data: {
              alreadyReceivedQuantity: {
                decrement: Number(receiptItem.receivedQuantity)
              }
            }
          })
        }
      }

      // 6. Aktualizuj status objednávky
      const updatedOrderItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: receipt.purchaseOrderId }
      })

      let allReceived = true
      let anyReceived = false

      for (const orderItem of updatedOrderItems) {
        const ordered = Number(orderItem.quantity)
        const received = Number(orderItem.alreadyReceivedQuantity)

        if (received > 0) anyReceived = true
        if (received < ordered) allReceived = false
      }

      const newStatus = allReceived ? 'received' : (anyReceived ? 'partially_received' : 'pending')

      await tx.purchaseOrder.update({
        where: { id: receipt.purchaseOrderId },
        data: { status: newStatus }
      })

      console.log(`✓ Storno příjemky ${receipt.receiptNumber} - objednávka ${receipt.purchaseOrder?.orderNumber} → ${newStatus}`)
    }

    // 7. Odpoj příjemku od faktury (částka faktury ZŮSTÁVÁ - je za celou objednávku)
    if (receipt.receivedInvoice) {
      // Odpoj příjemku od faktury (nová relace)
      await tx.receipt.update({
        where: { id: receipt.id },
        data: {
          receivedInvoiceId: null
        }
      })

      // Přidej poznámku o stornování (ČÁSTKU NEMĚNÍM - zůstává celá objednávka)
      await tx.receivedInvoice.update({
        where: { id: receipt.receivedInvoice.id },
        data: {
          note: `STORNO příjemky ${receipt.receiptNumber}: ${reason}${receipt.receivedInvoice.note ? '\n\n' + receipt.receivedInvoice.note : ''}`,
        },
      })
      console.log(`✓ Faktura ${receipt.receivedInvoice.invoiceNumber} - odpojena příjemka ${receipt.receiptNumber} (částka zůstává)`)
    }
  })

  console.log(`✅ Příjemka ${receiptId} byla stornována: ${reason}`)
}

/**
 * Stornuje výdejku
 *
 * Co se stane:
 * 1. Výdejka se označí jako "storno"
 * 2. Zboží se VRÁTÍ na sklad (inverzní operace k vyskladnění)
 * 3. Rezervace se uvolní
 *
 * @param deliveryNoteId - ID výdejky ke stornování
 * @param reason - Důvod storna (povinný!)
 * @param userId - Kdo stornuje (volitelné)
 */
export async function stornoDeliveryNote(
  deliveryNoteId: string,
  reason: string,
  userId?: string
): Promise<void> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Důvod storna je povinný')
  }

  await prisma.$transaction(async (tx) => {
    // 1. Načti výdejku
    const deliveryNote = await tx.deliveryNote.findUnique({
      where: { id: deliveryNoteId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customerOrder: {
          include: {
            items: true
          }
        }
      },
    })

    if (!deliveryNote) {
      throw new Error('Výdejka nenalezena')
    }

    // 2. Kontrola - lze stornovat pouze aktivní výdejky
    if (deliveryNote.status === 'storno') {
      throw new Error('Výdejka je již stornována')
    }

    if (deliveryNote.status === 'draft') {
      throw new Error('Nelze stornovat koncept - ten lze smazat')
    }

    // 3. Označ výdejku jako storno
    await tx.deliveryNote.update({
      where: { id: deliveryNoteId },
      data: {
        status: 'storno',
        stornoReason: reason,
        stornoAt: new Date(),
        stornoBy: userId || 'system',
      },
    })

    // 4. INVERZNÍ OPERACE: Vrať zboží na sklad
    // (Výdejka vyskladnila → storno musí naskladnit)
    for (const item of deliveryNote.items) {
      if (item.productId) {
        // 4a. Pokud existuje původní inventoryItem (záporný pohyb z vyskladnění), označ ho jako STORNO
        let originalBatchId: string | null = null
        if ((item as any).inventoryItemId) {
          const originalInventoryItem = await tx.inventoryItem.findUnique({
            where:  { id: (item as any).inventoryItemId },
            select: { batchId: true, note: true },
          })

          if (originalInventoryItem) {
            originalBatchId = originalInventoryItem.batchId
            await tx.inventoryItem.update({
              where: { id: (item as any).inventoryItemId },
              data: {
                note: `STORNO ${deliveryNote.deliveryNumber} - ${reason}${originalInventoryItem.note ? ' | Původní note: ' + originalInventoryItem.note : ''}`
              }
            })
          }
        }

        // 4b. Vytvoř KLADNOU skladovou položku (vrácení zpět = protipohyb)
        await tx.inventoryItem.create({
          data: {
            productId:     item.productId,
            quantity:      Number(item.quantity), // KLADNÉ množství (vrácení)
            unit:          item.unit,
            purchasePrice: item.product?.purchasePrice || 0,
            date:          new Date(),
            note:          `STORNO ${deliveryNote.deliveryNumber} - ${reason}`,
            batchId:       originalBatchId ?? undefined,
          },
        })
      }
    }

    // 5. Pokud je výdejka navázaná na objednávku zákazníka → uprav shippedQuantity
    if (deliveryNote.customerOrderId && deliveryNote.customerOrder) {
      const order = deliveryNote.customerOrder

      for (const deliveryItem of deliveryNote.items) {
        // Najdi odpovídající položku v objednávce
        const orderItem = order.items.find(
          oi => oi.productId === deliveryItem.productId
        )

        if (orderItem) {
          // Odečti stornované množství od shippedQuantity
          const newShippedQty = Math.max(0, Number(orderItem.shippedQuantity || 0) - Number(deliveryItem.quantity))

          await tx.customerOrderItem.update({
            where: { id: orderItem.id },
            data: {
              shippedQuantity: newShippedQty
            }
          })

          console.log(`✓ Aktualizována shippedQuantity pro ${deliveryItem.productName || deliveryItem.product?.name}: ${newShippedQty}`)
        }
      }

      // 6. Zkontroluj nový status objednávky
      // POZOR: Pokud je objednávka STORNO, NESMÍME měnit status!
      if (order.status !== 'storno') {
        const allOrderItems = await tx.customerOrderItem.findMany({
          where: { customerOrderId: order.id }
        })

        const anyShipped = allOrderItems.some(item => Number(item.shippedQuantity || 0) > 0)
        const allFullyShipped = allOrderItems.every(item =>
          Number(item.shippedQuantity || 0) >= Number(item.quantity)
        )

        let newOrderStatus = 'paid' // Default: zaplacená (čeká na vyskladnění)
        if (allFullyShipped) {
          newOrderStatus = 'shipped' // Kompletně odesláno
        } else if (anyShipped) {
          newOrderStatus = 'processing' // Částečně odesláno
        } else if (order.paidAt) {
          newOrderStatus = 'paid' // Zaplacená, čeká na vyskladnění
        } else {
          newOrderStatus = 'new' // Neuhrazená
        }

        await tx.customerOrder.update({
          where: { id: order.id },
          data: {
            status: newOrderStatus,
            shippedAt: allFullyShipped ? new Date() : null
            // paidAt NEMĚNÍME - zůstává zaplacená!
          }
        })

        console.log(`✓ Objednávka ${order.orderNumber} aktualizována na status: ${newOrderStatus} (paidAt zachováno)`)
      } else {
        console.log(`⚠ Objednávka ${order.orderNumber} je STORNO - status se NEAKTUALIZUJE`)
      }
    }

    // Hotovo - zboží vráceno na sklad
  })

  console.log(`✅ Výdejka ${deliveryNoteId} byla stornována: ${reason}`)
}

/**
 * Stornuje objednávku
 *
 * Co se stane:
 * 1. Objednávka se označí jako "storno"
 * 2. Faktura se označí jako "storno" (CASCADE)
 * 3. Kontrola, že objednávka nemá zpracované příjemky
 *
 * @param purchaseOrderId - ID objednávky ke stornování
 * @param reason - Důvod storna (povinný!)
 * @param userId - Kdo stornuje (volitelné)
 */
export async function stornoPurchaseOrder(
  purchaseOrderId: string,
  reason: string,
  userId?: string
): Promise<void> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Důvod storna je povinný')
  }

  await prisma.$transaction(async (tx) => {
    // 1. Načti objednávku
    const order = await tx.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: {
        receipts: true,
        invoice: true,
      },
    })

    if (!order) {
      throw new Error('Objednávka nenalezena')
    }

    // 2. Kontrola - lze stornovat pouze objednávky bez zpracovaných příjemek
    if (order.status === 'storno') {
      throw new Error('Objednávka je již stornována')
    }

    const hasProcessedReceipts = order.receipts.some(r => r.status === 'active')
    if (hasProcessedReceipts) {
      throw new Error('Nelze stornovat objednávku, která má zpracované příjemky. Stornuj nejdřív příjemky!')
    }

    // 3. Označ objednávku jako storno
    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: 'storno',
        stornoReason: reason,
        stornoAt: new Date(),
        stornoBy: userId || 'system',
      },
    })

    // 4. Označ fakturu jako storno (CASCADE)
    if (order.invoice) {
      await tx.receivedInvoice.update({
        where: { id: order.invoice.id },
        data: {
          status: 'storno',
          stornoReason: `Storno objednávky ${order.orderNumber}: ${reason}`,
          stornoAt: new Date(),
          stornoBy: userId || 'system',
        },
      })
      console.log(`✓ Faktura ${order.invoice.invoiceNumber} byla automaticky stornována (CASCADE)`)
    }

    console.log(`✅ Objednávka ${order.orderNumber} byla stornována: ${reason}`)
  })
}

/**
 * Stornuje fakturu
 *
 * Co se stane:
 * 1. Faktura se označí jako "storno"
 * 2. Kontrola, že faktura nemá zpracované příjemky
 *
 * @param invoiceId - ID faktury ke stornování
 * @param reason - Důvod storna (povinný!)
 * @param userId - Kdo stornuje (volitelné)
 */
export async function stornoReceivedInvoice(
  invoiceId: string,
  reason: string,
  userId?: string
): Promise<void> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Důvod storna je povinný')
  }

  await prisma.$transaction(async (tx) => {
    // 1. Načti fakturu
    const invoice = await tx.receivedInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        receipts: true,
        purchaseOrder: true,
      },
    })

    if (!invoice) {
      throw new Error('Faktura nenalezena')
    }

    // 2. Kontrola - lze stornovat pouze faktury, které nejsou již stornovány
    if (invoice.status === 'storno') {
      throw new Error('Faktura je již stornována')
    }

    // Poznámka: Faktura může mít příjemky - ty se řeší samostatně (vrátka nebo nová opravná faktura)

    // 3. Označ fakturu jako storno
    await tx.receivedInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'storno',
        stornoReason: reason,
        stornoAt: new Date(),
        stornoBy: userId || 'system',
      },
    })

    // 4. Označ objednávku jako storno (pokud existuje)
    if (invoice.purchaseOrder) {
      await tx.purchaseOrder.update({
        where: { id: invoice.purchaseOrder.id },
        data: {
          status: 'storno',
          stornoReason: `Storno faktury ${invoice.invoiceNumber}: ${reason}`,
          stornoAt: new Date(),
          stornoBy: userId || 'system',
        },
      })
      console.log(`✓ Objednávka ${invoice.purchaseOrder.orderNumber} byla automaticky stornována (CASCADE)`)
    }

    console.log(`✅ Faktura ${invoice.invoiceNumber} byla stornována: ${reason}`)
  })
}

/**
 * Kontrola, zda lze dokument stornovat
 */
export async function canStorno(
  documentType: 'receipt' | 'delivery_note' | 'purchase_order' | 'received_invoice',
  documentId: string
): Promise<{ canStorno: boolean; reason?: string }> {
  if (documentType === 'receipt') {
    const receipt = await prisma.receipt.findUnique({
      where: { id: documentId },
    })

    if (!receipt) {
      return { canStorno: false, reason: 'Doklad nenalezen' }
    }

    if (receipt.status === 'storno') {
      return { canStorno: false, reason: 'Doklad je již stornován' }
    }

    if (receipt.status === 'draft') {
      return { canStorno: false, reason: 'Koncept lze smazat, ne stornovat' }
    }

    return { canStorno: true }
  }

  if (documentType === 'delivery_note') {
    const deliveryNote = await prisma.deliveryNote.findUnique({
      where: { id: documentId },
    })

    if (!deliveryNote) {
      return { canStorno: false, reason: 'Doklad nenalezen' }
    }

    if (deliveryNote.status === 'storno') {
      return { canStorno: false, reason: 'Doklad je již stornován' }
    }

    if (deliveryNote.status === 'draft') {
      return { canStorno: false, reason: 'Koncept lze smazat, ne stornovat' }
    }

    return { canStorno: true }
  }

  if (documentType === 'purchase_order') {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: documentId },
      include: {
        receipts: true,
      },
    })

    if (!order) {
      return { canStorno: false, reason: 'Doklad nenalezen' }
    }

    if (order.status === 'storno') {
      return { canStorno: false, reason: 'Doklad je již stornován' }
    }

    const hasProcessedReceipts = order.receipts.some(r => r.status === 'active')
    if (hasProcessedReceipts) {
      return { canStorno: false, reason: 'Objednávka má zpracované příjemky - stornuj nejdřív příjemky!' }
    }

    return { canStorno: true }
  }

  if (documentType === 'received_invoice') {
    const invoice = await prisma.receivedInvoice.findUnique({
      where: { id: documentId },
    })

    if (!invoice) {
      return { canStorno: false, reason: 'Doklad nenalezen' }
    }

    if (invoice.status === 'storno') {
      return { canStorno: false, reason: 'Doklad je již stornován' }
    }

    // Faktura může mít příjemky - ty se řeší samostatně (vrátka nebo nová opravná faktura)
    return { canStorno: true }
  }

  return { canStorno: false, reason: 'Neznámý typ dokumentu' }
}
