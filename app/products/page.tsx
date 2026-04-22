'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { PopupButton } from '@/components/ui/PopupButton'
import { formatPrice } from '@/lib/utils'
import { VAT_RATE_LABELS, isNonVatPayer, CZECH_VAT_RATES } from '@/lib/vatCalculation'
import { Plus, X, Edit2, Trash2, ChevronUp, ChevronDown, ChevronRight, Package, Tag, ShoppingBag } from 'lucide-react'
import {
  useEntityPage, EntityPage, LoadingState, ErrorState,
  DetailSection, DetailRow, ActionToolbar, EmptyState,
} from '@/components/erp'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string; name: string; price: number | string; purchasePrice?: number | string | null
  vatRate: number | string; unit: string; categoryId?: string | null
  category?: { id: string; name: string } | null
  stockQuantity: number; eshopVariants?: ProductVariantSummary[]
}

interface ProductVariantSummary {
  id: string; name: string; price: number | string; isDefault: boolean; isActive: boolean
  variantValue?: number | null; variantUnit?: string | null
}

interface Category { id: string; name: string; _count?: { products: number } }

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
type SortDir   = 'asc' | 'desc'

const emptyVariantForm = (): EshopVariantForm => ({
  name: '', price: '', variantValue: '', variantUnit: '', isDefault: false, isActive: true, isSumup: false,
})

// ─── Category Manager (reusable inside popup) ─────────────────────────────────

interface CategoryManagerProps {
  categories: Category[]
  onRefresh:  () => void
}

