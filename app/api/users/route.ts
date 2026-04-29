// GET  /api/users  — list all ERP users (ADMIN only)
// POST /api/users  — create new ERP user (ADMIN only)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/routeGuard'
import { createAuditLog } from '@/lib/auditService'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.error

  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        id:        true,
        email:     true,
        name:      true,
        isActive:  true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            assignedAt: true,
            role: { select: { id: true, name: true, displayName: true } },
          },
        },
      },
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error('GET /api/users error:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst uživatele' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.error

  try {
    const body = await req.json()
    const { email, name, password, roleNames = [] } = body as {
      email:      string
      name:       string
      password:   string
      roleNames?: string[]
    }

    if (!email?.trim() || !name?.trim() || !password) {
      return NextResponse.json({ error: 'Email, jméno a heslo jsou povinné' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Heslo musí mít alespoň 8 znaků' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email:        email.toLowerCase().trim(),
        name:         name.trim(),
        passwordHash,
        isActive:     true,
      },
      select: { id: true, email: true, name: true, isActive: true, createdAt: true },
    })

    // Assign initial roles if provided
    if (roleNames.length > 0) {
      const roles = await prisma.role.findMany({ where: { name: { in: roleNames } } })
      if (roles.length > 0) {
        await prisma.userRole.createMany({
          data: roles.map(r => ({
            userId:     user.id,
            roleId:     r.id,
            assignedBy: guard.ctx.userId,
          })),
          skipDuplicates: true,
        })
      }
    }

    await createAuditLog({
      userId:     guard.ctx.userId,
      username:   guard.ctx.username,
      role:       guard.ctx.roles[0] ?? null,
      actionType: 'CREATE',
      entityName: 'User',
      entityId:   user.id,
      newValue:   JSON.stringify({ email: user.email, name: user.name }),
      module:     'users',
      ipAddress:  guard.ctx.ipAddress,
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/users error:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Uživatel s tímto emailem již existuje' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Nepodařilo se vytvořit uživatele' }, { status: 500 })
  }
}
