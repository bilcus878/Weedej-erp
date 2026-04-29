// API Endpoint pro příjemky (Receipts)
// URL: /api/receipts

import { NextResponse } from 'next/server'
import { getNextDocumentNumber } from '@/lib/documentNumbering'
import { prisma } from '@/lib/prisma'
import { archiveReceipt, archiveAsync } from '@/lib/documents/DocumentArchiveService'

export const dynamic = 'force-dynamic'

// GET /api/receipts - Získat všechny příjemky
export async function GET() {
  try {
    const receipts = await prisma.receipt.findMany({
      include: {
        supplier: true,
        purchaseOrder: {
          include: {
            invoice: true // Načti fakturu z objednávky
          }
        },
        items: {
          include: {
            product: true,
            inventoryItem: true // ✅ Přidej inventoryItem pro zobrazení odkazu na skladový pohyb
          }
        },
        inventoryItems: true,
        receivedInvoice: true // Načti fakturu přímo na příjemce
      },
      orderBy: {
        receiptNumber: 'desc' // Nejvyšší číslo nahoře
      }
    })

    return NextResponse.json(receipts)
  } catch (error) {
    console.error('Chyba při načítání příjemek:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst příjemky' },
      { status: 500 }
    )
  }
}

// POST /api/receipts - Vytvořit novou příjemku (draft)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      purchaseOrderId,
      supplierId,
      supplierName,
      supplierICO,
      supplierDIC,
      supplierAddress,
      receiptDate,
      note,
      items
    } = body

    // Validace
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Chybí povinná pole (items)' },
        { status: 400 }
      )
    }

    // Musí být buď supplierId NEBO supplierName
    if (!supplierId && !supplierName) {
      return NextResponse.json(
        { error: 'Musí být zadán dodavatel (supplierId nebo supplierName)' },
        { status: 400 }
      )
    }

    // Vytvoř příjemku v transakci (atomické - buď vše nebo nic)
    const receipt = await prisma.$transaction(async (tx) => {
      // Určíme datum příjemky
      const actualReceiptDate = receiptDate ? new Date(receiptDate) : new Date()

      // 1. Vygeneruj číslo příjemky (ON-COMMIT) - použij datum příjemky pro správný rok!
      const receiptNumber = await getNextDocumentNumber('receipt', tx, actualReceiptDate)

      // 1b. Pokud má příjemka purchaseOrderId, najdi k němu přijatou fakturu
      let receivedInvoiceId: string | null = null
      if (purchaseOrderId) {
        const invoice = await tx.receivedInvoice.findUnique({
          where: { purchaseOrderId: purchaseOrderId }
        })
        if (invoice) {
          receivedInvoiceId = invoice.id
          console.log(`✓ Našel jsem fakturu ${invoice.invoiceNumber} pro objednávku ${purchaseOrderId}`)
        }
      }

      // 2. Vytvoř příjemku (draft)
      return await tx.receipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: purchaseOrderId || null,
          receivedInvoiceId: receivedInvoiceId, // ✅ PROPOJENÍ S FAKTUROU
          supplierId: supplierId || null,
          supplierName: supplierName || null,
          supplierICO: supplierICO || null,
          supplierDIC: supplierDIC || null,
          supplierAddress: supplierAddress || null,
          receiptDate: actualReceiptDate,
          note: note || null,
          status: 'draft', // Vytvoříme jako draft
          items: {
            create: items.map((item: any) => ({
              productId: item.isManual ? null : item.productId,
              productName: item.isManual ? item.productName : null,
              quantity: Number(item.quantity),
              unit: item.unit,
              purchasePrice: Number(item.purchasePrice)
            }))
          }
        },
        include: {
          supplier: true,
          purchaseOrder: true,
          items: {
            include: {
              product: true
            }
          }
        }
      })
    })

    archiveAsync(() => archiveReceipt(receipt.id), `Receipt ${receipt.receiptNumber} draft`)
    return NextResponse.json(receipt, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření příjemky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit příjemku' },
      { status: 500 }
    )
  }
}
