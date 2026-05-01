import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { z }                from 'zod'
import { authOptions }      from '@/lib/auth'
import { ReturnCommandService } from '@/lib/returns/ReturnCommandService'
import { isValidationError, ReturnValidationError } from '@/lib/returns/ReturnValidationService'

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

  try {
    const body   = await request.json()
    const parsed = ReceiveGoodsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i: { message: string }) => i.message).join(', ') },
        { status: 400 },
      )
    }

    const result = await ReturnCommandService.receiveGoods(params.id, parsed.data, {
      id:   session.user.id,
      name: session.user.name ?? session.user.email,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: (error as ReturnValidationError).message }, { status: (error as ReturnValidationError).httpStatus })
    }
    console.error('[POST /api/returns/[id]/receive-goods]', error)
    return NextResponse.json({ error: 'Nepodařilo se zaznamenat příjem zboží' }, { status: 500 })
  }
}
