'use client'

import { useEffect }     from 'react'
import { useRouter }     from 'next/navigation'
import Link              from 'next/link'
import {
  ArrowLeft, RefreshCw, ShoppingCart,
  User, CreditCard, Clock,
  ExternalLink, CheckCircle, XCircle, Package, TrendingUp, Printer,
} from 'lucide-react'
import { LoadingState, ErrorState }                                     from '@/components/erp'
import { ERPStatusTimeline, ERPInfoCard, ERPERPInfoRow }                   from '@/components/erp/detail'
import { OrderItemsSection, ShippingSection, StornoSection }            from '@/components/erp/detail'
import type { TimelineEntry }                                           from '@/components/erp/detail'
import { useNavbarMeta }                                   from '@/components/erp/navbar/NavbarMetaContext'
import { useCompanySettings }                              from '@/components/erp/hooks/useCompanySettings'
import {
  useCustomerOrderDetail,
  useCustomerOrderActions,
  CustomerOrderStatusBadge,
  mapCustomerOrderToOrderDetail,
} from '@/features/customer-orders'
import type { OrderDetailData } from '@/components/erp'
import { formatPrice } from '@/lib/shared/finance/money'

export const dynamic = 'force-dynamic'

// ── Status / payment config ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange' }> = {
  new:        { label: 'Nová',          color: 'yellow' },
  paid:       { label: 'Zaplacena',     color: 'blue'   },
  processing: { label: 'Připravuje se', color: 'orange' },
  shipped:    { label: 'Odeslána',      color: 'green'  },
  delivered:  { label: 'Doručena',      color: 'green'  },
  cancelled:  { label: 'Zrušena',       color: 'red'    },
  storno:     { label: 'STORNO',        color: 'red'    },
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Hotovost', card: 'Platební karta',
  bank_transfer: 'Bankovní převod', transfer: 'Bankovní převod',
}

// ── Timeline builder ──────────────────────────────────────────────────────────

