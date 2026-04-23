'use client'

import { VAT_RATE_LABELS, isNonVatPayer, calculateLineVat, calculateVatSummary } from '@/lib/vatCalculation'
import type { CustomerOrderItem } from '../types'

interface Props {
  items:         CustomerOrderItem[]
  isVatPayer:    boolean
  discountType:  'percentage' | 'fixed' | 'none'
  discountValue: string
}

export function OrderTotalsPreview({ items, isVatPayer, discountType, discountValue }: Props) {
  if (items.length === 0) return null

  const fixedDiscount = discountType === 'fixed' && discountValue ? parseFloat(discountValue) : 0

  if (!isVatPayer) {
    const subtotal = items.reduce((s, i) => s + ((i.quantity || 0) * (i.price || 0)), 0)
    const disc     = discountType === 'percentage' && discountValue
      ? (subtotal * parseFloat(discountValue)) / 100
      : fixedDiscount
    const total = subtotal - disc
    return (
      <div className="p-4 space-y-2">
        <Row label="Mezisoučet:" value={fmt(subtotal)} />
        {disc > 0 && <Row label={discountLabel(discountType, discountValue)} value={`-${fmt(disc)}`} red />}
        <Row label="Celkem k úhradě:" value={fmt(total)} bold />
      </div>
    )
  }

  const vatLineItems = items.map(i => calculateLineVat(i.quantity || 0, i.price || 0, i.vatRate))
  const summary      = calculateVatSummary(vatLineItems)
  const disc         = discountType === 'percentage' && discountValue
    ? (summary.totalWithoutVat * parseFloat(discountValue)) / 100
    : fixedDiscount
  const afterDiscount    = summary.totalWithoutVat - disc
  const discountRatio    = summary.totalWithoutVat > 0 ? afterDiscount / summary.totalWithoutVat : 1
  const totalWithVat     = afterDiscount + summary.totalVat * discountRatio

  return (
    <div className="p-4 space-y-2">
      <Row label="Základ bez DPH:" value={fmt(summary.totalWithoutVat)} />
      {Object.entries(summary.byRate)
        .filter(([rate]) => !isNonVatPayer(Number(rate)))
        .map(([rate, breakdown]) => (
          <div key={rate} className="flex justify-between text-sm pl-4">
            <span className="text-gray-500">DPH {VAT_RATE_LABELS[Number(rate)] || `${rate}%`}:</span>
            <span className="text-gray-700">{fmt(breakdown.vat)}</span>
          </div>
        ))}
      <Row label="Celkem s DPH:" value={fmt(summary.totalWithVat)} />
      {disc > 0 && <Row label={discountLabel(discountType, discountValue)} value={`-${fmt(disc)}`} red />}
      <Row label="Celkem k úhradě:" value={fmt(totalWithVat)} bold />
    </div>
  )
}

function fmt(n: number) {
  return `${n.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč`
}

function discountLabel(type: string, value: string) {
  return `Sleva ${type === 'percentage' ? `(${value}%)` : '(pevná částka)'}:`
}

function Row({ label, value, bold, red }: { label: string; value: string; bold?: boolean; red?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'pt-2 border-t border-gray-200' : ''}`}>
      <span className={bold ? 'font-semibold text-gray-800' : red ? 'text-red-600' : 'text-gray-600'}>
        {label}
      </span>
      <span className={bold ? 'font-bold text-gray-900 text-base' : red ? 'font-medium text-red-600' : 'font-medium text-gray-900'}>
        {value}
      </span>
    </div>
  )
}
