'use client'

// PermissionGate — conditionally renders children based on the current user's
// JWT-cached permissions. This is a UI-only guard for progressive disclosure.
// Backend routes enforce the real permission check independently.

import { useSession } from 'next-auth/react'
import type { ReactNode } from 'react'

interface Props {
  permission:  string | string[]   // required permission(s)
  requireAll?: boolean             // true = AND logic, false (default) = OR logic
  fallback?:   ReactNode           // rendered when permission check fails
  children:    ReactNode
}

export function PermissionGate({ permission, requireAll = false, fallback = null, children }: Props) {
  const { data: session } = useSession()
  const userPermissions: string[] = (session?.user as any)?.permissions ?? []
  const userRoles:       string[] = (session?.user as any)?.roles       ?? []

  // ADMIN role has unconditional access in the UI as well
  if (userRoles.includes('ADMIN')) return <>{children}</>

  const required = Array.isArray(permission) ? permission : [permission]
  const granted  = requireAll
    ? required.every(p => userPermissions.includes(p))
    : required.some(p =>  userPermissions.includes(p))

  return granted ? <>{children}</> : <>{fallback}</>
}
