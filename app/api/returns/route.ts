import { NextResponse }       from 'next/server'
import { getServerSession }  from 'next-auth'
import { z }                 from 'zod'
import { authOptions }       from '@/lib/auth'
import { prisma }            from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentSeries'
import { createAuditLog }    from '@/lib/auditService'
import { STANDARD_RETURN_DAYS } from '@/lib/returns/returnWorkflow'
import { RETURN_FULL_INCLUDE, RETURN_LIST_INCLUDE, mapReturnFull } from './_shared'

export const dynamic = 'force-dynamic'

// ── GET /api/returns ────────────────────────────────────────────────────────

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
        customerName:    r.customerName,
        customerEmail:   r.customerEmail,
        customerOrderId: r.customerOrderId,
        customerOrderNumber: r.customerOrder?.orderNumber ?? null,
        refundAmount:        r.refundAmount ? Number(r.refundAmount) : null,
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

// ── POST /api/returns ───────────────────────────────────────────────────────

const CreateItemSchema = z.object({
  productId:        z.string().nullable().optional(),
  productName:      z.string().min(1),
  unit:             z.string().min(1),
  originalQuantity: z.number().positive(),
  returnedQuantity: z.number().positive(),
  unitPrice:        z.number().min(0),
  unitPriceWithVat: z.number().min(0),
  vatRate:          z.number().min(0).default(21),
})

const CreateReturnSchema = z.object({
  customerOrderId: z.string().uuid().nullable().optional(),
  type:            z.enum(['return', 'warranty_claim', 'complaint', 'exchange']).default('return'),
  reason:          z.enum(['wrong_product', 'damaged_on_arrival', 'defective', 'not_as_described', 'changed_mind', 'other']),
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
        { error: parsed.error.issues.map((i: any) => i.message).join(', ') },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Resolve customer and order metadata
    let customerName    = input.customerName ?? null
    let customerEmail   = input.customerEmail ?? null
    let customerPhone   = input.customerPhone ?? null
    let customerAddress = input.customerAddress ?? null
    let customerId      = input.customerId ?? null
    let returnDeadline: Date | null = null

    if (input.customerOrderId) {
      const order = await prisma.customerOrder.findUnique({
        where:   { id: input.customerOrderId },
        include: { customer: true },
      })
      if (!order) {
        return NextResponse.json({ error: 'Objednávka nebyla nalezena' }, { status: 404 })
      }
      customerName    = customerName    ?? order.customerName    ?? order.customer?.name    ?? null
      customerEmail   = customerEmail   ?? order.customerEmail   ?? order.customer?.email   ?? null
      customerPhone   = customerPhone   ?? order.customerPhone   ?? order.customer?.phone   ?? null
      customerAddress = customerAddress ?? order.customerAddress ?? order.customer?.address ?? null
      customerId      = customerId      ?? order.customerId      ?? null

      // Compute return deadline
      const deadline = new Date(order.orderDate)
      deadline.setDate(deadline.getDate() + STANDARD_RETURN_DAYS)
      returnDeadline = deadline
    }

    const returnRequest = await prisma.$transaction(async tx => {
      const returnNumber = await getNextDocumentNumber('return-request', tx)

      const rr = await tx.returnRequest.create({
        data: {
          returnNumber,
          customerOrderId: input.customerOrderId ?? null,
          customerId,
          eshopUserId:     input.eshopUserId ?? null,
          customerName,
          customerEmail:   customerEmail || null,
          customerPhone:   customerPhone   || null,
          customerAddress: customerAddress || null,
          type:            input.type,
          reason:          input.reason,
          reasonDetail:    input.reasonDetail ?? null,
          status:          'submitted',
          requestDate:     new Date(),
          returnDeadline,
          items: {
            create: input.items.map(item => ({
              productId:        item.productId ?? null,
              productName:      item.productName,
              unit:             item.unit,
              originalQuantity: item.originalQuantity,
              returnedQuantity: item.returnedQuantity,
              unitPrice:        item.unitPrice,
              unitPriceWithVat: item.unitPriceWithVat,
              vatRate:          item.vatRate,
            })),
          },
          statusHistory: {
            create: {
              fromStatus:   null,
              toStatus:     'submitted',
              changedBy:    session.user.id,
              changedByName: session.user.name ?? session.user.email,
              note:         'Reklamace podána',
            },
          },
        },
        include: RETURN_FULL_INCLUDE,
      })

      return rr
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
    console.error('[POST /api/returns]', error)
    return NextResponse.json({ error: 'Nepodařilo se vytvořit reklamaci' }, { status: 500 })
  }
}
