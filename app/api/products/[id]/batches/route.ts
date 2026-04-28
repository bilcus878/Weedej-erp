// GET /api/products/[id]/batches
// Returns all batches for a product with current stock per batch

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const batches = await prisma.batch.findMany({
      where:   { productId: params.id },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { receivedDate: 'desc' },
    })

    if (batches.length === 0) return NextResponse.json([])

    // Current stock per batch
    const stockAgg = await prisma.inventoryItem.groupBy({
      by: ['batchId'],
      where: { batchId: { in: batches.map(b => b.id) } },
      _sum: { quantity: true },
    })
    const stockMap = new Map(stockAgg.map(r => [r.batchId, Number(r._sum.quantity ?? 0)]))

    const result = batches.map(b => ({
      ...b,
      currentStock: stockMap.get(b.id) ?? 0,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Chyba při načítání šarží produktu:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst šarže' }, { status: 500 })
  }
}
