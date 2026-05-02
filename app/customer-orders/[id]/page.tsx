'use client'

import { useEffect }   from 'react'
import { useRouter }   from 'next/navigation'
import Link            from 'next/link'
import { RefreshCw, ExternalLink, Printer, CheckCircle, XCircle, Package, TrendingUp } from 'lucide-react'
import { ERPDetailPageLayout } from '@/components/erp/detail'
import {
  CustomerContactSection,
  OrderSummarySection,
  ShippingSection,
  StornoSection,
  OrderItemsSection,
  DocumentActionsCard,
  StatusTimelineCard,
  DocumentOverviewCard,
} from '@/components/erp/detail'
import type { TimelineEntry } from '@/components/erp/detail'
import { useNavbarMeta }       from '@/components/erp/navbar/NavbarMetaContext'
import { useCompanySettings }  from '@/components/erp/hooks/useCompanySettings'
import {
  useCustomerOrderDetail,
  useCustomerOrderActions,
  CustomerOrderStatusBadge,
  mapCustomerOrderToOrderDetail,
} from '@/features/customer-orders'
import type { OrderDetailData } from '@/components/erp'

export const dynamic = 'force-dynamic'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange' }> = {
  new:        { label: 'Nová',          color: 'yellow' },
  paid:       { label: 'Zaplacena',     color: 'blue'   },
  processing: { label: 'Připravuje se', color: 'orange' },
  shipped:    { label: 'Odeslána',      color: 'green'  },
  delivered:  { label: 'Doručena',      color: 'green'  },
  cancelled:  { label: 'Zrušena',       color: 'red'    },
  storno:     { label: 'STORNO',        color: 'red'    },
}

// ── Timeline builder ──────────────────────────────────────────────────────────

function buildTimeline(order: OrderDetailData): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  entries.push({ toStatus: 'new', changedAt: order.orderDate, statusLabel: 'Objednávka vytvořena' })
  if (order.paidAt) {
    entries.push({ toStatus: 'paid', changedAt: order.paidAt, statusLabel: 'Zaplacena' })
  }
  if (order.shippedAt) {
    entries.push({ toStatus: 'shipped', changedAt: order.shippedAt, statusLabel: 'Odeslána' })
  }
  if (order.stornoAt) {
    entries.push({ toStatus: order.status, changedAt: order.stornoAt, statusLabel: STATUS_CONFIG[order.status]?.label ?? order.status })
  }
  return entries.sort((a, b) => new Date(a.changedAt as string).getTime() - new Date(b.changedAt as string).getTime())
}

// ── Page ──────────────────────────────────────────────────────────────────────

const BASE_CRUMBS = [{ label: 'Objednávky', href: '/customer-orders' }]

