import type { Supplier, SupplierFormData } from '../types'

export async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await fetch('/api/suppliers')
  return res.json()
}

export async function createSupplier(data: SupplierFormData): Promise<Response> {
  return fetch('/api/suppliers', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
}

export async function updateSupplier(id: string, data: SupplierFormData): Promise<Response> {
  return fetch(`/api/suppliers/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
}

export async function deleteSupplier(id: string): Promise<Response> {
  return fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
}
