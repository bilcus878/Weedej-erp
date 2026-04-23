'use client'

import { calculateLineVat, calculateVatSummary, isNonVatPayer, VAT_RATE_LABELS, type VatLineItem } from '@/lib/vatCalculation'
import type { PurchaseOrderItem } from '../types'

interface Props {
  items: PurchaseOrderItem[]
}

export function PurchaseOrderTotals({ items }: Props) {
  if (items.length === 0) return null

  const vatItems: VatLineItem[] = items.map(item =>
    calculateLineVat(item.quantity || 0, item.expectedPrice || 0, item.vatRate)
  )
  const summary = calculateVatSummary(vatItems)

  return (
    <div className="mt-2 bg-gray-50 rounded border border-gray-200 overflow-hidden">
      <div className="p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Základ bez DPH:</span>
          <span className="font-medium text-gray-900">
            {summary.totalWithoutVat.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
          </span>
        </div>
        {Object.entries(summary.byRate)
          .filter(([rate]) => !isNonVatPayer(Number(rate)))
          .map(([rate, breakdown]) => (
            <div key={rate} className="flex justify-between text-sm pl-4">
              <span className="text-gray-500">DPH {VAT_RATE_LABELS[Number(rate)] || `${rate}%`}:</span>
              <span className="text-gray-700">
                {breakdown.vat.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
              </span>
            </div>
          ))}
        <div className="flex justify-between pt-2 border-t border-gray-200">
          <span className="font-semibold text-gray-800">Celkem s DPH:</span>
          <span className="font-bold text-gray-900 text-base">
            {summary.totalWithVat.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč
          </span>
        </div>
      </div>
    </div>
  )
}
