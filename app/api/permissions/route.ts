// GET /api/permissions  — list all permissions grouped by module (ADMIN only)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/routeGuard'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.error

  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(permissions)
  } catch (error) {
    console.error('GET /api/permissions error:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst oprávnění' }, { status: 500 })
  }
}
