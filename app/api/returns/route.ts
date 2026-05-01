import { NextResponse }       from 'next/server'
import { getServerSession }  from 'next-auth'
import { z }                 from 'zod'
import { authOptions }       from '@/lib/auth'
import { prisma }            from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentSeries'
import { createAuditLog }    from '@/lib/auditService'
import { calculateVatFromNet } from '@/lib/vatCalculation'
import { STANDARD_RETURN_DAYS } from '@/lib/returns/returnWorkflow'
import {
  ReturnValidationError,
  isValidationError,
} from '@/lib/returns/ReturnValidationService'
import { RETURN_FULL_INCLUDE, RETURN_LIST_INCLUDE, mapReturnFull } from './_shared'

export const dynamic = 'force-dynamic'

// ── GET /api/returns ─────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const rows = await prisma.returnRequest.findMany({
      include:  RETURN_LIST_INCLUDE,
      orderBy:  { requestDate: 'desc' },
    })

    const mapped = rows.map(r => {
      const approvedItems = r.items.filter(i => i.itemStatus === 'approved' || i.itemStatus === 'partial')
      return {
        id:           r.id,
        returnNumber: r.returnNumber,
        type:         r.type,
        reason:       r.reason,
        status:       r.status,
        requestDate:  r.requestDate,
        customerName:        r.customerName,
        customerEmail:       r.customerEmail,
        customerOrderId:     r.customerOrderId,
        customerOrderNumber: r.customerOrder?.orderNumber ?? null,
        refundAmount:        r.refundAmount     ? Number(r.refundAmount)     : null,
        resolutionType:      r.resolutionType,
        itemCount:           r.items.length,
        approvedItemCount:   approvedItems.length,
      }
    })

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('[GET /api/returns]', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst reklamace' }, { status: 500 })
  }
}

// ── POST /api/returns ─────────────────────────────────────────────────────────
//
// Design: the backend is the single source of truth for all prices.
//
// When a sourceOrderItemId is provided, the route fetches the price from the
// corresponding CustomerOrderItem record in the database. The client-supplied
// price fields are IGNORED — this eliminates the price-tampering vector and
// ensures the return is always priced at exactly what the customer originally paid.
//
// When there is no associated order (manual / walk-in return), the client must
// supply prices explicitly; these are accepted after schema validation.

const CreateItemSchema = z.object({
  // Reference to the original order line — used for authoritative price lookup.
  // Required when customerOrderId is set; optional for manual returns.
  sourceOrderItemId: z.string().uuid().optional().nullable(),

  // Product metadata (displayed in UI; canonical name comes from snapshot)
  productName: z.string().min(1, 'Název produktu nesmí být prázdný'),
  unit:        z.string().min(1, 'Jednotka je povinná'),

  // Quantities — coerced for Decimal-to-number safety
  originalQuantity: z.coerce.number().positive('Původní množství musí být kladné'),
  returnedQuantity: z.coerce.number().positive('Vrácené množství musí být kladné'),

  // Prices — IGNORED when sourceOrderItemId resolves; used only for manual returns.
  // Validated even when ignored so the schema is self-documenting.
  unitPrice:        z.coerce.number().min(0).optional(),
  unitPriceWithVat: z.coerce.number().min(0).optional(),
  vatRate:          z.coerce.number().min(0).max(100).optional(),
}).refine(
  d => d.returnedQuantity <= d.originalQuantity,
  { message: 'Vrácené množství nesmí překročit původně objednané množství', path: ['returnedQuantity'] },
)

