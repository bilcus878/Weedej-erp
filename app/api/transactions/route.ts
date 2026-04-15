// API Endpoint pro transakce
// URL: http://localhost:3000/api/transactions

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateVatFromNet, calculateVatFromGross, calculateLineVat, DEFAULT_VAT_RATE, round2 } from '@/lib/vatCalculation'

export const dynamic = 'force-dynamic'

// GET /api/transactions - Získat transakce s paginací
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '999999') // Načíst všechny transakce (paginace na FE)
    const skip = (page - 1) * limit

    // Filtrování podle data
    const where: any = {}

    if (startDate && endDate) {
      where.transactionDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    // Filter jen pro vystavené faktury a SumUp transakce
    where.invoiceType = {
      in: ['issued', 'sumup'],
    }

    // Spočítej celkový počet transakcí (pro paginaci)
    const totalCount = await prisma.transaction.count({ where })

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true, // Přidej odběratele
        deliveryNote: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            customerOrder: {
              include: {
                customer: true, // Přidej odběratele z objednávky
              },
            },
          },
        }, // Přidej výdejku s položkami a objednávkou
        issuedInvoice: true, // Přidej vystavenou fakturu
      },
      orderBy: {
        transactionDate: 'desc' // Nejnovější nahoře (podle data)
      },
      skip,
      take: limit,
      // Vrátit všechny fieldy včetně sumupId pro odkaz na účtenku
    })

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + transactions.length < totalCount,
      },
    })
  } catch (error) {
    console.error('Chyba při načítání transakcí:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst transakce' },
      { status: 500 }
    )
  }
}

// POST /api/transactions - Vytvořit novou transakci ručně (fakturu)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      transactionCode,
      totalAmount,
      paymentType,
      transactionDate,
      customerId, // Pro FA faktury
      customerName, // Pro ručně zadané odběratele
      customerICO,
      customerDIC,
      customerAddress,
      note,
      items, // Array položek: [{ productId, quantity, unit, price?, vatRate? }]
      pricesIncludeVat, // Boolean: true = ceny jsou s DPH, false = bez DPH
    } = body

    // Validace
    if (!transactionCode || !totalAmount || !paymentType || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Chybí povinná pole' },
        { status: 400 }
      )
    }

    // Pokud je to FA faktura (formát YYYYXXX), increment číslo v Settings
    if (transactionCode.match(/^\d{7}$/)) {
      const currentYear = new Date().getFullYear()
      const invoiceNumber = parseInt(transactionCode.slice(-3))

      await prisma.settings.upsert({
        where: { id: 'default' },
        update: {
          lastIssuedInvoiceNumber: invoiceNumber,
          lastIssuedInvoiceYear: currentYear,
        },
        create: {
          id: 'default',
          lastIssuedInvoiceNumber: invoiceNumber,
          lastIssuedInvoiceYear: currentYear,
        },
      })
    }

    // Vypočítej DPH pro každou položku
    const itemsWithVat = items.map((item: any) => {
      const vatRate = item.vatRate != null ? Number(item.vatRate) : DEFAULT_VAT_RATE
      const quantity = Number(item.quantity)
      const rawPrice = item.price ? Number(item.price) : 0

      let priceWithoutVat: number
      let vatAmount: number
      let priceWithVat: number

      if (pricesIncludeVat) {
        // Cena je S DPH - zpětný výpočet
        const vat = calculateVatFromGross(rawPrice, vatRate)
        priceWithoutVat = vat.priceWithoutVat
        vatAmount = round2(quantity * vat.vatAmount)
        priceWithVat = round2(quantity * vat.priceWithVat)
      } else {
        // Cena je BEZ DPH - dopředný výpočet
        const lineVat = calculateLineVat(quantity, rawPrice, vatRate)
        priceWithoutVat = rawPrice
        vatAmount = lineVat.vatAmount
        priceWithVat = lineVat.totalWithVat
      }

      return {
        productId: item.productId || null,
        productName: item.productName || null,
        quantity,
        unit: item.unit,
        price: priceWithoutVat, // Vždy uložíme cenu BEZ DPH
        vatRate,
        vatAmount,
        priceWithVat,
      }
    })

    // Vypočítej celkové sumy
    const totalWithoutVat = round2(itemsWithVat.reduce((sum: number, item: any) => {
      return sum + round2(item.quantity * item.price)
    }, 0))
    const totalVat = round2(itemsWithVat.reduce((sum: number, item: any) => sum + item.vatAmount, 0))
    const totalWithVat = round2(totalWithoutVat + totalVat)

    // Vytvoř transakci i se všemi položkami najednou (Prisma umí "nested create")
    const transaction = await prisma.transaction.create({
      data: {
        transactionCode,
        invoiceType: 'issued', // Nastavit jako vystavená faktura
        totalAmount: totalWithVat, // Celkem s DPH
        totalAmountWithoutVat: totalWithoutVat, // Celkem bez DPH
        totalVatAmount: totalVat, // Celkem DPH
        paymentType,
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        customerId: customerId || null, // Přidej odběratele (jen pro FA)
        customerName: customerName || null, // Ruční zadání odběratele
        customerICO: customerICO || null,
        customerDIC: customerDIC || null,
        customerAddress: customerAddress || null,
        note: note || null,
        items: {
          create: itemsWithVat.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            vatRate: item.vatRate,
            vatAmount: item.vatAmount,
            priceWithVat: item.priceWithVat,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    })

    // Automaticky vytvoř výdejku pro tuto transakci
    // (Nový systém - výdejky automaticky vyskladňují)
    try {
      const { createDeliveryNoteFromTransaction } = await import('@/lib/createDeliveryNote')
      await createDeliveryNoteFromTransaction(transaction.id)
      console.log(`✓ Automaticky vytvořena výdejka pro transakci ${transaction.transactionCode}`)
    } catch (error) {
      console.error('Chyba při vytváření automatické výdejky:', error)
      // Nepřerušuj vytvoření transakce, jen loguj chybu
    }

    return NextResponse.json(transaction, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření transakce:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit transakci' },
      { status: 500 }
    )
  }
}


// DELETE /api/transactions - Hromadné mazání transakc\u00ed
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Chybí seznam ID transakcí' },
        { status: 400 }
      )
    }

    // Smaž transakce podle ID (Cascade smaže i položky)
    await prisma.transaction.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    })

    return NextResponse.json({ message: `Smazáno ${ids.length} transakcí` })
  } catch (error) {
    console.error('Chyba při mazání transakcí:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se smazat transakce' },
      { status: 500 }
    )
  }
}
