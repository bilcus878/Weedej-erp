// GET  /api/products/[id]/eshop-variants  — seznam variant produktu pro eshop
// POST /api/products/[id]/eshop-variants  — vytvoření nové varianty

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })

  const { id } = await params

  const variants = await prisma.eshopVariant.findMany({
    where: { productId: id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(variants)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, price, weightGrams, isDefault, isActive } = body

  if (!name || price === undefined) {
    return NextResponse.json({ error: 'Chybí název nebo cena' }, { status: 400 })
  }

  // Pokud je tato varianta výchozí, odeber výchozí příznak ostatním
  if (isDefault) {
    await prisma.eshopVariant.updateMany({
      where: { productId: id },
      data: { isDefault: false },
    })
  }

  const variant = await prisma.eshopVariant.create({
    data: {
      productId: id,
      name,
      price: parseFloat(String(price)),
      weightGrams: weightGrams ? parseFloat(String(weightGrams)) : null,
      isDefault: isDefault ?? false,
      isActive: isActive ?? true,
    },
  })

  return NextResponse.json(variant, { status: 201 })
}
