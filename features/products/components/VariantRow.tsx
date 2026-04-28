'use client'

import { useState, useCallback } from 'react'
import { X, Star, ShoppingCart, Zap, Wand2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { TogglePill } from './TogglePill'
import { generateSkuPreview } from '../services/productService'
import type { EshopVariantForm } from '../types'

// ─── EAN client-side validation (format-only, no check-digit round-trip) ─────
// Full check-digit validation happens server-side. Here we just give instant UX feedback.

type EanStatus = 'empty' | 'valid' | 'invalid'

function getEanStatus(raw: string): { status: EanStatus; error: string } {
  const cleaned = raw.replace(/[\s\-]/g, '')
  if (!cleaned) return { status: 'empty', error: '' }
  if (!/^\d+$/.test(cleaned)) return { status: 'invalid', error: 'EAN smí obsahovat pouze číslice' }
  if (![8, 13, 14].includes(cleaned.length))
    return { status: 'invalid', error: `Délka ${cleaned.length} — povoleno: 8, 13 nebo 14 číslic` }

  // GS1 check-digit verification
  const digits = cleaned.split('').map(Number)
  const data   = digits.slice(0, -1)
  const check  = digits[digits.length - 1]
  const sum    = data.reduceRight((acc, d, idx) => {
    const posFromRight = data.length - idx
    return acc + d * (posFromRight % 2 === 1 ? 3 : 1)
  }, 0)
  const expected = (10 - (sum % 10)) % 10

  if (check !== expected)
    return { status: 'invalid', error: `Neplatná kontrolní číslice (očekáváno ${expected}, zadáno ${check})` }

  return { status: 'valid', error: '' }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface VariantRowProps {
  v:                EshopVariantForm
  onChange:         (patch: Partial<EshopVariantForm>) => void
  onRemove?:        () => void
  isEditing?:       boolean
  /**
   * When provided (existing product context), the SKU auto-generate button appears
   * and calls GET /api/products/{productId}/eshop-variants/generate-sku.
   */
  productId?:       string
  /**
   * Variant ID being edited — passed as excludeId so the uniqueness check
   * doesn't conflict with the variant's own current SKU.
   */
  currentVariantId?: string
}

export function VariantRow({
  v,
  onChange,
  onRemove,
  isEditing,
  productId,
  currentVariantId,
}: VariantRowProps) {
  const [skuGenerating, setSkuGenerating] = useState(false)
  const eanCheck = getEanStatus(v.ean)

  const handleAutoGenerateSku = useCallback(async () => {
    if (!productId || !v.name.trim()) return
    setSkuGenerating(true)
    try {
      const sku = await generateSkuPreview(
        productId,
        v.name,
        v.variantValue || undefined,
        v.variantUnit  || undefined,
        currentVariantId,
      )
      onChange({ sku })
    } catch {
      // server returns an error — silently ignore, user can type manually
    } finally {
      setSkuGenerating(false)
    }
  }, [productId, v.name, v.variantValue, v.variantUnit, currentVariantId, onChange])

  return (
    <div
      className={`rounded-lg border p-3 space-y-2.5 ${
        isEditing ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 bg-white'
      }`}
    >
      {/* Row 1 — name / price / quantity / unit */}
      <div className="grid grid-cols-[2fr_1.5fr_1fr_90px] gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Název varianty *
          </label>
          <input
            type="text"
            value={v.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="např. 3,5g / Zelená / M"
            className="w-full h-8 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Cena (Kč) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={v.price}
            onChange={e => onChange({ price: e.target.value })}
            placeholder="0"
            className="w-full h-8 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Množství
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={v.variantValue}
            onChange={e => onChange({ variantValue: e.target.value })}
            placeholder="3.5"
            className="w-full h-8 px-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Jednotka
          </label>
          <select
            value={v.variantUnit}
            onChange={e => onChange({ variantUnit: e.target.value as 'g' | 'ml' | 'ks' | '' })}
            className="w-full h-8 px-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white"
          >
            <option value="">—</option>
            <option value="g">g</option>
            <option value="ml">ml</option>
            <option value="ks">ks</option>
          </select>
        </div>
      </div>

      {/* Row 2 — SKU + EAN */}
      <div className="grid grid-cols-2 gap-2">
        {/* SKU */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            SKU{' '}
            <span className="text-gray-400 font-normal normal-case tracking-normal">
              {productId ? '(prázdné = auto)' : '(generuje se po uložení)'}
            </span>
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              value={v.sku}
              onChange={e => onChange({ sku: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
              placeholder={productId ? 'AUTO' : 'AUTO'}
              className="w-full h-8 px-2.5 text-sm font-mono border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-400 outline-none bg-white placeholder:text-gray-300"
              spellCheck={false}
              autoCapitalize="characters"
            />
            {productId && (
              <button
                type="button"
                onClick={handleAutoGenerateSku}
                disabled={skuGenerating || !v.name.trim()}
                title={v.name.trim() ? 'Vygenerovat SKU z názvu produktu a varianty' : 'Nejprve vyplň název varianty'}
                className="flex-shrink-0 h-8 w-8 flex items-center justify-center border border-gray-300 rounded-md text-gray-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {skuGenerating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Wand2 className="w-3.5 h-3.5" />
                }
              </button>
            )}
          </div>
        </div>

        {/* EAN */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            EAN{' '}
            <span className="text-gray-400 font-normal normal-case tracking-normal">(volitelné — 8, 13 nebo 14 číslic)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={v.ean}
              onChange={e => onChange({ ean: e.target.value.replace(/[^\d\s\-]/g, '') })}
              placeholder="např. 5901234123457"
              className={`w-full h-8 px-2.5 pr-8 text-sm font-mono border rounded-md focus:ring-2 outline-none bg-white transition-colors ${
                eanCheck.status === 'valid'
                  ? 'border-emerald-400 focus:ring-emerald-300'
                  : eanCheck.status === 'invalid'
                  ? 'border-red-400 focus:ring-red-300'
                  : 'border-gray-300 focus:ring-orange-400'
              }`}
              spellCheck={false}
            />
            {eanCheck.status === 'valid' && (
              <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500 pointer-events-none" />
            )}
            {eanCheck.status === 'invalid' && (
              <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-500 pointer-events-none" />
            )}
          </div>
          {eanCheck.error && (
            <p className="text-[10px] text-red-500 mt-0.5">{eanCheck.error}</p>
          )}
        </div>
      </div>

      {/* Row 3 — toggle pills + remove button */}
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
