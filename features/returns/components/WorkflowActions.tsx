'use client'

import {
  Clock, Truck, Package, AlertTriangle,
  CheckCircle, XCircle, CreditCard,
} from 'lucide-react'
import type { ReturnRequestDetail, ReturnStatus } from '../types'
import type { useReturnActions } from '../hooks/useReturnActions'

interface Props {
  detail:             ReturnRequestDetail
  actions:            ReturnType<typeof useReturnActions>
  onOpenApproveModal: () => void
  onOpenRejectModal:  () => void
  onOpenReceiveModal: () => void
  onOpenRefundModal:  () => void
}

export function WorkflowActions({
  detail, actions,
  onOpenApproveModal, onOpenRejectModal, onOpenReceiveModal, onOpenRefundModal,
}: Props) {
  const { status, id } = detail

  const handleTransition = (to: ReturnStatus, note?: string) => {
    actions.transition(id, to, note)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'submitted' && (
        <button
          onClick={() => handleTransition('under_review')}
          disabled={actions.saving}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Clock className="w-3.5 h-3.5" />
          Zahájit zpracování
        </button>
      )}

      {status === 'under_review' && (
        <>
          <button
            onClick={() => handleTransition('waiting_for_goods')}
            disabled={actions.saving}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            <Truck className="w-3.5 h-3.5" />
            Čeká na vrácení zboží
          </button>
          <button
            onClick={() => handleTransition('inspecting', 'Kontrola bez fyzického vrácení')}
            disabled={actions.saving}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            <Package className="w-3.5 h-3.5" />
            Přeskočit vrácení (fotky)
          </button>
        </>
      )}

      {status === 'waiting_for_goods' && (
        <button
          onClick={onOpenReceiveModal}
          disabled={actions.saving}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors"
        >
          <Package className="w-3.5 h-3.5" />
          Přijmout zboží
        </button>
      )}

      {status === 'goods_received' && (
        <button
          onClick={() => handleTransition('inspecting')}
          disabled={actions.saving}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Zahájit kontrolu
        </button>
      )}

      {status === 'inspecting' && (
        <>
          <button
            onClick={onOpenApproveModal}
            disabled={actions.saving}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Schválit
          </button>
          <button
            onClick={onOpenRejectModal}
            disabled={actions.saving}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Zamítnout
          </button>
        </>
      )}

      {(status === 'approved' || status === 'partially_approved') && (
        <button
          onClick={onOpenRefundModal}
          disabled={actions.saving}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          <CreditCard className="w-3.5 h-3.5" />
          Zpracovat refundaci
        </button>
      )}

      {(status === 'rejected' || status === 'resolved') && (
        <button
          onClick={() => handleTransition('closed')}
          disabled={actions.saving}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Uzavřít
        </button>
      )}

      {!['closed', 'cancelled', 'resolved', 'rejected'].includes(status) && (
        <button
          onClick={() => handleTransition('cancelled', 'Zrušeno administrátorem')}
          disabled={actions.saving}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <XCircle className="w-3.5 h-3.5" />
          Zrušit
        </button>
      )}
    </div>
  )
}
