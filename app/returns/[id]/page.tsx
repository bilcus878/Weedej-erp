'use client'

import { useState, useEffect } from 'react'
import Link            from 'next/link'
import { useRouter }   from 'next/navigation'
import {
  ArrowLeft, RefreshCw, RotateCcw, User, Package,
  FileText, CheckCircle, XCircle, Truck, CreditCard,
  AlertTriangle, Clock, ChevronDown, ChevronUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { cs }     from 'date-fns/locale'

import { LoadingState, ErrorState } from '@/components/erp'
import { useNavbarMeta }            from '@/components/NavbarMetaContext'
import {
  useReturnDetail,
  useReturnActions,
  ReturnStatusBadge,
  ReturnTypeBadge,
  ReturnTimeline,
  ReturnItemsTable,
} from '@/features/returns'
import type {
  ReturnRequestDetail,
  ReturnStatus,
  ReturnItemCondition,
  ReturnItemStatus,
} from '@/features/returns'
import {
  RETURN_REASON_LABELS,
  RETURN_RESOLUTION_LABELS,
  RETURN_REFUND_METHOD_LABELS,
  RETURN_TYPE_LABELS,
} from '@/lib/returns/returnWorkflow'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// ── Section card wrapper ──────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
        <Icon className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-900 text-right">{value ?? '—'}</span>
    </div>
  )
}

// ── Workflow action button bar ────────────────────────────────────────────────

