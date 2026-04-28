// Batch detail API
// GET   /api/batches/[id] — batch + full movement history + current stock per location
// PATCH /api/batches/[id] — update status / notes

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: params.id },
      include: {
        product:  { select: { id: true, name: true, unit: true, batchTracking: true } },
        supplier: { select: { id: true, name: true } },
      },
    })

    if (!batch) {
      return NextResponse.json({ error: 'Šarže nenalezena' }, { status: 404 })
    }

    // Full movement history for this batch
    const movements = await prisma.inventoryItem.findMany({
      where: { batchId: params.id },
      include: {
        receipt: {
          select: {
            id:             true,
            receiptNumber:  true,
            purchaseOrder:  { select: { id: true, orderNumber: true } },
            receivedInvoice:{ select: { id: true, invoiceNumber: true } },
          },
        },
        deliveryNoteItems: {
          select: {
            deliveryNote: {
              select: {
                id:             true,
                deliveryNumber: true,
                customerOrder:  { select: { id: true, orderNumber: true } },
              },
            },
          },
        },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    })

    // Current stock for this batch
    const stockAgg = await prisma.inventoryItem.aggregate({
      where: { batchId: params.id },
      _sum: { quantity: true },
    })
    const currentStock = Number(stockAgg._sum.quantity ?? 0)

    // Total received (sum of positive movements only)
    const receivedAgg = await prisma.inventoryItem.aggregate({
      where: { batchId: params.id, quantity: { gt: 0 } },
      _sum: { quantity: true },
    })
    const totalReceived = Number(receivedAgg._sum.quantity ?? 0)

    return NextResponse.json({
      batch,
      movements,
      currentStock,
      totalReceived,
      totalConsumed: totalReceived - currentStock,
    })
  } catch (error) {
    console.error('Chyba při načítání šarže:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst šarži' }, { status: 500 })
  }
}

// PATCH /api/batches/[id] — change status or update notes
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, notes } = body

    const allowed = ['active', 'quarantine', 'recalled', 'expired', 'consumed']
    if (status && !allowed.includes(status)) {
      return NextResponse.json({ error: 'Neplatný status šarže' }, { status: 400 })
    }

    const updated = await prisma.batch.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes  !== undefined && { notes }),
      },
      include: {
        product:  { select: { id: true, name: true, unit: true } },
        supplier: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Šarže nenalezena' }, { status: 404 })
    }
    console.error('Chyba při aktualizaci šarže:', error)
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat šarži' }, { status: 500 })
  }
}
