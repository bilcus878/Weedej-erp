'use client'

import { useState, useMemo, useRef } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { PopupButton } from '@/components/ui/PopupButton'
import { formatPrice } from '@/lib/utils'
import { VAT_RATE_LABELS, isNonVatPayer, CZECH_VAT_RATES } from '@/lib/vatCalculation'
import {
  Plus, X, Edit2, Trash2, ChevronUp, ChevronDown, ChevronRight,
  Package, Tag, ShoppingBag, Star, Zap, ShoppingCart,
} from 'lucide-react'
import {
  useEntityPage, EntityPage, LoadingState, ErrorState,
  DetailSection, DetailRow, ActionToolbar, EmptyState,
} from '@/components/erp'

export const dynamic = 'force-dynamic'

// ─── Domain types ─────────────────────────────────────────────────────────────

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

// A variant that exists only in the new-product form (no server id yet)
interface DraftVariant extends EshopVariantForm { tempId: string }

type SortField = 'name' | 'category' | 'variants'
type SortDir   = 'asc' | 'desc'

const emptyVariantForm = (): EshopVariantForm => ({
  name: '', price: '', variantValue: '', variantUnit: '', isDefault: false, isActive: true, isSumup: false,
})

// ─── Shared: Toggle pill button ───────────────────────────────────────────────

interface TogglePillProps {
  active:   boolean
  onChange: (v: boolean) => void
  label:    string
  icon:     React.ReactNode
  activeClass:   string
  inactiveClass: string
}

