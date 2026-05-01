'use client'

import { useState, useEffect } from 'react'
import Link            from 'next/link'
import { useRouter }   from 'next/navigation'
import {
  ArrowLeft, RefreshCw, RotateCcw, User, Package,
  FileText, CheckCircle, Truck, Clock, ChevronDown, ChevronUp,
} from 'lucide-react'
import { format } from 'date-fns'
import { cs }     from 'date-fns/locale'

import { LoadingState, ErrorState } from '@/components/erp'
import { useNavbarMeta }            from '@/components/erp/navbar/NavbarMetaContext'
import {
  useReturnDetail, useReturnActions,
  ReturnStatusBadge, ReturnTypeBadge, ReturnTimeline, ReturnItemsTable,
  WorkflowActions, ApproveModal, RejectModal, ReceiveGoodsModal, ProcessRefundModal,
} from '@/features/returns'
import {
  RETURN_REASON_LABELS,
  RETURN_RESOLUTION_LABELS,
  RETURN_REFUND_METHOD_LABELS,
  RETURN_TYPE_LABELS,
} from '@/lib/features/returns/returnWorkflow'
import { formatPrice } from '@/lib/shared/finance/money'

export const dynamic = 'force-dynamic'

function Section({ title, icon: Icon, children }: {
  title: string
  icon:  React.ElementType
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

export default function ReturnDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { detail, loading, error, refresh } = useReturnDetail(params.id)
  const actions = useReturnActions(() => refresh())

  const [showApprove,  setShowApprove]  = useState(false)
  const [showReject,   setShowReject]   = useState(false)
  const [showReceive,  setShowReceive]  = useState(false)
  const [showRefund,   setShowRefund]   = useState(false)
  const [showTimeline, setShowTimeline] = useState(true)

  const { setMeta } = useNavbarMeta()
  useEffect(() => {
    if (detail) setMeta({ subTitle: detail.returnNumber, pageTitleOnClick: () => router.push('/returns') })
  }, [detail?.returnNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingState />
  if (error)   return <ErrorState message={error} onRetry={refresh} />
  if (!detail) return null

  const isTerminal = ['closed', 'cancelled'].includes(detail.status)

  return (
    <>
      {showApprove && <ApproveModal  detail={detail} onClose={() => setShowApprove(false)}  actions={actions} />}
      {showReject  && <RejectModal   detail={detail} onClose={() => setShowReject(false)}   actions={actions} />}
      {showReceive && <ReceiveGoodsModal  detail={detail} onClose={() => setShowReceive(false)} actions={actions} />}
      {showRefund  && <ProcessRefundModal detail={detail} onClose={() => setShowRefund(false)}  actions={actions} />}

      <div className="space-y-4 max-w-5xl mx-auto">

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <button onClick={() => router.push('/returns')} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
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
              <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

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
              {actions.error && <p className="text-xs text-red-500 mt-1.5">{actions.error}</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Section title="Zákazník" icon={User}>
                <InfoRow label="Jméno"  value={detail.customerName} />
                <InfoRow label="E-mail" value={detail.customerEmail
                  ? <a href={`mailto:${detail.customerEmail}`} className="text-indigo-600 hover:underline">{detail.customerEmail}</a>
                  : null
                } />
                <InfoRow label="Telefon" value={detail.customerPhone} />
                <InfoRow label="Adresa"  value={detail.customerAddress} />
              </Section>

              <Section title="Objednávka" icon={Package}>
                {detail.customerOrderId && (
                  <InfoRow label="Číslo" value={
                    <Link href={`/customer-orders?highlight=${detail.customerOrderId}`} className="text-indigo-600 hover:underline font-mono text-xs">
                      {detail.customerOrderNumber}
                    </Link>
                  } />
                )}
                <InfoRow label="Typ reklamace" value={(RETURN_TYPE_LABELS as Record<string, string>)[detail.type] ?? detail.type} />
                <InfoRow label="Důvod"         value={(RETURN_REASON_LABELS as Record<string, string>)[detail.reason] ?? detail.reason} />
                {detail.reasonDetail && (
                  <div className="mt-2 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-600 leading-relaxed">
                    {detail.reasonDetail}
                  </div>
                )}
              </Section>
            </div>

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

            <Section title="Vrácené položky" icon={Package}>
              <ReturnItemsTable items={detail.items} />
            </Section>

            {detail.resolutionType && (
              <Section title="Výsledek reklamace" icon={CheckCircle}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <InfoRow label="Typ"    value={(RETURN_RESOLUTION_LABELS as Record<string, string>)[detail.resolutionType ?? ''] ?? detail.resolutionType} />
                  {detail.refundAmount != null && (
                    <InfoRow label="Částka" value={<span className="text-green-700 font-bold">{formatPrice(detail.refundAmount)}</span>} />
                  )}
                  {detail.refundMethod && (
                    <InfoRow label="Způsob" value={(RETURN_REFUND_METHOD_LABELS as Record<string, string>)[detail.refundMethod ?? ''] ?? detail.refundMethod} />
                  )}
                  {detail.refundReference && <InfoRow label="Reference" value={detail.refundReference} />}
                  {detail.refundProcessedAt && (
                    <InfoRow label="Zpracováno" value={format(new Date(detail.refundProcessedAt), 'd. M. yyyy HH:mm', { locale: cs })} />
                  )}
                  {detail.refundStatus && detail.refundStatus !== 'none' && (
                    <InfoRow label="Stav platby" value={
                      <span className={`text-xs font-semibold ${
                        detail.refundStatus === 'completed' ? 'text-green-700' :
                        detail.refundStatus === 'failed'    ? 'text-red-700'   :
                        'text-amber-700'
                      }`}>
                        {detail.refundStatus === 'completed' ? 'Vyplaceno' :
                         detail.refundStatus === 'failed'    ? 'Selhalo'   :
                         'Čekající'}
                      </span>
                    } />
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

            {detail.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-red-700 mb-1">Důvod zamítnutí</p>
                <p className="text-sm text-red-800">{detail.rejectionReason}</p>
              </div>
            )}

            <Section title="Interní poznámka" icon={FileText}>
              {detail.adminNote
                ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{detail.adminNote}</p>
                : <p className="text-xs text-gray-400 italic">Žádná interní poznámka</p>
              }
            </Section>
          </div>

          {/* Right column */}
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

            {detail.attachments.length > 0 && (
              <Section title="Přílohy" icon={FileText}>
                <div className="space-y-1.5">
                  {detail.attachments.map(att => (
                    <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-indigo-600 hover:underline truncate"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                      {att.filename}
                    </a>
                  ))}
                </div>
              </Section>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Přehled</p>
              </div>
              <div className="px-5 py-4 space-y-2">
                <InfoRow label="Položek celkem"     value={detail.itemCount} />
                <InfoRow label="Schváleno"           value={detail.approvedItemCount} />
                <InfoRow label="Zpracovává"          value={detail.handledByName ?? '—'} />
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
