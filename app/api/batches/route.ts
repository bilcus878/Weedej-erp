// Batch / Šarže API
// GET  /api/batches  — lot list (grouped by batchNumber)
// POST /api/batches  — find-or-create batch by (batchNumber, productId)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/batches?status=&search=&page=&limit=
// Returns lots — one entry per unique batchNumber, with all products aggregated
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const page   = Math.max(1, Number(searchParams.get('page')  || 1))
    const limit  = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)))

    const where: any = {}
    if (status && status !== 'mixed') where.status = status
    if (search) where.batchNumber = { contains: search, mode: 'insensitive' }

    // Step 1: distinct batchNumbers with min receivedDate for ordering
    const batchGroups = await prisma.batch.groupBy({
      by:       ['batchNumber'],
      where,
      _count:   { id: true },
      _min:     { receivedDate: true },
      orderBy:  { _min: { receivedDate: 'desc' } },
    })

    const total       = batchGroups.length
    const pagedGroups = batchGroups.slice((page - 1) * limit, page * limit)

    if (pagedGroups.length === 0) {
      return NextResponse.json({ lots: [], total, page, limit })
    }

    // Step 2: full batch rows for the paged lot numbers
    const batchNumbers = pagedGroups.map(g => g.batchNumber)
    const allBatches = await prisma.batch.findMany({
      where:   { batchNumber: { in: batchNumbers } },
      include: {
        product:  { select: { id: true, name: true, unit: true } },
        supplier: { select: { id: true, name: true } },
      },
    })

    // Step 3: current stock per batch record
    const batchIds = allBatches.map(b => b.id)
    const stockAgg = batchIds.length > 0
      ? await prisma.inventoryItem.groupBy({
          by:    ['batchId'],
          where: { batchId: { in: batchIds } },
          _sum:  { quantity: true },
        })
      : []
    const stockMap = new Map(stockAgg.map(r => [r.batchId, Number(r._sum.quantity ?? 0)]))

    // Step 4: assemble lot objects preserving paged order
    const lots = pagedGroups.map(group => {
      const lotBatches = allBatches.filter(b => b.batchNumber === group.batchNumber)
      const totalStock = lotBatches.reduce((s, b) => s + (stockMap.get(b.id) ?? 0), 0)
      const supplier   = lotBatches.find(b => b.supplier)?.supplier ?? null
      const statuses   = [...new Set(lotBatches.map(b => b.status))]

      return {
        batchNumber:    group.batchNumber,
        supplierLotRef: lotBatches[0]?.supplierLotRef ?? null,
        receivedDate:   group._min.receivedDate?.toISOString() ?? null,
        supplier,
        productCount:   lotBatches.length,
        totalStock,
        status:         statuses.length === 1 ? statuses[0] : 'mixed',
        notes:          lotBatches.find(b => b.notes)?.notes ?? null,
        products: lotBatches.map(b => ({
          id:           b.id,
          productId:    b.productId,
          name:         b.product?.name ?? '',
          unit:         b.product?.unit ?? '',
          status:       b.status,
          currentStock: stockMap.get(b.id) ?? 0,
          expiryDate:   b.expiryDate ? b.expiryDate.toISOString() : null,
        })),
      }
    })

    return NextResponse.json({ lots, total, page, limit })
  } catch (error) {
    console.error('Chyba při načítání šarží:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst šarže' }, { status: 500 })
  }
}

// POST /api/batches — find-or-create (used internally, not by list page)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { batchNumber, productId, productionDate, expiryDate, supplierLotRef, supplierId, receivedDate, notes } = body

    if (!batchNumber?.trim()) return NextResponse.json({ error: 'Číslo šarže je povinné' }, { status: 400 })
    if (!productId)           return NextResponse.json({ error: 'ID produktu je povinné' }, { status: 400 })

    const existing = await prisma.batch.findUnique({
      where: { batchNumber_productId: { batchNumber: batchNumber.trim(), productId } },
    })
    if (existing) return NextResponse.json(existing, { status: 200 })

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
    if (error?.code === 'P2002') return NextResponse.json({ error: 'Šarže s tímto číslem již existuje pro tento produkt' }, { status: 409 })
    console.error('Chyba při vytváření šarže:', error)
    return NextResponse.json({ error: 'Nepodařilo se vytvořit šarži' }, { status: 500 })
  }
}