const CreateReturnSchema = z.object({
  customerOrderId: z.string().uuid().nullable().optional(),
  type:     z.enum(['return', 'warranty_claim', 'complaint', 'exchange']).default('return'),
  reason:   z.enum(['wrong_product', 'damaged_on_arrival', 'defective', 'not_as_described', 'changed_mind', 'other']),
  reasonDetail:    z.string().optional(),
  customerName:    z.string().optional(),
  customerEmail:   z.string().email().optional().or(z.literal('')),
  customerPhone:   z.string().optional(),
  customerAddress: z.string().optional(),
  customerId:      z.string().uuid().optional(),
  eshopUserId:     z.string().optional(),
  items:           z.array(CreateItemSchema).min(1, 'Alespoň jedna položka je povinná'),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body   = await request.json()
    const parsed = CreateReturnSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i: { message: string }) => i.message).join(', ') },
        { status: 400 },
      )
    }

    const input = parsed.data

    // ── Resolve order metadata ──────────────────────────────────────────────

    let customerName    = input.customerName    ?? null
    let customerEmail   = input.customerEmail   ?? null
    let customerPhone   = input.customerPhone   ?? null
    let customerAddress = input.customerAddress ?? null
    let customerId      = input.customerId      ?? null
    let returnDeadline: Date | null = null

    // Map sourceOrderItemId → CustomerOrderItem for price resolution
    const orderItemsById = new Map<string, {
      price:        number
      priceWithVat: number
      vatRate:      number
      productId:    string | null
      productName:  string | null
      unit:         string
      quantity:     number
    }>()

    if (input.customerOrderId) {
      const order = await prisma.customerOrder.findUnique({
        where:   { id: input.customerOrderId },
        include: { customer: true, items: true },
      })
      if (!order) {
        return NextResponse.json({ error: 'Objednávka nebyla nalezena' }, { status: 404 })
      }

      // Populate name/contact from order (client values take precedence if non-empty)
      customerName    = customerName    || order.customerName    || order.customer?.name    || null
      customerEmail   = customerEmail   || order.customerEmail   || order.customer?.email   || null
      customerPhone   = customerPhone   || order.customerPhone   || order.customer?.phone   || null
      customerAddress = customerAddress || order.customerAddress || order.customer?.address || null
      customerId      = customerId      || order.customerId      || null

      const deadline = new Date(order.orderDate)
      deadline.setDate(deadline.getDate() + STANDARD_RETURN_DAYS)
      returnDeadline = deadline

      // Build price lookup table from real order items
      for (const item of order.items) {
        const unitPriceNet   = Number(item.price)
        const vatRateNum     = Number(item.vatRate)
        // Use stored priceWithVat if it was explicitly set; otherwise compute from net.
        const storedGross    = Number(item.priceWithVat)
        const unitPriceGross = storedGross > 0
          ? storedGross
          : calculateVatFromNet(unitPriceNet, vatRateNum).priceWithVat

        orderItemsById.set(item.id, {
          price:        unitPriceNet,
          priceWithVat: unitPriceGross,
          vatRate:      vatRateNum,
          productId:    item.productId,
          productName:  item.productName,
          unit:         item.unit,
          quantity:     Number(item.quantity),
        })
      }

      // Validate that all provided sourceOrderItemIds belong to this order
      for (const item of input.items) {
        if (item.sourceOrderItemId && !orderItemsById.has(item.sourceOrderItemId)) {
          return NextResponse.json(
            { error: `Položka ${item.sourceOrderItemId} nepatří k objednávce ${order.orderNumber}` },
            { status: 422 },
          )
        }
      }
    }

    // ── Build item data using authoritative prices ─────────────────────────

    const itemsToCreate = input.items.map(item => {
      const ordered = item.sourceOrderItemId ? orderItemsById.get(item.sourceOrderItemId) : null

      // Backend resolves prices; client-supplied prices used only for manual returns
      const unitPrice        = ordered?.price        ?? item.unitPrice        ?? 0
      const unitPriceWithVat = ordered?.priceWithVat ?? item.unitPriceWithVat ?? 0
      const vatRate          = ordered?.vatRate       ?? item.vatRate          ?? 21

      // Use the canonical product name from the order; client value is display-only
      const productName = ordered?.productName ?? item.productName
      const productId   = ordered?.productId   ?? null
      const unit        = ordered?.unit        ?? item.unit

      return {
        sourceOrderItemId: item.sourceOrderItemId ?? null,
        productId,
        productName:       productName?.trim() || 'Neznámý produkt',
        unit,
        originalQuantity:  item.originalQuantity,
        returnedQuantity:  item.returnedQuantity,
        unitPrice,
        unitPriceWithVat,
        vatRate,
      }
    })

    // ── Create the return request in a single transaction ──────────────────

    const returnRequest = await prisma.$transaction(async tx => {
      const returnNumber = await getNextDocumentNumber('return-request', tx)

      return tx.returnRequest.create({
        data: {
          returnNumber,
          currency:        'CZK',   // explicit — all returns are CZK until multi-currency is added
          customerOrderId: input.customerOrderId ?? null,
          customerId,
          eshopUserId:     input.eshopUserId ?? null,
          customerName,
          customerEmail:   customerEmail || null,
          customerPhone:   customerPhone || null,
          customerAddress: customerAddress || null,
          type:            input.type,
          reason:          input.reason,
          reasonDetail:    input.reasonDetail ?? null,
          status:          'submitted',
          requestDate:     new Date(),
          returnDeadline,
          items: { create: itemsToCreate },
          statusHistory: {
            create: {
              fromStatus:    null,
              toStatus:      'submitted',
              changedBy:     session.user.id,
              changedByName: session.user.name ?? session.user.email,
              note:          'Reklamace podána',
            },
          },
        },
        include: RETURN_FULL_INCLUDE,
      })
    })

    await createAuditLog({
      userId:     session.user.id,
      username:   session.user.name ?? session.user.email,
      actionType: 'CREATE',
      entityName: 'ReturnRequest',
      entityId:   returnRequest.id,
      module:     'returns',
      newValue:   returnRequest.returnNumber,
    })

    return NextResponse.json(mapReturnFull(returnRequest as any), { status: 201 })
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus })
    }
    console.error('[POST /api/returns]', error)
    return NextResponse.json({ error: 'Nepodařilo se vytvořit reklamaci' }, { status: 500 })
  }
}
