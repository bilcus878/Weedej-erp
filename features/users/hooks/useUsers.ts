'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchUsers } from '../services/userService'
import type { ErpUser } from '../types'

export function useUsers() {
  const [users, setUsers]     = useState<ErpUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await fetchUsers())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { users, loading, error, refresh: load }
}
