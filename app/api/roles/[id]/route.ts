// PATCH  /api/roles/[id]  — update role metadata (ADMIN only, non-system roles)
// DELETE /api/roles/[id]  — delete role (ADMIN only, non-system roles)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/routeGuard'
import { createAuditLog } from '@/lib/auditService'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.error

  try {
    const role = await prisma.role.findUnique({ where: { id: params.id } })
    if (!role) return NextResponse.json({ error: 'Role nebyla nalezena' }, { status: 404 })
    if (role.isSystem) {
      return NextResponse.json({ error: 'Systémové role nelze upravovat' }, { status: 403 })
    }

    const body = await req.json()
    const { displayName, description } = body as { displayName?: string; description?: string }

    const updated = await prisma.role.update({
      where: { id: params.id },
      data:  {
        displayName: displayName?.trim() ?? role.displayName,
        description: description?.trim() ?? role.description,
      },
    })

    await createAuditLog({
      userId:     guard.ctx.userId,
      username:   guard.ctx.username,
      role:       guard.ctx.roles[0] ?? null,
      actionType: 'UPDATE',
      entityName: 'Role',
      entityId:   params.id,
      newValue:   JSON.stringify({ displayName: updated.displayName, description: updated.description }),
      module:     'roles',
      ipAddress:  guard.ctx.ipAddress,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('PATCH /api/roles/[id] error:', error)
    if (error.code === 'P2025') return NextResponse.json({ error: 'Role nebyla nalezena' }, { status: 404 })
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat roli' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.error

  try {
    const role = await prisma.role.findUnique({
      where:   { id: params.id },
      include: { _count: { select: { userRoles: true } } },
    })
    if (!role) return NextResponse.json({ error: 'Role nebyla nalezena' }, { status: 404 })
    if (role.isSystem) {
      return NextResponse.json({ error: 'Systémové role nelze smazat' }, { status: 403 })
    }
    if (role._count.userRoles > 0) {
      return NextResponse.json(
        { error: `Roli má přiřazeno ${role._count.userRoles} uživatelů. Nejprve odeberte roli uživatelům.` },
        { status: 409 }
      )
    }

    await prisma.role.delete({ where: { id: params.id } })

    await createAuditLog({
      userId:     guard.ctx.userId,
      username:   guard.ctx.username,
      role:       guard.ctx.roles[0] ?? null,
      actionType: 'DELETE',
      entityName: 'Role',
      entityId:   params.id,
      oldValue:   JSON.stringify({ name: role.name, displayName: role.displayName }),
      module:     'roles',
      ipAddress:  guard.ctx.ipAddress,
    })

    return NextResponse.json({ message: 'Role byla smazána' })
  } catch (error: any) {
    console.error('DELETE /api/roles/[id] error:', error)
    if (error.code === 'P2025') return NextResponse.json({ error: 'Role nebyla nalezena' }, { status: 404 })
    return NextResponse.json({ error: 'Nepodařilo se smazat roli' }, { status: 500 })
  }
}
