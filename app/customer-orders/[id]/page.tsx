'use client'

import { useEffect }     from 'react'
import { useRouter }     from 'next/navigation'
import Link              from 'next/link'
import {
  ShoppingCart,
  User, CreditCard, Clock,
  ExternalLink, CheckCircle, XCircle, Package, Send, Printer,
} from 'lucide-react'
import { LoadingState, ErrorState }                                     from '@/components/erp'
import { ERPStatusTimeline, ERPInfoCard, ERPInfoRow, ERPDetailHeader, ERPSplitButton } from '@/components/erp/detail'
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
  const isCompleted    = ['shipped', 'delivered'].includes(order.status)
  const showMainActions = !isCancelled && !isCompleted

  // ── Action buttons ──────────────────────────────────────────────────────────

  const headerActions = (
    <>
      {/* Mark as paid — only when unpaid and not cancelled */}
      {!isPaid && !isCancelled && (
        <ERPSplitButton
          primary={{
            label:   'Zaplaceno',
            icon:    CheckCircle,
            color:   'indigo',
            onClick: () => handleMarkPaid(order.id),
          }}
        />
      )}

      {/* Main split button state machine */}
      {showMainActions && !hasActiveNote && (
        <ERPSplitButton
          primary={{
            label:   'Vyskladnit',
            icon:    Package,
            color:   'blue',
            onClick: () => router.push(`/delivery-notes/new?orderId=${order.id}`),
          }}
          secondary={{
            label:   'PDF',
            icon:    Printer,
            onClick: () => handlePrintPDF(order),
          }}
        />
      )}

      {showMainActions && hasActiveNote && (
        <ERPSplitButton
          primary={{
            label:   'Odeslat',
            icon:    Send,
            color:   'emerald',
            onClick: () => handleUpdateStatus(order.id, 'shipped'),
          }}
          secondary={{
            label:   'PDF',
            icon:    Printer,
            onClick: () => handlePrintPDF(order),
          }}
        />
      )}

      {/* After shipping/delivery or cancelled — PDF only */}
      {(isCompleted || isCancelled) && (
        <ERPSplitButton
          primary={{
            label:   'PDF',
            icon:    Printer,
            color:   'blue',
            onClick: () => handlePrintPDF(order),
          }}
        />
      )}

      {/* Cancel — only while still actionable */}
      {!isCancelled && (
        <button
          onClick={() => handleUpdateStatus(order.id, 'cancelled')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg transition-colors border border-red-200"
        >
          <XCircle className="w-3.5 h-3.5" /> Zrušit
        </button>
      )}
    </>
  )

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* ── Header card ──────────────────────────────────────────────────── */}
      <ERPDetailHeader
        title={order.orderNumber}
        titleMono
        subtitle={
          <>
            {new Date(order.orderDate).toLocaleDateString('cs-CZ')}
            {mapped.customerName && ` · ${mapped.customerName}`}
          </>
        }
        icon={ShoppingCart}
        iconBg="bg-violet-100"
        iconColor="text-violet-600"
        onBack={() => router.push('/customer-orders')}
        badge={<CustomerOrderStatusBadge status={order.status} />}
        actions={headerActions}
      />

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
