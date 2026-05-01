/**
 * STORNO Logika - České Účetní Standardy
 *
 * Doklady se NIKDY nemažou - pouze se stornují.
 * Storno automaticky provede inverzní operaci na skladě.
 */

import { prisma } from './prisma'
import { createAuditLog } from './auditService'
import {
  ReceiptStatus,
  DeliveryNoteStatus,
  PurchaseOrderStatus,
  ReceivedInvoiceStatus,
  CustomerOrderStatus,
} from './constants'

/**
 * Stornuje příjemku
 *
 * Co se stane:
 * 1. Příjemka se označí jako storno
 * 2. Zboží se ODEČTE ze skladu (inverzní operace k naskladnění)
 * 3. Status objednávky se přepočítá
 */
export async function stornoReceipt(
  receiptId: string,
  reason: string,
  userId?: string
): Promise<void> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Důvod storna je povinný')
  }

  const previousStatus = await prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.findUnique({
      where: { id: receiptId },
      include: {
        items: true,
        inventoryItems: true,
        purchaseOrder: true,
        receivedInvoice: true,
      },
    })

    if (!receipt) {
      throw new Error('Příjemka nenalezena')
    }

    if (receipt.status === ReceiptStatus.STORNO) {
      throw new Error('Příjemka je již stornována')
    }

    if (receipt.status === ReceiptStatus.DRAFT) {
      throw new Error('Nelze stornovat koncept - ten lze smazat')
    }

    await tx.receipt.update({
      where: { id: receiptId },
      data: {
        status: ReceiptStatus.STORNO,
        stornoReason: reason,
        stornoAt: new Date(),
        stornoBy: userId || 'system',
      },
    })

    // INVERZNÍ OPERACE: Odeber zboží ze skladu
    for (const invItem of receipt.inventoryItems) {
      await tx.inventoryItem.update({
        where: { id: invItem.id },
        data: {
          note: `STORNO ${receipt.receiptNumber} - ${reason}${invItem.note ? ' | Původní note: ' + invItem.note : ''}`
        }
      })

      await tx.inventoryItem.create({
        data: {
          productId:     invItem.productId,
          quantity:      -Number(invItem.quantity),
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

    // Vrať alreadyReceivedQuantity zpět
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

      const newStatus = allReceived
        ? PurchaseOrderStatus.RECEIVED
        : (anyReceived ? PurchaseOrderStatus.PARTIALLY_RECEIVED : PurchaseOrderStatus.PENDING)

      await tx.purchaseOrder.update({
        where: { id: receipt.purchaseOrderId },
        data: { status: newStatus }
      })
    }

    if (receipt.receivedInvoice) {
      await tx.receipt.update({
        where: { id: receipt.id },
        data: { receivedInvoiceId: null }
      })

      await tx.receivedInvoice.update({
        where: { id: receipt.receivedInvoice.id },
        data: {
          note: `STORNO příjemky ${receipt.receiptNumber}: ${reason}${receipt.receivedInvoice.note ? '\n\n' + receipt.receivedInvoice.note : ''}`,
        },
      })
    }

    return receipt.status
  })

  await createAuditLog({
    userId:     userId || 'system',
    username:   userId || 'system',
    actionType: 'UPDATE',
    entityName: 'Receipt',
    entityId:   receiptId,
    fieldName:  'status',
    oldValue:   previousStatus,
    newValue:   ReceiptStatus.STORNO,
    module:     'receipts',
  })
}

/**
 * Stornuje výdejku
 *
 * Co se stane:
 * 1. Výdejka se označí jako storno
 * 2. Zboží se VRÁTÍ na sklad (inverzní operace k vyskladnění)
 * 3. Rezervace se uvolní
 */
