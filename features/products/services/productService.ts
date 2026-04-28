import type { Product, Category, EshopVariant } from '../types'

// ─── Products ─────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/products')
  return res.json()
}

export async function createProduct(data: object): Promise<{ id: string }> {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Chyba při vytváření produktu')
  return res.json()
}

export async function updateProduct(id: string, data: object): Promise<Response> {
  return fetch(`/api/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteProduct(id: string): Promise<Response> {
  return fetch(`/api/products/${id}`, { method: 'DELETE' })
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories')
  return res.json()
}

export async function createCategory(name: string): Promise<Response> {
  return fetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function updateCategory(id: string, name: string): Promise<Response> {
  return fetch(`/api/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export async function deleteCategory(id: string): Promise<Response> {
  return fetch(`/api/categories/${id}`, { method: 'DELETE' })
}

// ─── Variants ─────────────────────────────────────────────────────────────────

export async function fetchVariants(productId: string): Promise<EshopVariant[]> {
  const res = await fetch(`/api/products/${productId}/eshop-variants`)
  if (!res.ok) throw new Error('Nepodařilo se načíst varianty')
  return res.json()
}

export async function createVariant(productId: string, data: object): Promise<Response> {
  return fetch(`/api/products/${productId}/eshop-variants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateVariant(
  productId: string,
  variantId: string,
  data: object,
): Promise<Response> {
  return fetch(`/api/products/${productId}/eshop-variants/${variantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteVariant(productId: string, variantId: string): Promise<Response> {
  return fetch(`/api/products/${productId}/eshop-variants/${variantId}`, { method: 'DELETE' })
}

// ─── SKU preview ──────────────────────────────────────────────────────────────

/**
 * Ask the server to preview the SKU that would be auto-generated for a variant,
 * WITHOUT persisting anything. Used to pre-fill the SKU field before the user saves.
 *
 * @param productId   Parent product ID (must exist in DB).
 * @param variantName Variant display name used for colour/size extraction.
 * @param variantValue Optional numeric size value (e.g. 30).
 * @param variantUnit  Optional unit string: "g" | "ml" | "ks".
 * @param excludeId   Variant ID to exclude from uniqueness check (pass when editing).
 */
export async function generateSkuPreview(
  productId:    string,
  variantName:  string,
  variantValue?: string,
  variantUnit?:  string,
  excludeId?:   string,
): Promise<string> {
  const params = new URLSearchParams({ variantName })
  if (variantValue) params.set('variantValue', variantValue)
  if (variantUnit)  params.set('variantUnit',  variantUnit)
  if (excludeId)    params.set('excludeId',    excludeId)

  const res = await fetch(
    `/api/products/${productId}/eshop-variants/generate-sku?${params.toString()}`,
  )
  if (!res.ok) throw new Error('Chyba při generování SKU')
  const data = await res.json() as { sku: string }
  return data.sku
}
