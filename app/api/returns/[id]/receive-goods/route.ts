import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { z }                from 'zod'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/prisma'
import { createAuditLog }   from '@/lib/auditService'
import { canReceiveGoods, type ReturnStatus } from '@/lib/returns/returnWorkflow'
import { restockReturnItems }                from '@/lib/returns/returnStockService'
import { RETURN_FULL_INCLUDE, mapReturnFull } from '../../_shared'

export const dynamic = 'force-dynamic'

const ItemConditionSchema = z.object({
  id:           z.string().uuid(),
  condition:    z.enum(['good', 'damaged', 'defective', 'opened', 'wrong_item']),
  conditionNote: z.string().optional(),
})

const ReceiveGoodsSchema = z.object({
  items:    z.array(ItemConditionSchema).min(1),
  restock:  z.boolean().default(false),
  adminNote: z.string().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body   = await request.json()
    const parsed = ReceiveGoodsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((i: any) => i.message).join(', ') }, { status: 400 })
    }

    const input = parsed.data

    const existing = await prisma.returnRequest.findUnique({
      where:   { id: params.id },
      include: { items: true },
    })
    if (!existing) return NextResponse.json({ error: 'Reklamace nebyla nalezena' }, { status: 404 })

    if (!canReceiveGoods(existing.status as ReturnStatus)) {
      return NextResponse.json(
        { error: `Nelze přijmout zboží ve stavu: ${existing.status}` },
        { status: 422 }
      )
    }

    const updated = await prisma.$transaction(async tx => {
      // Record condition on each item
      for (const itemInput of input.items) {
        await tx.returnRequestItem.update({
          where: { id: itemInput.id },
          data:  {
            condition:    itemInput.condition,
            conditionNote: itemInput.conditionNote ?? null,
          },
        })
      }

      // Optionally restock items with 'good' or 'opened' condition
      if (input.restock) {
        const restockCandidates = input.items
          .filter(i => i.condition === 'good' || i.condition === 'opened')
          .map(condItem => {
            const item = existing.items.find(ei => ei.id === condItem.id)
            if (!item || !item.productId) return null
            return {
              returnRequestId: params.id,
              returnNumber:    existing.returnNumber,
              itemId:          item.id,
              productId:       item.productId,
              approvedQty:     Number(item.approvedQuantity ?? item.returnedQuantity),
              unit:            item.unit,
              condition:       condItem.condition,
            }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)

        if (restockCandidates.length > 0) {
          await restockReturnItems(tx, restockCandidates)
        }
      }

      const r = await tx.returnRequest.update({
        where: { id: params.id },
        data:  {
          status:    'goods_received',
          adminNote: input.adminNote ?? existing.adminNote,
        },
        include: RETURN_FULL_INCLUDE,
      })

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: params.id,
          fromStatus:      existing.status,
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
      oldValue:   existing.status,
      newValue:   'goods_received',
      module:     'returns',
    })

    return NextResponse.json(mapReturnFull(updated as any))
  } catch (error) {
    console.error('[POST /api/returns/[id]/receive-goods]', error)
    return NextResponse.json({ error: 'Nepodařilo se zaznamenat příjem zboží' }, { status: 500 })
  }
}
