import { NextResponse }       from 'next/server'
import { getServerSession }  from 'next-auth'
import { z }                 from 'zod'
import { authOptions }       from '@/lib/auth'
import { prisma }            from '@/lib/prisma'
import { RETURN_FULL_INCLUDE } from '@/lib/returns/ReturnCommandService'
import { mapReturnFull }       from '@/lib/returns/returnMapper'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

// ── GET /api/returns/[id] ────────────────────────────────────────────────────

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const r = await prisma.returnRequest.findUnique({
      where:   { id: params.id },
      include: RETURN_FULL_INCLUDE,
    })
    if (!r) return NextResponse.json({ error: 'Reklamace nebyla nalezena' }, { status: 404 })

    return NextResponse.json(mapReturnFull(r as any))
  } catch (error) {
    console.error('[GET /api/returns/[id]]', error)
    return NextResponse.json({ error: 'Chyba načítání' }, { status: 500 })
  }
}

// ── PATCH /api/returns/[id] — update mutable logistic fields only ─────────────
//
// Financial fields (refundAmount, resolutionType, status) are NOT patchable here.
// They are set exclusively by the dedicated action endpoints.

const PatchSchema = z.object({
  adminNote:             z.string().optional(),
  returnTrackingNumber:  z.string().optional(),
  returnCarrier:         z.string().optional(),
  returnShippingCost:    z.coerce.number().min(0).nullable().optional(),
  returnShippingPaidBy:  z.enum(['customer', 'seller']).nullable().optional(),
})

export async function PATCH(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body   = await request.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((i: { message: string }) => i.message).join(', ') },
        { status: 400 },
      )
    }

    const update: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) update[key] = value
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Žádná platná pole ke změně' }, { status: 400 })
    }

    const r = await prisma.returnRequest.update({
      where:   { id: params.id },
      data:    update,
      include: RETURN_FULL_INCLUDE,
    })

    return NextResponse.json(mapReturnFull(r as any))
  } catch (error) {
    console.error('[PATCH /api/returns/[id]]', error)
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat reklamaci' }, { status: 500 })
  }
}
