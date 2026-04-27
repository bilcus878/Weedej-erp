import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Provider = 'dpd' | 'zasilkovna' | 'personal' | 'courier' | 'custom'

const DEFAULTS = [
  { id: 'DPD_HOME',          name: 'DPD — Na adresu',                       provider: 'dpd'        as Provider, description: 'Doručení na adresu zákazníka',            price: 99,  freeThreshold: null, codFee: 0, isActive: true, sortOrder: 1, estimatedDays: '2-3', note: null },
  { id: 'DPD_PICKUP',        name: 'DPD — Výdejní místo',                   provider: 'dpd'        as Provider, description: 'Vyzvednutí na výdejním místě DPD',         price: 79,  freeThreshold: null, codFee: 0, isActive: true, sortOrder: 2, estimatedDays: '1-2', note: null },
  { id: 'ZASILKOVNA_HOME',   name: 'Zásilkovna — Na adresu',                provider: 'zasilkovna' as Provider, description: 'Doručení na adresu zákazníka',            price: 89,  freeThreshold: null, codFee: 0, isActive: true, sortOrder: 3, estimatedDays: '2-3', note: null },
  { id: 'ZASILKOVNA_PICKUP', name: 'Zásilkovna — Výdejní místo / Z-BOX',   provider: 'zasilkovna' as Provider, description: 'Vyzvednutí na výdejním místě nebo Z-BOXu', price: 69,  freeThreshold: null, codFee: 0, isActive: true, sortOrder: 4, estimatedDays: '1-2', note: null },
  { id: 'COURIER',           name: 'Kurýr',                                  provider: 'courier'    as Provider, description: 'Expresní doručení kurýrem',               price: 150, freeThreshold: null, codFee: 0, isActive: true, sortOrder: 5, estimatedDays: '1',   note: null },
  { id: 'PICKUP_IN_STORE',   name: 'Osobní odběr',                          provider: 'personal'   as Provider, description: 'Vyzvednutí na provozovně',                price: 0,   freeThreshold: null, codFee: 0, isActive: true, sortOrder: 6, estimatedDays: '0',   note: null },
]

// GET /api/shipping/methods — list all (or ?active=true for only enabled)
// Seeds defaults automatically on first call when table is empty.
export async function GET(req: NextRequest) {
  try {
    const activeOnly = req.nextUrl.searchParams.get('active') === 'true'

    let methods = await prisma.shippingMethod.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { sortOrder: 'asc' },
    })

    if (methods.length === 0) {
      await prisma.shippingMethod.createMany({
        data: DEFAULTS.map(d => ({ ...d, updatedAt: new Date() })),
        skipDuplicates: true,
      })
      methods = await prisma.shippingMethod.findMany({
        where: activeOnly ? { isActive: true } : {},
        orderBy: { sortOrder: 'asc' },
      })
    }

    return NextResponse.json(methods)
  } catch (error) {
    console.error('GET /api/shipping/methods:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst metody dopravy' }, { status: 500 })
  }
}

// POST /api/shipping/methods — create custom method
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, provider = 'custom', description, price, freeThreshold, codFee, estimatedDays, note } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Název metody je povinný' }, { status: 400 })
    }
    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ error: 'Cena musí být nezáporné číslo' }, { status: 400 })
    }

    const maxOrder = await prisma.shippingMethod.aggregate({ _max: { sortOrder: true } })
    const id = `CUSTOM_${Date.now()}`

    const method = await prisma.shippingMethod.create({
      data: {
        id,
        name: name.trim(),
        provider: provider || 'custom',
        description: description?.trim() || null,
        price:         Math.round(price),
        freeThreshold: freeThreshold != null ? Math.round(Number(freeThreshold)) : null,
        codFee:        Math.round(Number(codFee) || 0),
        isActive:      true,
        sortOrder:     (maxOrder._max.sortOrder ?? 0) + 10,
        estimatedDays: estimatedDays?.trim() || '2-3',
        note:          note?.trim() || null,
        updatedAt:     new Date(),
      },
    })

    return NextResponse.json(method, { status: 201 })
  } catch (error) {
    console.error('POST /api/shipping/methods:', error)
    return NextResponse.json({ error: 'Nepodařilo se vytvořit metodu dopravy' }, { status: 500 })
  }
}