export async function stornoDeliveryNote(
  deliveryNoteId: string,
  reason: string,
  userId?: string
): Promise<void> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Důvod storna je povinný')
  }

  const previousStatus = await prisma.$transaction(async (tx) => {
    const deliveryNote = await tx.deliveryNote.findUnique({
      where: { id: deliveryNoteId },
      include: {
        items: {
          include: { product: true },
        },
        customerOrder: {
          include: { items: true }
        }
      },
    })

    if (!deliveryNote) {
      throw new Error('Výdejka nenalezena')
    }

    if (deliveryNote.status === DeliveryNoteStatus.STORNO) {
      throw new Error('Výdejka je již stornována')
    }

    if (deliveryNote.status === DeliveryNoteStatus.DRAFT) {
      throw new Error('Nelze stornovat koncept - ten lze smazat')
    }

    await tx.deliveryNote.update({
      where: { id: deliveryNoteId },
      data: {
        status: DeliveryNoteStatus.STORNO,
        stornoReason: reason,
        stornoAt: new Date(),
        stornoBy: userId || 'system',
      },
    })

    // INVERZNÍ OPERACE: Vrať zboží na sklad
    for (const item of deliveryNote.items) {
      if (item.productId) {
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

        await tx.inventoryItem.create({
          data: {
            productId:     item.productId,
            quantity:      Number(item.quantity),
            unit:          item.unit,
            purchasePrice: item.product?.purchasePrice || 0,
            date:          new Date(),
            note:          `STORNO ${deliveryNote.deliveryNumber} - ${reason}`,
            batchId:       originalBatchId ?? undefined,
          },
        })
      }
    }

    if (deliveryNote.customerOrderId && deliveryNote.customerOrder) {
      const order = deliveryNote.customerOrder

      for (const deliveryItem of deliveryNote.items) {
        const orderItem = order.items.find(
          oi => oi.productId === deliveryItem.productId
        )

        if (orderItem) {
          const newShippedQty = Math.max(0, Number(orderItem.shippedQuantity || 0) - Number(deliveryItem.quantity))
          await tx.customerOrderItem.update({
            where: { id: orderItem.id },
            data: { shippedQuantity: newShippedQty }
          })
        }
      }

      if (order.status !== CustomerOrderStatus.STORNO) {
        const allOrderItems = await tx.customerOrderItem.findMany({
          where: { customerOrderId: order.id }
        })

        const anyShipped = allOrderItems.some(item => Number(item.shippedQuantity || 0) > 0)
        const allFullyShipped = allOrderItems.every(item =>
          Number(item.shippedQuantity || 0) >= Number(item.quantity)
        )

        let newOrderStatus: string
        if (allFullyShipped) {
          newOrderStatus = CustomerOrderStatus.SHIPPED
        } else if (anyShipped) {
          newOrderStatus = CustomerOrderStatus.PROCESSING
        } else if (order.paidAt) {
          newOrderStatus = CustomerOrderStatus.PAID
        } else {
          newOrderStatus = CustomerOrderStatus.NEW
        }

        await tx.customerOrder.update({
          where: { id: order.id },
          data: {
            status: newOrderStatus,
            shippedAt: allFullyShipped ? new Date() : null
          }
        })
      }
    }

    return deliveryNote.status
  })

  await createAuditLog({
    userId:     userId || 'system',
    username:   userId || 'system',
    actionType: 'UPDATE',
    entityName: 'DeliveryNote',
    entityId:   deliveryNoteId,
    fieldName:  'status',
    oldValue:   previousStatus,
    newValue:   DeliveryNoteStatus.STORNO,
    module:     'delivery-notes',
  })
}

/**
 * Stornuje nákupní objednávku
 *
 * Co se stane:
 * 1. Objednávka se označí jako storno
 * 2. Faktura se označí jako storno (CASCADE)
 * 3. Kontrola, že objednávka nemá zpracované příjemky
 */
export async function stornoPurchaseOrder(
  purchaseOrderId: string,
  reason: string,
  userId?: string
): Promise<void> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Důvod storna je povinný')
  }

  const previousStatus = await prisma.$transaction(async (tx) => {
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

    if (order.status === PurchaseOrderStatus.STORNO) {
      throw new Error('Objednávka je již stornována')
    }

    const hasProcessedReceipts = order.receipts.some(r => r.status === ReceiptStatus.ACTIVE)
    if (hasProcessedReceipts) {
      throw new Error('Nelze stornovat objednávku, která má zpracované příjemky. Stornuj nejdřív příjemky!')
    }

    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: PurchaseOrderStatus.STORNO,
        stornoReason: reason,
        stornoAt: new Date(),
        stornoBy: userId || 'system',
      },
    })

    if (order.invoice) {
      await tx.receivedInvoice.update({
        where: { id: order.invoice.id },
        data: {
          status: ReceivedInvoiceStatus.STORNO,
          stornoReason: `Storno objednávky ${order.orderNumber}: ${reason}`,
          stornoAt: new Date(),
          stornoBy: userId || 'system',
        },
      })
    }

    return order.status
  })

  await createAuditLog({
    userId:     userId || 'system',
    username:   userId || 'system',
    actionType: 'UPDATE',
    entityName: 'PurchaseOrder',
    entityId:   purchaseOrderId,
    fieldName:  'status',
    oldValue:   previousStatus,
    newValue:   PurchaseOrderStatus.STORNO,
    module:     'purchase-orders',
  })
}

