'use client'

import { useState, useMemo, useRef } from 'react'
import { useEntityPage, useFilters } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import { VAT_RATE_LABELS, CZECH_VAT_RATES } from '@/lib/vatCalculation'
import type { Product, Category, EshopVariant, EshopVariantForm, SortField, SortDir, InlineEditForm } from '../types'
import { emptyVariantForm } from '../types'
import {
  fetchProducts, fetchCategories,
  fetchVariants as fetchVariantsService,
  updateProduct, deleteProduct,
  createVariant, updateVariant, deleteVariant,
} from '../services/productService'

export function useProducts() {
  const { isVatPayer } = useCompanySettings()

  const [categories,      setCategories]      = useState<Category[]>([])
  const [popupOpen,       setPopupOpen]       = useState(false)
  const [inlineEditForms, setInlineEditForms] = useState<Record<string, InlineEditForm>>({})
  const [eshopVariants,   setEshopVariants]   = useState<Record<string, EshopVariant[]>>({})
  const [variantForms,    setVariantForms]    = useState<Record<string, EshopVariantForm>>({})
  const [editingVariant,  setEditingVariant]  = useState<Record<string, EshopVariant | null>>({})
  const [variantLoading,  setVariantLoading]  = useState<Record<string, boolean>>({})
  const [sortField,       setSortField]       = useState<SortField>('name')
  const [sortDir,         setSortDir]         = useState<SortDir>('asc')

  const resetPage = useRef<() => void>(() => {})

  const catOptions = useMemo(() => [
    { label: 'Všechny kategorie', value: '' },
    ...categories.map(c => ({ label: c.name, value: c.id })),
  ], [categories])

  const vatOptions = useMemo(() => [
    { label: 'Všechna DPH', value: '' },
    ...CZECH_VAT_RATES.map(r => ({ label: VAT_RATE_LABELS[r], value: String(r) })),
  ], [])

  const filters = useFilters<Product>([
    { key: 'name',     type: 'text',   placeholder: 'Název...',    match: (r, v) => r.name.toLowerCase().includes(v.toLowerCase()) },
    { key: 'category', type: 'select', options: catOptions,        match: (r, v) => !v || r.categoryId === v },
    ...(isVatPayer ? [{ key: 'vat', type: 'select' as const, options: vatOptions, match: (r: Product, v: string) => !v || String(Number(r.vatRate)) === v }] : []),
    { key: 'unit',     type: 'text',   placeholder: 'Jednotka...', match: (r, v) => r.unit.toLowerCase().includes(v.toLowerCase()) },
  ], () => resetPage.current())

  const ep = useEntityPage<Product>({
    fetchData: async () => {
      const [products, cats] = await Promise.all([fetchProducts(), fetchCategories()])
      setCategories(Array.isArray(cats) ? cats : [])
      return products
    },
    getRowId:    r => r.id,
    filterFn:    filters.fn,
    highlightId: null,
  })
  resetPage.current = () => ep.setPage(1)

  const sorted = useMemo(() => [...ep.filtered].sort((a, b) => {
    const av = sortField === 'category' ? (a.category?.name || '') : sortField === 'variants' ? (a.eshopVariants?.length ?? 0) : a.name
    const bv = sortField === 'category' ? (b.category?.name || '') : sortField === 'variants' ? (b.eshopVariants?.length ?? 0) : b.name
    return av < bv ? (sortDir === 'asc' ? -1 : 1) : av > bv ? (sortDir === 'asc' ? 1 : -1) : 0
  }), [ep.filtered, sortField, sortDir])

  const PAGE_SIZE  = 20
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated  = useMemo(() => sorted.slice((ep.page - 1) * PAGE_SIZE, ep.page * PAGE_SIZE), [sorted, ep.page])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function handleToggleExpand(id: string) {
    ep.toggleExpand(id)
    if (!eshopVariants[id]) loadVariants(id)
  }

  function handleInlineEdit(product: Product) {
    ep.expandRow(product.id)
    if (!eshopVariants[product.id]) loadVariants(product.id)
    setInlineEditForms(prev => ({
      ...prev,
      [product.id]: {
        name: product.name, price: String(product.price),
        purchasePrice: product.purchasePrice ? String(product.purchasePrice) : '',
        vatRate: isVatPayer ? String(Number(product.vatRate) || 21) : '0',
        unit: product.unit, categoryId: product.categoryId || '',
      },
    }))
  }

  function handleInlineCancel(id: string) {
    setInlineEditForms(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  async function handleInlineSave(id: string) {
    const form = inlineEditForms[id]
    if (!form?.name.trim()) { alert('Vyplň název produktu'); return }
    const res = await updateProduct(id, {
      name: form.name, price: parseFloat(form.price) || 0,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : null,
      vatRate: isVatPayer ? parseFloat(form.vatRate) : 0,
      unit: form.unit, categoryId: form.categoryId || null,
    })
    if (res.ok) { await ep.refresh(); handleInlineCancel(id) }
    else alert('Chyba při ukládání produktu')
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Smazat "${product.name}"?`)) return
    const res = await deleteProduct(product.id)
    if (res.ok) await ep.refresh()
    else alert('Nepodařilo se smazat produkt')
  }

  async function loadVariants(productId: string) {
    try {
      const data = await fetchVariantsService(productId)
      setEshopVariants(prev => ({ ...prev, [productId]: data }))
    } catch { /* silent */ }
  }

  async function handleVariantSubmit(productId: string) {
    const form = variantForms[productId] || emptyVariantForm()
    if (!form.name || !form.price) { alert('Vyplň název a cenu varianty'); return }
    setVariantLoading(prev => ({ ...prev, [productId]: true }))
    try {
      const ev = editingVariant[productId]

      // Build the base payload shared by both create and update
      const payload: Record<string, unknown> = {
        name:         form.name,
        price:        parseFloat(form.price),
        variantValue: form.variantValue ? parseFloat(form.variantValue) : null,
        variantUnit:  form.variantUnit || null,
        isDefault:    form.isDefault,
        isActive:     form.isActive,
        isSumup:      form.isSumup,
        // EAN: always include — null means "no EAN" (create) or "clear EAN" (update)
        ean:          form.ean.trim() || null,
      }

      // SKU: only include when non-empty.
      //   • On create — omitted → server auto-generates
      //   • On update — omitted → server keeps the existing value
      const normSku = form.sku.trim().toUpperCase()
      if (normSku) payload.sku = normSku

      const res = ev
        ? await updateVariant(productId, ev.id, payload)
        : await createVariant(productId, payload)

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; errors?: Record<string, string> }
        const msg  = body.errors
          ? Object.values(body.errors).join('\n')
          : body.error ?? 'Chyba při ukládání varianty'
        throw new Error(msg)
      }

      await loadVariants(productId)
      setVariantForms(prev => ({ ...prev, [productId]: emptyVariantForm() }))
      setEditingVariant(prev => ({ ...prev, [productId]: null }))
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Chyba') }
    finally { setVariantLoading(prev => ({ ...prev, [productId]: false })) }
  }

  function handleEditVariant(productId: string, v: EshopVariant) {
    setEditingVariant(prev => ({ ...prev, [productId]: v }))
    setVariantForms(prev => ({
      ...prev,
      [productId]: {
        name:         v.name,
        price:        String(v.price),
        variantValue: v.variantValue ? String(v.variantValue) : '',
        variantUnit:  (v.variantUnit as 'g' | 'ml' | 'ks' | '') ?? '',
        isDefault:    v.isDefault,
        isActive:     v.isActive,
        isSumup:      v.isSumup,
        sku:          v.sku ?? '',
        ean:          v.ean ?? '',
      },
    }))
  }

  function handleCancelVariantEdit(productId: string) {
    setEditingVariant(prev => ({ ...prev, [productId]: null }))
    setVariantForms(prev => ({ ...prev, [productId]: emptyVariantForm() }))
  }

  async function handleDeleteVariant(productId: string, variantId: string, variantName: string) {
    if (!confirm(`Smazat variantu "${variantName}"?`)) return
    setVariantLoading(prev => ({ ...prev, [productId]: true }))
    try {
      const res = await deleteVariant(productId, variantId)
      if (!res.ok) throw new Error('Chyba při mazání varianty')
      await loadVariants(productId)
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Chyba') }
    finally { setVariantLoading(prev => ({ ...prev, [productId]: false })) }
  }

  return {
    ep, filters, categories, isVatPayer,
    popupOpen, setPopupOpen,
    sorted, paginated, totalPages,
    sortField, sortDir, toggleSort,
    inlineEditForms, setInlineEditForms,
    eshopVariants,
    variantForms, setVariantForms,
    editingVariant,
    variantLoading,
    handleToggleExpand,
    handleInlineEdit, handleInlineCancel, handleInlineSave, handleDelete,
    loadVariants,
    handleVariantSubmit, handleEditVariant, handleCancelVariantEdit, handleDeleteVariant,
  }
}
