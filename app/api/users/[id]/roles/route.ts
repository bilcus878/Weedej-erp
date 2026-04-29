// PUT /api/users/[id]/roles  — replace the user's entire role set (ADMIN only)
// Accepts: { roleIds: string[] }

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
    const body = await req.json()
    const { roleIds } = body as { roleIds: string[] }

    if (!Array.isArray(roleIds)) {
      return NextResponse.json({ error: 'roleIds musí být pole' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where:  { id: params.id },
      select: { id: true, email: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Uživatel nebyl nalezen' }, { status: 404 })
    }

    // Validate all provided roleIds exist
    if (roleIds.length > 0) {
      const found = await prisma.role.findMany({ where: { id: { in: roleIds } }, select: { id: true } })
      if (found.length !== roleIds.length) {
        return NextResponse.json({ error: 'Jedna nebo více rolí neexistuje' }, { status: 400 })
      }
    }

    // Fetch current roles for audit diff
    const oldRoles = await prisma.userRole.findMany({
      where:  { userId: params.id },
      include: { role: { select: { name: true } } },
    })

    // Replace roles atomically
    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: params.id } }),
      ...(roleIds.length > 0
        ? [prisma.userRole.createMany({
            data: roleIds.map(roleId => ({
              userId:     params.id,
              roleId,
              assignedBy: guard.ctx.userId,
            })),
          })]
        : []),
    ])

    const newRoles = await prisma.userRole.findMany({
      where:   { userId: params.id },
      include: { role: { select: { name: true } } },
    })

    await createAuditLog({
      userId:     guard.ctx.userId,
      username:   guard.ctx.username,
      role:       guard.ctx.roles[0] ?? null,
      actionType: 'UPDATE',
      entityName: 'User',
      entityId:   params.id,
      fieldName:  'roles',
      oldValue:   JSON.stringify(oldRoles.map(r => r.role.name)),
      newValue:   JSON.stringify(newRoles.map(r => r.role.name)),
      module:     'users',
      ipAddress:  guard.ctx.ipAddress,
    })

    return NextResponse.json({ message: 'Role uživatele aktualizovány' })
  } catch (error) {
    console.error('PUT /api/users/[id]/roles error:', error)
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat role' }, { status: 500 })
  }
}
