// API Endpoint pro zpracování příjemky (naskladnění)
// URL: /api/receipts/[id]/process
// NOVÝ WORKFLOW: Tahová logika s validací zbývajícího množství

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentNumbering'
import { findOrCreateBatch, type BatchInput } from '@/lib/batchUtils'

export const dynamic = 'force-dynamic'

// Typy pro request body
interface ProcessReceiptRequest {
  items: Array<{
    id: string // ID ReceiptItem
    receivedQuantity: number
    batchData?: BatchInput | null
  }>
  receiptDate?: string
  invoiceData?: {
    invoiceNumber?: string
    invoiceDate: string
    dueDate?: string
    note?: string
  }
}

// POST /api/receipts/[id]/process - Zpracovat příjemku s validací remaining quantity
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Parsuj request body
    const body: ProcessReceiptRequest = await request.json()

    // Validace
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Chybí položky k naskladnění' },
        { status: 400 }
      )
    }

    // Načti příjemku s položkami
    const receipt = await prisma.receipt.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        purchaseOrder: {
          include: {
            items: true
          }
        },
        supplier: true
      }
    })

    if (!receipt) {
      return NextResponse.json(
        { error: 'Příjemka nenalezena' },
        { status: 404 }
      )
    }

    // Kontrola statusu
    if (receipt.status === 'active' && receipt.processedAt) {
      return NextResponse.json(
        { error: 'Příjemka již byla zpracována' },
        { status: 400 }
      )
    }

    if (receipt.status === 'storno') {
      return NextResponse.json(
        { error: 'Příjemka je stornována' },
        { status: 400 }
      )
    }

    if (!receipt.purchaseOrderId) {
      return NextResponse.json(
        { error: 'Příjemka není propojena s objednávkou' },
        { status: 400 }
      )
    }

    // KRITICKÁ VALIDACE: Zkontroluj, že nepřekračujeme remaining quantity
    for (const itemData of body.items) {
      const receiptItem = receipt.items.find(i => i.id === itemData.id)
      if (!receiptItem || !receiptItem.productId) continue

      const orderItem = receipt.purchaseOrder?.items.find(
        oi => oi.productId === receiptItem.productId
      )
      if (!orderItem) continue

      // Vypočítej zbývající množství
      const ordered = Number(orderItem.quantity)
      const alreadyReceived = Number(orderItem.alreadyReceivedQuantity)
      const remaining = ordered - alreadyReceived

      // Validace: receivedQuantity nesmí překročit remaining
      if (itemData.receivedQuantity > remaining) {
        const productName = receiptItem.product?.name || receiptItem.productName || 'Neznámý produkt'
        return NextResponse.json(
          {
            error: `❌ CHYBA: Nelze přijmout ${itemData.receivedQuantity} ${receiptItem.unit} produktu "${productName}".\n\nObjednáno: ${ordered}\nJiž přijato: ${alreadyReceived}\nZbývá: ${remaining}\n\nMaximum k přijetí: ${remaining} ${receiptItem.unit}`
          },
          { status: 400 }
        )
      }

      // Kontrola, že receivedQuantity není záporné nebo nula
      if (itemData.receivedQuantity <= 0) {
        const productName = receiptItem.product?.name || receiptItem.productName || 'Neznámý produkt'
        return NextResponse.json(
          {
            error: `Množství k přijetí musí být větší než 0 pro produkt "${productName}"`
          },
          { status: 400 }
        )
      }
    }

    // Validace data příjmu
    let actualReceiptDate = receipt.receiptDate
    if (body.receiptDate) {
      const selectedDate = new Date(body.receiptDate)
      const today = new Date()

      // Kontrola: datum nesmí být v budoucnosti
      if (selectedDate > today) {
        return NextResponse.json(
          { error: 'Datum příjmu nesmí být v budoucnosti' },
          { status: 400 }
        )
      }

      actualReceiptDate = selectedDate
    }

    // Zjisti, jestli se změnil rok (a je potřeba přegenerovat číslo)
    const oldYear = receipt.receiptDate.getFullYear()
    const newYear = actualReceiptDate.getFullYear()
    const needsNewNumber = oldYear !== newYear

    // Zpracování v transakci (ON-COMMIT)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Aktualizuj receivedQuantity u všech položek příjemky
      for (const itemData of body.items) {
        await tx.receiptItem.update({
          where: { id: itemData.id },
          data: {
            receivedQuantity: itemData.receivedQuantity
          }
        })
      }

      // 2. Přegeneruj číslo příjemky, pokud se změnil rok
      let newReceiptNumber = receipt.receiptNumber
      if (needsNewNumber) {
        newReceiptNumber = await getNextDocumentNumber('receipt', tx, actualReceiptDate)
        console.log(`✓ Přegenerováno číslo příjemky: ${receipt.receiptNumber} → ${newReceiptNumber} (změna roku ${oldYear} → ${newYear})`)
      }

      // 3. Změň status příjemky na "active" (naskladněno) + aktualizuj datum
      await tx.receipt.update({
        where: { id: params.id },
        data: {
          status: 'active',
          processedAt: new Date(),
          receiptDate: actualReceiptDate,
          receiptNumber: newReceiptNumber
        }
      })

      // 4. Naskladni každou položku (použij receivedQuantity) a propoj s ReceiptItem
      for (const itemData of body.items) {
        const item = receipt.items.find(i => i.id === itemData.id)
        if (!item || !item.productId) continue

        // Naskladni skutečně přijaté množství
        if (itemData.receivedQuantity > 0) {
          // Resolve batch — find-or-create within this transaction
          const batchId = await findOrCreateBatch(
            tx,
            item.productId,
            receipt.supplierId,
            actualReceiptDate,
            itemData.batchData ?? null,
          )

          // Vytvoř InventoryItem
          const inventoryItem = await tx.inventoryItem.create({
            data: {
              productId: item.productId,
              quantity: itemData.receivedQuantity,
              unit: item.unit,
              purchasePrice: item.purchasePrice,
              vatRate: item.vatRate || 21,
              supplierId: receipt.supplierId,
              receiptId: receipt.id,
              batchId,
              date: actualReceiptDate,
              note: null
            }
          })

          // Propoj ReceiptItem s InventoryItem + zapiš batchId
          await tx.receiptItem.update({
            where: { id: itemData.id },
            data: {
              inventoryItemId: inventoryItem.id,
              batchId,
            }
          })
        }
      }

      // 5. AKTUALIZUJ alreadyReceivedQuantity v PurchaseOrderItem
      for (const itemData of body.items) {
        const receiptItem = receipt.items.find(i => i.id === itemData.id)
        if (!receiptItem || !receiptItem.productId) continue

        const orderItem = receipt.purchaseOrder?.items.find(
          oi => oi.productId === receiptItem.productId
        )
        if (!orderItem) continue

        // Přičti receivedQuantity k alreadyReceivedQuantity
        await tx.purchaseOrderItem.update({
          where: { id: orderItem.id },
          data: {
            alreadyReceivedQuantity: {
              increment: itemData.receivedQuantity
            }
          }
        })
      }

      // 6. Aktualizuj status objednávky (podle toho, jestli je vše přijato)
      if (receipt.purchaseOrder) {
        // Načti aktualizované položky objednávky
        const updatedOrderItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: receipt.purchaseOrderId! }
        })

        // Zkontroluj, zda je vše přijato
        let allReceived = true
        let anyReceived = false

        for (const orderItem of updatedOrderItems) {
          const ordered = Number(orderItem.quantity)
          const received = Number(orderItem.alreadyReceivedQuantity)

          if (received > 0) anyReceived = true
          if (received < ordered) allReceived = false
        }

        // Nastav status
        let newStatus = 'pending'
        if (allReceived) {
          newStatus = 'received'
        } else if (anyReceived) {
          newStatus = 'partially_received'
        }

        await tx.purchaseOrder.update({
          where: { id: receipt.purchaseOrderId! },
          data: { status: newStatus }
        })

        console.log(`✓ Objednávka ${receipt.purchaseOrder.orderNumber} - status: ${newStatus}`)
      }

      // 7. PROPOJ s existující fakturou (pokud existuje objednávka)
      if (receipt.purchaseOrderId) {
        // Najdi fakturu pro tuto objednávku
        // Fallback: pokud neexistuje (starší objednávky), vytvoř ji teď
        let existingInvoice = await tx.receivedInvoice.findUnique({
          where: { purchaseOrderId: receipt.purchaseOrderId }
        })

        if (!existingInvoice) {
          const invoiceNum = body.invoiceData?.invoiceNumber?.trim() || `FA-OBJ-${receipt.purchaseOrder?.orderNumber}`
          existingInvoice = await tx.receivedInvoice.create({
            data: {
              invoiceNumber: invoiceNum,
              isTemporary: !body.invoiceData?.invoiceNumber,
              purchaseOrderId: receipt.purchaseOrderId,
              invoiceDate: body.invoiceData?.invoiceDate ? new Date(body.invoiceData.invoiceDate) : new Date(),
              dueDate: body.invoiceData?.dueDate ? new Date(body.invoiceData.dueDate) : null,
              totalAmount: receipt.purchaseOrder?.totalAmount ?? 0,
              totalAmountWithoutVat: receipt.purchaseOrder?.totalAmountWithoutVat ?? 0,
              totalVatAmount: receipt.purchaseOrder?.totalVatAmount ?? 0,
              paymentType: 'transfer',
              note: body.invoiceData?.note || null,
            }
          })
          console.log(`⚠️ Faktura nebyla nalezena pro objednávku ${receipt.purchaseOrder?.orderNumber} — vytvořena nová: ${invoiceNum}`)
        }

        // Propoj příjemku s fakturou
        await tx.receipt.update({
          where: { id: receipt.id },
          data: {
            receivedInvoiceId: existingInvoice.id
          }
        })

        // Aktualizuj fakturu - POUZE číslo a datum, ČÁSTKA ZŮSTÁVÁ!
        let invoiceNumber = existingInvoice.invoiceNumber
        let isTemporary = existingInvoice.isTemporary

        // Pokud uživatel zadal skutečné číslo faktury, přepiš ho
        if (body.invoiceData?.invoiceNumber && body.invoiceData.invoiceNumber.trim() !== '') {
          invoiceNumber = body.invoiceData.invoiceNumber
          isTemporary = false
        }

        await tx.receivedInvoice.update({
          where: { id: existingInvoice.id },
          data: {
            invoiceNumber, // Přepiš číslo (pokud zadáno)
            isTemporary,
            // totalAmount NEMĚNÍM - zůstává celá částka objednávky!
            invoiceDate: body.invoiceData?.invoiceDate
              ? new Date(body.invoiceData.invoiceDate)
              : existingInvoice.invoiceDate,
            dueDate: body.invoiceData?.dueDate
              ? new Date(body.invoiceData.dueDate)
              : existingInvoice.dueDate,
            note: body.invoiceData?.note || existingInvoice.note
          }
        })

        console.log(`✓ Faktura ${invoiceNumber} ${isTemporary ? '(DOČASNÁ)' : '(SKUTEČNÁ)'} propojeno s příjemkou ${receipt.receiptNumber}`)
      } else {
        // Příjemka bez objednávky - vytvoř novou fakturu (starý flow)
        let totalAmountWithoutVat = 0
        let totalVatAmt = 0
        for (const itemData of body.items) {
          const item = receipt.items.find(i => i.id === itemData.id)
          if (item) {
            const lineBase = itemData.receivedQuantity * Number(item.purchasePrice)
            const lineVat = lineBase * Number(item.vatRate || 21) / 100
            totalAmountWithoutVat += lineBase
            totalVatAmt += lineVat
          }
        }
        const totalAmount = Math.round((totalAmountWithoutVat + totalVatAmt) * 100) / 100
        totalAmountWithoutVat = Math.round(totalAmountWithoutVat * 100) / 100
        totalVatAmt = Math.round(totalVatAmt * 100) / 100

        const invoiceNumber = body.invoiceData?.invoiceNumber && body.invoiceData.invoiceNumber.trim() !== ''
          ? body.invoiceData.invoiceNumber
          : `TEMP-${receipt.receiptNumber}`

        const createdInvoice = await tx.receivedInvoice.create({
          data: {
            invoiceNumber,
            isTemporary: !body.invoiceData?.invoiceNumber,
            invoiceDate: body.invoiceData?.invoiceDate
              ? new Date(body.invoiceData.invoiceDate)
              : new Date(),
            dueDate: body.invoiceData?.dueDate ? new Date(body.invoiceData.dueDate) : null,
            totalAmount,
            totalAmountWithoutVat,
            totalVatAmount: totalVatAmt,
            paymentType: 'transfer',
            note: body.invoiceData?.note || null
          }
        })

        // Connect receipt to this invoice
        await tx.receipt.update({
          where: { id: receipt.id },
          data: {
            receivedInvoiceId: createdInvoice.id
          }
        })

        console.log(`✓ Vytvořena nová faktura ${invoiceNumber} pro příjemku bez objednávky`)
      }

      return { success: true }
    })

    // ── Stock webhook: notifikuj e-shop o změně skladu ──────────────────────
    // Collect ERP product IDs of received items (fire-and-forget)
    const affectedProductIds = body.items
      .map(i => receipt.items.find(ri => ri.id === i.id)?.productId)
      .filter((id): id is string => Boolean(id))
    if (affectedProductIds.length > 0) {
      import('@/lib/eshopStockWebhook').then(({ notifyEshopStockUpdate }) =>
        notifyEshopStockUpdate(affectedProductIds)
      ).catch(() => {})
    }

    // Načti aktualizovanou příjemku S objednávkou
    const updated = await prisma.receipt.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        purchaseOrder: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        items: {
          include: {
            product: true
          }
        },
        inventoryItems: true,
        receivedInvoice: true
      }
    })

    console.log(`✓ Příjemka ${receipt.receiptNumber} byla zpracována a naskladněna`)

    // Vrať příjemku I s aktualizovanou objednávkou
    return NextResponse.json({
      receipt: updated,
      purchaseOrder: updated?.purchaseOrder
    })
  } catch (error) {
    console.error('Chyba při zpracování příjemky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se zpracovat příjemku' },
      { status: 500 }
    )
  }
}
