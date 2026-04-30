import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { z }                from 'zod'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/prisma'
import { createAuditLog }   from '@/lib/auditService'
import { canBeApproved, type ReturnStatus } from '@/lib/returns/returnWorkflow'
import { RETURN_FULL_INCLUDE, mapReturnFull }   from '../../_shared'

export const dynamic = 'force-dynamic'

const ItemDecisionSchema = z.object({
  id:              z.string().uuid(),
  itemStatus:      z.enum(['approved', 'rejected', 'partial']),
  approvedQuantity: z.number().min(0).nullable().optional(),
  condition:       z.string().nullable().optional(),
  conditionNote:   z.string().nullable().optional(),
  itemRejectionReason: z.string().nullable().optional(),
})

const ApproveSchema = z.object({
  items:          z.array(ItemDecisionSchema).min(1),
  resolutionType: z.enum(['refund', 'store_credit', 'exchange', 'repair', 'rejected']),
  refundAmount:   z.number().min(0).optional(),
  adminNote:      z.string().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body   = await request.json()
    const parsed = ApproveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((i: any) => i.message).join(', ') }, { status: 400 })
    }

    const input = parsed.data

    const existing = await prisma.returnRequest.findUnique({
      where:   { id: params.id },
      include: { items: true },
    })
    if (!existing) return NextResponse.json({ error: 'Reklamace nebyla nalezena' }, { status: 404 })

    if (!canBeApproved(existing.status as ReturnStatus)) {
      return NextResponse.json(
        { error: `Nelze schválit reklamaci ve stavu: ${existing.status}` },
        { status: 422 }
      )
    }

    // Determine final status
    const anyApproved = input.items.some(i => i.itemStatus === 'approved' || i.itemStatus === 'partial')
    const anyRejected = input.items.some(i => i.itemStatus === 'rejected')
    const newStatus: ReturnStatus = anyApproved && anyRejected
      ? 'partially_approved'
      : anyApproved
        ? 'approved'
        : 'rejected'

    // Compute approved refund amount from items if not provided
    let refundAmount = input.refundAmount
    if (refundAmount == null) {
      refundAmount = 0
      for (const decision of input.items) {
        if (decision.itemStatus === 'rejected') continue
        const item = existing.items.find(i => i.id === decision.id)
        if (!item) continue
        const qty = decision.approvedQuantity ?? Number(item.returnedQuantity)
        refundAmount += qty * Number(item.unitPriceWithVat)
      }
      refundAmount = Math.round(refundAmount * 100) / 100
    }

    const updated = await prisma.$transaction(async tx => {
      // Update each item decision
      for (const decision of input.items) {
        await tx.returnRequestItem.update({
          where: { id: decision.id },
          data:  {
            itemStatus:          decision.itemStatus,
            approvedQuantity:    decision.approvedQuantity ?? null,
            condition:           decision.condition ?? null,
            conditionNote:       decision.conditionNote ?? null,
            itemRejectionReason: decision.itemRejectionReason ?? null,
          },
        })
      }

      const r = await tx.returnRequest.update({
        where: { id: params.id },
        data:  {
          status:         newStatus,
          resolutionType: input.resolutionType,
          refundAmount,
          adminNote:      input.adminNote ?? existing.adminNote,
          handledById:    session.user.id,
        },
        include: RETURN_FULL_INCLUDE,
      })

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: params.id,
          fromStatus:      existing.status,
          toStatus:        newStatus,
          changedBy:       session.user.id,
          changedByName:   session.user.name ?? session.user.email,
          note:            `Rozhodnutí: ${input.resolutionType}`,
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
      newValue:   newStatus,
      module:     'returns',
    })

    return NextResponse.json(mapReturnFull(updated as any))
  } catch (error) {
    console.error('[POST /api/returns/[id]/approve]', error)
    return NextResponse.json({ error: 'Nepodařilo se schválit reklamaci' }, { status: 500 })
  }
}
