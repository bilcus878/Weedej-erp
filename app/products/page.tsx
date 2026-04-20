'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { formatPrice } from '@/lib/utils'
import { VAT_RATE_LABELS, isNonVatPayer, CZECH_VAT_RATES } from '@/lib/vatCalculation'
import { Plus, X, Edit2, Trash2, ChevronUp, ChevronDown, ChevronRight, Package, Tag, ShoppingBag } from 'lucide-react'
import {
  useEntityPage, EntityPage, LoadingState, ErrorState,
} from '@/components/erp'

export const dynamic = 'force-dynamic'

interface ProductVariantSummary {
  id: string; name: string; price: number | string; isDefault: boolean; isActive: boolean
  variantValue?: number | null; variantUnit?: string | null
}

interface Product {
  id: string; name: string; price: number | string; purchasePrice?: number | string | null
  vatRate: number | string; unit: string; categoryId?: string | null
  category?: { id: string; name: string } | null
  stockQuantity: number; eshopVariants?: ProductVariantSummary[]
}

interface Category {
  id: string; name: string; _count?: { products: number }
}

interface EshopVariant {
  id: string; productId: string; name: string; price: number | string
  variantValue?: number | null; variantUnit?: string | null
  isDefault: boolean; isActive: boolean; isSumup: boolean
}

interface EshopVariantForm {
  name: string; price: string; variantValue: string
  variantUnit: 'g' | 'ml' | 'ks' | ''; isDefault: boolean; isActive: boolean; isSumup: boolean
}

type SortField = 'name' | 'category' | 'variants'
type SortDirection = 'asc' | 'desc'

const emptyVariantForm = (): EshopVariantForm => ({
  name: '', price: '', variantValue: '', variantUnit: '', isDefault: false, isActive: true, isSumup: false,
})

