import type { Product, Category, EshopVariant } from '../types'

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/products')
  return res.json()
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories')
  return res.json()
}

export async function createProduct(data: object): Promise<{ id: string }> {
  const res = await fetch('/api/products', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Chyba při vytváření produktu')
  return res.json()
}

export async function updateProduct(id: string, data: object): Promise<Response> {
  return fetch(`/api/products/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteProduct(id: string): Promise<Response> {
  return fetch(`/api/products/${id}`, { method: 'DELETE' })
}

export async function fetchVariants(productId: string): Promise<EshopVariant[]> {
  const res = await fetch(`/api/products/${productId}/eshop-variants`)
  if (!res.ok) throw new Error()
  return res.json()
}

export async function createVariant(productId: string, data: object): Promise<Response> {
  return fetch(`/api/products/${productId}/eshop-variants`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateVariant(productId: string, variantId: string, data: object): Promise<Response> {
  return fetch(`/api/products/${productId}/eshop-variants/${variantId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteVariant(productId: string, variantId: string): Promise<Response> {
  return fetch(`/api/products/${productId}/eshop-variants/${variantId}`, { method: 'DELETE' })
}

export async function createCategory(name: string): Promise<Response> {
  return fetch('/api/categories', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function updateCategory(id: string, name: string): Promise<Response> {
  return fetch(`/api/categories/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function deleteCategory(id: string): Promise<Response> {
  return fetch(`/api/categories/${id}`, { method: 'DELETE' })
}
