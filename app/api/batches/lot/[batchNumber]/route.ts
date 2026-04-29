// Lot detail API — all products sharing the same batchNumber
// GET   /api/batches/lot/[batchNumber]  — lot header + products + combined movements
// PATCH /api/batches/lot/[batchNumber]  — bulk status / notes update for all products in lot

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { batchNumber: string } }
) {
  try {
    const batchNumber = decodeURIComponent(params.batchNumber)

    const batches = await prisma.batch.findMany({
      where:   { batchNumber },
      include: {
        product:  { select: { id: true, name: true, unit: true } },
        supplier: { select: { id: true, name: true } },
      },
    })

    if (batches.length === 0) {
      return NextResponse.json({ error: 'Šarže nenalezena' }, { status: 404 })
    }

    const batchIds = batches.map(b => b.id)

    // Stock per product-batch
    const stockAgg = await prisma.inventoryItem.groupBy({
      by:    ['batchId'],
      where: { batchId: { in: batchIds } },
      _sum:  { quantity: true },
    })
    const stockMap = new Map(stockAgg.map(r => [r.batchId, Number(r._sum.quantity ?? 0)]))

    // Combined movements across all product-batches in this lot
    const rawMovements = await prisma.inventoryItem.findMany({
      where:   { batchId: { in: batchIds } },
      include: {
        receipt: {
          select: {
            id:              true,
            receiptNumber:   true,
            purchaseOrder:   { select: { id: true, orderNumber: true } },
            receivedInvoice: { select: { id: true, invoiceNumber: true } },
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
        batch:    { select: { productId: true, product: { select: { name: true, unit: true } } } },
      },
      orderBy: { date: 'asc' },
    })

    const movements = rawMovements.map(m => ({
      id:            m.id,
      quantity:      Number(m.quantity),
      unit:          m.unit,
      date:          m.date,
      purchasePrice: Number(m.purchasePrice),
      note:          m.note,
      productId:     m.batch?.productId ?? '',
      productName:   m.batch?.product?.name ?? '',
      batchId:       m.batchId ?? '',
      supplier:      m.supplier,
      receipt:       m.receipt,
      deliveryNoteItems: m.deliveryNoteItems,
    }))

    const totalReceived = movements.filter(m => m.quantity > 0).reduce((s, m) => s + m.quantity, 0)
    const totalConsumed = movements.filter(m => m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0)

    const supplier = batches.find(b => b.supplier)?.supplier ?? null
    const statuses = [...new Set(batches.map(b => b.status))]

    const lot = {
      batchNumber,
      supplierLotRef: batches[0]?.supplierLotRef ?? null,
      receivedDate:   batches[0]?.receivedDate?.toISOString() ?? null,
      supplier,
      productCount:   batches.length,
      totalStock:     batches.reduce((s, b) => s + (stockMap.get(b.id) ?? 0), 0),
      status:         statuses.length === 1 ? statuses[0] : 'mixed',
      notes:          batches.find(b => b.notes)?.notes ?? null,
      products: batches.map(b => ({
        id:           b.id,
        productId:    b.productId,
        name:         b.product?.name ?? '',
        unit:         b.product?.unit ?? '',
        status:       b.status,
        currentStock: stockMap.get(b.id) ?? 0,
        expiryDate:   b.expiryDate ? b.expiryDate.toISOString() : null,
      })),
    }

    return NextResponse.json({ lot, movements, totalReceived, totalConsumed })
  } catch (error) {
    console.error('Chyba při načítání šarže:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst šarži' }, { status: 500 })
  }
}

// Bulk status/notes update — applies to every product in this lot
export async function PATCH(
  request: Request,
  { params }: { params: { batchNumber: string } }
) {
  try {
    const batchNumber = decodeURIComponent(params.batchNumber)
    const { status, notes } = await request.json()

    const allowed = ['active', 'quarantine', 'recalled', 'expired', 'consumed']
    if (status && !allowed.includes(status)) {
      return NextResponse.json({ error: 'Neplatný status šarže' }, { status: 400 })
    }

    await prisma.batch.updateMany({
      where: { batchNumber },
      data: {
        ...(status !== undefined && { status }),
        ...(notes  !== undefined && { notes }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Chyba při aktualizaci šarže:', error)
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat šarži' }, { status: 500 })
  }
}
