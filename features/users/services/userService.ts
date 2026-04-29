import type { ErpUser, UserFormData, UserUpdateData } from '../types'

export async function fetchUsers(): Promise<ErpUser[]> {
  const res = await fetch('/api/users', { cache: 'no-store' })
  if (!res.ok) throw new Error('Nepodařilo se načíst uživatele')
  return res.json()
}

export async function createUser(data: UserFormData): Promise<ErpUser> {
  const res = await fetch('/api/users', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Chyba při vytváření uživatele')
  return json
}

export async function updateUser(id: string, data: UserUpdateData): Promise<ErpUser> {
  const res = await fetch(`/api/users/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Chyba při aktualizaci uživatele')
  return json
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Chyba při mazání uživatele')
  }
}

export async function updateUserRoles(userId: string, roleIds: string[]): Promise<void> {
  const res = await fetch(`/api/users/${userId}/roles`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ roleIds }),
  })
  if (!res.ok) {
    const json = await res.json()
    throw new Error(json.error ?? 'Chyba při aktualizaci rolí')
  }
}
