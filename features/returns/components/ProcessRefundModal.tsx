'use client'

import { useState } from 'react'
import { XCircle, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { ReturnRequestDetail } from '../types'
import type { useReturnActions } from '../hooks/useReturnActions'

interface Props {
  detail:  ReturnRequestDetail
  onClose: () => void
  actions: ReturnType<typeof useReturnActions>
}

export function ProcessRefundModal({ detail, onClose, actions }: Props) {
  const [amount,    setAmount]    = useState(detail.totalApprovedRefund.toString())
  const [method,    setMethod]    = useState<string>('original_payment')
  const [reference, setReference] = useState('')

  const parsedAmount = parseFloat(amount)
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount > 0

  const handleSubmit = async () => {
    if (!isAmountValid) return
    const ok = await actions.processRefund(detail.id, {
      refundAmount:    parsedAmount,
      refundMethod:    method as any,
      refundReference: reference.trim() || undefined,
    })
    if (ok) onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Zpracovat refundaci</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Částka refundace (CZK) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Vypočtená hodnota ze schválených položek: {formatPrice(detail.totalApprovedRefund)}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Způsob refundace</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="original_payment">Původní způsob platby</option>
              <option value="bank_transfer">Bankovní převod</option>
              <option value="store_credit">Kredit v e-shopu</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reference / č. transakce</label>
            <input
              type="text"
              placeholder="Volitelně..."
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div className="bg-teal-50 rounded-xl px-4 py-3 text-sm text-teal-800">
            Bude automaticky vytvořen dobropis k původní faktuře, pokud existuje.
          </div>

          {actions.error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{actions.error}</span>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            Zrušit
          </button>
          <button
            onClick={handleSubmit}
            disabled={actions.saving || !isAmountValid}
            className="text-sm px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors font-medium"
          >
            {actions.saving ? 'Zpracovávám...' : 'Provést refundaci'}
          </button>
        </div>
      </div>
    </div>
  )
}
