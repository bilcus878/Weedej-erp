import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { z }                from 'zod'
import { authOptions }      from '@/lib/platform/auth/auth'
import { ReturnCommandService } from '@/lib/features/returns/ReturnCommandService'
import { isValidationError, ReturnValidationError } from '@/lib/features/returns/ReturnValidationService'

export const dynamic = 'force-dynamic'

const ProcessRefundSchema = z.object({
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
      return NextResponse.json(
        { error: parsed.error.issues.map((i: { message: string }) => i.message).join(', ') },
        { status: 400 },
      )
    }

    const result = await ReturnCommandService.processRefund(params.id, parsed.data, {
      id:   session.user.id,
      name: session.user.name ?? session.user.email,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: (error as ReturnValidationError).message }, { status: (error as ReturnValidationError).httpStatus })
    }
    console.error('[POST /api/returns/[id]/process-refund]', error)
    return NextResponse.json({ error: 'Nepodařilo se zpracovat refundaci' }, { status: 500 })
  }
}