function WorkflowActions({
  detail,
  actions,
  onOpenApproveModal,
  onOpenRejectModal,
  onOpenReceiveModal,
  onOpenRefundModal,
}: {
  detail:              ReturnRequestDetail
  actions:             ReturnType<typeof useReturnActions>
  onOpenApproveModal:  () => void
  onOpenRejectModal:   () => void
  onOpenReceiveModal:  () => void
  onOpenRefundModal:   () => void
}) {
  const { status, canTransitionTo, id } = detail

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

// ── Approve modal ─────────────────────────────────────────────────────────────

function ApproveModal({
  detail,
  onClose,
  actions,
}: {
  detail:  ReturnRequestDetail
  onClose: () => void
  actions: ReturnType<typeof useReturnActions>
}) {
  const [resolutionType, setResolutionType] = useState<string>('refund')
  const [itemDecisions, setItemDecisions]   = useState(
    detail.items.map(item => ({
      id:              item.id,
      itemStatus:      'approved' as ReturnItemStatus,
      approvedQuantity: item.returnedQuantity,
      condition:       item.condition as ReturnItemCondition | null,
      conditionNote:   item.conditionNote,
      itemRejectionReason: null as string | null,
    }))
  )

  const computedRefund = itemDecisions.reduce((sum, d) => {
    if (d.itemStatus === 'rejected') return sum
    const item = detail.items.find(i => i.id === d.id)!
    return sum + (d.approvedQuantity ?? 0) * item.unitPriceWithVat
  }, 0)

  const handleSubmit = async () => {
    await actions.approve(detail.id, {
      items:          itemDecisions,
      resolutionType: resolutionType as any,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Schválit reklamaci</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Resolution type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Typ rozhodnutí</label>
            <select
              value={resolutionType}
              onChange={e => setResolutionType(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="refund">Vrácení peněz</option>
              <option value="store_credit">Kredit v e-shopu</option>
              <option value="exchange">Výměna produktu</option>
              <option value="repair">Oprava</option>
            </select>
          </div>

          {/* Per-item decisions */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Rozhodnutí položek</label>
            <div className="space-y-3">
              {detail.items.map((item, idx) => {
                const decision = itemDecisions[idx]
                return (
                  <div key={item.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{item.productName}</span>
                      <span className="text-xs text-gray-500">{item.returnedQuantity} {item.unit}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-semibold">Rozhodnutí</label>
                        <select
                          value={decision.itemStatus}
                          onChange={e => {
                            const updated = [...itemDecisions]
                            updated[idx] = { ...updated[idx], itemStatus: e.target.value as ReturnItemStatus }
                            setItemDecisions(updated)
                          }}
                          className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        >
                          <option value="approved">Schváleno</option>
                          <option value="partial">Částečně</option>
                          <option value="rejected">Zamítnuto</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-semibold">Schválené mn.</label>
                        <input
                          type="number"
                          min={0}
                          max={item.returnedQuantity}
                          step="any"
                          value={decision.approvedQuantity ?? ''}
                          onChange={e => {
                            const updated = [...itemDecisions]
                            updated[idx] = { ...updated[idx], approvedQuantity: parseFloat(e.target.value) || 0 }
                            setItemDecisions(updated)
                          }}
                          disabled={decision.itemStatus === 'rejected'}
                          className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:bg-gray-50 disabled:text-gray-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase font-semibold">Stav zboží</label>
                        <select
                          value={decision.condition ?? ''}
                          onChange={e => {
                            const updated = [...itemDecisions]
                            updated[idx] = { ...updated[idx], condition: (e.target.value || null) as ReturnItemCondition | null }
                            setItemDecisions(updated)
                          }}
                          className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        >
                          <option value="">Vybrat...</option>
                          <option value="good">Nepoškozené</option>
                          <option value="damaged">Poškozené</option>
                          <option value="defective">Vadné</option>
                          <option value="opened">Otevřené</option>
                          <option value="wrong_item">Špatné zboží</option>
                        </select>
                      </div>
                    </div>
                    {decision.itemStatus === 'rejected' && (
                      <input
                        type="text"
                        placeholder="Důvod zamítnutí..."
                        value={decision.itemRejectionReason ?? ''}
                        onChange={e => {
                          const updated = [...itemDecisions]
                          updated[idx] = { ...updated[idx], itemRejectionReason: e.target.value || null }
                          setItemDecisions(updated)
                        }}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Computed refund */}
          <div className="bg-green-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700 font-medium">Celková refundace</span>
            <span className="text-lg font-bold text-green-700">{formatPrice(Math.round(computedRefund * 100) / 100)}</span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            Zrušit
          </button>
          <button
            onClick={handleSubmit}
            disabled={actions.saving}
            className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
          >
            {actions.saving ? 'Ukládám...' : 'Potvrdit rozhodnutí'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({
  detail,
  onClose,
  actions,
}: {
  detail:  ReturnRequestDetail
  onClose: () => void
  actions: ReturnType<typeof useReturnActions>
}) {
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

// ── Receive goods modal ───────────────────────────────────────────────────────

function ReceiveGoodsModal({
  detail,
  onClose,
  actions,
}: {
  detail:  ReturnRequestDetail
  onClose: () => void
  actions: ReturnType<typeof useReturnActions>
}) {
  const [restock, setRestock] = useState(true)
  const [conditions, setConditions] = useState(
    detail.items.map(i => ({
      id:        i.id,
      condition: 'good' as ReturnItemCondition,
      conditionNote: '',
    }))
  )

  const handleSubmit = async () => {
    await actions.receiveGoods(detail.id, { items: conditions, restock })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Přijmout vrácené zboží</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {detail.items.map((item, idx) => (
            <div key={item.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
              <p className="text-sm font-medium text-gray-900">{item.productName}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Stav přijatého zboží</label>
                  <select
                    value={conditions[idx].condition}
                    onChange={e => {
                      const updated = [...conditions]
                      updated[idx] = { ...updated[idx], condition: e.target.value as ReturnItemCondition }
                      setConditions(updated)
                    }}
                    className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    <option value="good">Nepoškozené</option>
                    <option value="opened">Otevřené</option>
                    <option value="damaged">Poškozené</option>
                    <option value="defective">Vadné</option>
                    <option value="wrong_item">Špatné zboží</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 uppercase font-semibold">Poznámka</label>
                  <input
                    type="text"
                    placeholder="Volitelně..."
                    value={conditions[idx].conditionNote}
                    onChange={e => {
                      const updated = [...conditions]
                      updated[idx] = { ...updated[idx], conditionNote: e.target.value }
                      setConditions(updated)
                    }}
                    className="w-full mt-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              </div>
            </div>
          ))}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={restock}
              onChange={e => setRestock(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-400"
            />
            <span className="text-sm text-gray-700">Naskladnit nepoškozené zboží zpět do skladu</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            Zrušit
          </button>
          <button
            onClick={handleSubmit}
            disabled={actions.saving}
            className="text-sm px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors font-medium"
          >
            {actions.saving ? 'Ukládám...' : 'Potvrdit příjem'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Process refund modal ──────────────────────────────────────────────────────

function ProcessRefundModal({
  detail,
  onClose,
  actions,
}: {
  detail:  ReturnRequestDetail
  onClose: () => void
  actions: ReturnType<typeof useReturnActions>
}) {
  const [amount,    setAmount]    = useState(detail.totalApprovedRefund.toString())
  const [method,    setMethod]    = useState<string>('original_payment')
  const [reference, setReference] = useState('')

  const handleSubmit = async () => {
    await actions.processRefund(detail.id, {
      refundAmount:    parseFloat(amount),
      refundMethod:    method as any,
      refundReference: reference || undefined,
    })
    onClose()
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
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Částka refundace (CZK)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Vypočtená hodnota: {formatPrice(detail.totalApprovedRefund)}
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
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            Zrušit
          </button>
          <button
            onClick={handleSubmit}
            disabled={actions.saving || !amount || parseFloat(amount) <= 0}
            className="text-sm px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors font-medium"
          >
            {actions.saving ? 'Zpracovávám...' : 'Provést refundaci'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReturnDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { detail, loading, error, refresh } = useReturnDetail(params.id)
  const actions = useReturnActions(updated => {
    // Trigger a re-fetch — simplest pattern matching existing codebase
    refresh()
  })

  const [showApprove,  setShowApprove]  = useState(false)
  const [showReject,   setShowReject]   = useState(false)
  const [showReceive,  setShowReceive]  = useState(false)
  const [showRefund,   setShowRefund]   = useState(false)
  const [showTimeline, setShowTimeline] = useState(true)

  const { setMeta } = useNavbarMeta()
  useEffect(() => {
    if (detail) {
      setMeta({ subTitle: detail.returnNumber, pageTitleOnClick: () => router.push('/returns') })
    }
  }, [detail?.returnNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={refresh} />
  if (!detail) return null

  const isTerminal = ['closed', 'cancelled'].includes(detail.status)

  return (
    <>
      {/* Modals */}
      {showApprove && <ApproveModal detail={detail} onClose={() => setShowApprove(false)} actions={actions} />}
      {showReject  && <RejectModal  detail={detail} onClose={() => setShowReject(false)}  actions={actions} />}
      {showReceive && <ReceiveGoodsModal detail={detail} onClose={() => setShowReceive(false)} actions={actions} />}
      {showRefund  && <ProcessRefundModal detail={detail} onClose={() => setShowRefund(false)} actions={actions} />}

      <div className="space-y-4 max-w-5xl mx-auto">

        {/* ── Header card ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <button
              onClick={() => router.push('/returns')}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>

            <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5 text-rose-600" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-gray-900 font-mono">{detail.returnNumber}</h1>
              <p className="text-xs text-gray-400">
                {format(new Date(detail.requestDate), 'd. MMMM yyyy', { locale: cs })}
                {detail.returnDeadline && (
                  <> · Lhůta: {format(new Date(detail.returnDeadline), 'd. M. yyyy', { locale: cs })}</>
                )}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
              <ReturnTypeBadge   type={detail.type}     />
              <ReturnStatusBadge status={detail.status} />
              <button
                onClick={refresh}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Workflow actions */}
          {!isTerminal && (
            <div className="px-6 py-3 bg-gray-50/60 border-b border-gray-100">
              <WorkflowActions
                detail={detail}
                actions={actions}
                onOpenApproveModal={() => setShowApprove(true)}
                onOpenRejectModal={() => setShowReject(true)}
                onOpenReceiveModal={() => setShowReceive(true)}
                onOpenRefundModal={() => setShowRefund(true)}
              />
              {actions.error && (
                <p className="text-xs text-red-500 mt-1.5">{actions.error}</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Left column (2/3) ────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Customer + Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Section title="Zákazník" icon={User}>
                <InfoRow label="Jméno"    value={detail.customerName} />
                <InfoRow label="E-mail"   value={detail.customerEmail
                  ? <a href={`mailto:${detail.customerEmail}`} className="text-indigo-600 hover:underline">{detail.customerEmail}</a>
                  : null
                } />
                <InfoRow label="Telefon"  value={detail.customerPhone} />
                <InfoRow label="Adresa"   value={detail.customerAddress} />
              </Section>

              <Section title="Objednávka" icon={Package}>
                {detail.customerOrderId && (
                  <InfoRow label="Číslo" value={
                    <Link href={`/customer-orders?highlight=${detail.customerOrderId}`} className="text-indigo-600 hover:underline font-mono text-xs">
                      {detail.customerOrderNumber}
                    </Link>
                  } />
                )}
                <InfoRow label="Typ reklamace" value={(RETURN_TYPE_LABELS as Record<string,string>)[detail.type] ?? detail.type} />
                <InfoRow label="Důvod"         value={(RETURN_REASON_LABELS as Record<string,string>)[detail.reason] ?? detail.reason} />
                {detail.reasonDetail && (
                  <div className="mt-2 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-600 leading-relaxed">
                    {detail.reasonDetail}
                  </div>
                )}
              </Section>
            </div>

            {/* Return shipping */}
            {(detail.returnShippingPaidBy || detail.returnTrackingNumber || detail.returnCarrier) && (
              <Section title="Přeprava zpět" icon={Truck}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <InfoRow label="Platí"    value={detail.returnShippingPaidBy === 'seller' ? 'Prodejce' : 'Zákazník'} />
                  <InfoRow label="Dopravce" value={detail.returnCarrier} />
                  <InfoRow label="Tracking" value={detail.returnTrackingNumber} />
                  {detail.returnShippingCost != null && (
                    <InfoRow label="Cena" value={formatPrice(detail.returnShippingCost)} />
                  )}
                </div>
              </Section>
            )}

            {/* Items */}
            <Section title="Vrácené položky" icon={Package}>
              <ReturnItemsTable items={detail.items} />
            </Section>

            {/* Resolution */}
            {detail.resolutionType && (
              <Section title="Výsledek reklamace" icon={CheckCircle}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <InfoRow label="Typ"        value={(RETURN_RESOLUTION_LABELS as Record<string,string>)[detail.resolutionType ?? ''] ?? detail.resolutionType} />
                  {detail.refundAmount != null && (
                    <InfoRow label="Částka" value={<span className="text-green-700 font-bold">{formatPrice(detail.refundAmount)}</span>} />
                  )}
                  {detail.refundMethod && (
                    <InfoRow label="Způsob" value={(RETURN_REFUND_METHOD_LABELS as Record<string,string>)[detail.refundMethod ?? ''] ?? detail.refundMethod} />
                  )}
                  {detail.refundReference && (
                    <InfoRow label="Reference" value={detail.refundReference} />
                  )}
                  {detail.refundProcessedAt && (
                    <InfoRow label="Zpracováno" value={format(new Date(detail.refundProcessedAt), 'd. M. yyyy HH:mm', { locale: cs })} />
                  )}
                  {detail.creditNoteId && (
                    <InfoRow label="Dobropis" value={
                      <Link href={`/credit-notes?highlight=${detail.creditNoteId}`} className="text-purple-600 hover:underline font-mono text-xs">
                        {detail.creditNoteNumber}
                      </Link>
                    } />
                  )}
                  {detail.exchangeOrderId && (
                    <InfoRow label="Nová objednávka" value={
                      <Link href={`/customer-orders?highlight=${detail.exchangeOrderId}`} className="text-indigo-600 hover:underline font-mono text-xs">
                        {detail.exchangeOrderNumber}
                      </Link>
                    } />
                  )}
                </div>
              </Section>
            )}

            {/* Rejection reason */}
            {detail.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-red-700 mb-1">Důvod zamítnutí</p>
                <p className="text-sm text-red-800">{detail.rejectionReason}</p>
              </div>
            )}

            {/* Admin note */}
            <Section title="Interní poznámka" icon={FileText}>
              {detail.adminNote
                ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{detail.adminNote}</p>
                : <p className="text-xs text-gray-400 italic">Žádná interní poznámka</p>
              }
            </Section>
          </div>

          {/* ── Right column (1/3) — timeline ────────────────────────────────── */}
          <div className="space-y-4">
            <Section title="Historie stavu" icon={Clock}>
              <button
                onClick={() => setShowTimeline(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors"
              >
                {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {showTimeline ? 'Skrýt' : 'Zobrazit'}
              </button>
              {showTimeline && <ReturnTimeline history={detail.statusHistory} />}
            </Section>

            {/* Attachments */}
            {detail.attachments.length > 0 && (
              <Section title="Přílohy" icon={FileText}>
                <div className="space-y-1.5">
                  {detail.attachments.map(att => (
                    <a
                      key={att.id}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-indigo-600 hover:underline truncate"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                      {att.filename}
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {/* Summary stats */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Přehled</p>
              </div>
              <div className="px-5 py-4 space-y-2">
                <InfoRow label="Položek celkem"    value={detail.itemCount} />
                <InfoRow label="Schváleno"          value={detail.approvedItemCount} />
                <InfoRow label="Zpracovává"         value={detail.handledByName ?? '—'} />
                <InfoRow label="Vypočtená refundace" value={
                  <span className="text-green-700 font-bold">{formatPrice(detail.totalApprovedRefund)}</span>
                } />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
