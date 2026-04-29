import type { Role, Permission } from '../types'

export async function fetchRoles(): Promise<Role[]> {
  const res = await fetch('/api/roles', { cache: 'no-store' })
  if (!res.ok) throw new Error('Nepodařilo se načíst role')
  return res.json()
}

export async function fetchPermissions(): Promise<Permission[]> {
  const res = await fetch('/api/permissions', { cache: 'no-store' })
  if (!res.ok) throw new Error('Nepodařilo se načíst oprávnění')
  return res.json()
}

export async function createRole(data: { name: string; displayName: string; description?: string }): Promise<Role> {
  const res = await fetch('/api/roles', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Chyba při vytváření role')
  return json
}

export async function updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  const res = await fetch(`/api/roles/${roleId}/permissions`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ permissionIds }),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Chyba při aktualizaci oprávnění')
  }
}

export async function deleteRole(id: string): Promise<void> {
  const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Chyba při mazání role')
  }
}
