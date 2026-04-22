// API Endpoint pro objednávky zákazníků (E-shop)
// URL: /api/customer-orders

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentNumbering'
import { createReservations, canReserveQuantity } from '@/lib/reservationManagement'
import { applyDiscountAndCalculateVat, calculateVatFromGross, round2 } from '@/lib/vatCalculation'

export const dynamic = 'force-dynamic'

// GET /api/customer-orders - Získat všechny objednávky
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const orders = await prisma.customerOrder.findMany({
      where: {
        source: { not: 'eshop' },
        ...(customerId ? { customerId } : {}),
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        reservations: {
          where: { status: 'active' }
        },
        deliveryNotes: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        issuedInvoice: true // Přidej vystavenou fakturu
      },
      orderBy: {
        orderNumber: 'desc' // Nejvyšší číslo nahoře
      }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Chyba při načítání objednávek:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst objednávky' },
      { status: 500 }
    )
  }
}

// POST /api/customer-orders - Vytvořit novou objednávku
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      customerId,
      isManualCustomer,
      isAnonymousCustomer,
      saveCustomerToDatabase,
      manualCustomerData,
      orderDate,
      note,
      items, // Array<{ productId?, productName?, quantity, unit, price, vatRate? }>
      sumupTransactionId,
      // Platební údaje (POVINNÉ pro customer orders)
      dueDate,
      paymentType,
      variableSymbol,
      constantSymbol,
      specificSymbol,
      // Sleva
      discountType, // 'percentage' nebo 'fixed' nebo null
      discountValue, // hodnota slevy (10 pro 10% nebo 100 pro 100 Kč)
      // DPH
      pricesIncludeVat // boolean - zda zadané ceny jsou S DPH
    } = body

    // Validace
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Objednávka musí obsahovat alespoň jednu položku' },
        { status: 400 }
      )
    }

    // Validace platebních údajů (POVINNÉ pro customer orders)
    if (!dueDate) {
      return NextResponse.json(
        { error: 'Datum splatnosti je povinné' },
        { status: 400 }
      )
    }

    if (!paymentType) {
      return NextResponse.json(
        { error: 'Forma úhrady je povinná' },
        { status: 400 }
      )
    }

    // Kontrola dostupnosti skladu pro všechny položky
    for (const item of items) {
      if (item.productId) {
        const check = await canReserveQuantity(item.productId, item.quantity)
        if (!check.canReserve) {
          return NextResponse.json(
            { error: check.message },
            { status: 400 }
          )
        }
      }
    }

    // Přepočítej ceny položek - pokud jsou zadány S DPH, spočítej cenu BEZ DPH
    const processedItems = items.map((item: any) => {
      const vatRate = item.vatRate != null ? Number(item.vatRate) : 21
      let unitPriceWithoutVat = Number(item.price)

      if (pricesIncludeVat) {
        // Cena je S DPH - spočítej cenu BEZ DPH
        const vatCalc = calculateVatFromGross(unitPriceWithoutVat, vatRate)
        unitPriceWithoutVat = vatCalc.priceWithoutVat
      }

      return {
        ...item,
        price: unitPriceWithoutVat, // price = cena BEZ DPH
        vatRate,
      }
    })

    // Použij VAT utilitu pro výpočet slevy a DPH dohromady
    const vatItems = processedItems.map((item: any) => ({
      quantity: Number(item.quantity),
      unitPriceWithoutVat: Number(item.price),
      vatRate: Number(item.vatRate),
    }))

    const { lineItems: vatLineItems, discountAmount, summary: vatSummary } = applyDiscountAndCalculateVat(
      vatItems,
      discountType || null,
      discountValue ? Number(discountValue) : null
    )

    // Celková částka S DPH (= totalAmount pro zpětnou kompatibilitu)
    const totalAmount = vatSummary.totalWithVat
    const totalAmountWithoutVat = vatSummary.totalWithoutVat
    const totalVatAmount = vatSummary.totalVat

    // Vytvoř objednávku s položkami v transakci
    const order = await prisma.$transaction(async (tx) => {
      // 1. Vygeneruj číslo objednávky (ON-COMMIT)
      const orderNumber = await getNextDocumentNumber('customer-order', tx)

      // 2. Připrav data zákazníka podle typu (anonymní / manuální / vybraný)
      let customerData: any = {}
      let createdCustomerId = null

      // Pokud je zaškrtnuté "Uložit do databáze" a je to manuální zákazník, vytvoř ho
      if (isManualCustomer && saveCustomerToDatabase && manualCustomerData) {
        const newCustomer = await tx.customer.create({
          data: {
            name: manualCustomerData.name,
            entityType: manualCustomerData.entityType || 'company',
            contact: manualCustomerData.contactPerson || null, // Customer má pole "contact", ne "contactPerson"
            email: manualCustomerData.email || null,
            phone: manualCustomerData.phone || null,
            ico: manualCustomerData.ico || null,
            dic: manualCustomerData.dic || null,
            bankAccount: manualCustomerData.bankAccount || null,
            // website není v Customer modelu
            address: manualCustomerData.address || null,
            note: manualCustomerData.note || null
          }
        })
        createdCustomerId = newCustomer.id
      }

      if (isAnonymousCustomer) {
        // Anonymní odběratel
        customerData = {
          customerId: null,
          customerName: 'Anonymní odběratel',
          customerEmail: null,
          customerPhone: null,
          customerAddress: null
        }
      } else if (isManualCustomer && manualCustomerData) {
        // Ruční zadání zákazníka
        customerData = {
          customerId: createdCustomerId, // použij ID pokud byl vytvořen
          customerName: createdCustomerId ? null : (manualCustomerData.name || null),
          customerEntityType: createdCustomerId ? null : (manualCustomerData.entityType || 'company'),
          customerEmail: createdCustomerId ? null : (manualCustomerData.email || null),
          customerPhone: createdCustomerId ? null : (manualCustomerData.phone || null),
          customerAddress: createdCustomerId ? null : (manualCustomerData.address || null)
        }
      } else {
        // Vybraný zákazník z databáze
        customerData = {
          customerId: customerId || null,
          customerName: null,
          customerEmail: null,
          customerPhone: null,
          customerAddress: null
        }
      }

      // 3. Vytvoř objednávku
      const newOrder = await tx.customerOrder.create({
        data: {
          orderNumber,
          ...customerData,
          orderDate: orderDate ? new Date(orderDate) : new Date(),
          totalAmount,
          note,
          sumupTransactionId,
          status: sumupTransactionId ? 'paid' : 'new', // Pokud je SumUp, rovnou "paid"
          paidAt: sumupTransactionId ? new Date() : null,
          // Sleva
          discountType: discountType || null,
          discountValue: discountValue || null,
          discountAmount: discountAmount || null,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId || null,
              productName: item.productName || null,
              quantity: item.quantity,
              unit: item.unit,
              price: item.price
            }))
          }
        },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      })

      // 4. Vytvoř rezervace pro produkty z katalogu (uvnitř stejné transakce)
      await createReservations(
        newOrder.id,
        items.filter((item: any) => item.productId).map((item: any) => ({
          productId:    item.productId,
          quantity:     Number(item.quantity),
          unit:         item.unit,
          variantValue: item.variantValue != null ? Number(item.variantValue) : null,
          variantUnit:  item.variantUnit  ?? null,
        })),
        tx
      )

      return newOrder
    })

    console.log(`✓ Vytvořena objednávka ${order.orderNumber}, vytvořeny rezervace`)

    // POZNÁMKA: Výdejka se NEVYTVÁŘÍ automaticky!
    // Vytvoří se až když zaměstnanec klikne "Připravit k expedici" (stejně jako u příjemek)

    // Automaticky vytvoř vystavenou fakturu (nezaplacenou) pro tuto objednávku
    try {
      const { createIssuedInvoiceFromCustomerOrder } = await import('@/lib/createIssuedInvoice')
      await createIssuedInvoiceFromCustomerOrder(order.id, {
        dueDate,
        paymentType,
        variableSymbol,
        constantSymbol,
        specificSymbol
      })
    } catch (error) {
      console.error('Chyba při vytváření automatické faktury:', error)
      // Nepřerušuj vytvoření objednávky, jen loguj chybu
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Chyba při vytváření objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit objednávku' },
      { status: 500 }
    )
  }
}
