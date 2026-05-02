'use client'

import { useEffect }     from 'react'
import { useRouter }     from 'next/navigation'
import Link              from 'next/link'
import {
  ArrowLeft, ShoppingCart,
  User, CreditCard, Clock,
  ExternalLink, CheckCircle, XCircle, Package, TrendingUp, Printer,
} from 'lucide-react'
import { LoadingState, ErrorState }                                     from '@/components/erp'
import { ERPStatusTimeline, ERPInfoCard, ERPInfoRow }                      from '@/components/erp/detail'
import { OrderItemsSection, ShippingSection, StornoSection }            from '@/components/erp/detail'
import type { TimelineEntry }                                           from '@/components/erp/detail'
import { useNavbarMeta }                                   from '@/components/erp/navbar/NavbarMetaContext'
import { useCompanySettings }                              from '@/components/erp/hooks/useCompanySettings'
import {
  useCustomerOrderDetail,
  useCustomerOrderActions,
  CustomerOrderStatusBadge,
  CustomerOrderAuditSection,
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
  const hasBilling     = !!(mapped.billingStreet || mapped.billingCity)
  const inv            = mapped.issuedInvoice

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* ── Header card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-3.5">
          <button
            onClick={() => router.push('/customer-orders')}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>

          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-4 h-4 text-violet-600" />
          </div>

          {/* Title + status badge */}
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 font-mono leading-tight tracking-tight">
              {order.orderNumber}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-400">
                {new Date(order.orderDate).toLocaleDateString('cs-CZ')}
                {mapped.customerName && ` · ${mapped.customerName}`}
              </span>
              <CustomerOrderStatusBadge status={order.status} />
            </div>
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2 shrink-0 flex-wrap justify-end">

            {/* Primary CTA — only when unpaid */}
            {!isPaid && !isCancelled && (
              <button
                onClick={() => handleMarkPaid(order.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Zaplaceno
              </button>
            )}

            {/* Secondary toolbar */}
            <div className="flex items-center divide-x divide-gray-200 rounded-lg border border-gray-200 overflow-hidden text-xs font-medium text-gray-600">
              <button
                onClick={() => handlePrintPDF(order)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
              {!isCancelled && !hasActiveNote && (
                <button
                  onClick={() => router.push(`/delivery-notes/new?orderId=${order.id}`)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  <Package className="w-3.5 h-3.5" /> Výdejka
                </button>
              )}
              {order.status === 'shipped' && (
                <button
                  onClick={() => handleUpdateStatus(order.id, 'delivered')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Doručeno
                </button>
              )}
            </div>

            {/* Danger */}
            {!isCancelled && (
              <button
                onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors border border-red-200"
              >
                <XCircle className="w-3.5 h-3.5" /> Zrušit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Historie — full width horizontal stepper ─────────────────────── */}
      <ERPInfoCard title="Historie" icon={Clock}>
        <ERPStatusTimeline
          entries={buildTimeline(mapped)}
          statusConfig={STATUS_CONFIG}
          horizontal
        />
      </ERPInfoCard>

      {/* ── Content grid — flat 3-col, cards share equal row height ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Row 1 — Zákazník */}
        <ERPInfoCard title="Zákazník" icon={User} className="h-full">
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

        {/* Row 1 — Platba */}
        <ERPInfoCard title="Platba" icon={CreditCard} className="h-full">
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
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100">
            <span className="text-xs text-gray-500">{isVatPayer ? 'Celkem s DPH' : 'Celkem'}</span>
            <span className="text-base font-bold text-gray-900 tabular-nums">
              {formatPrice(Number(mapped.totalAmount))}
            </span>
          </div>
        </ERPInfoCard>

        {/* Row 1 — Doprava (stretches to match sibling row height) */}
        {hasShipping
          ? <ShippingSection order={mapped} onRefresh={refresh} />
          : <div />
        }

        {/* Storno — full width when cancelled */}
        {isCancelled && (
          <div className="lg:col-span-3">
            <StornoSection
              stornoAt={mapped.stornoAt}
              stornoBy={mapped.stornoBy}
              stornoReason={mapped.stornoReason}
            />
          </div>
        )}

        {/* Položky — full width */}
        <div className="lg:col-span-3">
          <OrderItemsSection order={mapped} isVatPayer={isVatPayer} />
        </div>

        {/* Audit / Historie změn — full width */}
        <div className="lg:col-span-3">
          <CustomerOrderAuditSection orderId={order.id} />
        </div>

      </div>
    </div>
  )
}
