// API Endpoint pro označení objednávky jako zaplacené
// URL: /api/customer-orders/[id]/mark-paid

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/platform/auth/auth'
import { prisma } from '@/lib/platform/db/prisma'
import { archiveCustomerOrder, archiveAsync } from '@/lib/platform/documents/DocumentArchiveService'
import { createAuditLog } from '@/lib/platform/audit/auditService'

export const dynamic = 'force-dynamic'

// POST /api/customer-orders/[id]/mark-paid - Označit objednávku jako zaplacenou
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const userId   = (session?.user as any)?.id   ?? null
    const username = session?.user?.email ?? session?.user?.name ?? null
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      ?? request.headers.get('x-real-ip') ?? null

    const body = await request.json()
    const { sumupTransactionId } = body

    const order = await prisma.customerOrder.findUnique({
      where: { id: params.id }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      )
    }

    if (order.status === 'cancelled' || order.status === 'storno') {
      return NextResponse.json(
        { error: 'Nelze označit zrušenou/stornovanou objednávku jako zaplacenou' },
        { status: 400 }
      )
    }

    if (order.status === 'paid' || order.status === 'shipped') {
      return NextResponse.json(
        { error: 'Objednávka již byla zaplacena' },
        { status: 400 }
      )
    }

    const updated = await prisma.customerOrder.update({
      where: { id: params.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        sumupTransactionId: sumupTransactionId || undefined
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        },
        reservations: true
      }
    })

    console.log(`✓ Objednávka ${order.orderNumber} označena jako zaplacená`)
    archiveAsync(() => archiveCustomerOrder(params.id), `CustomerOrder ${order.orderNumber} paid`)

    await createAuditLog({
      userId, username, ipAddress,
      actionType: 'UPDATE',
      entityName: 'CustomerOrder',
      entityId:   params.id,
      fieldName:  'status',
      oldValue:   order.status,
      newValue:   'paid',
      module:     'customer-orders',
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Chyba při označování objednávky jako zaplacené:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se označit objednávku jako zaplacenou' },
      { status: 500 }
    )
  }
}
