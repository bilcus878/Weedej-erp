import { NextResponse } from 'next/server'
import { prisma } from '@/lib/platform/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const entries = await prisma.auditLog.findMany({
      where: { entityName: 'CustomerOrder', entityId: params.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: {
        id: true,
        userId: true,
        username: true,
        actionType: true,
        fieldName: true,
        oldValue: true,
        newValue: true,
        createdAt: true,
      },
    })
    return NextResponse.json(entries)
  } catch (err) {
    console.error('[audit/customer-orders] read failed:', err)
    return NextResponse.json([])
  }
}