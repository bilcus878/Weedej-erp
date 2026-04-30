'use client'

import { useState } from 'react'
import { XCircle } from 'lucide-react'
import type { ReturnRequestDetail } from '../types'
import type { useReturnActions } from '../hooks/useReturnActions'

interface Props {
  detail:  ReturnRequestDetail
  onClose: () => void
  actions: ReturnType<typeof useReturnActions>
}

export function RejectModal({ detail, onClose, actions }: Props) {
  const [reason, setReason] = useState('')

  const handleSubmit = async () => {
    if (!reason.trim()) return
    await actions.reject(detail.id, { rejectionReason: reason })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Zamítnout reklamaci</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Důvod zamítnutí *</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={4}
            placeholder="Popište důvod zamítnutí reklamace..."
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            Zrušit
          </button>
          <button
            onClick={handleSubmit}
            disabled={actions.saving || !reason.trim()}
            className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
          >
            {actions.saving ? 'Ukládám...' : 'Zamítnout reklamaci'}
          </button>
        </div>
      </div>
    </div>
  )
}
