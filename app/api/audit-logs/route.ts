// GET /api/audit-logs  — paginated, filtered audit log (VIEW_AUDIT_LOG permission)
//
// Query params:
//   userId, module, actionType, entityName, entityId
//   dateFrom, dateTo  (ISO 8601)
//   page (default 1), pageSize (default 50, max 200)
//   sortField (default 'createdAt'), sortDir ('asc'|'desc', default 'desc')

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requirePermission(Permission.VIEW_AUDIT_LOG, req)
  if (!guard.ok) return guard.error

  try {
    const sp = req.nextUrl.searchParams

    const page     = Math.max(1, parseInt(sp.get('page')     ?? '1',  10))
    const pageSize = Math.min(200, Math.max(1, parseInt(sp.get('pageSize') ?? '50', 10)))
    const sortDir  = sp.get('sortDir') === 'asc' ? 'asc' : 'desc'

    const where: Record<string, unknown> = {}

    const userId     = sp.get('userId')
    const module     = sp.get('module')
    const actionType = sp.get('actionType')
    const entityName = sp.get('entityName')
    const entityId   = sp.get('entityId')
    const dateFrom   = sp.get('dateFrom')
    const dateTo     = sp.get('dateTo')

    if (userId)     where.userId     = userId
    if (module)     where.module     = module
    if (actionType) where.actionType = actionType
    if (entityName) where.entityName = entityName
    if (entityId)   where.entityId   = entityId

    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo)   } : {}),
      }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where } as any),
      prisma.auditLog.findMany({
        where:   where as any,
        orderBy: { createdAt: sortDir },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select: {
          id:         true,
          userId:     true,
          username:   true,
          role:       true,
          actionType: true,
          entityName: true,
          entityId:   true,
          fieldName:  true,
          oldValue:   true,
          newValue:   true,
          module:     true,
          ipAddress:  true,
          createdAt:  true,
        },
      }),
    ])

    return NextResponse.json({
      data:       logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('GET /api/audit-logs error:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst audit log' }, { status: 500 })
  }
}
