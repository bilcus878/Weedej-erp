'use client'

import { useState } from 'react'
import { Plus, X, Edit2, Package, ShoppingBag, Tag, ChevronUp, ChevronDown } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { VAT_RATE_LABELS, CZECH_VAT_RATES } from '@/lib/vatCalculation'
import { formatPrice } from '@/lib/utils'
import { createProduct, createVariant } from '../services/productService'
import { CategoryManager } from './CategoryManager'
import { VariantRow } from './VariantRow'
import type { Category, EshopVariantForm, DraftVariant } from '../types'
import { emptyVariantForm } from '../types'

interface Props {
  categories: Category[]
  isVatPayer: boolean
  onClose:    () => void
  onSaved:    () => void
  onRefresh:  () => void
}

export function ProductFormModal({ categories, isVatPayer, onClose, onSaved, onRefresh }: Props) {
  const defaultVat = isVatPayer ? 21 : 0

  const [name,          setName]          = useState('')
  const [unit,          setUnit]          = useState('ks')
  const [categoryId,    setCategoryId]    = useState('')
  const [vatRate,       setVatRate]       = useState(String(defaultVat))
  const [price,         setPrice]         = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')

  const [draftVariants, setDraftVariants] = useState<DraftVariant[]>([])
  const [editingTempId, setEditingTempId] = useState<string | null>(null)
  const [addingVariant, setAddingVariant] = useState(false)
  const [variantDraft,  setVariantDraft]  = useState<EshopVariantForm>(emptyVariantForm())

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
    setEditingTempId(null); setVariantDraft(emptyVariantForm()); setAddingVariant(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { alert('Vyplň název produktu'); return }
    setSaving(true)
    try {
      const { id } = await createProduct({
        name, price: parseFloat(price) || 0,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        vatRate: isVatPayer ? parseFloat(vatRate) : 0,
        unit, categoryId: categoryId || null,
      })
      for (const v of draftVariants) {
        await createVariant(id, {
          name: v.name, price: parseFloat(v.price),
          variantValue: v.variantValue ? parseFloat(v.variantValue) : null,
          variantUnit: v.variantUnit || null,
          isDefault: v.isDefault, isActive: v.isActive, isSumup: v.isSumup,
        })
      }
      onSaved(); onClose()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Chyba při ukládání')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center gap-2">
          <Package className="w-4 h-4 text-orange-600" />
          <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Základní informace</span>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Název produktu *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Název produktu..." required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Základní jednotka *</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="ks">ks — kusy</option>
              <option value="g">g — gramy</option>
              <option value="ml">ml — mililitry</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Bez kategorie</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {isVatPayer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sazba DPH</label>
              <select value={vatRate} onChange={e => setVatRate(e.target.value)} className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                {CZECH_VAT_RATES.map(r => <option key={r} value={r}>{VAT_RATE_LABELS[r]}</option>)}
              </select>
            </div>
          )}
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
                  <button type="button" onClick={() => handleEditDraft(v)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => handleRemoveDraft(v.tempId)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}

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
            <button type="button" onClick={() => { setAddingVariant(true); setVariantDraft(emptyVariantForm()) }}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/30 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus className="w-4 h-4" />Přidat variantu
            </button>
          )}
          {draftVariants.length === 0 && !addingVariant && (
            <p className="text-xs text-gray-400 text-center py-1">Produkty bez variant jsou také platné.</p>
          )}
        </div>
      </div>

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

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          {draftVariants.length > 0 ? `${draftVariants.length} varianty budou přidány po uložení` : 'Produkt bez variant'}
        </p>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Zrušit</Button>
          <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white min-w-[140px]">
            {saving ? <span className="animate-pulse">Ukládám…</span> : <><Package className="w-4 h-4 mr-2" />Přidat produkt</>}
          </Button>
        </div>
      </div>
    </form>
  )
}
