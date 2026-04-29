// GET  /api/roles  — list all roles with their permissions (ADMIN only)
// POST /api/roles  — create a new role (ADMIN only)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/routeGuard'
import { createAuditLog } from '@/lib/auditService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.error

  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        rolePermissions: {
          include: { permission: true },
          orderBy: { permission: { module: 'asc' } },
        },
        _count: { select: { userRoles: true } },
      },
    })
    return NextResponse.json(roles)
  } catch (error) {
    console.error('GET /api/roles error:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst role' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.error

  try {
    const body = await req.json()
    const { name, displayName, description } = body as {
      name:         string
      displayName:  string
      description?: string
    }

    if (!name?.trim() || !displayName?.trim()) {
      return NextResponse.json({ error: 'Název a zobrazený název jsou povinné' }, { status: 400 })
    }

    const role = await prisma.role.create({
      data: {
        name:        name.trim().toUpperCase().replace(/\s+/g, '_'),
        displayName: displayName.trim(),
        description: description?.trim() ?? null,
        isSystem:    false,
      },
    })

    await createAuditLog({
      userId:     guard.ctx.userId,
      username:   guard.ctx.username,
      role:       guard.ctx.roles[0] ?? null,
      actionType: 'CREATE',
      entityName: 'Role',
      entityId:   role.id,
      newValue:   JSON.stringify({ name: role.name, displayName: role.displayName }),
      module:     'roles',
      ipAddress:  guard.ctx.ipAddress,
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/roles error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Role s tímto názvem již existuje' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Nepodařilo se vytvořit roli' }, { status: 500 })
  }
}