function CategoryManager({ categories, onRefresh }: CategoryManagerProps) {
  const [name,     setName]     = useState('')
  const [editing,  setEditing]  = useState<Category | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (editing) {
      await fetch(`/api/categories/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    } else {
      await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    }
    setName(''); setEditing(null); onRefresh()
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Smazat kategorii "${cat.name}"?${cat._count?.products ? ` (${cat._count.products} produktů bude bez kategorie)` : ''}`)) return
    await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
    onRefresh()
  }

  function startEdit(cat: Category) { setEditing(cat); setName(cat.name) }
  function cancelEdit()             { setEditing(null); setName('') }

  return (
    <div className="border border-purple-200 rounded-lg overflow-hidden">
      <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-200 flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-purple-600" />
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Správa kategorií</span>
      </div>
      <div className="p-3 space-y-3 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Název kategorie..."
            className="flex-1 h-8 text-xs"
            required
          />
          <Button type="submit" size="sm" className="h-8 text-xs px-3 bg-purple-600 hover:bg-purple-700 text-white">
            {editing ? 'Uložit' : 'Přidat'}
          </Button>
          {editing && (
            <Button type="button" size="sm" variant="secondary" className="h-8 text-xs px-3" onClick={cancelEdit}>
              Zrušit
            </Button>
          )}
        </form>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {categories.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Žádné kategorie.</p>
          ) : categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded border border-gray-100 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate">{cat.name}</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">{cat._count?.products ?? 0}</span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(cat)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Upravit">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(cat)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Smazat">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── New Product Form (lives inside popup) ────────────────────────────────────

interface NewProductFormProps {
  categories:  Category[]
  isVatPayer:  boolean
  onSaved:     () => void
  onClose:     () => void
  onRefresh:   () => void
}

function NewProductForm({ categories, isVatPayer, onSaved, onClose, onRefresh }: NewProductFormProps) {
  const defaultVat = isVatPayer ? 21 : 0
  const [name,          setName]          = useState('')
  const [price,         setPrice]         = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [vatRate,       setVatRate]       = useState(String(defaultVat))
  const [unit,          setUnit]          = useState('ks')
  const [categoryId,    setCategoryId]    = useState('')
  const [showCatMgr,    setShowCatMgr]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { alert('Vyplň název produktu'); return }
    const res = await fetch('/api/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, price: parseFloat(price) || 0,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        vatRate: isVatPayer ? parseFloat(vatRate) : 0,
        unit, categoryId: categoryId || null,
      }),
    })
    if (res.ok) { onSaved(); onClose() }
    else alert('Chyba při vytváření produktu')
  }

  return (
    <div className="space-y-4">

      {/* Základní info */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200">
          <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Produkt</h3>
        </div>
        <form id="new-product-form" onSubmit={handleSubmit}>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Název *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Název produktu..." required autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jednotka *</label>
              <select
                value={unit} onChange={e => setUnit(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="ks">ks (kusy)</option>
                <option value="g">g (gramy)</option>
                <option value="ml">ml (mililitry)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
              <select
                value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Bez kategorie</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {isVatPayer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sazba DPH</label>
                <select
                  value={vatRate} onChange={e => setVatRate(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {CZECH_VAT_RATES.map(r => <option key={r} value={r}>{VAT_RATE_LABELS[r]}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prodejní cena (Kč)</label>
              <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nákupní cena (Kč)</label>
              <Input type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="0" />
            </div>
          </div>
        </form>
      </div>

      {/* Category manager toggle */}
      <button
        type="button"
        onClick={() => setShowCatMgr(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
          showCatMgr
            ? 'bg-purple-100 border-purple-300 text-purple-800'
            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Správa kategorií
          {categories.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800 font-semibold">{categories.length}</span>
          )}
        </div>
        {showCatMgr ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showCatMgr && <CategoryManager categories={categories} onRefresh={onRefresh} />}

      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <Button type="button" variant="secondary" onClick={onClose}>Zrušit</Button>
        <Button type="submit" form="new-product-form" className="bg-amber-500 hover:bg-amber-600 text-white">
          <Package className="w-4 h-4 mr-2" />
          Přidat produkt
        </Button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [categories,   setCategories]   = useState<Category[]>([])
  const [isVatPayer,   setIsVatPayer]   = useState(true)
  const [popupOpen,    setPopupOpen]    = useState(false)

  // Inline edit state (per expanded row)
  const [inlineEditForms, setInlineEditForms] = useState<Record<string, { name: string; price: string; purchasePrice: string; vatRate: string; unit: string; categoryId: string }>>({})
  const [newlyCreatedId,  setNewlyCreatedId]  = useState<string | null>(null)
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())

  // Variants
  const [eshopVariants,  setEshopVariants]  = useState<Record<string, EshopVariant[]>>({})
  const [variantForms,   setVariantForms]   = useState<Record<string, EshopVariantForm>>({})
  const [editingVariant, setEditingVariant] = useState<Record<string, EshopVariant | null>>({})
  const [variantLoading, setVariantLoading] = useState<Record<string, boolean>>({})

  // Filters & sort
  const [filterName,     setFilterName]     = useState('')
  const [filterVat,      setFilterVat]      = useState('')
  const [filterUnit,     setFilterUnit]     = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortField,      setSortField]      = useState<SortField>('name')
  const [sortDir,        setSortDir]        = useState<SortDir>('asc')

  // Pagination
  const [currentPage,  setCurrentPage]  = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const sectionRef = useRef<HTMLDivElement>(null)

  const ep = useEntityPage<Product>({
    fetchData: async () => {
      const [pRes, cRes, sRes] = await Promise.all([
        fetch('/api/products'), fetch('/api/categories'), fetch('/api/settings'),
      ])
      const [p, c, s] = await Promise.all([pRes.json(), cRes.json(), sRes.json()])
      setCategories(Array.isArray(c) ? c : [])
      setIsVatPayer(s.isVatPayer ?? true)
      return p
    },
    getRowId:    r => r.id,
    filterFn:    () => true,
    highlightId: null,
  })

  useEffect(() => { setCurrentPage(1) }, [filterName, filterUnit, categoryFilter, filterVat])

  const filtered = useMemo(() => {
    let rows = ep.rows
    if (categoryFilter) rows = rows.filter(p => p.categoryId === categoryFilter)
    if (filterName)     rows = rows.filter(p => p.name.toLowerCase().includes(filterName.toLowerCase()))
    if (filterUnit)     rows = rows.filter(p => p.unit.toLowerCase().includes(filterUnit.toLowerCase()))
    if (filterVat)      rows = rows.filter(p => String(Number(p.vatRate)) === filterVat)
    return [...rows].sort((a, b) => {
      if (a.id === newlyCreatedId) return -1
      if (b.id === newlyCreatedId) return 1
      let av: any, bv: any
      if (sortField === 'category')      { av = a.category?.name || ''; bv = b.category?.name || '' }
      else if (sortField === 'variants') { av = a.eshopVariants?.length ?? 0; bv = b.eshopVariants?.length ?? 0 }
      else                               { av = a.name; bv = b.name }
      return av < bv ? (sortDir === 'asc' ? -1 : 1) : av > bv ? (sortDir === 'asc' ? 1 : -1) : 0
    })
  }, [ep.rows, sortField, sortDir, categoryFilter, filterName, filterUnit, filterVat, newlyCreatedId])

  const paginated  = useMemo(() => filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filtered, currentPage, itemsPerPage])
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))

  // ─── Sort ──────────────────────────────────────────────────────────────────

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 ml-0.5 opacity-0 inline" />
    return sortDir === 'asc'
      ? <ChevronUp   className="h-3 w-3 ml-0.5 text-amber-600 inline" />
      : <ChevronDown className="h-3 w-3 ml-0.5 text-amber-600 inline" />
  }

  // ─── Expand ────────────────────────────────────────────────────────────────

  function handleToggleExpand(id: string) {
    setExpandedProducts(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
    if (!eshopVariants[id]) fetchVariants(id)
  }

  // ─── Selection ─────────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedProducts(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }
  function toggleSelectAll() {
    setSelectedProducts(selectedProducts.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)))
  }

  // ─── Product CRUD ──────────────────────────────────────────────────────────

  function handleInlineEdit(product: Product) {
    setExpandedProducts(prev => new Set([...prev, product.id]))
    if (!eshopVariants[product.id]) fetchVariants(product.id)
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
    if (newlyCreatedId === id) setNewlyCreatedId(null)
  }

  async function handleInlineSave(id: string) {
    const form = inlineEditForms[id]
    if (!form?.name.trim()) { alert('Vyplň název produktu'); return }
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name, price: parseFloat(form.price) || 0,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : null,
        vatRate: isVatPayer ? parseFloat(form.vatRate) : 0,
        unit: form.unit, categoryId: form.categoryId || null,
      }),
    })
    if (res.ok) { await ep.refresh(); handleInlineCancel(id) }
    else alert('Chyba při ukládání produktu')
  }

  async function handleDelete(product: Product) {
    if (!confirm(`Smazat "${product.name}"?`)) return
    const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
    if (res.ok) await ep.refresh()
    else alert('Nepodařilo se smazat produkt')
  }

  async function handleBulkDelete() {
    if (selectedProducts.size === 0) return
    if (!confirm(`Smazat ${selectedProducts.size} vybraných produktů?`)) return
    const res = await fetch('/api/products', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedProducts) }),
    })
    if (res.ok) { setSelectedProducts(new Set()); await ep.refresh() }
    else alert('Nepodařilo se smazat produkty')
  }

  // ─── Variants ──────────────────────────────────────────────────────────────

  async function fetchVariants(productId: string) {
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
      const ev  = editingVariant[productId]
      const url = ev ? `/api/products/${productId}/eshop-variants/${ev.id}` : `/api/products/${productId}/eshop-variants`
      const res = await fetch(url, {
        method: ev ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, price: parseFloat(form.price), variantValue: form.variantValue ? parseFloat(form.variantValue) : null, variantUnit: form.variantUnit || null, isDefault: form.isDefault, isActive: form.isActive, isSumup: form.isSumup }),
      })
      if (!res.ok) throw new Error('Chyba při ukládání varianty')
      await fetchVariants(productId)
      setVariantForms(prev => ({ ...prev, [productId]: emptyVariantForm() }))
      setEditingVariant(prev => ({ ...prev, [productId]: null }))
    } catch (err: any) { alert(err.message) }
    finally { setVariantLoading(prev => ({ ...prev, [productId]: false })) }
  }

  function handleEditVariant(productId: string, v: EshopVariant) {
    setEditingVariant(prev => ({ ...prev, [productId]: v }))
    setVariantForms(prev => ({ ...prev, [productId]: { name: v.name, price: String(v.price), variantValue: v.variantValue ? String(v.variantValue) : '', variantUnit: (v.variantUnit as 'g' | 'ml' | 'ks' | '') ?? '', isDefault: v.isDefault, isActive: v.isActive, isSumup: v.isSumup } }))
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
      await fetchVariants(productId)
    } catch (err: any) { alert(err.message) }
    finally { setVariantLoading(prev => ({ ...prev, [productId]: false })) }
  }

  function handlePageChange(p: number) {
    setCurrentPage(p)
    setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const clearFilters = () => { setFilterName(''); setCategoryFilter(''); setFilterVat(''); setFilterUnit('') }

  // ─── Grid layout ───────────────────────────────────────────────────────────

  const gridCols = isVatPayer
    ? 'grid-cols-[28px_28px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
    : 'grid-cols-[28px_28px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'

  // ─── Render ────────────────────────────────────────────────────────────────

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={null}>
      <EntityPage.Header
        title="Katalog zboží"
        icon={Package}
        color="amber"
        total={ep.rows.length}
        filtered={filtered.length}
        onRefresh={ep.refresh}
        actions={
          <div className="flex items-center gap-2">
            {selectedProducts.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Smazat vybrané ({selectedProducts.size})
              </button>
            )}
            <PopupButton
              color="orange"
              variant="modal"
              headerLabel="Nový produkt"
              triggerTitle="Přidat nový produkt"
              open={popupOpen}
              onOpenChange={setPopupOpen}
            >
              <NewProductForm
                categories={categories}
                isVatPayer={isVatPayer}
                onSaved={ep.refresh}
                onClose={() => setPopupOpen(false)}
                onRefresh={ep.refresh}
              />
            </PopupButton>
          </div>
        }
      />

      <div ref={sectionRef} className="space-y-1.5">
        {ep.rows.length === 0 ? (
          <EmptyState
            icon={Package}
            message="Žádné produkty v katalogu."
            subMessage="Klikni na tlačítko + vpravo nahoře pro přidání prvního produktu."
          />
        ) : (
          <>
            {/* Filter row */}
            <div className={`grid items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg ${gridCols}`}>
              <button onClick={clearFilters} title="Vymazat filtry" className="w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded transition-colors flex items-center justify-center">
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center justify-center">
                <input type="checkbox" checked={selectedProducts.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded w-3.5 h-3.5" />
              </div>
              <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Název..." className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-amber-400 focus:border-amber-400" />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-amber-400 bg-white">
                <option value="">Všechny kategorie</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div />
              {isVatPayer && (
                <select value={filterVat} onChange={e => setFilterVat(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-amber-400 bg-white">
                  <option value="">Všechna DPH</option>
                  {CZECH_VAT_RATES.map(r => <option key={r} value={String(r)}>{VAT_RATE_LABELS[r]}</option>)}
                </select>
              )}
              <input type="text" value={filterUnit} onChange={e => setFilterUnit(e.target.value)} placeholder="Jednotka..." className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-amber-400 focus:border-amber-400" />
            </div>

            {/* Table header */}
            <div className={`grid items-center gap-3 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-600 ${gridCols}`}>
              <div />
              <div />
              <button onClick={() => toggleSort('name')} className="text-center hover:text-amber-700 transition-colors select-none">
                Název <SortIcon field="name" />
              </button>
              <button onClick={() => toggleSort('category')} className="text-center hover:text-amber-700 transition-colors select-none">
                Kategorie <SortIcon field="category" />
              </button>
              <button onClick={() => toggleSort('variants')} className="text-center hover:text-amber-700 transition-colors select-none">
                Varianty <SortIcon field="variants" />
              </button>
              {isVatPayer && <div className="text-center">DPH</div>}
              <div className="text-center">Jednotka</div>
            </div>

            {/* Rows */}
            {paginated.map(product => {
              const isExpanded = expandedProducts.has(product.id)
              const editForm   = inlineEditForms[product.id]
              const variants   = eshopVariants[product.id] || []
              const vForm      = variantForms[product.id]
              const evEditing  = editingVariant[product.id]
              const vLoading   = variantLoading[product.id]

              return (
                <div key={product.id} className={`border rounded-lg transition-all ${isExpanded ? 'ring-2 ring-amber-400 shadow-sm' : 'hover:shadow-sm'}`}>

                  {/* Summary row */}
                  <div className={`grid items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${gridCols}`} onClick={() => handleToggleExpand(product.id)}>
                    <button onClick={e => { e.stopPropagation(); handleToggleExpand(product.id) }} className="flex items-center justify-center">
                      {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    </button>
                    <div onClick={e => e.stopPropagation()} className="flex items-center justify-center">
                      <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => toggleSelect(product.id)} className="rounded w-3.5 h-3.5" />
                    </div>
                    <div className="text-center min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                    </div>
                    <div className="text-center min-w-0">
                      {product.category?.name
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 truncate inline-block max-w-full">{product.category.name}</span>
                        : <span className="text-xs text-gray-400">—</span>}
                    </div>
                    <div className="text-center min-w-0">
                      {(() => {
                        const vs = product.eshopVariants ?? []
                        if (vs.length === 0) return <span className="text-xs text-gray-400">—</span>
                        const prices = vs.map(v => Number(v.price))
                        const min = Math.min(...prices), max = Math.max(...prices)
                        return (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{vs.length} var.</span>
                            <span className="text-[10px] text-gray-500">{min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`}</span>
                          </div>
                        )
                      })()}
                    </div>
                    {isVatPayer && (
                      <div className="text-center min-w-0">
                        <p className="text-xs text-gray-500">{isNonVatPayer(Number(product.vatRate)) ? '—' : (VAT_RATE_LABELS[Number(product.vatRate)] || `${Number(product.vatRate)}%`)}</p>
                      </div>
                    )}
                    <div className="text-center min-w-0">
                      <p className="text-xs text-gray-500">{product.unit}</p>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">

                      {/* Product detail / inline edit */}
                      {editForm ? (
                        <DetailSection title="Upravit produkt" icon={Edit2}>
                          <div className="grid grid-cols-2 gap-3 py-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Název *</label>
                              <input type="text" value={editForm.name}
                                onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], name: e.target.value } }))}
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-400 outline-none" autoFocus />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Kategorie</label>
                              <select value={editForm.categoryId}
                                onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], categoryId: e.target.value } }))}
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-400 bg-white outline-none">
                                <option value="">Bez kategorie</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Jednotka *</label>
                              <select value={editForm.unit}
                                onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], unit: e.target.value } }))}
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-400 bg-white outline-none">
                                <option value="ks">ks (kusy)</option>
                                <option value="g">g (gramy)</option>
                                <option value="ml">ml (mililitry)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Sazba DPH</label>
                              {isVatPayer ? (
                                <select value={editForm.vatRate}
                                  onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], vatRate: e.target.value } }))}
                                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-400 bg-white outline-none">
                                  {CZECH_VAT_RATES.map(r => <option key={r} value={r}>{VAT_RATE_LABELS[r]}</option>)}
                                </select>
                              ) : (
                                <div className="w-full h-9 px-3 text-sm border border-gray-200 bg-gray-100 rounded-md flex items-center text-gray-500">Neplátce DPH</div>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Prodejní cena (Kč)</label>
                              <input type="number" step="0.01" value={editForm.price}
                                onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], price: e.target.value } }))}
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-400 outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Nákupní cena (Kč)</label>
                              <input type="number" step="0.01" value={editForm.purchasePrice}
                                onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], purchasePrice: e.target.value } }))}
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-400 outline-none" />
                            </div>
                          </div>
                        </DetailSection>
                      ) : (
                        <DetailSection title="Detail produktu" icon={Package}>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 py-1.5">
                            <DetailRow label="Název"     value={product.name} />
                            <DetailRow label="Kategorie" value={product.category?.name} muted />
                            <DetailRow label="Jednotka"  value={product.unit} muted />
                            <DetailRow label="DPH"       value={isVatPayer ? (isNonVatPayer(Number(product.vatRate)) ? '—' : (VAT_RATE_LABELS[Number(product.vatRate)] || `${Number(product.vatRate)}%`)) : 'Neplátce'} muted />
                            {Number(product.price) > 0 && (
                              <DetailRow label="Prodejní cena" value={formatPrice(Number(product.price))} muted />
                            )}
                            {product.purchasePrice && Number(product.purchasePrice) > 0 && (
                              <DetailRow label="Nákupní cena" value={formatPrice(Number(product.purchasePrice))} muted />
                            )}
                          </div>
                        </DetailSection>
                      )}

                      {/* Variants section */}
                      <DetailSection
                        title="Varianty produktu"
                        icon={ShoppingBag}
                        headerRight={<span className="text-xs text-gray-500 font-normal">{variants.length} variant</span>}
                      >
                        {variants.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-3">Žádné varianty — přidejte první variantu níže.</p>
                        ) : (
                          <table className="w-full text-xs mt-1">
                            <thead>
                              <tr className="text-gray-500 border-b border-gray-100">
                                <th className="py-1.5 text-left font-medium">Název</th>
                                <th className="py-1.5 text-right font-medium">Cena</th>
                                <th className="py-1.5 text-right font-medium">Množství</th>
                                <th className="py-1.5 text-center font-medium">Výchozí</th>
                                <th className="py-1.5 text-center font-medium">SumUp</th>
                                <th className="py-1.5 text-center font-medium">Eshop</th>
                                <th className="py-1.5 text-center font-medium">Akce</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variants.map(v => (
                                <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                                  <td className="py-1.5 font-medium">{v.name}</td>
                                  <td className="py-1.5 text-right">{formatPrice(Number(v.price))}</td>
                                  <td className="py-1.5 text-right">{v.variantValue ? `${v.variantValue} ${v.variantUnit ?? ''}`.trim() : '—'}</td>
                                  <td className="py-1.5 text-center">{v.isDefault  ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-gray-300">—</span>}</td>
                                  <td className="py-1.5 text-center">{v.isSumup   ? <span className="text-orange-500 font-bold">S</span>  : <span className="text-gray-300">—</span>}</td>
                                  <td className="py-1.5 text-center">{v.isActive  ? <span className="text-emerald-600">✓</span> : <span className="text-red-400">✗</span>}</td>
                                  <td className="py-1.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={() => handleEditVariant(product.id, v)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="h-3.5 w-3.5" /></button>
                                      <button onClick={() => handleDeleteVariant(product.id, v.id, v.name)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {/* Variant form */}
                        <div className="mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                          <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                            {evEditing ? <><Edit2 className="h-3 w-3" />Upravit variantu</> : <><Plus className="h-3 w-3" />Nová varianta</>}
                          </p>
                          <div className="grid grid-cols-[2fr_1.5fr_1fr_80px] gap-2 mb-2">
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">Název *</label>
                              <input type="text" value={vForm?.name ?? ''} onChange={e => setVariantForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), name: e.target.value } }))} placeholder="např. 3,5g" className="w-full h-8 px-2 text-xs border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-emerald-400 outline-none" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">Cena (Kč) *</label>
                              <input type="number" step="0.01" value={vForm?.price ?? ''} onChange={e => setVariantForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), price: e.target.value } }))} placeholder="0" className="w-full h-8 px-2 text-xs border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-emerald-400 outline-none" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">Množství</label>
                              <input type="number" step="0.001" value={vForm?.variantValue ?? ''} onChange={e => setVariantForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), variantValue: e.target.value } }))} placeholder="3.5" className="w-full h-8 px-2 text-xs border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-emerald-400 outline-none" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">Jedn.</label>
                              <select value={vForm?.variantUnit ?? ''} onChange={e => setVariantForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), variantUnit: e.target.value as 'g'|'ml'|'ks'|'' } }))} className="w-full h-8 px-1 text-xs border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-emerald-400 outline-none">
                                <option value="">—</option><option value="g">g</option><option value="ml">ml</option><option value="ks">ks</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-1.5">
                              {[
                                { key: 'isDefault', label: '★ Výchozí', active: vForm?.isDefault,      ac: 'bg-emerald-600 text-white border-emerald-600', ic: 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-700' },
                                { key: 'isSumup',   label: '⚡ SumUp',   active: vForm?.isSumup,        ac: 'bg-orange-500 text-white border-orange-500',   ic: 'bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600' },
                                { key: 'isActive',  label: '🛒 Eshop',   active: vForm?.isActive ?? true, ac: 'bg-blue-600 text-white border-blue-600',       ic: 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'    },
                              ].map(({ key, label, active, ac, ic }) => (
                                <button key={key} type="button"
                                  onClick={() => setVariantForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), [key]: !(prev[product.id]?.[key as keyof EshopVariantForm]) } }))}
                                  className={`px-2.5 py-1 text-[10px] rounded-full border font-medium transition-all ${active ? ac : ic}`}>
                                  {label}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-1.5">
                              {evEditing && (
                                <button onClick={() => handleCancelVariantEdit(product.id)} className="h-8 px-3 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200">Zrušit</button>
                              )}
                              <button onClick={() => handleVariantSubmit(product.id)} disabled={vLoading}
                                className="h-8 px-4 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 font-medium flex items-center gap-1">
                                {vLoading ? <span className="animate-pulse">…</span> : evEditing ? 'Uložit změny' : <><Plus className="h-3 w-3" />Přidat</>}
                              </button>
                            </div>
                          </div>
                        </div>
                      </DetailSection>

                      {/* ActionToolbar */}
                      <ActionToolbar
                        right={
                          editForm ? (
                            <>
                              <button onClick={() => handleInlineSave(product.id)} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors">✓ Uložit</button>
                              <button onClick={() => handleInlineCancel(product.id)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition-colors"><X className="h-3.5 w-3.5" /> Zrušit</button>
                              <button onClick={() => handleDelete(product)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /> Smazat</button>
                            </>
                          ) : (
                            <>
                              <button onClick={e => { e.stopPropagation(); handleInlineEdit(product) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors"><Edit2 className="h-3.5 w-3.5" /> Upravit</button>
                              <button onClick={e => { e.stopPropagation(); handleDelete(product) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /> Smazat</button>
                            </>
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Pagination + per-page */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Zobrazit:</span>
                {[10, 20, 50, 100].map(n => (
                  <button key={n} onClick={() => { setItemsPerPage(n); setCurrentPage(1) }}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${itemsPerPage === n ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {n}
                  </button>
                ))}
                <span className="text-xs text-gray-400 ml-1">({filtered.length} celkem)</span>
              </div>
              <EntityPage.Pagination page={currentPage} total={totalPages} onChange={handlePageChange} />
            </div>
          </>
        )}
      </div>
    </EntityPage>
  )
}