/**
 * Stornuje přijatou fakturu
 *
 * Co se stane:
 * 1. Faktura se označí jako storno
 * 2. Objednávka se označí jako storno (CASCADE)
 */
export async function stornoReceivedInvoice(
  invoiceId: string,
  reason: string,
  userId?: string
): Promise<void> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Důvod storna je povinný')
  }

  const previousStatus = await prisma.$transaction(async (tx) => {
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

    if (invoice.status === ReceivedInvoiceStatus.STORNO) {
      throw new Error('Faktura je již stornována')
    }

    await tx.receivedInvoice.update({
      where: { id: invoiceId },
      data: {
        status: ReceivedInvoiceStatus.STORNO,
        stornoReason: reason,
        stornoAt: new Date(),
        stornoBy: userId || 'system',
      },
    })

    if (invoice.purchaseOrder) {
      await tx.purchaseOrder.update({
        where: { id: invoice.purchaseOrder.id },
        data: {
          status: PurchaseOrderStatus.STORNO,
          stornoReason: `Storno faktury ${invoice.invoiceNumber}: ${reason}`,
          stornoAt: new Date(),
          stornoBy: userId || 'system',
        },
      })
    }

    return invoice.status
  })

  await createAuditLog({
    userId:     userId || 'system',
    username:   userId || 'system',
    actionType: 'UPDATE',
    entityName: 'ReceivedInvoice',
    entityId:   invoiceId,
    fieldName:  'status',
    oldValue:   previousStatus,
    newValue:   ReceivedInvoiceStatus.STORNO,
    module:     'received-invoices',
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
    const receipt = await prisma.receipt.findUnique({ where: { id: documentId } })
    if (!receipt) return { canStorno: false, reason: 'Doklad nenalezen' }
    if (receipt.status === ReceiptStatus.STORNO) return { canStorno: false, reason: 'Doklad je již stornován' }
    if (receipt.status === ReceiptStatus.DRAFT) return { canStorno: false, reason: 'Koncept lze smazat, ne stornovat' }
    return { canStorno: true }
  }

  if (documentType === 'delivery_note') {
    const deliveryNote = await prisma.deliveryNote.findUnique({ where: { id: documentId } })
    if (!deliveryNote) return { canStorno: false, reason: 'Doklad nenalezen' }
    if (deliveryNote.status === DeliveryNoteStatus.STORNO) return { canStorno: false, reason: 'Doklad je již stornován' }
    if (deliveryNote.status === DeliveryNoteStatus.DRAFT) return { canStorno: false, reason: 'Koncept lze smazat, ne stornovat' }
    return { canStorno: true }
  }

  if (documentType === 'purchase_order') {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: documentId },
      include: { receipts: true },
    })
    if (!order) return { canStorno: false, reason: 'Doklad nenalezen' }
    if (order.status === PurchaseOrderStatus.STORNO) return { canStorno: false, reason: 'Doklad je již stornován' }
    const hasProcessedReceipts = order.receipts.some(r => r.status === ReceiptStatus.ACTIVE)
    if (hasProcessedReceipts) return { canStorno: false, reason: 'Objednávka má zpracované příjemky - stornuj nejdřív příjemky!' }
    return { canStorno: true }
  }

  if (documentType === 'received_invoice') {
    const invoice = await prisma.receivedInvoice.findUnique({ where: { id: documentId } })
    if (!invoice) return { canStorno: false, reason: 'Doklad nenalezen' }
    if (invoice.status === ReceivedInvoiceStatus.STORNO) return { canStorno: false, reason: 'Doklad je již stornován' }
    return { canStorno: true }
  }

  return { canStorno: false, reason: 'Neznámý typ dokumentu' }
}
