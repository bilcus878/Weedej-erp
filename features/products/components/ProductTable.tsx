'use client'

import { ChevronUp, ChevronDown, ChevronRight, Package, Edit2, Trash2, ShoppingBag, Plus, X, Barcode } from 'lucide-react'
import { PopupButton } from '@/components/ui/PopupButton'
import { EmptyState, DetailSection, DetailRow, ActionToolbar } from '@/components/erp'
import { VAT_RATE_LABELS, isNonVatPayer } from '@/lib/vatCalculation'
import { formatPrice } from '@/lib/utils'
import { VariantRow } from './VariantRow'
import { ProductFormModal } from './ProductFormModal'
import type { useProducts } from '../hooks/useProducts'
import { emptyVariantForm } from '../types'

type ProductsHook = ReturnType<typeof useProducts>

type Props = Pick<ProductsHook,
  | 'ep' | 'categories' | 'isVatPayer' | 'paginated'
  | 'popupOpen' | 'setPopupOpen'
  | 'sortField' | 'sortDir' | 'toggleSort'
  | 'inlineEditForms' | 'setInlineEditForms'
  | 'eshopVariants' | 'variantForms' | 'setVariantForms'
  | 'editingVariant' | 'variantLoading'
  | 'handleToggleExpand' | 'handleInlineEdit' | 'handleInlineCancel' | 'handleInlineSave' | 'handleDelete'
  | 'handleVariantSubmit' | 'handleEditVariant' | 'handleCancelVariantEdit' | 'handleDeleteVariant'
> & { hideTrigger?: boolean }

function SortIcon({ field, sortField, sortDir }: { field: string; sortField: string; sortDir: string }) {
  if (sortField !== field) return <ChevronUp className="h-3 w-3 ml-0.5 opacity-0 inline" />
  return sortDir === 'asc'
    ? <ChevronUp   className="h-3 w-3 ml-0.5 text-orange-600 inline" />
    : <ChevronDown className="h-3 w-3 ml-0.5 text-orange-600 inline" />
}

/** Monospace SKU chip — visually distinct from normal text. */
function SkuBadge({ sku }: { sku: string | null }) {
  if (!sku) return <span className="text-gray-300 text-xs">—</span>
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] leading-tight border border-slate-200">
      {sku}
    </span>
  )
}

/** EAN display with optional format badge. */
function EanBadge({ ean }: { ean: string | null }) {
  if (!ean) return <span className="text-gray-300 text-xs">—</span>
  const fmt = ean.length === 8 ? 'EAN-8' : ean.length === 13 ? 'EAN-13' : 'GTIN-14'
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[11px] leading-tight border border-indigo-100"
      title={fmt}
    >
      <Barcode className="w-3 h-3 flex-shrink-0" />
      {ean}
    </span>
  )
}