function buildTimeline(order: OrderDetailData): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { toStatus: 'new', changedAt: order.orderDate, statusLabel: 'Objednávka vytvořena' },
  ]
  if (order.paidAt)    entries.push({ toStatus: 'paid',        changedAt: order.paidAt,    statusLabel: 'Zaplacena'  })
  if (order.shippedAt) entries.push({ toStatus: 'shipped',     changedAt: order.shippedAt, statusLabel: 'Odeslána'   })
  if (order.stornoAt)  entries.push({ toStatus: order.status,  changedAt: order.stornoAt,  statusLabel: STATUS_CONFIG[order.status]?.label ?? order.status })
  return entries.sort((a, b) => new Date(a.changedAt as string).getTime() - new Date(b.changedAt as string).getTime())
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomerOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { order, loading, error, refresh } = useCustomerOrderDetail(params.id)
  const { isVatPayer }   = useCompanySettings()
  const { handleMarkPaid, handleUpdateStatus, handlePrintPDF } = useCustomerOrderActions(refresh)
  const { setMeta } = useNavbarMeta()

  useEffect(() => {
    if (order) setMeta({ subTitle: order.orderNumber, pageTitleOnClick: () => router.push('/customer-orders') })
  }, [order?.orderNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <LoadingState />
  if (error === 'not_found') return (
    <div className="max-w-5xl mx-auto px-4 py-20 text-center text-gray-400">Objednávka nenalezena</div>
  )
  if (error)  return <ErrorState message={error} onRetry={refresh} />
  if (!order) return null

  const mapped      = mapCustomerOrderToOrderDetail(order)
  const isCancelled = ['cancelled', 'storno'].includes(order.status)
  const isPaid      = ['paid', 'shipped', 'delivered'].includes(order.status)
  const hasShipping = !!(order.shippingMethod || order.pickupPointId)

  const activeNotes    = (mapped.deliveryNotes ?? []).filter(dn => dn.status === 'active')
  const hasActiveNote  = activeNotes.length > 0
  const catalogCount   = mapped.items.filter(i => i.productId !== null).length
  const hasBilling     = !!(mapped.billingStreet || mapped.billingCity)
  const inv            = mapped.issuedInvoice

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* ── Header card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <button
            onClick={() => router.push('/customer-orders')}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5 text-violet-600" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 font-mono leading-tight">{order.orderNumber}</h1>
            <p className="text-xs text-gray-400">
              {new Date(order.orderDate).toLocaleDateString('cs-CZ')}
              {mapped.customerName && ` · ${mapped.customerName}`}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap justify-end shrink-0">
            <CustomerOrderStatusBadge status={order.status} />
            <button onClick={refresh} title="Obnovit" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Actions strip */}
        <div className="px-6 py-3 bg-gray-50/60 flex items-center gap-2 flex-wrap">
          {!isPaid && !isCancelled && (
            <button
              onClick={() => handleMarkPaid(order.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Označit jako zaplacené
            </button>
          )}
          <button
            onClick={() => handlePrintPDF(order)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Tisk / PDF
          </button>
          {!isCancelled && !hasActiveNote && (
            <button
              onClick={() => router.push(`/delivery-notes/new?orderId=${order.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <Package className="w-3.5 h-3.5" /> Výdejka
            </button>
          )}
          {order.status === 'shipped' && (
            <button
              onClick={() => handleUpdateStatus(order.id, 'delivered')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5" /> Označit jako doručené
            </button>
          )}
          {!isCancelled && (
            <button
              onClick={() => handleUpdateStatus(order.id, 'cancelled')}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors border border-red-200"
            >
              <XCircle className="w-3.5 h-3.5" /> Zrušit
            </button>
          )}
        </div>
      </div>

      {/* ── Content grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Zákazník + Platba — side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <ERPInfoCard title="Zákazník" icon={User}>
              <ERPInfoRow label="Jméno"  value={mapped.customerName} />
              <ERPInfoRow label="E-mail" value={
                mapped.customerEmail
                  ? <a href={`mailto:${mapped.customerEmail}`} className="text-indigo-600 hover:underline">{mapped.customerEmail}</a>
                  : null
              } />
              {mapped.customerPhone && <ERPInfoRow label="Telefon" value={mapped.customerPhone} />}
              {mapped.billingIco && (
                <ERPInfoRow label="IČO" value={<code className="font-mono text-xs">{mapped.billingIco}</code>} />
              )}
              {hasBilling && (
                <ERPInfoRow label="Fakturace" value={
                  <span className="text-right leading-relaxed">
                    {[
                      mapped.billingCompany || mapped.billingName,
                      mapped.billingStreet,
                      [mapped.billingZip, mapped.billingCity].filter(Boolean).join(' '),
                      mapped.billingCountry !== 'CZ' ? mapped.billingCountry : null,
                    ].filter(Boolean).join(', ')}
                  </span>
                } />
              )}
            </ERPInfoCard>

            <ERPInfoCard title="Platba" icon={CreditCard}>
              <ERPInfoRow label="Faktura" value={
                inv ? (
                  <span className="flex items-center gap-1.5 justify-end">
                    <span className={`text-[10px] px-1 py-0.5 rounded font-semibold ${
                      inv.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {inv.paymentStatus === 'paid' ? 'Zap.' : 'Nezap.'}
                    </span>
                    <Link
                      href={`/invoices/issued?highlight=${inv.id}`}
                      className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      {inv.invoiceNumber}<ExternalLink className="w-3 h-3" />
                    </Link>
                  </span>
                ) : <span className="text-gray-400 italic text-xs">nevystavena</span>
              } />
              {inv?.paymentType && (
                <ERPInfoRow label="Způsob" value={PAYMENT_LABELS[inv.paymentType] ?? inv.paymentType} />
              )}
              <ERPInfoRow label="Datum" value={new Date(mapped.orderDate).toLocaleDateString('cs-CZ')} />
              {mapped.paidAt    && <ERPInfoRow label="Zaplaceno" value={new Date(mapped.paidAt).toLocaleDateString('cs-CZ')} />}
              {mapped.shippedAt && <ERPInfoRow label="Odesláno"  value={new Date(mapped.shippedAt).toLocaleDateString('cs-CZ')} />}
              {inv?.dueDate     && <ERPInfoRow label="Splatnost" value={new Date(inv.dueDate).toLocaleDateString('cs-CZ')} />}
              {inv?.variableSymbol && <ERPInfoRow label="VS" value={<code className="font-mono text-xs">{inv.variableSymbol}</code>} />}
              {inv?.constantSymbol && <ERPInfoRow label="KS" value={<code className="font-mono text-xs">{inv.constantSymbol}</code>} />}
              {inv?.specificSymbol && <ERPInfoRow label="SS" value={<code className="font-mono text-xs">{inv.specificSymbol}</code>} />}
              {mapped.discountAmount != null && mapped.discountAmount !== 0 && (
                <ERPInfoRow label="Sleva" value={formatPrice(Number(mapped.discountAmount))} />
              )}
              {mapped.note && !mapped.note.startsWith('Platba:') && (
                <ERPInfoRow label="Poznámka" value={mapped.note} />
              )}
              {activeNotes.length > 0 && (
                <ERPInfoRow label="Výdejky" value={
                  <div className="flex flex-wrap gap-1 justify-end">
                    {activeNotes.map(dn => (
                      <Link
                        key={dn.id}
                        href={`/delivery-notes?highlight=${dn.id}`}
                        className="text-[10px] font-medium px-1.5 py-0.5 bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 transition-colors"
                      >
                        {dn.deliveryNumber}
                      </Link>
                    ))}
                  </div>
                } />
              )}
            </ERPInfoCard>
          </div>

          {/* Items */}
          <OrderItemsSection order={mapped} isVatPayer={isVatPayer} />

          {/* Shipping */}
          {hasShipping && <ShippingSection order={mapped} onRefresh={refresh} />}

          {/* Storno */}
          {isCancelled && (
            <StornoSection
              stornoAt={mapped.stornoAt}
              stornoBy={mapped.stornoBy}
              stornoReason={mapped.stornoReason}
            />
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">

          {/* Přehled + KPI total */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Přehled</p>
            </div>
            <div className="px-5 py-4">
              <ERPInfoRow label="Číslo" value={
                <span className="font-mono text-violet-700">{mapped.orderNumber}</span>
              } />
              <ERPInfoRow label="Položek" value={catalogCount} />
              {hasActiveNote && <ERPInfoRow label="Výdejky" value={activeNotes.length} />}
            </div>
            <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">{isVatPayer ? 'Celkem s DPH' : 'Celkem'}</span>
              <span className="text-xl font-bold text-gray-900 tabular-nums">
                {formatPrice(Number(mapped.totalAmount))}
              </span>
            </div>
          </div>

          {/* Historie */}
          <ERPInfoCard title="Historie" icon={Clock}>
            <ERPStatusTimeline
              entries={buildTimeline(mapped)}
              statusConfig={STATUS_CONFIG}
              compact
            />
          </ERPInfoCard>

        </div>
      </div>
    </div>
  )
}
