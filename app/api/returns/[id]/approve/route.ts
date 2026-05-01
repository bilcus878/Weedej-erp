import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { z }                from 'zod'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/prisma'
import { createAuditLog }   from '@/lib/auditService'
import { round2, calculateLineVat, calculateVatSummary } from '@/lib/vatCalculation'
import type { ReturnStatus } from '@/lib/returns/returnWorkflow'
import {
  assertStatusTransition,
  assertItemOwnership,
  assertApprovedQuantities,
  isValidationError,
  rewrapPrismaError,
} from '@/lib/returns/ReturnValidationService'
import { RETURN_FULL_INCLUDE, mapReturnFull } from '../../_shared'

export const dynamic = 'force-dynamic'

const ItemDecisionSchema = z.object({
  id:                  z.string().uuid(),
  itemStatus:          z.enum(['approved', 'rejected', 'partial']),
  approvedQuantity:    z.coerce.number().min(0).nullable().optional(),
  condition:           z.string().nullable().optional(),
  conditionNote:       z.string().nullable().optional(),
  itemRejectionReason: z.string().nullable().optional(),
})

const ApproveSchema = z.object({
  items:          z.array(ItemDecisionSchema).min(1),
  resolutionType: z.enum(['refund', 'store_credit', 'exchange', 'repair', 'rejected']),
  adminNote:      z.string().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let existingStatus: string | undefined

  try {
    const body   = await request.json()
    const parsed = ApproveSchema.safeParse(body)
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

    // Central validation — throws ReturnValidationError on failure
    assertStatusTransition(existing.status, 'approved')  // 'inspecting' → 'approved' is valid; machine will catch others
    assertItemOwnership(input.items.map(d => d.id), existing.items)
    assertApprovedQuantities(input.items, existing.items)

    // Determine final status from item decisions
    const anyApproved = input.items.some(i => i.itemStatus === 'approved' || i.itemStatus === 'partial')
    const anyRejected = input.items.some(i => i.itemStatus === 'rejected')
    const newStatus: ReturnStatus = anyApproved && anyRejected
      ? 'partially_approved'
      : anyApproved
        ? 'approved'
        : 'rejected'

    // resolutionType must be consistent with outcome
    const resolutionType = newStatus === 'rejected' ? 'rejected' : input.resolutionType

    // ── Compute refund amount using correct per-line VAT arithmetic ──────────
    //
    // This is the authoritative refund amount. It will be stored on ReturnRequest
    // and MUST equal what the credit note service will compute later so there is
    // no divergence between ReturnRequest.refundAmount and CreditNote.totalAmount.
    //
    // We use the same gross→net back-calculation that returnRefundService uses.
    let refundAmount = 0
    if (resolutionType !== 'rejected') {
      const approvedLines = input.items
        .filter(d => d.itemStatus !== 'rejected')
        .map(d => {
          const item      = existing.items.find(i => i.id === d.id)!
          const qty       = d.approvedQuantity ?? Number(item.returnedQuantity)
          const gross     = Number(item.unitPriceWithVat)
          const vatRate   = Number(item.vatRate)
          const derivedNet = round2(gross / (1 + vatRate / 100))
          return calculateLineVat(qty, derivedNet, vatRate)
        })
      const summary = calculateVatSummary(approvedLines)
      refundAmount  = summary.totalWithVat
    }

    const updated = await prisma.$transaction(async tx => {
      for (const decision of input.items) {
        await tx.returnRequestItem.update({
          where: { id: decision.id },
          data:  {
            itemStatus:          decision.itemStatus,
            approvedQuantity:    decision.approvedQuantity ?? null,
            condition:           decision.condition        ?? null,
            conditionNote:       decision.conditionNote    ?? null,
            itemRejectionReason: decision.itemRejectionReason ?? null,
          },
        })
      }

      // Atomic guard: WHERE status = 'inspecting' prevents concurrent approvals
      const r = await tx.returnRequest.update({
        where: { id: params.id, status: 'inspecting' },
        data:  {
          status:         newStatus,
          resolutionType,
          refundAmount,
          adminNote:      input.adminNote ?? existing.adminNote,
          handledById:    session.user.id,
        },
        include: RETURN_FULL_INCLUDE,
      }).catch(rewrapPrismaError)

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: params.id,
          fromStatus:      'inspecting',
          toStatus:        newStatus,
          changedBy:       session.user.id,
          changedByName:   session.user.name ?? session.user.email,
          note:            `Rozhodnutí: ${resolutionType}`,
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
      newValue:   newStatus,
      module:     'returns',
    })

    return NextResponse.json(mapReturnFull(updated as any))
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus })
    }
    console.error('[POST /api/returns/[id]/approve]', error)
    return NextResponse.json({ error: 'Nepodařilo se schválit reklamaci' }, { status: 500 })
  }
}