export function ProductTable({
  ep, categories, isVatPayer, paginated,
  popupOpen, setPopupOpen,
  sortField, sortDir, toggleSort,
  inlineEditForms, setInlineEditForms,
  eshopVariants, variantForms, setVariantForms,
  editingVariant, variantLoading,
  handleToggleExpand, handleInlineEdit, handleInlineCancel, handleInlineSave, handleDelete,
  handleVariantSubmit, handleEditVariant, handleCancelVariantEdit, handleDeleteVariant,
  hideTrigger,
}: Props) {
  const gridCols = isVatPayer
    ? 'grid-cols-[32px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
    : 'grid-cols-[32px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'

  return (
    <div className="space-y-1">
      {/* Header row */}
      <div className={`grid items-center gap-3 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-600 ${gridCols}`}>
        <div className="flex items-center justify-center">
          <PopupButton color="orange" variant="modal" headerLabel="Nový produkt" triggerTitle="Přidat nový produkt" open={popupOpen} onOpenChange={setPopupOpen} hideTrigger={hideTrigger}>
            <ProductFormModal categories={categories} isVatPayer={isVatPayer} onSaved={ep.refresh} onClose={() => setPopupOpen(false)} onRefresh={ep.refresh} />
          </PopupButton>
        </div>
        <button onClick={() => toggleSort('name')}     className="text-center hover:text-orange-700 transition-colors select-none">Název <SortIcon field="name"     sortField={sortField} sortDir={sortDir} /></button>
        <button onClick={() => toggleSort('category')} className="text-center hover:text-orange-700 transition-colors select-none">Kategorie <SortIcon field="category" sortField={sortField} sortDir={sortDir} /></button>
        <button onClick={() => toggleSort('variants')} className="text-center hover:text-orange-700 transition-colors select-none">Varianty <SortIcon field="variants"  sortField={sortField} sortDir={sortDir} /></button>
        {isVatPayer && <div className="text-center">DPH</div>}
        <div className="text-center">Jednotka</div>
      </div>

      {paginated.length === 0 && (
        <EmptyState icon={Package} message="Žádné produkty v katalogu." subMessage="Klikni na tlačítko + vlevo nahoře pro přidání prvního produktu." />
      )}

      {paginated.map(product => {
        const isExpanded = ep.expanded.has(product.id)
        const editForm   = inlineEditForms[product.id]
        const variants   = eshopVariants[product.id] || []
        const vForm      = variantForms[product.id]
        const evEditing  = editingVariant[product.id]
        const vLoading   = variantLoading[product.id]

        return (
          <div key={product.id} className={`border rounded-lg transition-all ${isExpanded ? 'ring-2 ring-orange-400 shadow-sm' : 'hover:shadow-sm'}`}>

            {/* ── Collapsed row ─────────────────────────────────────────── */}
            <div className={`grid items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${gridCols}`} onClick={() => handleToggleExpand(product.id)}>
              <div className="flex items-center justify-center">
                {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
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

            {/* ── Expanded panel ────────────────────────────────────────── */}
            {isExpanded && (
              <div className="border-t border-gray-100 p-4 bg-gray-50/50 space-y-4">

                {/* Product detail / inline edit form */}
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
                            {[0, 12, 21].map(r => <option key={r} value={r}>{VAT_RATE_LABELS[r]}</option>)}
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

                {/* ── Variants section ───────────────────────────────────── */}
                <DetailSection
                  title="Varianty produktu"
                  icon={ShoppingBag}
                  headerRight={<span className="text-xs text-gray-400 font-normal">{variants.length} variant</span>}
                >
                  {variants.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">Žádné varianty.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs mt-1 min-w-[640px]">
                        <thead>
                          <tr className="text-gray-500 border-b border-gray-100">
                            <th className="py-1.5 text-left font-semibold">Název</th>
                            <th className="py-1.5 text-left font-semibold">SKU</th>
                            <th className="py-1.5 text-left font-semibold">EAN</th>
                            <th className="py-1.5 text-right font-semibold">Cena</th>
                            <th className="py-1.5 text-right font-semibold">Množství</th>
                            <th className="py-1.5 text-center font-semibold">Příznaky</th>
                            <th className="py-1.5 text-center font-semibold">Akce</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variants.map(v => (
                            <tr key={v.id} className="border-t border-gray-100 hover:bg-white/80 transition-colors">
                              <td className="py-2 font-medium text-gray-900 pr-2">{v.name}</td>
                              <td className="py-2 pr-2">
                                <SkuBadge sku={v.sku} />
                              </td>
                              <td className="py-2 pr-2">
                                <EanBadge ean={v.ean} />
                              </td>
                              <td className="py-2 text-right font-medium text-gray-700 pr-2">{formatPrice(Number(v.price))}</td>
                              <td className="py-2 text-right text-gray-500 pr-2">
                                {v.variantValue ? `${v.variantValue} ${v.variantUnit ?? ''}`.trim() : '—'}
                              </td>
                              <td className="py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {v.isDefault && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">★ Výchozí</span>
                                  )}
                                  {v.isSumup && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">⚡ SumUp</span>
                                  )}
                                  {v.isActive && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">🛒 E-shop</span>
                                  )}
                                  {!v.isDefault && !v.isSumup && !v.isActive && (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleEditVariant(product.id, v)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Upravit variantu"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteVariant(product.id, v.id, v.name)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="Smazat variantu"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Variant add / edit form */}
                  <div className="mt-3 pt-3 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                    <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                      {evEditing
                        ? <><Edit2 className="h-3 w-3" />Upravit variantu — <span className="font-normal text-gray-400">{evEditing.name}</span></>
                        : <><Plus className="h-3 w-3" />Nová varianta</>
                      }
                    </p>
                    <VariantRow
                      v={vForm || emptyVariantForm()}
                      onChange={patch => setVariantForms(prev => ({
                        ...prev,
                        [product.id]: { ...(prev[product.id] || emptyVariantForm()), ...patch },
                      }))}
                      productId={product.id}
                      currentVariantId={evEditing?.id}
                    />
                    <div className="flex gap-2 mt-2 justify-end">
                      {evEditing && (
                        <button
                          onClick={() => handleCancelVariantEdit(product.id)}
                          className="h-8 px-3 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          Zrušit
                        </button>
                      )}
                      <button
                        onClick={() => handleVariantSubmit(product.id)}
                        disabled={vLoading}
                        className="h-8 px-4 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 font-medium flex items-center gap-1 transition-colors"
                      >
                        {vLoading
                          ? <span className="animate-pulse">…</span>
                          : evEditing
                            ? 'Uložit změny'
                            : <><Plus className="h-3 w-3" />Přidat</>
                        }
                      </button>
                    </div>
                  </div>
                </DetailSection>

                {/* Action toolbar */}
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
    </div>
  )
}
