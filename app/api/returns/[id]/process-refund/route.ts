import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { z }                from 'zod'
import { authOptions }      from '@/lib/auth'
import { prisma }           from '@/lib/prisma'
import { createAuditLog }   from '@/lib/auditService'
import { canProcessRefund, type ReturnStatus } from '@/lib/returns/returnWorkflow'
import { processReturnRefund }                from '@/lib/returns/returnRefundService'
import { RETURN_FULL_INCLUDE, mapReturnFull } from '../../_shared'

export const dynamic = 'force-dynamic'

const ProcessRefundSchema = z.object({
  refundAmount:    z.number().positive('Částka refundace musí být kladná'),
  refundMethod:    z.enum(['original_payment', 'store_credit', 'bank_transfer']),
  refundReference: z.string().optional(),
  adminNote:       z.string().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body   = await request.json()
    const parsed = ProcessRefundSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((i: any) => i.message).join(', ') }, { status: 400 })
    }

    const input = parsed.data

    const existing = await prisma.returnRequest.findUnique({
      where:   { id: params.id },
      include: {
        items:      true,
        creditNotes: { select: { id: true } },
      },
    })
    if (!existing) return NextResponse.json({ error: 'Reklamace nebyla nalezena' }, { status: 404 })

    if (!canProcessRefund(existing.status as ReturnStatus)) {
      return NextResponse.json(
        { error: `Nelze zpracovat refundaci ve stavu: ${existing.status}` },
        { status: 422 }
      )
    }

    if ((existing.creditNotes?.length ?? 0) > 0) {
      return NextResponse.json({ error: 'Refundace již byla zpracována' }, { status: 422 })
    }

    const updated = await prisma.$transaction(async tx => {
      // Build refund items from approved items
      const refundItems = existing.items
        .filter(i => i.itemStatus === 'approved' || i.itemStatus === 'partial')
        .map(i => ({
          productName:      i.productName,
          unit:             i.unit,
          approvedQty:      Number(i.approvedQuantity ?? i.returnedQuantity),
          unitPrice:        Number(i.unitPrice),
          unitPriceWithVat: Number(i.unitPriceWithVat),
          vatRate:          Number(i.vatRate),
        }))

      const refundResult = await processReturnRefund(tx, {
        returnRequestId: params.id,
        customerOrderId: existing.customerOrderId,
        refundMethod:    input.refundMethod,
        refundReference: input.refundReference ?? null,
        items:           refundItems,
      })

      const r = await tx.returnRequest.update({
        where: { id: params.id },
        data:  {
          status:           'resolved',
          refundAmount:     input.refundAmount,
          refundMethod:     input.refundMethod,
          refundReference:  input.refundReference ?? null,
          refundProcessedAt: new Date(),
          adminNote:        input.adminNote ?? existing.adminNote,
        },
        include: RETURN_FULL_INCLUDE,
      })

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: params.id,
          fromStatus:      existing.status,
          toStatus:        'resolved',
          changedBy:       session.user.id,
          changedByName:   session.user.name ?? session.user.email,
          note: refundResult.hasAccountingDoc
            ? `Refundace ${input.refundAmount} CZK zpracována — dobropis ${refundResult.creditNoteNumber}`
            : `Refundace ${input.refundAmount} CZK zpracována (bez dobropisu)`,
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
      newValue:   'resolved',
      module:     'returns',
    })

    return NextResponse.json(mapReturnFull(updated as any))
  } catch (error) {
    console.error('[POST /api/returns/[id]/process-refund]', error)
    return NextResponse.json({ error: 'Nepodařilo se zpracovat refundaci' }, { status: 500 })
  }
}
