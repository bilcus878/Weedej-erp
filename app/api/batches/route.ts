// Batch / Šarže API
// GET  /api/batches          — list + filter
// POST /api/batches          — find-or-create batch by (batchNumber, productId)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/batches?productId=&status=&search=&page=&limit=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId') || undefined
    const status    = searchParams.get('status')    || undefined
    const search    = searchParams.get('search')    || undefined
    const page      = Math.max(1, Number(searchParams.get('page')  || 1))
    const limit     = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)))

    const where: any = {}
    if (productId) where.productId = productId
    if (status)    where.status    = status
    if (search)    where.batchNumber = { contains: search, mode: 'insensitive' }

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        include: {
          product:  { select: { id: true, name: true, unit: true } },
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { receivedDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.batch.count({ where }),
    ])

    // Attach current stock per batch (SUM of InventoryItems)
    const batchIds = batches.map(b => b.id)
    const stockAgg = await prisma.inventoryItem.groupBy({
      by: ['batchId'],
      where: { batchId: { in: batchIds } },
      _sum: { quantity: true },
    })
    const stockMap = new Map(stockAgg.map(r => [r.batchId, Number(r._sum.quantity ?? 0)]))

    const result = batches.map(b => ({
      ...b,
      currentStock: stockMap.get(b.id) ?? 0,
    }))

    return NextResponse.json({ batches: result, total, page, limit })
  } catch (error) {
    console.error('Chyba při načítání šarží:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst šarže' }, { status: 500 })
  }
}

// POST /api/batches — find-or-create
// Body: { batchNumber, productId, productionDate?, expiryDate?, supplierLotRef?, supplierId?, receivedDate? }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { batchNumber, productId, productionDate, expiryDate, supplierLotRef, supplierId, receivedDate, notes } = body

    if (!batchNumber?.trim()) {
      return NextResponse.json({ error: 'Číslo šarže je povinné' }, { status: 400 })
    }
    if (!productId) {
      return NextResponse.json({ error: 'ID produktu je povinné' }, { status: 400 })
    }

    // Find-or-create: same batchNumber + productId reuses the existing master record
    const existing = await prisma.batch.findUnique({
      where: { batchNumber_productId: { batchNumber: batchNumber.trim(), productId } },
    })

    if (existing) {
      return NextResponse.json(existing, { status: 200 })
    }

    const batch = await prisma.batch.create({
      data: {
        batchNumber:    batchNumber.trim(),
        productId,
        productionDate: productionDate ? new Date(productionDate) : null,
        expiryDate:     expiryDate     ? new Date(expiryDate)     : null,
        supplierLotRef: supplierLotRef || null,
        supplierId:     supplierId     || null,
        receivedDate:   receivedDate   ? new Date(receivedDate)   : new Date(),
        notes:          notes          || null,
        status:         'active',
      },
      include: {
        product:  { select: { id: true, name: true, unit: true } },
        supplier: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(batch, { status: 201 })
  } catch (error: any) {
    console.error('Chyba při vytváření šarže:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Šarže s tímto číslem již existuje pro tento produkt' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Nepodařilo se vytvořit šarži' }, { status: 500 })
  }
}
