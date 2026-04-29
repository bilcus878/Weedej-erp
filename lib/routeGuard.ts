// Route guard utilities for permission checking.
//
// SECURITY: requirePermission() always validates against the current database
// state — never trusts JWT-cached permissions alone. This ensures that if an
// admin revokes a role mid-session, the user loses access immediately without
// requiring re-login.

import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Permission } from '@/lib/permissions'

export interface AuthContext {
  userId:      string
  username:    string
  roles:       string[]
  permissions: string[]
  ipAddress:   string | null
}

type GuardOk     = { ok: true;  ctx: AuthContext;  error: null }
type GuardFail   = { ok: false; ctx: null;         error: NextResponse }
export type GuardResult = GuardOk | GuardFail

function extractIp(req?: NextRequest): string | null {
  if (!req) return null
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    null
  )
}

// Load the user's current roles + permissions fresh from the database.
// One DB call per protected request — ensures revocations take effect instantly.
async function loadUserPermissions(userId: string): Promise<{ roles: string[]; permissions: string[] }> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  })

  const roles = userRoles.map(ur => ur.role.name)
  const permissions = [
    ...new Set(
      userRoles.flatMap(ur => ur.role.rolePermissions.map(rp => rp.permission.name))
    ),
  ]
  return { roles, permissions }
}

// Verify that a valid session exists. No permission check.
export async function requireAuth(req?: NextRequest): Promise<GuardResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      ok:    false,
      ctx:   null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const u = session.user as any
  return {
    ok:  true,
    ctx: {
      userId:      u.id    ?? '',
      username:    u.email ?? u.name ?? '',
      roles:       u.roles       ?? [],
      permissions: u.permissions ?? [],
      ipAddress:   extractIp(req),
    },
    error: null,
  }
}

// Verify session AND validate the required permission against the current DB
// state. Falls back gracefully if the user record is missing (deactivated).
export async function requirePermission(
  permission: Permission,
  req?: NextRequest,
): Promise<GuardResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      ok:    false,
      ctx:   null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const userId = (session.user as any).id as string

  // Verify user is still active
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { isActive: true, email: true, name: true },
  })

  if (!user || !user.isActive) {
    return {
      ok:    false,
      ctx:   null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { roles, permissions } = await loadUserPermissions(userId)

  if (!permissions.includes(permission)) {
    return {
      ok:    false,
      ctx:   null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    ok:  true,
    ctx: {
      userId,
      username:  user.email ?? user.name ?? '',
      roles,
      permissions,
      ipAddress: extractIp(req),
    },
    error: null,
  }
}

// Verify session AND that the user holds the ADMIN role in the database.
// Used for privilege-sensitive operations (user management, role management).
// ADMIN check is intentionally separate from permission checks to prevent
// privilege escalation via permission tampering.
export async function requireAdmin(req?: NextRequest): Promise<GuardResult> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      ok:    false,
      ctx:   null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const userId = (session.user as any).id as string

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { isActive: true, email: true, name: true },
  })

  if (!user || !user.isActive) {
    return {
      ok:    false,
      ctx:   null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const { roles, permissions } = await loadUserPermissions(userId)

  if (!roles.includes('ADMIN')) {
    return {
      ok:    false,
      ctx:   null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return {
    ok:  true,
    ctx: {
      userId,
      username:  user.email ?? user.name ?? '',
      roles,
      permissions,
      ipAddress: extractIp(req),
    },
    error: null,
  }
}
