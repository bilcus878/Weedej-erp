import { NextResponse }       from 'next/server'
import { getServerSession }  from 'next-auth'
import { z }                 from 'zod'
import { authOptions }       from '@/lib/auth'
import { prisma }            from '@/lib/prisma'
import {
  ReturnCommandService,
  RETURN_LIST_INCLUDE,
} from '@/lib/returns/ReturnCommandService'
import {
  ReturnValidationError,
  isValidationError,
} from '@/lib/returns/ReturnValidationService'

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

// ── POST /api/returns ─────────────────────────────────────────────────────────

const CreateItemSchema = z.object({
  sourceOrderItemId: z.string().uuid().optional().nullable(),
  productName:       z.string().min(1, 'Název produktu nesmí být prázdný'),
  unit:              z.string().min(1, 'Jednotka je povinná'),
  originalQuantity:  z.coerce.number().positive('Původní množství musí být kladné'),
  returnedQuantity:  z.coerce.number().positive('Vrácené množství musí být kladné'),
  unitPrice:         z.coerce.number().min(0).optional(),
  unitPriceWithVat:  z.coerce.number().min(0).optional(),
  vatRate:           z.coerce.number().min(0).max(100).optional(),
}).refine(
  d => d.returnedQuantity <= d.originalQuantity,
  { message: 'Vrácené množství nesmí překročit původně objednané množství', path: ['returnedQuantity'] },
)

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
        { error: parsed.error.issues.map((i: { message: string }) => i.message).join(', ') },
        { status: 400 },
      )
    }

    const result = await ReturnCommandService.createReturn(parsed.data, {
      id:   session.user.id,
      name: session.user.name ?? session.user.email,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: (error as ReturnValidationError).message }, { status: (error as ReturnValidationError).httpStatus })
    }
    console.error('[POST /api/returns]', error)
    return NextResponse.json({ error: 'Nepodařilo se vytvořit reklamaci' }, { status: 500 })
  }
}
