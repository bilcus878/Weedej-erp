import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { z }                from 'zod'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/prisma'
import { createAuditLog }   from '@/lib/auditService'
import {
  assertStatusTransition,
  assertItemOwnership,
  isValidationError,
  rewrapPrismaError,
} from '@/lib/returns/ReturnValidationService'
import { restockReturnItems } from '@/lib/returns/returnStockService'
import { RETURN_FULL_INCLUDE, mapReturnFull } from '../../_shared'

export const dynamic = 'force-dynamic'

const ItemConditionSchema = z.object({
  id:            z.string().uuid(),
  condition:     z.enum(['good', 'damaged', 'defective', 'opened', 'wrong_item']),
  conditionNote: z.string().optional(),
})

const ReceiveGoodsSchema = z.object({
  items:     z.array(ItemConditionSchema).min(1),
  restock:   z.boolean().default(false),
  adminNote: z.string().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let existingStatus: string | undefined

  try {
    const body   = await request.json()
    const parsed = ReceiveGoodsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i: { message: string }) => i.message).join(', ') },
        { status: 400 },
      )
    }

    const input = parsed.data

    const existing = await prisma.returnRequest.findUnique({
      where:   { id: params.id },
      include: { items: true },
    })
    if (!existing) return NextResponse.json({ error: 'Reklamace nebyla nalezena' }, { status: 404 })

    existingStatus = existing.status

    assertStatusTransition(existing.status, 'goods_received')
    assertItemOwnership(input.items.map(i => i.id), existing.items)

    const updated = await prisma.$transaction(async tx => {
      for (const itemInput of input.items) {
        await tx.returnRequestItem.update({
          where: { id: itemInput.id },
          data:  {
            condition:     itemInput.condition,
            conditionNote: itemInput.conditionNote ?? null,
          },
        })
      }

      if (input.restock) {
        const restockCandidates = input.items
          .filter(i => i.condition === 'good' || i.condition === 'opened')
          .flatMap(condItem => {
            const item = existing.items.find(ei => ei.id === condItem.id)
            if (!item || !item.productId) return []
            // Guard: skip if already restocked to prevent double-restocking on retry
            if (item.restockInventoryItemId) return []
            return [{
              returnRequestId: params.id,
              returnNumber:    existing.returnNumber,
              itemId:          item.id,
              productId:       item.productId,
              approvedQty:     Number(item.returnedQuantity),
              unit:            item.unit,
              condition:       condItem.condition,
            }]
          })

        if (restockCandidates.length > 0) {
          await restockReturnItems(tx, restockCandidates)
        }
      }

      // Atomic guard: WHERE status = 'waiting_for_goods'
      const r = await tx.returnRequest.update({
        where: { id: params.id, status: 'waiting_for_goods' },
        data:  {
          status:    'goods_received',
          adminNote: input.adminNote ?? existing.adminNote,
        },
        include: RETURN_FULL_INCLUDE,
      }).catch(rewrapPrismaError)

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: params.id,
          fromStatus:      'waiting_for_goods',
          toStatus:        'goods_received',
          changedBy:       session.user.id,
          changedByName:   session.user.name ?? session.user.email,
          note:            input.restock ? 'Zboží přijato a naskladněno' : 'Zboží přijato',
        },
      })

      return r
    })

    await createAuditLog({
      userId:     session.user.id,
      username:   session.user.name ?? session.user.email,
      actionType: 'UPDATE',
      entityName: 'ReturnRequest',
      entityId:   params.id,
      fieldName:  'status',
      oldValue:   existingStatus,
      newValue:   'goods_received',
      module:     'returns',
    })

    return NextResponse.json(mapReturnFull(updated as any))
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus })
    }
    console.error('[POST /api/returns/[id]/receive-goods]', error)
    return NextResponse.json({ error: 'Nepodařilo se zaznamenat příjem zboží' }, { status: 500 })
  }
}
