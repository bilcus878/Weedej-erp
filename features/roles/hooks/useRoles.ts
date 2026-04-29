'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchRoles, fetchPermissions } from '../services/roleService'
import type { Role, Permission, PermissionsByModule } from '../types'

export function useRoles() {
  const [roles, setRoles]             = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, p] = await Promise.all([fetchRoles(), fetchPermissions()])
      setRoles(r)
      setPermissions(p)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const permissionsByModule: PermissionsByModule = permissions.reduce<PermissionsByModule>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = []
    acc[p.module].push(p)
    return acc
  }, {})

  return { roles, permissions, permissionsByModule, loading, error, refresh: load }
}
