export interface Product {
  id: string; name: string; price: number | string; purchasePrice?: number | string | null
  vatRate: number | string; unit: string; categoryId?: string | null
  category?: { id: string; name: string } | null
  stockQuantity: number; eshopVariants?: ProductVariantSummary[]
}

export interface ProductVariantSummary {
  id: string; name: string; price: number | string; isDefault: boolean; isActive: boolean
  variantValue?: number | null; variantUnit?: string | null
}

export interface Category { id: string; name: string; _count?: { products: number } }

export interface EshopVariant {
  id: string; productId: string; name: string; price: number | string
  variantValue?: number | null; variantUnit?: string | null
  isDefault: boolean; isActive: boolean; isSumup: boolean
}

export interface EshopVariantForm {
  name: string; price: string; variantValue: string
  variantUnit: 'g' | 'ml' | 'ks' | ''; isDefault: boolean; isActive: boolean; isSumup: boolean
}

export interface DraftVariant extends EshopVariantForm { tempId: string }

export interface InlineEditForm {
  name: string; price: string; purchasePrice: string
  vatRate: string; unit: string; categoryId: string
}

export type SortField = 'name' | 'category' | 'variants'
export type SortDir   = 'asc' | 'desc'

export const emptyVariantForm = (): EshopVariantForm => ({
  name: '', price: '', variantValue: '', variantUnit: '', isDefault: false, isActive: true, isSumup: false,
})
