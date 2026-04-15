// POST /api/external/orders
// Vytvoří objednávku v ERP z e-shopu po úspěšné Stripe platbě
// GET  /api/external/orders?id=<erpOrderId> — vrátí stav objednávky
// Určeno pro e-shop — vyžaduje API klíč v hlavičce X-API-Key

import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentNumbering'
import { createIssuedInvoiceFromCustomerOrder } from '@/lib/createIssuedInvoice'
import { verifyApiKey, corsHeaders, handleOptions } from '@/lib/apiKeyAuth'

export const dynamic = 'force-dynamic'

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

// GET /api/external/orders?id=xxx — stav objednávky
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')

  const auth = await verifyApiKey(request)
  if (!auth.success) return auth.response

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const stripeSessionId = searchParams.get('stripeSessionId')

  if (!id && !stripeSessionId) {
    return NextResponse.json(
      { error: 'Zadej parametr id nebo stripeSessionId' },
      { status: 400, headers: corsHeaders(origin) }
    )
  }

  try {
    const order = await prisma.customerOrder.findFirst({
      where: id ? { id } : { stripeSessionId: stripeSessionId! },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        paidAt: true,
        shippedAt: true,
        createdAt: true,
        source: true,
        stripeSessionId: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404, headers: corsHeaders(origin) }
      )
    }

    return NextResponse.json(order, { headers: corsHeaders(origin) })
  } catch (error) {
    console.error('[ERP External API] Chyba při načítání objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst objednávku' },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}

// POST /api/external/orders — vytvoří objednávku z e-shopu
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')

  const auth = await verifyApiKey(request)
  if (!auth.success) return auth.response

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Neplatný JSON' },
      { status: 400, headers: corsHeaders(origin) }
    )
  }

  const {
    stripeSessionId,      // Stripe session ID (pro deduplikaci)
    stripePaymentIntent,  // Stripe payment intent ID
    eshopUserId,          // ID uživatele z eshopu (EshopUser.id)
    eshopOrderId,         // ID objednávky v eshopu (Order.id)
    customerName,         // Jméno zákazníka
    customerEmail,
    customerPhone,
    customerAddress,      // Formátovaná adresa jako string
    items,                // [{ erpProductId, productName, quantity, unit, priceWithoutVat, vatRate }]
    totalAmountCents,     // Celková částka v haléřích (z Stripe)
    note,
  } = body

  // Validace povinných polí
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: 'Chybí pole items' },
      { status: 400, headers: corsHeaders(origin) }
    )
  }

  if (!customerName) {
    return NextResponse.json(
      { error: 'Chybí customerName' },
      { status: 400, headers: corsHeaders(origin) }
    )
  }

  // Deduplikace — pokud objednávka se stejným stripeSessionId už existuje, vrátí ji
  if (stripeSessionId) {
    const existing = await prisma.customerOrder.findUnique({
      where: { stripeSessionId },
      select: { id: true, orderNumber: true, status: true },
    })
    if (existing) {
      return NextResponse.json(
        { ...existing, duplicate: true },
        { headers: corsHeaders(origin) }
      )
    }
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Vygeneruj číslo objednávky
      const orderNumber = await getNextDocumentNumber('eshop-order', tx)

      // Vypočítej součty (totalAmountCents je v haléřích, ERP používá Kč)
      const totalAmount = totalAmountCents != null
        ? totalAmountCents / 100
        : items.reduce((sum: number, item: any) => {
            const priceWithVat = Number(item.priceWithoutVat ?? 0) * (1 + Number(item.vatRate ?? 21) / 100)
            return sum + priceWithVat * Number(item.quantity ?? 1)
          }, 0)

      const totalAmountWithoutVat = items.reduce((sum: number, item: any) => {
        return sum + Number(item.priceWithoutVat ?? 0) * Number(item.quantity ?? 1)
      }, 0)

      const totalVatAmount = totalAmount - totalAmountWithoutVat

      // Vytvoř objednávku
      const created = await tx.customerOrder.create({
        data: {
          orderNumber,
          source: 'eshop',
          status: 'paid', // Stripe platba proběhla
          paidAt: new Date(),
          customerName,
          customerEmail: customerEmail ?? null,
          customerPhone: customerPhone ?? null,
          customerAddress: customerAddress ?? null,
          customerEntityType: 'individual',
          totalAmount,
          totalAmountWithoutVat,
          totalVatAmount,
          stripeSessionId: stripeSessionId ?? null,
          stripePaymentIntent: stripePaymentIntent ?? null,
          eshopUserId: eshopUserId ?? null,
          eshopOrderId: eshopOrderId ?? null,
          note: note ?? null,
          items: {
            create: items.map((item: any) => {
              const price = Number(item.priceWithoutVat ?? 0)
              const vatRate = Number(item.vatRate ?? 21)
              const vatAmount = price * vatRate / 100
              const priceWithVat = price + vatAmount
              return {
                productId: item.erpProductId ?? null,
                productName: item.productName ?? 'Produkt',
                quantity: Number(item.quantity ?? 1),
                unit: item.unit ?? 'ks',
                price,
                vatRate,
                vatAmount,
                priceWithVat,
                shippedQuantity: 0,
              }
            }),
          },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
      })

      return created
    })

    // Auto-vytvoř fakturu a očekávanou výdejku (mimo transakci, aby číslo bylo definitvní)
    try {
      await createIssuedInvoiceFromCustomerOrder(order.id, {
        paymentType: 'card',
        variableSymbol: order.orderNumber,
      })
    } catch (invoiceErr) {
      console.error('[ERP External API] Chyba při auto-vytváření faktury:', invoiceErr)
      // Neblokujeme odpověď — objednávka je vytvořena, faktura se dá vytvořit ručně
    }

    return NextResponse.json(order, {
      status: 201,
      headers: corsHeaders(origin),
    })
  } catch (error) {
    console.error('[ERP External API] Chyba při vytváření objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit objednávku v ERP' },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}
