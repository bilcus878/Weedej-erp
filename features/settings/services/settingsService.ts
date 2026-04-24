import type { AppSettings, ApiKeyItem, CompanyFormData } from '../types'

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch('/api/settings')
  return res.json()
}

export async function updateSettings(data: Partial<CompanyFormData> | { isVatPayer: boolean } | { allowNegativeStock: boolean }): Promise<AppSettings> {
  const res = await fetch('/api/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Nepodařilo se uložit nastavení')
  return res.json()
}

export async function resetDatabase(): Promise<void> {
  const res = await fetch('/api/settings/reset-database', { method: 'POST' })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error || 'Chyba při resetování')
}

export async function fetchApiKeys(): Promise<ApiKeyItem[]> {
  const res = await fetch('/api/api-keys')
  if (!res.ok) throw new Error()
  return res.json()
}

export async function createApiKey(name: string): Promise<{ key: string }> {
  const res = await fetch('/api/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Nepodařilo se vytvořit API klíč')
  return res.json()
}

export async function toggleApiKey(id: string, isActive: boolean): Promise<Response> {
  return fetch(`/api/api-keys/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: !isActive }),
  })
}

export async function deleteApiKey(id: string): Promise<Response> {
  return fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
}
