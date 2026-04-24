import type { Customer, CustomerFormData } from '../types'

export async function fetchCustomers(): Promise<Customer[]> {
  const res = await fetch('/api/customers')
  return res.json()
}

export async function createCustomer(data: CustomerFormData): Promise<Response> {
  return fetch('/api/customers', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
}

export async function updateCustomer(id: string, data: CustomerFormData): Promise<Response> {
  return fetch(`/api/customers/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
}

export async function deleteCustomer(id: string): Promise<Response> {
  return fetch(`/api/customers/${id}`, { method: 'DELETE' })
}
