// PATCH  /api/users/[id]  — update user name / isActive / password (ADMIN only)
// DELETE /api/users/[id]  — permanently delete user (ADMIN only)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/routeGuard'
import { createAuditLog, diffAndLog } from '@/lib/auditService'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.error

  // Prevent admin from deactivating their own account
  if (params.id === guard.ctx.userId) {
    return NextResponse.json(
      { error: 'Nemůžete upravit vlastní účet' },
      { status: 400 }
    )
  }

  try {
    const body = await req.json()
    const { name, isActive, password } = body as {
      name?:     string
      isActive?: boolean
      password?: string
    }

    const before = await prisma.user.findUnique({
      where:  { id: params.id },
      select: { id: true, name: true, isActive: true, email: true },
    })
    if (!before) {
      return NextResponse.json({ error: 'Uživatel nebyl nalezen' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined)     updateData.name     = name.trim()
    if (isActive !== undefined) updateData.isActive = isActive
    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Heslo musí mít alespoň 8 znaků' }, { status: 400 })
      }
      // passwordHash is written but excluded from audit diff automatically
      updateData.passwordHash = await bcrypt.hash(password, 12)
    }

    const after = await prisma.user.update({
      where:  { id: params.id },
      data:   updateData,
      select: { id: true, name: true, isActive: true, email: true, updatedAt: true },
    })

    const base = {
      userId:    guard.ctx.userId,
      username:  guard.ctx.username,
      role:      guard.ctx.roles[0] ?? null,
      entityName: 'User',
      entityId:  params.id,
      module:    'users',
      ipAddress: guard.ctx.ipAddress,
    }

    const diffs = diffAndLog(base, before as any, { ...after, passwordHash: undefined } as any)
    if (password) {
      // Log password change without storing old/new values
      diffs.push(createAuditLog({ ...base, actionType: 'UPDATE', fieldName: 'password', oldValue: '[REDACTED]', newValue: '[REDACTED]' }))
    }
    await Promise.all(diffs)

    return NextResponse.json(after)
  } catch (error: any) {
    console.error('PATCH /api/users/[id] error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Uživatel nebyl nalezen' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Nepodařilo se aktualizovat uživatele' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.error

  if (params.id === guard.ctx.userId) {
    return NextResponse.json({ error: 'Nemůžete smazat vlastní účet' }, { status: 400 })
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { id: params.id },
      select: { id: true, email: true, name: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Uživatel nebyl nalezen' }, { status: 404 })
    }

    await prisma.user.delete({ where: { id: params.id } })

    await createAuditLog({
      userId:     guard.ctx.userId,
      username:   guard.ctx.username,
      role:       guard.ctx.roles[0] ?? null,
      actionType: 'DELETE',
      entityName: 'User',
      entityId:   params.id,
      oldValue:   JSON.stringify({ email: user.email, name: user.name }),
      module:     'users',
      ipAddress:  guard.ctx.ipAddress,
    })

    return NextResponse.json({ message: 'Uživatel byl smazán' })
  } catch (error: any) {
    console.error('DELETE /api/users/[id] error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Uživatel nebyl nalezen' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Nepodařilo se smazat uživatele' }, { status: 500 })
  }
}
