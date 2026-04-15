// API Endpoint pro přímé naskladnění z objednávky (ATOMIC)
// URL: /api/purchase-orders/[id]/receive
// NOVÝ WORKFLOW: Všechno naráz - příjemka + sklad + faktura v jedné transakci

import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentNumbering'

export const dynamic = 'force-dynamic'

// Typy pro request body
interface ReceiveOrderRequest {
  items: Array<{
    productId: string
    receivedQuantity: number // Skutečně přijaté množství
  }>
  receiptDate?: string // Datum příjmu zboží (kdy fyzicky dorazilo)
  invoiceData?: {
    invoiceNumber?: string // Může být prázdné - vytvoří se dočasná
    invoiceDate: string
    dueDate?: string
    note?: string
  }
}

// POST /api/purchase-orders/[id]/receive - Přímé naskladnění (atomická operace)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Parsuj request body
    const body: ReceiveOrderRequest = await request.json()

    // Validace
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Chybí položky k naskladnění' },
        { status: 400 }
      )
    }

    // Načti objednávku
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        supplier: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      )
    }

    // KRITICKÁ VALIDACE: Zkontroluj zbývající množství
    for (const itemData of body.items) {
      const orderItem = order.items.find(oi => oi.productId === itemData.productId)
      if (!orderItem) {
        return NextResponse.json(
          { error: `Produkt ${itemData.productId} není v objednávce` },
          { status: 400 }
        )
      }

      const ordered = Number(orderItem.quantity)
      const alreadyReceived = Number(orderItem.alreadyReceivedQuantity)
      const remaining = ordered - alreadyReceived

      // Validace: receivedQuantity nesmí překročit remaining
      if (itemData.receivedQuantity > remaining) {
        const productName = orderItem.product?.name || orderItem.productName || 'Neznámý produkt'
        return NextResponse.json(
          {
            error: `❌ CHYBA: Nelze přijmout ${itemData.receivedQuantity} ks produktu "${productName}".\n\n` +
                   `Objednáno: ${ordered}\n` +
                   `Již přijato: ${alreadyReceived}\n` +
                   `Zbývá: ${remaining}\n\n` +
                   `Maximum k přijetí: ${remaining} ks`
          },
          { status: 400 }
        )
      }

      // Kontrola, že receivedQuantity není záporné nebo nula
      if (itemData.receivedQuantity <= 0) {
        const productName = orderItem.product?.name || orderItem.productName || 'Neznámý produkt'
        return NextResponse.json(
          { error: `Množství k přijetí musí být větší než 0 pro produkt "${productName}"` },
          { status: 400 }
        )
      }
    }

    // Validace data příjmu
    let actualReceiptDate = new Date()
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

    // ATOMICKÁ TRANSAKCE: Všechno naráz
    const result = await prisma.$transaction(async (tx) => {
      // 1. Vygeneruj číslo příjemky (ON-COMMIT) s datem příjmu
      const receiptNumber = await getNextDocumentNumber('receipt', tx, actualReceiptDate)

      // 2. Vytvoř příjemku (finální, ne draft!)
      const receipt = await tx.receipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: order.id,
          supplierId: order.supplierId,
          supplierName: order.supplierName,
          supplierICO: order.supplierICO,
          supplierDIC: order.supplierDIC,
          supplierAddress: order.supplierAddress,
          receiptDate: actualReceiptDate,
          note: null, // Poznámka se nevyplňuje automaticky
          status: 'active', // Rovnou aktivní (naskladněno)
          processedAt: new Date(),
          items: {
            create: body.items.map((itemData) => {
              const orderItem = order.items.find(oi => oi.productId === itemData.productId)!
              return {
                productId: itemData.productId,
                productName: orderItem.productName,
                quantity: orderItem.quantity, // Původní objednané množství (pro info)
                receivedQuantity: itemData.receivedQuantity, // Skutečně přijaté
                unit: orderItem.unit,
                purchasePrice: orderItem.expectedPrice || 0
              }
            })
          }
        },
        include: {
          items: true // ✅ Načti vytvořené items pro propojení
        }
      })

      // 3. Naskladni každou položku a propoj s ReceiptItem
      for (const itemData of body.items) {
        // Přeskoč manuální položky bez productId (nelze naskladnit do InventoryItem)
        if (!itemData.productId) continue

        const orderItem = order.items.find(oi => oi.productId === itemData.productId)!

        // Najdi odpovídající ReceiptItem
        const receiptItem = receipt.items.find(ri => ri.productId === itemData.productId)
        if (!receiptItem) continue

        // Vytvoř InventoryItem
        const inventoryItem = await tx.inventoryItem.create({
          data: {
            productId: itemData.productId,
            quantity: itemData.receivedQuantity,
            unit: orderItem.unit,
            purchasePrice: orderItem.expectedPrice || 0,
            supplierId: order.supplierId,
            receiptId: receipt.id,
            date: actualReceiptDate,
            note: null
          }
        })

        // Propoj ReceiptItem s InventoryItem
        await tx.receiptItem.update({
          where: { id: receiptItem.id },
          data: {
            inventoryItemId: inventoryItem.id
          }
        })
      }

      // 4. Aktualizuj alreadyReceivedQuantity v objednávce
      for (const itemData of body.items) {
        const orderItem = order.items.find(oi => oi.productId === itemData.productId)!

        await tx.purchaseOrderItem.update({
          where: { id: orderItem.id },
          data: {
            alreadyReceivedQuantity: {
              increment: itemData.receivedQuantity
            }
          }
        })
      }

      // 5. Aktualizuj status objednávky
      const updatedOrderItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: order.id }
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
        where: { id: order.id },
        data: { status: newStatus }
      })

      // 6. PROPOJ s existující fakturou (vytvořenou při objednání)
      // Pokud faktura neexistuje (starší objednávky), vytvoř ji teď
      let existingInvoice = await tx.receivedInvoice.findUnique({
        where: { purchaseOrderId: order.id }
      })

      if (!existingInvoice) {
        // Fallback: faktura nebyla vytvořena při objednání — vytvoř ji nyní
        const invoiceNum = body.invoiceData?.invoiceNumber?.trim() || `FA-OBJ-${order.orderNumber}`
        existingInvoice = await tx.receivedInvoice.create({
          data: {
            invoiceNumber: invoiceNum,
            isTemporary: !body.invoiceData?.invoiceNumber,
            purchaseOrderId: order.id,
            invoiceDate: body.invoiceData?.invoiceDate ? new Date(body.invoiceData.invoiceDate) : actualReceiptDate,
            dueDate: body.invoiceData?.dueDate ? new Date(body.invoiceData.dueDate) : null,
            totalAmount: order.totalAmount ?? 0,
            totalAmountWithoutVat: order.totalAmountWithoutVat ?? 0,
            totalVatAmount: order.totalVatAmount ?? 0,
            paymentType: 'transfer',
            note: body.invoiceData?.note || null,
          }
        })
        console.log(`⚠️ Faktura nebyla nalezena pro objednávku ${order.orderNumber} — vytvořena nová: ${invoiceNum}`)
      }

      // Propoj příjemku s fakturou
      await tx.receipt.update({
        where: { id: receipt.id },
        data: { receivedInvoiceId: existingInvoice.id }
      })

      // Aktualizuj fakturu — POUZE číslo a datum, ČÁSTKA ZŮSTÁVÁ
      let invoiceNumber = existingInvoice.invoiceNumber
      let isTemporary = existingInvoice.isTemporary

      if (body.invoiceData?.invoiceNumber && body.invoiceData.invoiceNumber.trim() !== '') {
        invoiceNumber = body.invoiceData.invoiceNumber
        isTemporary = false
      }

      await tx.receivedInvoice.update({
        where: { id: existingInvoice.id },
        data: {
          invoiceNumber,
          isTemporary,
          invoiceDate: body.invoiceData?.invoiceDate
            ? new Date(body.invoiceData.invoiceDate)
            : existingInvoice.invoiceDate,
          dueDate: body.invoiceData?.dueDate
            ? new Date(body.invoiceData.dueDate)
            : existingInvoice.dueDate,
          note: body.invoiceData?.note || existingInvoice.note
        }
      })

      console.log(`✅ ATOMICKÁ OPERACE ÚSPĚŠNÁ:`)
      console.log(`   - Příjemka: ${receiptNumber}`)
      console.log(`   - Faktura: ${invoiceNumber} ${isTemporary ? '(DOČASNÁ)' : '(SKUTEČNÁ)'}`)
      console.log(`   - Sklad: ${body.items.length} položek naskladněno`)
      console.log(`   - Objednávka: ${order.orderNumber} → ${newStatus}`)

      return { receipt, newStatus }
    })

    // Načti aktualizovanou objednávku pro frontend refresh
    const updatedOrder = await prisma.purchaseOrder.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        supplier: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Příjem úspěšně zpracován a naskladněn',
      receipt: result.receipt,
      order: updatedOrder
    })
  } catch (error) {
    console.error('Chyba při přímém naskladnění:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se zpracovat příjem' },
      { status: 500 }
    )
  }
}