function TogglePill({ active, onChange, label, icon, activeClass, inactiveClass }: TogglePillProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all select-none ${active ? activeClass : inactiveClass}`}
    >
      {icon}
      {label}
    </button>
  )
}

// ─── Shared: Variant row in form (draft or existing) ─────────────────────────

interface VariantRowProps {
  v:        EshopVariantForm
  onChange: (patch: Partial<EshopVariantForm>) => void
  onRemove?: () => void
  isEditing?: boolean
}

function VariantRow({ v, onChange, onRemove, isEditing }: VariantRowProps) {
  return (
    <div className={`rounded-lg border p-3 space-y-2.5 ${isEditing ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 bg-white'}`}>
      <div className="grid grid-cols-[2fr_1.5fr_1fr_90px] gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Název varianty *</label>
          <input
            type="text"
            value={v.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="např. 3,5g / Zelená / M"
            className="w-full h-8 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Cena (Kč) *</label>
          <input
            type="number"
            step="0.01"
            value={v.price}
            onChange={e => onChange({ price: e.target.value })}
            placeholder="0"
            className="w-full h-8 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Množství</label>
          <input
            type="number"
            step="0.001"
            value={v.variantValue}
            onChange={e => onChange({ variantValue: e.target.value })}
            placeholder="3.5"
            className="w-full h-8 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Jednotka</label>
          <select
            value={v.variantUnit}
            onChange={e => onChange({ variantUnit: e.target.value as 'g'|'ml'|'ks'|'' })}
            className="w-full h-8 px-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          >
            <option value="">—</option>
            <option value="g">g</option>
            <option value="ml">ml</option>
            <option value="ks">ks</option>
          </select>
        </div>
      </div>

      {/* E-shop flags */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          <TogglePill
            active={v.isDefault}
            onChange={val => onChange({ isDefault: val })}
            label="Výchozí"
            icon={<Star className="w-3 h-3" />}
            activeClass="bg-emerald-600 text-white border-emerald-600"
            inactiveClass="bg-white text-gray-500 border-gray-200 hover:border-emerald-300 hover:text-emerald-700"
          />
          <TogglePill
            active={v.isActive}
            onChange={val => onChange({ isActive: val })}
            label="E-shop"
            icon={<ShoppingCart className="w-3 h-3" />}
            activeClass="bg-blue-600 text-white border-blue-600"
            inactiveClass="bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600"
          />
          <TogglePill
            active={v.isSumup}
            onChange={val => onChange({ isSumup: val })}
            label="SumUp"
            icon={<Zap className="w-3 h-3" />}
            activeClass="bg-orange-500 text-white border-orange-500"
            inactiveClass="bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-600"
          />
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Odebrat variantu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── CategoryManager (inline in popup) ───────────────────────────────────────

function CategoryManager({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const [name,    setName]    = useState('')
  const [editing, setEditing] = useState<Category | null>(null)

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

  return (
    <div className="border border-purple-200 rounded-lg overflow-hidden">
      <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-200 flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-purple-600" />
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Správa kategorií</span>
      </div>
      <div className="p-3 space-y-2 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Název kategorie..." className="flex-1 h-8 text-xs" required />
          <Button type="submit" size="sm" className="h-8 text-xs px-3 bg-purple-600 hover:bg-purple-700 text-white">{editing ? 'Uložit' : 'Přidat'}</Button>
          {editing && <Button type="button" size="sm" variant="secondary" className="h-8 text-xs px-2" onClick={() => { setEditing(null); setName('') }}>✕</Button>}
        </form>
        <div className="max-h-44 overflow-y-auto space-y-1">
          {categories.length === 0
            ? <p className="text-xs text-gray-400 text-center py-3">Žádné kategorie.</p>
            : categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-md border border-gray-100 hover:bg-gray-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate">{cat.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">{cat._count?.products ?? 0}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditing(cat); setName(cat.name) }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Upravit"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDelete(cat)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Smazat"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}

// ─── ProductFormModal — full self-contained form with inline variants ─────────

interface ProductFormModalProps {
  categories: Category[]
  isVatPayer: boolean
  onClose:    () => void
  onSaved:    () => void
  onRefresh:  () => void
}

function ProductFormModal({ categories, isVatPayer, onClose, onSaved, onRefresh }: ProductFormModalProps) {
  const defaultVat = isVatPayer ? 21 : 0

  // Basic fields
  const [name,          setName]          = useState('')
  const [unit,          setUnit]          = useState('ks')
  const [categoryId,    setCategoryId]    = useState('')
  const [vatRate,       setVatRate]       = useState(String(defaultVat))
  const [price,         setPrice]         = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')

  // Draft variants — all managed client-side before product exists
  const [draftVariants, setDraftVariants] = useState<DraftVariant[]>([])
  const [editingTempId, setEditingTempId] = useState<string | null>(null)
  const [addingVariant, setAddingVariant] = useState(false)
  const [variantDraft,  setVariantDraft]  = useState<EshopVariantForm>(emptyVariantForm())

  // UI toggles
  const [showCatMgr, setShowCatMgr] = useState(false)
  const [saving,     setSaving]     = useState(false)

  function patchVariantDraft(patch: Partial<EshopVariantForm>) {
    setVariantDraft(prev => ({ ...prev, ...patch }))
  }

  function handleAddVariant() {
    if (!variantDraft.name.trim() || !variantDraft.price) {
      alert('Vyplň alespoň název a cenu varianty')
      return
    }
    if (editingTempId) {
      setDraftVariants(prev => prev.map(v => v.tempId === editingTempId ? { ...variantDraft, tempId: editingTempId } : v))
      setEditingTempId(null)
    } else {
      setDraftVariants(prev => [...prev, { ...variantDraft, tempId: crypto.randomUUID() }])
    }
    setVariantDraft(emptyVariantForm())
    setAddingVariant(false)
  }

  function handleEditDraft(v: DraftVariant) {
    setEditingTempId(v.tempId)
    setVariantDraft({ name: v.name, price: v.price, variantValue: v.variantValue, variantUnit: v.variantUnit, isDefault: v.isDefault, isActive: v.isActive, isSumup: v.isSumup })
    setAddingVariant(true)
  }

  function handleRemoveDraft(tempId: string) {
    setDraftVariants(prev => prev.filter(v => v.tempId !== tempId))
    if (editingTempId === tempId) { setEditingTempId(null); setVariantDraft(emptyVariantForm()); setAddingVariant(false) }
  }

  function handleCancelVariant() {
    setEditingTempId(null)
    setVariantDraft(emptyVariantForm())
    setAddingVariant(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { alert('Vyplň název produktu'); return }
    setSaving(true)
    try {
      // 1. Create product
      const productRes = await fetch('/api/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, price: parseFloat(price) || 0,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
          vatRate: isVatPayer ? parseFloat(vatRate) : 0,
          unit, categoryId: categoryId || null,
        }),
      })
      if (!productRes.ok) throw new Error('Chyba při vytváření produktu')
      const { id } = await productRes.json()

      // 2. Create all draft variants
      for (const v of draftVariants) {
        await fetch(`/api/products/${id}/eshop-variants`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: v.name, price: parseFloat(v.price),
            variantValue: v.variantValue ? parseFloat(v.variantValue) : null,
            variantUnit: v.variantUnit || null,
            isDefault: v.isDefault, isActive: v.isActive, isSumup: v.isSumup,
          }),
        })
      }

      onSaved()
      onClose()
    } catch (err: any) {
      alert(err.message || 'Chyba při ukládání')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Section 1: Basic product info ─────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center gap-2">
          <Package className="w-4 h-4 text-orange-600" />
          <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Základní informace</span>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          {/* Name — full width */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Název produktu *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Název produktu..."
              required
              autoFocus
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Základní jednotka *</label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="ks">ks — kusy</option>
              <option value="g">g — gramy</option>
              <option value="ml">ml — mililitry</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="">Bez kategorie</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* VAT */}
          {isVatPayer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sazba DPH</label>
              <select
                value={vatRate}
                onChange={e => setVatRate(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {CZECH_VAT_RATES.map(r => <option key={r} value={r}>{VAT_RATE_LABELS[r]}</option>)}
              </select>
            </div>
          )}

          {/* Prices */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prodejní cena (Kč)</label>
            <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nákupní cena (Kč)</label>
            <Input type="number" step="0.01" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="0.00" />
          </div>
        </div>
      </div>

      {/* ── Section 2: Variants ───────────────────────────────────────── */}
      <div className="border border-emerald-200 rounded-xl overflow-hidden">
        <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Varianty produktu</span>
            {draftVariants.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-bold">{draftVariants.length}</span>
            )}
          </div>
          <p className="text-xs text-emerald-600">velikost · barva · balení · hmotnost</p>
        </div>

        <div className="p-4 space-y-2">
          {/* Existing draft variants */}
          {draftVariants.map(v => (
            <div key={v.tempId} className={`rounded-lg border p-3 ${editingTempId === v.tempId ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{v.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatPrice(parseFloat(v.price) || 0)}
                    {v.variantValue && ` · ${v.variantValue} ${v.variantUnit || ''}`.trim()}
                  </p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {v.isDefault && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">★ Výchozí</span>}
                    {v.isActive  && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">🛒 E-shop</span>}
                    {v.isSumup   && <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">⚡ SumUp</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => handleEditDraft(v)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Upravit"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => handleRemoveDraft(v.tempId)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Odebrat"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}

          {/* Add / Edit variant form */}
          {addingVariant ? (
            <div className="border-2 border-dashed border-emerald-300 rounded-xl p-3 bg-emerald-50/30">
              <p className="text-xs font-semibold text-emerald-700 mb-2.5 flex items-center gap-1.5">
                {editingTempId ? <><Edit2 className="w-3 h-3" />Upravit variantu</> : <><Plus className="w-3 h-3" />Nová varianta</>}
              </p>
              <VariantRow v={variantDraft} onChange={patchVariantDraft} isEditing={!!editingTempId} />
              <div className="flex gap-2 mt-2.5 justify-end">
                <button type="button" onClick={handleCancelVariant} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium">Zrušit</button>
                <button type="button" onClick={handleAddVariant} className="px-4 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  {editingTempId ? 'Uložit změny' : 'Přidat variantu'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setAddingVariant(true); setVariantDraft(emptyVariantForm()) }}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/30 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" />
              Přidat variantu
            </button>
          )}

          {draftVariants.length === 0 && !addingVariant && (
            <p className="text-xs text-gray-400 text-center py-1">Produkty bez variant jsou také platné. Varianty přidáte výše.</p>
          )}
        </div>
      </div>

      {/* ── Section 3: Category manager (collapsible) ─────────────────── */}
      <button
        type="button"
        onClick={() => setShowCatMgr(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
          showCatMgr
            ? 'bg-purple-100 border-purple-300 text-purple-800'
            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Správa kategorií
          {categories.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800 font-bold">{categories.length}</span>
          )}
        </div>
        {showCatMgr ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showCatMgr && <CategoryManager categories={categories} onRefresh={onRefresh} />}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {draftVariants.length > 0
            ? `${draftVariants.length} varianty budou přidány po uložení`
            : 'Produkt bez variant'}
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white min-w-[140px]">
            {saving ? (
              <span className="animate-pulse">Ukládám…</span>
            ) : (
              <><Package className="w-4 h-4 mr-2" />Přidat produkt</>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const [categories,  setCategories]  = useState<Category[]>([])
  const [isVatPayer,  setIsVatPayer]  = useState(true)
  const [popupOpen,   setPopupOpen]   = useState(false)

  // Inline edit state (per existing row)
  const [inlineEditForms, setInlineEditForms] = useState<Record<string, { name: string; price: string; purchasePrice: string; vatRate: string; unit: string; categoryId: string }>>({})
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())

  // Existing variant state (per expanded existing row)
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

  const filtered = useMemo(() => {
    let rows = ep.rows
    if (categoryFilter) rows = rows.filter(p => p.categoryId === categoryFilter)
    if (filterName)     rows = rows.filter(p => p.name.toLowerCase().includes(filterName.toLowerCase()))
    if (filterUnit)     rows = rows.filter(p => p.unit.toLowerCase().includes(filterUnit.toLowerCase()))
    if (filterVat)      rows = rows.filter(p => String(Number(p.vatRate)) === filterVat)
    return [...rows].sort((a, b) => {
      let av: any, bv: any
      if (sortField === 'category')      { av = a.category?.name || ''; bv = b.category?.name || '' }
      else if (sortField === 'variants') { av = a.eshopVariants?.length ?? 0; bv = b.eshopVariants?.length ?? 0 }
      else                               { av = a.name; bv = b.name }
      return av < bv ? (sortDir === 'asc' ? -1 : 1) : av > bv ? (sortDir === 'asc' ? 1 : -1) : 0
    })
  }, [ep.rows, sortField, sortDir, categoryFilter, filterName, filterUnit, filterVat])

  const paginated  = useMemo(() => filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filtered, currentPage, itemsPerPage])
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 ml-0.5 opacity-0 inline" />
    return sortDir === 'asc'
      ? <ChevronUp   className="h-3 w-3 ml-0.5 text-orange-600 inline" />
      : <ChevronDown className="h-3 w-3 ml-0.5 text-orange-600 inline" />
  }

  function handleToggleExpand(id: string) {
    setExpandedProducts(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
    if (!eshopVariants[id]) fetchVariants(id)
  }

  function toggleSelect(id: string) {
    setSelectedProducts(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }
  function toggleSelectAll() {
    setSelectedProducts(selectedProducts.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)))
  }

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
    if (!selectedProducts.size) return
    if (!confirm(`Smazat ${selectedProducts.size} vybraných produktů?`)) return
    const res = await fetch('/api/products', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selectedProducts) }),
    })
    if (res.ok) { setSelectedProducts(new Set()); await ep.refresh() }
    else alert('Nepodařilo se smazat produkty')
  }

  async function fetchVariants(productId: string) {
    try {
      const res = await fetch(`/api/products/${productId}/eshop-variants`)
      if (res.ok) { const data = await res.json(); setEshopVariants(prev => ({ ...prev, [productId]: data })) }
    } catch { /* silent */ }
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
    setVariantForms(prev => ({ ...prev, [productId]: { name: v.name, price: String(v.price), variantValue: v.variantValue ? String(v.variantValue) : '', variantUnit: (v.variantUnit as 'g'|'ml'|'ks'|'') ?? '', isDefault: v.isDefault, isActive: v.isActive, isSumup: v.isSumup } }))
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

  const gridCols = isVatPayer
    ? 'grid-cols-[32px_32px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
    : 'grid-cols-[32px_32px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'

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
          selectedProducts.size > 0 ? (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Smazat vybrané ({selectedProducts.size})
            </button>
          ) : undefined
        }
      />

      <div ref={sectionRef} className="space-y-1.5">
        {ep.rows.length === 0 ? (
          <>
            {/* Even on empty, show the table header with the + button */}
            <div className={`grid items-center gap-3 px-4 py-3 bg-gray-100 border rounded-lg ${gridCols}`}>
              <div className="flex items-center justify-center">
                <PopupButton
                  color="orange"
                  variant="modal"
                  headerLabel="Nový produkt"
                  triggerTitle="Přidat nový produkt"
                  open={popupOpen}
                  onOpenChange={setPopupOpen}
                >
                  <ProductFormModal
                    categories={categories}
                    isVatPayer={isVatPayer}
                    onSaved={ep.refresh}
                    onClose={() => setPopupOpen(false)}
                    onRefresh={ep.refresh}
                  />
                </PopupButton>
              </div>
              <div />
              <div className="text-xs font-semibold text-gray-600 text-center">Název</div>
              <div className="text-xs font-semibold text-gray-600 text-center">Kategorie</div>
              <div className="text-xs font-semibold text-gray-600 text-center">Varianty</div>
              {isVatPayer && <div className="text-xs font-semibold text-gray-600 text-center">DPH</div>}
              <div className="text-xs font-semibold text-gray-600 text-center">Jednotka</div>
            </div>
            <EmptyState
              icon={Package}
              message="Žádné produkty v katalogu."
              subMessage="Klikni na tlačítko + vlevo nahoře pro přidání prvního produktu."
            />
          </>
        ) : (
          <>
            {/* Filter row */}
            <div className={`grid items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg ${gridCols}`}>
              <button
                onClick={() => { setFilterName(''); setCategoryFilter(''); setFilterVat(''); setFilterUnit('') }}
                title="Vymazat filtry"
                className="w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded transition-colors flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center justify-center">
                <input type="checkbox" checked={selectedProducts.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded w-3.5 h-3.5" />
              </div>
              <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Název..." className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-400 focus:border-orange-400" />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-400 bg-white">
                <option value="">Všechny</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div />
              {isVatPayer && (
                <select value={filterVat} onChange={e => setFilterVat(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-400 bg-white">
                  <option value="">Všechna DPH</option>
                  {CZECH_VAT_RATES.map(r => <option key={r} value={String(r)}>{VAT_RATE_LABELS[r]}</option>)}
                </select>
              )}
              <input type="text" value={filterUnit} onChange={e => setFilterUnit(e.target.value)} placeholder="Jedn...." className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-400 focus:border-orange-400" />
            </div>

            {/* Table header — + button lives here in first column */}
            <div className={`grid items-center gap-3 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-600 ${gridCols}`}>
              {/* FIRST COLUMN — the "+" popup button */}
              <div className="flex items-center justify-center">
                <PopupButton
                  color="orange"
                  variant="modal"
                  headerLabel="Nový produkt"
                  triggerTitle="Přidat nový produkt"
                  open={popupOpen}
                  onOpenChange={setPopupOpen}
                >
                  <ProductFormModal
                    categories={categories}
                    isVatPayer={isVatPayer}
                    onSaved={ep.refresh}
                    onClose={() => setPopupOpen(false)}
                    onRefresh={ep.refresh}
                  />
                </PopupButton>
              </div>
              <div />
              <button onClick={() => toggleSort('name')} className="text-center hover:text-orange-700 transition-colors select-none">Název <SortIcon field="name" /></button>
              <button onClick={() => toggleSort('category')} className="text-center hover:text-orange-700 transition-colors select-none">Kategorie <SortIcon field="category" /></button>
              <button onClick={() => toggleSort('variants')} className="text-center hover:text-orange-700 transition-colors select-none">Varianty <SortIcon field="variants" /></button>
              {isVatPayer && <div className="text-center">DPH</div>}
              <div className="text-center">Jednotka</div>
            </div>

            {/* Product rows */}
            {paginated.map(product => {
              const isExpanded = expandedProducts.has(product.id)
              const editForm   = inlineEditForms[product.id]
              const variants   = eshopVariants[product.id] || []
              const vForm      = variantForms[product.id]
              const evEditing  = editingVariant[product.id]
              const vLoading   = variantLoading[product.id]

              return (
                <div key={product.id} className={`border rounded-lg transition-all ${isExpanded ? 'ring-2 ring-orange-400 shadow-sm' : 'hover:shadow-sm'}`}>

                  {/* Summary row */}
                  <div
                    className={`grid items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${gridCols}`}
                    onClick={() => handleToggleExpand(product.id)}
                  >
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
                    <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-4">

                      {/* Product detail / inline edit */}
                      {editForm ? (
                        <DetailSection title="Upravit produkt" icon={Edit2}>
                          <div className="grid grid-cols-2 gap-3 py-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Název *</label>
                              <input type="text" value={editForm.name}
                                onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], name: e.target.value } }))}
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none" autoFocus />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Kategorie</label>
                              <select value={editForm.categoryId}
                                onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], categoryId: e.target.value } }))}
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 bg-white outline-none">
                                <option value="">Bez kategorie</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Jednotka *</label>
                              <select value={editForm.unit}
                                onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], unit: e.target.value } }))}
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 bg-white outline-none">
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
                                  className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 bg-white outline-none">
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
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Nákupní cena (Kč)</label>
                              <input type="number" step="0.01" value={editForm.purchasePrice}
                                onChange={e => setInlineEditForms(prev => ({ ...prev, [product.id]: { ...prev[product.id], purchasePrice: e.target.value } }))}
                                className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none" />
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
                            {Number(product.price) > 0 && <DetailRow label="Prodejní cena" value={formatPrice(Number(product.price))} muted />}
                            {product.purchasePrice && Number(product.purchasePrice) > 0 && <DetailRow label="Nákupní cena" value={formatPrice(Number(product.purchasePrice))} muted />}
                          </div>
                        </DetailSection>
                      )}

                      {/* Variants */}
                      <DetailSection
                        title="Varianty produktu"
                        icon={ShoppingBag}
                        headerRight={<span className="text-xs text-gray-400 font-normal">{variants.length} variant</span>}
                      >
                        {variants.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-3">Žádné varianty.</p>
                        ) : (
                          <table className="w-full text-xs mt-1">
                            <thead>
                              <tr className="text-gray-500 border-b border-gray-100">
                                <th className="py-1.5 text-left font-medium">Název</th>
                                <th className="py-1.5 text-right font-medium">Cena</th>
                                <th className="py-1.5 text-right font-medium">Množství</th>
                                <th className="py-1.5 text-center font-medium">Výchozí</th>
                                <th className="py-1.5 text-center font-medium">SumUp</th>
                                <th className="py-1.5 text-center font-medium">E-shop</th>
                                <th className="py-1.5 text-center font-medium">Akce</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variants.map(v => (
                                <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                                  <td className="py-1.5 font-medium">{v.name}</td>
                                  <td className="py-1.5 text-right">{formatPrice(Number(v.price))}</td>
                                  <td className="py-1.5 text-right">{v.variantValue ? `${v.variantValue} ${v.variantUnit ?? ''}`.trim() : '—'}</td>
                                  <td className="py-1.5 text-center">{v.isDefault ? <span className="text-emerald-600 font-bold">★</span> : <span className="text-gray-300">—</span>}</td>
                                  <td className="py-1.5 text-center">{v.isSumup ? <span className="text-orange-500 font-bold">⚡</span> : <span className="text-gray-300">—</span>}</td>
                                  <td className="py-1.5 text-center">{v.isActive ? <span className="text-emerald-600">✓</span> : <span className="text-red-400">✗</span>}</td>
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

                        {/* Inline variant form for existing product */}
                        <div className="mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                          <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                            {evEditing ? <><Edit2 className="h-3 w-3" />Upravit variantu</> : <><Plus className="h-3 w-3" />Nová varianta</>}
                          </p>
                          <VariantRow
                            v={vForm || emptyVariantForm()}
                            onChange={patch => setVariantForms(prev => ({ ...prev, [product.id]: { ...(prev[product.id] || emptyVariantForm()), ...patch } }))}
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            {evEditing && (
                              <button onClick={() => handleCancelVariantEdit(product.id)} className="h-8 px-3 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200">Zrušit</button>
                            )}
                            <button
                              onClick={() => handleVariantSubmit(product.id)}
                              disabled={vLoading}
                              className="h-8 px-4 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 font-medium flex items-center gap-1"
                            >
                              {vLoading ? <span className="animate-pulse">…</span> : evEditing ? 'Uložit změny' : <><Plus className="h-3 w-3" />Přidat</>}
                            </button>
                          </div>
                        </div>
                      </DetailSection>

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
                              <button onClick={e => { e.stopPropagation(); handleInlineEdit(product) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors"><Edit2 className="h-3.5 w-3.5" /> Upravit</button>
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

            {/* Pagination + per-page selector */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Zobrazit:</span>
                {[10, 20, 50, 100].map(n => (
                  <button key={n} onClick={() => { setItemsPerPage(n); setCurrentPage(1) }}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${itemsPerPage === n ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
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
