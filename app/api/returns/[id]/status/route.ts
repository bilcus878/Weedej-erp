import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { z }                from 'zod'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/prisma'
import { createAuditLog }   from '@/lib/auditService'
import type { ReturnStatus } from '@/lib/returns/returnWorkflow'
import {
  assertStatusTransition,
  isValidationError,
  rewrapPrismaError,
} from '@/lib/returns/ReturnValidationService'
import { RETURN_FULL_INCLUDE, mapReturnFull } from '../../_shared'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  toStatus: z.string().min(1),
  note:     z.string().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let existingStatus: string | undefined

  try {
    const body   = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Neplatný vstup' }, { status: 400 })
    }

    const { toStatus, note } = parsed.data

    const existing = await prisma.returnRequest.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Reklamace nebyla nalezena' }, { status: 404 })

    existingStatus = existing.status

    // Authoritative state machine check
    assertStatusTransition(existing.status, toStatus as ReturnStatus)

    const closeStatuses = new Set(['closed', 'cancelled'])

    const updated = await prisma.$transaction(async tx => {
      // Atomic guard: WHERE status = currentStatus ensures no concurrent modification wins
      const r = await tx.returnRequest.update({
        where: { id: params.id, status: existing.status },
        data:  {
          status:      toStatus,
          closedAt:    closeStatuses.has(toStatus) ? new Date() : undefined,
          handledById: existing.handledById ?? session.user.id,
        },
        include: RETURN_FULL_INCLUDE,
      }).catch(rewrapPrismaError)

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: params.id,
          fromStatus:      existing.status,
          toStatus,
          changedBy:       session.user.id,
          changedByName:   session.user.name ?? session.user.email,
          note:            note ?? null,
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
      newValue:   toStatus,
      module:     'returns',
    })

    return NextResponse.json(mapReturnFull(updated as any))
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus })
    }
    console.error('[POST /api/returns/[id]/status]', error)
    return NextResponse.json({ error: 'Nepodařilo se změnit stav' }, { status: 500 })
  }
}
