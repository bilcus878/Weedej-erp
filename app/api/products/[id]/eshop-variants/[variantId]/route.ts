// PATCH  /api/products/[id]/eshop-variants/[variantId]  — úprava varianty
// DELETE /api/products/[id]/eshop-variants/[variantId]  — smazání varianty

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })

  const { id, variantId } = await params
  const body = await req.json()
  const { name, price, weightGrams, isDefault, isActive } = body

  // Pokud se nastavuje jako výchozí, odeber příznak ostatním
  if (isDefault) {
    await prisma.eshopVariant.updateMany({
      where: { productId: id, id: { not: variantId } },
      data: { isDefault: false },
    })
  }

  const variant = await prisma.eshopVariant.update({
    where: { id: variantId },
    data: {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: parseFloat(String(price)) }),
      ...(weightGrams !== undefined && { weightGrams: weightGrams ? parseFloat(String(weightGrams)) : null }),
      ...(isDefault !== undefined && { isDefault }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json(variant)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Nepřihlášen' }, { status: 401 })

  const { variantId } = await params

  await prisma.eshopVariant.delete({ where: { id: variantId } })

  return NextResponse.json({ success: true })
}
