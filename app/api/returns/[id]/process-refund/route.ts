import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { z }                from 'zod'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/prisma'
import { createAuditLog }   from '@/lib/auditService'
import {
  assertStatusTransition,
  assertNoExistingRefund,
  assertCurrency,
  isValidationError,
  rewrapPrismaError,
} from '@/lib/returns/ReturnValidationService'
import { processReturnRefund } from '@/lib/returns/returnRefundService'
import { RETURN_FULL_INCLUDE, mapReturnFull } from '../../_shared'

export const dynamic = 'force-dynamic'

const ProcessRefundSchema = z.object({
  refundMethod:    z.enum(['original_payment', 'store_credit', 'bank_transfer']),
  refundReference: z.string().optional(),
  adminNote:       z.string().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let existingStatus: string | undefined

  try {
    const body   = await request.json()
    const parsed = ProcessRefundSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i: { message: string }) => i.message).join(', ') },
        { status: 400 },
      )
    }

    const input = parsed.data

    const existing = await prisma.returnRequest.findUnique({
      where:   { id: params.id },
      include: {
        items:       true,
        creditNotes: { select: { id: true } },
      },
    })
    if (!existing) return NextResponse.json({ error: 'Reklamace nebyla nalezena' }, { status: 404 })

    existingStatus = existing.status

    // Currency guard — must be done before any financial computation
    assertCurrency(existing.currency)

    // Status pre-flight: resolved is the target; state machine validates the source
    assertStatusTransition(existing.status, 'resolved')

    // Idempotency pre-flight (DB unique constraint is the real guard; this gives a clean error)
    assertNoExistingRefund(existing.creditNotes)

    const refundLineItems = existing.items
      .filter(i => i.itemStatus === 'approved' || i.itemStatus === 'partial')
      .map(i => ({
        productName:      i.productName,
        unit:             i.unit,
        approvedQty:      Number(i.approvedQuantity ?? i.returnedQuantity),
        unitPrice:        Number(i.unitPrice),
        unitPriceWithVat: Number(i.unitPriceWithVat),
        vatRate:          Number(i.vatRate),
      }))

    const updated = await prisma.$transaction(async tx => {
      // processReturnRefund:
      // 1. Computes totals via calculateLineVat + calculateVatSummary (no FP accumulation)
      // 2. Creates CreditNote with correct negative amounts
      // 3. Runs assertFinancialConsistency inside the transaction (rolls back if wrong)
      // 4. Returns the canonical totalRefund and the correct initial refundStatus
      const refundResult = await processReturnRefund(tx, {
        returnRequestId: params.id,
        customerOrderId: existing.customerOrderId,
        currency:        existing.currency,
        refundMethod:    input.refundMethod,
        refundReference: input.refundReference ?? null,
        items:           refundLineItems,
      }).catch(rewrapPrismaError)

      // KEY INVARIANT: ReturnRequest.refundAmount = CreditNote.totalAmount (when doc exists)
      const canonicalRefundAmount = refundResult.totalRefund

      // Atomic guard: explicit IN constraint prevents any other status from being processed.
      // This is more defensive than WHERE { status: existing.status } because it does not
      // depend on the pre-read value — it expresses the business rule directly.
      const r = await tx.returnRequest.update({
        where: {
          id:     params.id,
          status: { in: ['approved', 'partially_approved'] },
        },
        data: {
          status:            'resolved',
          refundAmount:      canonicalRefundAmount,
          refundStatus:      refundResult.refundStatus,
          refundMethod:      input.refundMethod,
          refundReference:   input.refundReference ?? null,
          refundProcessedAt: new Date(),
          adminNote:         input.adminNote ?? existing.adminNote,
        },
        include: RETURN_FULL_INCLUDE,
      }).catch(rewrapPrismaError)

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: params.id,
          fromStatus:      existing.status,
          toStatus:        'resolved',
          changedBy:       session.user.id,
          changedByName:   session.user.name ?? session.user.email,
          note:            refundResult.hasAccountingDoc
            ? `Refundace ${canonicalRefundAmount.toFixed(2)} ${existing.currency} — dobropis ${refundResult.creditNoteNumber} (${refundResult.refundStatus})`
            : `Refundace ${canonicalRefundAmount.toFixed(2)} ${existing.currency} (bez dobropisu, ${refundResult.refundStatus})`,
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
      newValue:   'resolved',
      module:     'returns',
    })

    return NextResponse.json(mapReturnFull(updated as any))
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus })
    }
    console.error('[POST /api/returns/[id]/process-refund]', error)
    return NextResponse.json({ error: 'Nepodařilo se zpracovat refundaci' }, { status: 500 })
  }
}
