// API Endpoint pro přijaté faktury (od dodavatelů)
// URL: http://localhost:3000/api/invoices/received

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/invoices/received - Získat všechny přijaté faktury
export async function GET() {
  try {
    const invoices = await prisma.receivedInvoice.findMany({
      include: {
        receipts: {
          include: {
            supplier: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        purchaseOrder: {
          include: {
            supplier: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: {
        invoiceNumber: 'desc' // Nejvyšší číslo nahoře
      },
    })

    // Mapuj status z purchaseOrder
    const mappedInvoices = invoices.map(invoice => ({
      ...invoice,
      // Pokud má purchaseOrder, převezmi status z něj
      status: invoice.purchaseOrder?.status || invoice.status
    }))

    return NextResponse.json(mappedInvoices)
  } catch (error) {
    console.error('Chyba při načítání přijatých faktur:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst přijaté faktury' },
      { status: 500 }
    )
  }
}

// POST /api/invoices/received - Vytvořit novou přijatou fakturu a naskladnit
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      transactionCode,
      totalAmount,
      supplierId,
      supplierName,
      supplierICO,
      supplierDIC,
      supplierAddress,
      paymentType,
      transactionDate,
      note,
      attachmentUrl,
      items, // Array položek: [{ productId, quantity, unit, purchasePrice }]
    } = body

    // Validace - musí být buď supplierId NEBO supplierName
    if (!transactionCode || !totalAmount || (!supplierId && !supplierName) || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Chybí povinná pole' },
        { status: 400 }
      )
    }

    // Increment číslo v Settings
    await prisma.settings.upsert({
      where: { id: 'default' },
      update: {
        lastReceivedInvoiceNumber: {
          increment: 1,
        },
      },
      create: {
        id: 'default',
        lastReceivedInvoiceNumber: 1,
      },
    })

    // Vytvoř přijatou fakturu
    const transaction = await prisma.transaction.create({
      data: {
        transactionCode,
        invoiceType: 'received',
        totalAmount: Number(totalAmount),
        supplierId: supplierId || null,
        supplierName: supplierName || null,
        supplierICO: supplierICO || null,
        supplierDIC: supplierDIC || null,
        supplierAddress: supplierAddress || null,
        paymentType: paymentType || 'cash', // Default pro příjaté faktury
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        note: note || null,
        attachmentUrl: attachmentUrl || null,
        items: {
          create: items.map((item: any) => ({
            productId: item.isManual ? null : item.productId,
            productName: item.isManual ? item.productName : null,
            quantity: Number(item.quantity),
            unit: item.unit,
            price: item.purchasePrice ? Number(item.purchasePrice) : null,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        supplier: true,
      },
    })

    // Automaticky naskladni každou položku (jen ty z katalogu)
    console.log('=== NASKLADŇOVÁNÍ ===')
    console.log('Počet položek k naskladnění:', items.length)
    for (const item of items) {
      console.log(`Položka: isManual=${item.isManual}, productId=${item.productId}, productName=${item.productName}, quantity=${item.quantity}`)

      // Naskladni jen položky z katalogu (mají productId)
      if (!item.isManual && item.productId) {
        console.log(`  ✓ Naskladňuji produkt ${item.productId}, množství: ${item.quantity}`)
        await prisma.inventoryItem.create({
          data: {
            productId: item.productId,
            quantity: Number(item.quantity),
            unit: item.unit,
            purchasePrice: Number(item.purchasePrice),
            supplierId,
            transactionId: transaction.id, // Propojení s fakturou
            date: transactionDate ? new Date(transactionDate) : new Date(),
          },
        })
      } else {
        console.log(`  ✗ PŘESKAKUJI - isManual: ${item.isManual}, productId: ${item.productId}`)
      }
    }
    console.log('=== KONEC NASKLADŇOVÁNÍ ===')

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření přijaté faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit přijatou fakturu' },
      { status: 500 }
    )
  }
}