export default function CustomerOrderDetailPage({ params }: { params: { id: string } }) {
  const router  = useRouter()
  const { order, loading, error, refresh } = useCustomerOrderDetail(params.id)
  const { isVatPayer }   = useCompanySettings()
  const { handleMarkPaid, handleUpdateStatus, handlePrintPDF } = useCustomerOrderActions(refresh)
  const { setMeta } = useNavbarMeta()

  useEffect(() => {
    if (order) setMeta({ subTitle: order.orderNumber, pageTitleOnClick: () => router.push('/customer-orders') })
  }, [order?.orderNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = [...BASE_CRUMBS, { label: order?.orderNumber ?? '…' }]

  if (error === 'not_found') return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Objednávka nenalezena" notFound />
  if (error)                 return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Chyba" error={error} />
  if (loading || !order)     return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Načítání…" isLoading />

  const mapped              = mapCustomerOrderToOrderDetail(order)
  const isCancelled         = ['cancelled', 'storno'].includes(order.status)
  const isPaid              = ['paid', 'shipped', 'delivered'].includes(order.status)
  const hasActiveDeliveryNote = mapped.deliveryNotes?.some(dn => dn.status === 'active') ?? false
  const hasShipping           = !!(order.shippingMethod || order.pickupPointId)

  const actions = [
    {
      label:    'Označit jako zaplacené',
      icon:     <CheckCircle />,
      variant:  'primary' as const,
      onClick:  () => handleMarkPaid(order.id),
      hidden:   isPaid || isCancelled,
    },
    {
      label:    'Tisk / PDF',
      icon:     <Printer />,
      variant:  'secondary' as const,
      onClick:  () => handlePrintPDF(order),
    },
    {
      label:    'Vystavit výdejku',
      icon:     <Package />,
      variant:  'secondary' as const,
      onClick:  () => router.push(`/delivery-notes/new?orderId=${order.id}`),
      hidden:   isCancelled || hasActiveDeliveryNote,
    },
    {
      label:    'Označit jako doručené',
      icon:     <TrendingUp />,
      variant:  'secondary' as const,
      onClick:  () => handleUpdateStatus(order.id, 'delivered'),
      hidden:   order.status !== 'shipped',
    },
    {
      label:    'Zrušit objednávku',
      icon:     <XCircle />,
      variant:  'danger' as const,
      onClick:  () => handleUpdateStatus(order.id, 'cancelled'),
      hidden:   isCancelled,
    },
  ]

  const overviewRows = [
    {
      label: 'Číslo objednávky',
      value: (
        <span className="font-mono text-indigo-600">{mapped.orderNumber}</span>
      ),
    },
    ...(mapped.issuedInvoice ? [{
      label: 'Faktura',
      value: (
        <Link
          href={`/invoices/issued?highlight=${mapped.issuedInvoice.id}`}
          className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5"
        >
          {mapped.issuedInvoice.invoiceNumber}
          <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    }] : []),
    {
      label: 'Položek',
      value: mapped.items.filter(i => i.productId !== null).length,
    },
    ...(hasActiveDeliveryNote ? [{
      label: 'Výdejky',
      value: mapped.deliveryNotes?.filter(dn => dn.status === 'active').length ?? 0,
    }] : []),
  ]

  return (
    <ERPDetailPageLayout
      breadcrumbs={breadcrumbs}
      title={order.orderNumber}
      subtitle={mapped.customerName ?? undefined}
      statusBadge={<CustomerOrderStatusBadge status={order.status} />}
      actions={
        <button
          onClick={refresh}
          title="Obnovit"
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      }
      sidebar={
        <div className="space-y-4">
          <DocumentOverviewCard rows={overviewRows} />
          <CustomerContactSection
            name={mapped.customerName}
            email={mapped.customerEmail}
            phone={mapped.customerPhone}
            company={mapped.billingCompany}
            ico={mapped.billingIco}
            billingName={mapped.billingName}
            billingCompany={mapped.billingCompany}
            billingStreet={mapped.billingStreet}
            billingCity={mapped.billingCity}
            billingZip={mapped.billingZip}
            billingCountry={mapped.billingCountry}
          />
          <StatusTimelineCard
            entries={buildTimeline(mapped)}
            statusConfig={STATUS_CONFIG}
          />
          <DocumentActionsCard actions={actions} />
        </div>
      }
    >
      {/* 1. Primary work area — what was ordered */}
      <OrderItemsSection order={mapped} isVatPayer={isVatPayer} />

      {/* 2. Logistics — how it moves */}
      {hasShipping && (
        <ShippingSection order={mapped} onRefresh={refresh} />
      )}

      {/* 3. Financial summary — what it costs */}
      <OrderSummarySection order={mapped} isVatPayer={isVatPayer} />

      {/* 4. Storno — only for terminal cancelled state */}
      {isCancelled && (
        <StornoSection
          stornoAt={mapped.stornoAt}
          stornoBy={mapped.stornoBy}
          stornoReason={mapped.stornoReason}
        />
      )}
    </ERPDetailPageLayout>
  )
}
