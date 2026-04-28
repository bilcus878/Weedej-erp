// ─── Product catalog types ────────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  price: number | string
  purchasePrice?: number | string | null
  vatRate: number | string
  unit: string
  categoryId?: string | null
  batchTracking?: boolean
  category?: { id: string; name: string } | null
  stockQuantity: number
  eshopVariants?: ProductVariantSummary[]
}

/** Lightweight summary returned inside the Product list endpoint. */
export interface ProductVariantSummary {
  id: string
  name: string
  price: number | string
  isDefault: boolean
  isActive: boolean
  variantValue?: number | null
  variantUnit?: string | null
  sku?: string | null
}

export interface Category {
  id: string
  name: string
  _count?: { products: number }
}

// ─── Full variant (returned by GET /api/products/[id]/eshop-variants) ─────────

export interface EshopVariant {
  id: string
  productId: string
  name: string
  price: number | string
  variantValue?: number | null
  variantUnit?: string | null
  isDefault: boolean
  isActive: boolean
  isSumup: boolean
  /** Unique SKU across all variants. Null only for legacy rows created before the feature. */
  sku: string | null
  /** EAN-8, EAN-13, or GTIN-14 barcode. Null when not assigned. */
  ean: string | null
}

// ─── Form state (all fields as strings for controlled inputs) ─────────────────

export interface EshopVariantForm {
  name: string
  price: string
  variantValue: string
  variantUnit: 'g' | 'ml' | 'ks' | ''
  isDefault: boolean
  isActive: boolean
  isSumup: boolean
  /**
   * SKU value as entered by the user (uppercase, may contain hyphens).
   * Empty string means "auto-generate" on create; on update, empty means "keep existing".
   */
  sku: string
  /**
   * EAN value as entered by the user (digits only, stripped of spaces/dashes).
   * Empty string means "no EAN" on create; on update, empty means "keep existing".
   */
  ean: string
}

export interface DraftVariant extends EshopVariantForm {
  tempId: string
}

// ─── Product inline-edit form ─────────────────────────────────────────────────

export interface InlineEditForm {
  name: string
  price: string
  purchasePrice: string
  vatRate: string
  unit: string
  categoryId: string
}

// ─── Table sorting ────────────────────────────────────────────────────────────

export type SortField = 'name' | 'category' | 'variants'
export type SortDir   = 'asc' | 'desc'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const emptyVariantForm = (): EshopVariantForm => ({
  name:         '',
  price:        '',
  variantValue: '',
  variantUnit:  '',
  isDefault:    false,
  isActive:     true,
  isSumup:      false,
  sku:          '',
  ean:          '',
})
