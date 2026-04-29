// PUT /api/roles/[id]/permissions  — replace all permissions for a role (ADMIN only)
// Accepts: { permissionIds: string[] }

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/routeGuard'
import { createAuditLog } from '@/lib/auditService'

export const dynamic = 'force-dynamic'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.error

  try {
    const role = await prisma.role.findUnique({ where: { id: params.id } })
    if (!role) return NextResponse.json({ error: 'Role nebyla nalezena' }, { status: 404 })

    // System roles (ADMIN) cannot have their permissions changed
    if (role.isSystem) {
      return NextResponse.json({ error: 'Oprávnění systémové role nelze měnit' }, { status: 403 })
    }

    const body = await req.json()
    const { permissionIds } = body as { permissionIds: string[] }

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json({ error: 'permissionIds musí být pole' }, { status: 400 })
    }

    // Validate that all permissionIds exist
    if (permissionIds.length > 0) {
      const found = await prisma.permission.findMany({
        where:  { id: { in: permissionIds } },
        select: { id: true },
      })
      if (found.length !== permissionIds.length) {
        return NextResponse.json({ error: 'Jedno nebo více oprávnění neexistuje' }, { status: 400 })
      }
    }

    // Snapshot current permissions for audit
    const oldPerms = await prisma.rolePermission.findMany({
      where:   { roleId: params.id },
      include: { permission: { select: { name: true } } },
    })

    // Replace permissions atomically
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: params.id } }),
      ...(permissionIds.length > 0
        ? [prisma.rolePermission.createMany({
            data: permissionIds.map(permissionId => ({ roleId: params.id, permissionId })),
          })]
        : []),
    ])

    const newPerms = await prisma.rolePermission.findMany({
      where:   { roleId: params.id },
      include: { permission: { select: { name: true } } },
    })

    await createAuditLog({
      userId:     guard.ctx.userId,
      username:   guard.ctx.username,
      role:       guard.ctx.roles[0] ?? null,
      actionType: 'UPDATE',
      entityName: 'Role',
      entityId:   params.id,
      fieldName:  'permissions',
      oldValue:   JSON.stringify(oldPerms.map(p => p.permission.name).sort()),
      newValue:   JSON.stringify(newPerms.map(p => p.permission.name).sort()),
      module:     'roles',
      ipAddress:  guard.ctx.ipAddress,
    })

    return NextResponse.json({ message: 'Oprávnění role aktualizována' })
  } catch (error) {
    console.error('PUT /api/roles/[id]/permissions error:', error)
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat oprávnění' }, { status: 500 })
  }
}
