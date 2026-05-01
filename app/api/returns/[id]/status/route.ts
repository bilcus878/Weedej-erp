import { NextResponse }      from 'next/server'
import { getServerSession } from 'next-auth'
import { z }                from 'zod'
import { authOptions }      from '@/lib/auth'
import type { ReturnStatus } from '@/lib/returns/returnWorkflow'
import { ReturnCommandService } from '@/lib/returns/ReturnCommandService'
import { isValidationError, ReturnValidationError } from '@/lib/returns/ReturnValidationService'

export const dynamic = 'force-dynamic'

const Schema = z.object({
  toStatus: z.string().min(1),
  note:     z.string().optional(),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body   = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Neplatný vstup' }, { status: 400 })
    }

    const result = await ReturnCommandService.transitionStatus(
      params.id,
      { toStatus: parsed.data.toStatus as ReturnStatus, note: parsed.data.note },
      { id: session.user.id, name: session.user.name ?? session.user.email },
    )

    return NextResponse.json(result)
  } catch (error) {
    if (isValidationError(error)) {
      return NextResponse.json({ error: (error as ReturnValidationError).message }, { status: (error as ReturnValidationError).httpStatus })
    }
    console.error('[POST /api/returns/[id]/status]', error)
    return NextResponse.json({ error: 'Nepodařilo se změnit stav' }, { status: 500 })
  }
}