export default function ProductsPage() {
  const [categories, setCategories]   = useState<Category[]>([])
  const [isVatPayer, setIsVatPayer]   = useState(true)

  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null)
  const [inlineEditForms, setInlineEditForms] = useState<Record<string, { name: string; price: string; purchasePrice: string; vatRate: string; unit: string; categoryId: string }>>({})
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [sortField, setSortField]       = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  const [eshopVariants, setEshopVariants] = useState<Record<string, EshopVariant[]>>({})
  const [variantForms, setVariantForms]   = useState<Record<string, EshopVariantForm>>({})
  const [editingVariant, setEditingVariant] = useState<Record<string, EshopVariant | null>>({})
  const [variantLoading, setVariantLoading] = useState<Record<string, boolean>>({})

  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState({ name: '' })
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const [filterName, setFilterName]   = useState('')
  const [filterVat, setFilterVat]     = useState('')
  const [filterUnit, setFilterUnit]   = useState('')

  const [currentPage, setCurrentPage]   = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const sectionRef = useRef<HTMLDivElement>(null)

  const ep = useEntityPage<Product>({
    fetchData: async () => {
      const [pRes, cRes, sRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/settings'),
      ])
      const [p, c, s] = await Promise.all([pRes.json(), cRes.json(), sRes.json()])
      setCategories(Array.isArray(c) ? c : [])
      setIsVatPayer(s.isVatPayer ?? true)
      return p
    },
    getRowId: r => r.id,
    filterFn: () => true,
    highlightId: null,
  })

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = ep.rows
    if (categoryFilter) filtered = filtered.filter(p => p.categoryId === categoryFilter)
    if (filterName)     filtered = filtered.filter(p => p.name.toLowerCase().includes(filterName.toLowerCase()))
    if (filterUnit)     filtered = filtered.filter(p => p.unit.toLowerCase().includes(filterUnit.toLowerCase()))
    if (filterVat)      filtered = filtered.filter(p => String(Number(p.vatRate)) === filterVat)
    return [...filtered].sort((a, b) => {
      if (a.id === newlyCreatedId) return -1
      if (b.id === newlyCreatedId) return 1
      let aVal: any, bVal: any
      if (sortField === 'category')      { aVal = a.category?.name || ''; bVal = b.category?.name || '' }
      else if (sortField === 'variants') { aVal = a.eshopVariants?.length ?? 0; bVal = b.eshopVariants?.length ?? 0 }
      else                               { aVal = a[sortField]; bVal = b[sortField] }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [ep.rows, sortField, sortDirection, categoryFilter, filterName, filterUnit, filterVat, newlyCreatedId])

  useEffect(() => { setCurrentPage(1) }, [filterName, filterUnit, categoryFilter, filterVat])

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredAndSortedProducts.slice(start, start + itemsPerPage)
  }, [filteredAndSortedProducts, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage)

  function handleSort(field: SortField) {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 inline ml-1 opacity-0" />
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3 inline ml-1 text-blue-600" />
      : <ChevronDown className="h-3 w-3 inline ml-1 text-blue-600" />
  }

  function toggleExpand(productId: string) {
    setExpandedProducts(prev => { const s = new Set(prev); s.has(productId) ? s.delete(productId) : s.add(productId); return s })
  }
  function handleToggleExpand(productId: string) {
    toggleExpand(productId)
    if (!eshopVariants[productId]) fetchEshopVariants(productId)
  }
  function toggleProductSelection(productId: string) {
    setSelectedProducts(prev => { const s = new Set(prev); s.has(productId) ? s.delete(productId) : s.add(productId); return s })
  }
  function toggleSelectAll() {
    if (selectedProducts.size === filteredAndSortedProducts.length) setSelectedProducts(new Set())
    else setSelectedProducts(new Set(filteredAndSortedProducts.map(p => p.id)))
  }

  async function handleCreateEmpty() {
    const defaultVatRate = isVatPayer ? 21 : 0
    try {
      const res = await fetch('/api/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Nový produkt', price: 0, vatRate: defaultVatRate, unit: 'ks' }),
      })
      if (res.ok) {
        const newProduct = await res.json()
        await ep.refresh()
        setExpandedProducts(prev => new Set([...prev, newProduct.id]))
        setNewlyCreatedId(newProduct.id)
        fetchEshopVariants(newProduct.id)
        setInlineEditForms(prev => ({
          ...prev, [newProduct.id]: { name: 'Nový produkt', price: '0', purchasePrice: '', vatRate: String(defaultVatRate), unit: 'ks', categoryId: '' },
        }))
      } else alert('Chyba při vytváření produktu')
    } catch { alert('Chyba při vytváření produktu') }
  }

  function handleInlineEdit(product: Product) {
    setExpandedProducts(prev => new Set([...prev, product.id]))
    if (!eshopVariants[product.id]) fetchEshopVariants(product.id)
    setInlineEditForms(prev => ({
      ...prev, [product.id]: {
        name: product.name, price: product.price.toString(),
        purchasePrice: product.purchasePrice ? product.purchasePrice.toString() : '',
        vatRate: isVatPayer ? (product.vatRate?.toString() || '21') : '0',
        unit: product.unit, categoryId: product.categoryId || '',
      },
    }))
  }

  function handleInlineCancel(productId: string) {
    setInlineEditForms(prev => { const n = { ...prev }; delete n[productId]; return n })
    if (newlyCreatedId === productId) setNewlyCreatedId(null)
  }

  async function handleInlineSave(productId: string) {
    const form = inlineEditForms[productId]
    if (!form) return
    if (!form.name.trim()) { alert('Vyplň název produktu'); return }
    const finalVatRate = isVatPayer ? parseFloat(form.vatRate) : 0
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, price: parseFloat(form.price) || 0, purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : null, vatRate: finalVatRate, unit: form.unit, categoryId: form.categoryId || null }),
      })
      if (res.ok) { await ep.refresh(); handleInlineCancel(productId) }
      else alert('Chyba při ukládání produktu')
    } catch { alert('Chyba při ukládání produktu') }
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Opravdu chceš smazat produkt "${product.name}"?`)) return
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
      if (res.ok) { alert('Produkt smazán!'); await ep.refresh() }
      else alert('Nepodařilo se smazat produkt')
    } catch { alert('Nepodařilo se smazat produkt') }
  }

  async function handleBulkDelete() {
    if (selectedProducts.size === 0) { alert('Nevybral jsi žádné produkty'); return }
    if (!confirm(`Opravdu chceš smazat ${selectedProducts.size} vybraných produktů?`)) return
    try {
      const res = await fetch('/api/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selectedProducts) }) })
      if (res.ok) { alert(`Smazáno ${selectedProducts.size} produktů!`); setSelectedProducts(new Set()); await ep.refresh() }
      else alert('Nepodařilo se smazat produkty')
    } catch { alert('Nepodařilo se smazat produkty') }
  }

  // Category management
  async function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryFormData.name.trim()) { alert('Vyplň název kategorie'); return }
    try {
      if (editingCategory) {
        const res = await fetch(`/api/categories/${editingCategory.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: categoryFormData.name }) })
        if (res.ok) alert('Kategorie upravena!')
        else { alert('Chyba při úpravě kategorie'); return }
      } else {
        const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: categoryFormData.name }) })
        if (res.ok) alert('Kategorie přidána!')
        else { alert('Chyba při přidávání kategorie'); return }
      }
      setCategoryFormData({ name: '' }); setEditingCategory(null); await ep.refresh()
    } catch { alert('Chyba při ukládání kategorie') }
  }

  async function handleCategoryDelete(category: Category) {
    if (!confirm(`Opravdu chceš smazat kategorii "${category.name}"?${category._count?.products ? ` Kategorie má ${category._count.products} produktů - budou přesunuty do "Bez kategorie".` : ''}`)) return
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: 'DELETE' })
      if (res.ok) { alert('Kategorie smazána!'); await ep.refresh() }
      else alert('Nepodařilo se smazat kategorii')
    } catch { alert('Chyba při mazání kategorie') }
  }

  function handleCategoryEdit(category: Category) { setEditingCategory(category); setCategoryFormData({ name: category.name }) }
  function handleCategoryCancelEdit() { setEditingCategory(null); setCategoryFormData({ name: '' }) }

  // Eshop variants
  async function fetchEshopVariants(productId: string) {
    try {
      const res = await fetch(`/api/products/${productId}/eshop-variants`)
      if (res.ok) { const data = await res.json(); setEshopVariants(prev => ({ ...prev, [productId]: data })) }
    } catch { /* ignore */ }
  }

  async function handleVariantSubmit(productId: string) {
    const form = variantForms[productId] || emptyVariantForm()
    if (!form.name || !form.price) { alert('Vyplň název a cenu varianty'); return }
    setVariantLoading(prev => ({ ...prev, [productId]: true }))
    try {
      const editing = editingVariant[productId]
      const url = editing ? `/api/products/${productId}/eshop-variants/${editing.id}` : `/api/products/${productId}/eshop-variants`
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, price: parseFloat(form.price), variantValue: form.variantValue ? parseFloat(form.variantValue) : null, variantUnit: form.variantUnit || null, isDefault: form.isDefault, isActive: form.isActive, isSumup: form.isSumup }),
      })
      if (!res.ok) throw new Error('Chyba při ukládání varianty')
      await fetchEshopVariants(productId)
      setVariantForms(prev => ({ ...prev, [productId]: emptyVariantForm() }))
      setEditingVariant(prev => ({ ...prev, [productId]: null }))
    } catch (err: any) { alert(err.message) }
    finally { setVariantLoading(prev => ({ ...prev, [productId]: false })) }
  }

  function handleEditVariant(productId: string, variant: EshopVariant) {
    setEditingVariant(prev => ({ ...prev, [productId]: variant }))
    setVariantForms(prev => ({ ...prev, [productId]: { name: variant.name, price: String(variant.price), variantValue: variant.variantValue ? String(variant.variantValue) : '', variantUnit: (variant.variantUnit as 'g' | 'ml' | 'ks' | '') ?? '', isDefault: variant.isDefault, isActive: variant.isActive, isSumup: variant.isSumup } }))
  }
  function handleCancelVariantEdit(productId: string) {
    setEditingVariant(prev => ({ ...prev, [productId]: null }))
    setVariantForms(prev => ({ ...prev, [productId]: emptyVariantForm() }))
  }
  async function handleDeleteVariant(productId: string, variantId: string, variantName: string) {
    if (!confirm(`Smazat variantu "${variantName}"?`)) return
    setVariantLoading(prev => ({ ...prev, [productId]: true }))
    try {
      const res = await fetch(`/api/products/${productId}/eshop-variants/${variantId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Chyba při mazání varianty')
      await fetchEshopVariants(productId)
    } catch (err: any) { alert(err.message) }
    finally { setVariantLoading(prev => ({ ...prev, [productId]: false })) }
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage)
    setTimeout(() => { if (sectionRef.current) sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 50)
  }

  const gridClass = isVatPayer
    ? 'grid-cols-[32px_20px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
    : 'grid-cols-[32px_20px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={null}>
      <EntityPage.Header
        title="Katalog zboží"
        icon={Package}
        color="amber"
        total={ep.rows.length}
        filtered={filteredAndSortedProducts.length}
        onRefresh={ep.refresh}
        actions={
          <div className="flex gap-2">
            {selectedProducts.size > 0 && (
              <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors">
                <Trash2 className="h-4 w-4" />Smazat vybrané ({selectedProducts.size})
              </button>
            )}
            <button onClick={handleCreateEmpty} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
              <Plus className="h-4 w-4" />Nový produkt
            </button>
            <button onClick={() => setShowCategoryManager(!showCategoryManager)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors">
              <Tag className="h-4 w-4" />Správa kategorií
              {categories.length > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold bg-purple-500 text-white">{categories.length}</span>}
            </button>
          </div>
        }
      />

      {/* Category Manager */}
      {showCategoryManager && (
        <Card className="border-2 border-purple-300 bg-purple-50 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-purple-900 flex items-center gap-2"><Tag className="w-5 h-5" />Správa kategorií</CardTitle>
              <button onClick={() => { setShowCategoryManager(false); handleCategoryCancelEdit() }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 bg-white rounded-b-lg">
            <form onSubmit={handleCategorySubmit} className="flex gap-3">
              <div className="flex-1">
                <Input value={categoryFormData.name} onChange={e => setCategoryFormData({ name: e.target.value })} placeholder="Název kategorie" required />
              </div>
              <Button type="submit">{editingCategory ? 'Uložit' : 'Přidat kategorii'}</Button>
              {editingCategory && <Button type="button" variant="secondary" onClick={handleCategoryCancelEdit}>Zrušit</Button>}
            </form>
            <div className="space-y-1">
              {categories.length === 0 ? (
                <div className="text-center py-6 text-gray-500 text-sm">Žádné kategorie</div>
              ) : categories.map(category => (
                <div key={category.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm text-gray-900">{category.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{category._count?.products || 0} produktů</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleCategoryEdit(category)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Upravit"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleCategoryDelete(category)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Smazat"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products list */}
      <div ref={sectionRef} className="space-y-2">
        {ep.rows.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Žádné produkty v katalogu.</p>
            <p className="text-sm text-gray-400">Klikni na tlačítko "+ Nový produkt" nahoře pro přidání prvního produktu</p>
          </div>
        ) : (
          <>
            {/* Filter row */}
            <div className={`grid items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg ${gridClass}`}>
              <button onClick={() => { setFilterName(''); setCategoryFilter(''); setFilterVat(''); setFilterUnit('') }} className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center" title="Vymazat filtry">
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center justify-center">
                <input type="checkbox" checked={selectedProducts.size === filteredAndSortedProducts.length && filteredAndSortedProducts.length > 0} onChange={toggleSelectAll} className="rounded" />
              </div>
              <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Název..." className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-1 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 bg-white">
                <option value="">Vše</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <div />
              {isVatPayer && (
                <select value={filterVat} onChange={e => setFilterVat(e.target.value)} className="px-1 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Vše</option>
                  {CZECH_VAT_RATES.map(rate => <option key={rate} value={String(rate)}>{VAT_RATE_LABELS[rate]}</option>)}
                </select>
              )}
              <input type="text" value={filterUnit} onChange={e => setFilterUnit(e.target.value)} placeholder="Jednotka..." className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
            </div>

            {/* Table header */}
            <div className={`grid items-center gap-4 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-700 ${gridClass}`}>
              <div /><div />
              <div className="text-center cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('name')}>Název <SortIcon field="name" /></div>
              <div className="text-center cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('category')}>Kategorie <SortIcon field="category" /></div>
              <div className="text-center cursor-pointer hover:text-blue-600 select-none" onClick={() => handleSort('variants')}>Varianty <SortIcon field="variants" /></div>
              {isVatPayer && <div className="text-center">DPH</div>}
              <div className="text-center">Jednotka</div>
            </div>

            {/* Product rows */}
            {paginatedProducts.map(product => {
              const isExpanded = expandedProducts.has(product.id)
              return (
                <div key={product.id} className={`border rounded-lg transition-all ${isExpanded ? 'ring-2 ring-amber-400 shadow-md' : 'hover:shadow-sm'}`}>
                  <div className={`grid items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50 ${gridClass}`}>
                    <button onClick={() => handleToggleExpand(product.id)} className="flex items-center justify-center">
                      {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    </button>
                    <div onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => toggleProductSelection(product.id)} className="rounded" />
                    </div>
                    <div className="cursor-pointer text-center overflow-hidden" onClick={() => handleToggleExpand(product.id)}>
                      <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                    </div>
                    <div className="cursor-pointer text-center overflow-hidden" onClick={() => handleToggleExpand(product.id)}>
                      {product.category?.name
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 truncate inline-block max-w-full">{product.category.name}</span>
                        : <span className="text-xs text-gray-400">-</span>}
                    </div>
                    <div className="cursor-pointer text-center overflow-hidden" onClick={() => handleToggleExpand(product.id)}>
                      {(() => {
                        const variants = product.eshopVariants ?? []
                        if (variants.length === 0) return <span className="text-xs text-gray-400">—</span>
                        const prices = variants.map(v => Number(v.price))
                        const min = Math.min(...prices); const max = Math.max(...prices)
                        return (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{variants.length} var.</span>
                            <span className="text-xs text-gray-500">{min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`}</span>
                          </div>
                        )
                      })()}
                    </div>
                    {isVatPayer && (
                      <div className="cursor-pointer text-center overflow-hidden" onClick={() => handleToggleExpand(product.id)}>
                        <p className="text-xs text-gray-500 truncate">{isNonVatPayer(Number(product.vatRate)) ? '-' : (VAT_RATE_LABELS[Number(product.vatRate)] || `${Number(product.vatRate)}%`)}</p>
                      </div>
                    )}
                    <div className="cursor-pointer text-center overflow-hidden" onClick={() => handleToggleExpand(product.id)}>
                      <p className="text-xs text-gray-500 truncate">{product.unit}</p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t p-4 bg-gray-50">
                      {inlineEditForms[product.id] ? (
                        <div className="mb-4 border-2 border-blue-300 rounded-lg overflow-hidden bg-blue-50">
                          <h4 className="font-semibold px-4 py-3 bg-blue-100 border-b border-blue-200 text-sm text-blue-900 flex items-center gap-2">
                            <Edit2 className="h-4 w-4" />Upravit produkt
                          </h4>
                          <div className="p-4 grid grid-cols-2 gap-4 bg-white">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Název *</label>
                              <input type="text" value={inlineEditForms[product.id].name}
                                onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], name: e.target.value } }))}
                                onClick={e => e.stopPropagation()}
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400" autoFocus />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Kategorie</label>
                              <select value={inlineEditForms[product.id].categoryId}
                                onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], categoryId: e.target.value } }))}
                                onClick={e => e.stopPropagation()}
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 bg-white">
                                <option value="">Bez kategorie</option>
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Jednotka *</label>
                              <select value={inlineEditForms[product.id].unit}
                                onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], unit: e.target.value } }))}
                                onClick={e => e.stopPropagation()}
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 bg-white">
                                <option value="ks">ks (kusy)</option>
                                <option value="g">g (gramy)</option>
                                <option value="ml">ml (mililitry)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Sazba DPH</label>
                              {isVatPayer ? (
                                <select value={inlineEditForms[product.id].vatRate}
                                  onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], vatRate: e.target.value } }))}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 bg-white">
                                  {CZECH_VAT_RATES.map(rate => <option key={rate} value={rate}>{VAT_RATE_LABELS[rate]}</option>)}
                                </select>
                              ) : (
                                <div className="w-full h-9 px-3 text-sm border border-gray-200 bg-gray-100 rounded-md flex items-center text-gray-500">Neplátce DPH</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                          <h4 className="font-semibold px-4 py-3 bg-gray-100 border-b text-sm">Detail produktu</h4>
                          <div className="text-sm">
                            <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                              <div><span className="text-gray-600">Název:</span> <span className="font-medium">{product.name}</span></div>
                              <div className="border-l border-gray-200 mx-4" />
                              <div><span className="text-gray-600">Kategorie:</span> <span className="font-medium">{product.category?.name || 'Bez kategorie'}</span></div>
                            </div>
                            <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                              <div><span className="text-gray-600">Jednotka:</span> <span className="font-medium">{product.unit}</span></div>
                              <div className="border-l border-gray-200 mx-4" />
                              <div><span className="text-gray-600">Sazba DPH:</span> <span className="font-medium">{isVatPayer ? (isNonVatPayer(Number(product.vatRate)) ? '—' : (VAT_RATE_LABELS[Number(product.vatRate)] || `${Number(product.vatRate)}%`)) : 'Neplátce DPH'}</span></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Variants */}
                      <div className="mt-4 border border-emerald-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-200">
                          <h4 className="font-semibold text-sm text-emerald-900 flex items-center gap-2"><ShoppingBag className="h-4 w-4" />Varianty produktu</h4>
                          <span className="text-xs text-emerald-700">{(eshopVariants[product.id] || []).length} variant</span>
                        </div>
                        <div className="bg-white">
                          {(eshopVariants[product.id] || []).length === 0 ? (
                            <p className="text-xs text-gray-500 text-center py-3">Žádné varianty — přidejte první variantu níže.</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-50 text-gray-600">
                                  <th className="px-3 py-2 text-left font-medium">Název</th>
                                  <th className="px-3 py-2 text-right font-medium">Cena (Kč)</th>
                                  <th className="px-3 py-2 text-right font-medium">Množství</th>
                                  <th className="px-3 py-2 text-center font-medium">Výchozí</th>
                                  <th className="px-3 py-2 text-center font-medium">SumUp</th>
                                  <th className="px-3 py-2 text-center font-medium">Eshop</th>
                                  <th className="px-3 py-2 text-center font-medium">Akce</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(eshopVariants[product.id] || []).map(v => (
                                  <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2 font-medium">{v.name}</td>
                                    <td className="px-3 py-2 text-right">{Number(v.price).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right">{v.variantValue ? `${v.variantValue} ${v.variantUnit ?? ''}`.trim() : '—'}</td>
                                    <td className="px-3 py-2 text-center">{v.isDefault ? <span className="text-emerald-600 font-semibold">✓</span> : <span className="text-gray-300">—</span>}</td>
                                    <td className="px-3 py-2 text-center">{v.isSumup ? <span title="Napojena na SumUp sync" className="text-orange-500 font-semibold">S</span> : <span className="text-gray-300">—</span>}</td>
                                    <td className="px-3 py-2 text-center">{v.isActive ? <span className="text-emerald-600">✓</span> : <span className="text-red-400">✗</span>}</td>
                                    <td className="px-3 py-2 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <button onClick={e => { e.stopPropagation(); handleEditVariant(product.id, v) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Upravit"><Edit2 className="h-3.5 w-3.5" /></button>
                                        <button onClick={e => { e.stopPropagation(); handleDeleteVariant(product.id, v.id, v.name) }} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Smazat"><Trash2 className="h-3.5 w-3.5" /></button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>

                        <div className="border-t border-emerald-100" onClick={e => e.stopPropagation()}>
                          <div className="px-4 pt-3 pb-1 flex items-center">
                            <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                              {editingVariant[product.id] ? <><Edit2 className="h-3 w-3" /> Upravit variantu</> : <><Plus className="h-3 w-3" /> Nová varianta</>}
                            </span>
                          </div>
                          <div className="px-4 pb-4 space-y-3">
                            <div className="grid grid-cols-[2fr_1.5fr_1fr_80px] gap-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Název *</label>
                                <input type="text" value={variantForms[product.id]?.name ?? ''} onChange={e => setVariantForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), name: e.target.value } }))} placeholder="např. 3,5g" className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-400 outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Cena (Kč) *</label>
                                <input type="number" step="0.01" value={variantForms[product.id]?.price ?? ''} onChange={e => setVariantForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), price: e.target.value } }))} placeholder="0" className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-400 outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Množství</label>
                                <input type="number" step="0.001" min="0" value={variantForms[product.id]?.variantValue ?? ''} onChange={e => setVariantForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), variantValue: e.target.value } }))} placeholder="3.5" className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-400 outline-none" />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Jednotka</label>
                                <select value={variantForms[product.id]?.variantUnit ?? ''} onChange={e => setVariantForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), variantUnit: e.target.value as 'g' | 'ml' | 'ks' | '' } }))} className="w-full h-9 px-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-400 outline-none">
                                  <option value="">—</option>
                                  <option value="g">g</option>
                                  <option value="ml">ml</option>
                                  <option value="ks">ks</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex gap-2">
                                {[
                                  { key: 'isDefault', label: '★ Výchozí', active: variantForms[product.id]?.isDefault, activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm', inactiveClass: 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-700' },
                                  { key: 'isSumup',   label: '⚡ SumUp',   active: variantForms[product.id]?.isSumup,   activeClass: 'bg-orange-500 text-white border-orange-500 shadow-sm', inactiveClass: 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600' },
                                  { key: 'isActive',  label: '🛒 Eshop',   active: variantForms[product.id]?.isActive ?? true, activeClass: 'bg-blue-600 text-white border-blue-600 shadow-sm', inactiveClass: 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600' },
                                ].map(({ key, label, active, activeClass, inactiveClass }) => (
                                  <button key={key} type="button"
                                    onClick={() => setVariantForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), [key]: !prev[product.id]?.[key as keyof EshopVariantForm] } }))}
                                    className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all ${active ? activeClass : inactiveClass}`}>
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                {editingVariant[product.id] && (
                                  <button onClick={() => handleCancelVariantEdit(product.id)} className="h-9 px-4 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">Zrušit</button>
                                )}
                                <button onClick={() => handleVariantSubmit(product.id)} disabled={variantLoading[product.id]}
                                  className="h-9 px-5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium flex items-center gap-1.5">
                                  {variantLoading[product.id] ? <span className="animate-pulse">Ukládám…</span> : editingVariant[product.id] ? 'Uložit změny' : <><Plus className="h-3.5 w-3.5" />Přidat variantu</>}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-4">
                        {inlineEditForms[product.id] ? (
                          <>
                            <button onClick={e => { e.stopPropagation(); handleInlineSave(product.id) }} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700">✓ Uložit</button>
                            <button onClick={e => { e.stopPropagation(); handleInlineCancel(product.id) }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"><X className="h-4 w-4" />Zrušit</button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(product) }} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"><Trash2 className="h-4 w-4" />Smazat</button>
                          </>
                        ) : (
                          <>
                            <button onClick={e => { e.stopPropagation(); handleInlineEdit(product) }} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"><Edit2 className="h-4 w-4" />Upravit</button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(product) }} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700"><Trash2 className="h-4 w-4" />Smazat</button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Pagination controls with per-page selector */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Zobrazit:</span>
                {[10, 20, 50, 100].map(count => (
                  <button key={count} onClick={() => { setItemsPerPage(count); setCurrentPage(1) }}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${itemsPerPage === count ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {count}
                  </button>
                ))}
                <span className="text-sm text-gray-500 ml-2">({filteredAndSortedProducts.length} celkem)</span>
              </div>
              <EntityPage.Pagination page={currentPage} total={totalPages} onChange={handlePageChange} />
            </div>
          </>
        )}
      </div>
    </EntityPage>
  )
}
