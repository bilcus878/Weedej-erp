'use client'

import { useState } from 'react'
import type { ReceivedInvoice } from '../types'

interface Props {
  invoice:         ReceivedInvoice
  onApplyDiscount: (invoiceId: string, type: string, value: string) => Promise<void>
}

export function InvoiceDiscountWidget({ invoice, onApplyDiscount }: Props) {
  const [type,  setType]  = useState('percentage')
  const [value, setValue] = useState('')

  const items    = invoice.purchaseOrder?.items ?? []
  const subtotal = items.reduce((s: number, item: any) => s + (item.quantity * (item.expectedPrice || 0)), 0)
  const discountAmt = type === 'percentage' ? (subtotal * parseFloat(value || '0')) / 100 : parseFloat(value || '0')
  const newTotal    = subtotal - discountAmt

  async function handleApply() {
    await onApplyDiscount(invoice.id, type, value)
    setValue('')
  }

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-300 rounded-lg mt-4">
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-orange-900 font-semibold flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Uplatnit slevu dodavatele</span>
          </div>
          <select
            value={type}
            onChange={e => { setType(e.target.value); setValue('') }}
            className="px-2 py-1 border border-orange-300 rounded text-xs focus:border-orange-500 focus:ring-orange-500 bg-white"
          >
            <option value="percentage">%</option>
            <option value="fixed">Kč</option>
          </select>
          <input
            type="number" step="0.01" min="0" max={type === 'percentage' ? '100' : undefined}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={type === 'fixed' ? '100' : '10'}
            className="w-24 px-2 py-1 border border-orange-300 rounded text-xs focus:border-orange-500 focus:ring-orange-500 bg-white"
          />
          {value && (
            <>
              <div className="flex items-center gap-2 text-xs text-orange-700">
                <span className="text-gray-500">→</span>
                <span>Sleva: <span className="font-bold">-{discountAmt.toLocaleString('cs-CZ')} Kč</span></span>
                <span className="text-gray-500">|</span>
                <span>Nová cena: <span className="font-bold text-orange-900">{newTotal.toLocaleString('cs-CZ')} Kč</span></span>
              </div>
              <button
                onClick={handleApply}
                className="ml-auto px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded font-medium transition-colors"
              >
                Uplatnit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
