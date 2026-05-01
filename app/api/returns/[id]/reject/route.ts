import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { z }                from 'zod'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/prisma'
import { createAuditLog }   from '@/lib/auditService'
import {
  assertStatusTransition,
  isValidationError,
  rewrapPrismaError,
} from '@/lib/returns/ReturnValidationService'
import { RETURN_FULL_INCLUDE, mapReturnFull } from '../../_shared'

export const dynamic = 'force-dynamic'

const RejectSchema = z.object({
  rejectionReason: z.string().min(1, 'Důvod zamítnutí je povinný'),
  adminNote:       z.string().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let existingStatus: string | undefined

  try {
    const body   = await request.json()
    const parsed = RejectSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i: { message: string }) => i.message).join(', ') },
        { status: 400 },
      )
    }

    const existing = await prisma.returnRequest.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Reklamace nebyla nalezena' }, { status: 404 })

    existingStatus = existing.status

    assertStatusTransition(existing.status, 'rejected')

    const updated = await prisma.$transaction(async tx => {
      await tx.returnRequestItem.updateMany({
        where: { returnRequestId: params.id, itemStatus: 'pending' },
        data:  { itemStatus: 'rejected' },
      })

      // Atomic guard: WHERE status = 'inspecting' prevents concurrent modifications
      const r = await tx.returnRequest.update({
        where: { id: params.id, status: 'inspecting' },
        data:  {
          status:          'rejected',
          resolutionType:  'rejected',
          refundAmount:    0,
          rejectionReason: parsed.data.rejectionReason,
          adminNote:       parsed.data.adminNote ?? existing.adminNote,
          handledById:     session.user.id,
        },
        include: RETURN_FULL_INCLUDE,
      }).catch(rewrapPrismaError)

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: params.id,
          fromStatus:      'inspecting',
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
      oldValue:   existingStatus,
      newValue:   'rejected',
      module:     'returns',
    })

    return NextResponse.json(mapReturnFull(updated as any))
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus })
    }
    console.error('[POST /api/returns/[id]/reject]', error)
    return NextResponse.json({ error: 'Nepodařilo se zamítnout reklamaci' }, { status: 500 })
  }
}
