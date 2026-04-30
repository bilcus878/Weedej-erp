import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { z }                from 'zod'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/prisma'
import { createAuditLog }   from '@/lib/auditService'
import { canBeApproved, type ReturnStatus } from '@/lib/returns/returnWorkflow'
import { RETURN_FULL_INCLUDE, mapReturnFull }   from '../../_shared'

export const dynamic = 'force-dynamic'

const RejectSchema = z.object({
  rejectionReason: z.string().min(1, 'Důvod zamítnutí je povinný'),
  adminNote:       z.string().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body   = await request.json()
    const parsed = RejectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((i: any) => i.message).join(', ') }, { status: 400 })
    }

    const existing = await prisma.returnRequest.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Reklamace nebyla nalezena' }, { status: 404 })

    if (!canBeApproved(existing.status as ReturnStatus)) {
      return NextResponse.json(
        { error: `Nelze zamítnout reklamaci ve stavu: ${existing.status}` },
        { status: 422 }
      )
    }

    const updated = await prisma.$transaction(async tx => {
      // Mark all pending items as rejected
      await tx.returnRequestItem.updateMany({
        where: { returnRequestId: params.id, itemStatus: 'pending' },
        data:  { itemStatus: 'rejected' },
      })

      const r = await tx.returnRequest.update({
        where: { id: params.id },
        data:  {
          status:          'rejected',
          resolutionType:  'rejected',
          rejectionReason: parsed.data.rejectionReason,
          adminNote:       parsed.data.adminNote ?? existing.adminNote,
          handledById:     session.user.id,
        },
        include: RETURN_FULL_INCLUDE,
      })

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: params.id,
          fromStatus:      existing.status,
          toStatus:        'rejected',
          changedBy:       session.user.id,
          changedByName:   session.user.name ?? session.user.email,
          note:            parsed.data.rejectionReason,
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
      newValue:   'rejected',
      module:     'returns',
    })

    return NextResponse.json(mapReturnFull(updated as any))
  } catch (error) {
    console.error('[POST /api/returns/[id]/reject]', error)
    return NextResponse.json({ error: 'Nepodařilo se zamítnout reklamaci' }, { status: 500 })
  }
}
