'use client'

import { useEffect }  from 'react'
import { useRouter }  from 'next/navigation'
import Link           from 'next/link'
import { RefreshCw, Printer, TrendingUp, XCircle, ExternalLink } from 'lucide-react'
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
import { useNavbarMeta }      from '@/components/erp/navbar/NavbarMetaContext'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useEshopOrderDetail,
  useEshopOrderActions,
  EshopOrderStatusBadge,
  mapEshopOrderToOrderDetail,
} from '@/features/eshop-orders'
import type { OrderDetailData } from '@/components/erp'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange' }> = {
  paid:       { label: 'Zaplaceno',       color: 'yellow'  },
  processing: { label: 'Část. odesláno', color: 'blue'    },
  shipped:    { label: 'Odesláno',        color: 'purple'  },
  delivered:  { label: 'Doručeno',        color: 'green'   },
  cancelled:  { label: 'Zrušeno',         color: 'red'     },
  storno:     { label: 'Zrušeno',         color: 'red'     },
  new:        { label: 'Nová',            color: 'gray'    },
}

function buildTimeline(order: OrderDetailData): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  entries.push({ toStatus: 'paid', changedAt: order.orderDate, statusLabel: 'Objednávka zaplacena' })
  if (order.shippedAt) entries.push({ toStatus: 'shipped',  changedAt: order.shippedAt,  statusLabel: 'Odesláno' })
  if (order.stornoAt)  entries.push({ toStatus: order.status, changedAt: order.stornoAt, statusLabel: STATUS_CONFIG[order.status]?.label ?? order.status })
  return entries.sort((a, b) => new Date(a.changedAt as string).getTime() - new Date(b.changedAt as string).getTime())
}

const BASE_CRUMBS = [{ label: 'Eshop objednávky', href: '/eshop-orders' }]

export default function EshopOrderDetailPage({ params }: { params: { id: string } }) {
  const router  = useRouter()
  const { order, loading, error, refresh } = useEshopOrderDetail(params.id)
  const { isVatPayer }   = useCompanySettings()
  const { handleUpdateStatus, handlePrintPDF } = useEshopOrderActions(refresh)
  const { setMeta } = useNavbarMeta()

  useEffect(() => {
    if (order) setMeta({ subTitle: order.orderNumber, pageTitleOnClick: () => router.push('/eshop-orders') })
  }, [order?.orderNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = [...BASE_CRUMBS, { label: order?.orderNumber ?? '…' }]

  if (error === 'not_found') return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Objednávka nenalezena" notFound />
  if (error)             return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Chyba" error={error} />
  if (loading || !order) return <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Načítání…" isLoading />

  const mapped      = mapEshopOrderToOrderDetail(order)
  const isCancelled = ['cancelled', 'storno'].includes(order.status)
  const isShipped   = order.status === 'shipped'
  const hasShipping = !!(order.shippingMethod || order.pickupPointId)

  const actions = [
    {
      label:   'Tisk / PDF',
      icon:    <Printer />,
      variant: 'secondary' as const,
      onClick: () => handlePrintPDF(order),
    },
    {
      label:   'Označit jako doručené',
      icon:    <TrendingUp />,
      variant: 'secondary' as const,
      onClick: () => handleUpdateStatus(order.id, 'delivered'),
      hidden:  !isShipped,
    },
    {
      label:   'Zrušit objednávku',
      icon:    <XCircle />,
      variant: 'danger' as const,
      onClick: () => handleUpdateStatus(order.id, 'cancelled'),
      hidden:  isCancelled,
    },
  ]

  const overviewRows = [
    {
      label: 'Číslo objednávky',
      value: <span className="font-mono text-indigo-600">{mapped.orderNumber}</span>,
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
      value: mapped.items.length,
    },
    ...(mapped.deliveryNotes && mapped.deliveryNotes.length > 0 ? [{
      label: 'Výdejky',
      value: mapped.deliveryNotes.length,
    }] : []),
  ]

  return (
    <ERPDetailPageLayout
      breadcrumbs={breadcrumbs}
      title={order.orderNumber}
      subtitle={mapped.customerName ?? undefined}
      statusBadge={<EshopOrderStatusBadge status={order.status} />}
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
          <DocumentActionsCard actions={actions} />
          <StatusTimelineCard entries={buildTimeline(mapped)} statusConfig={STATUS_CONFIG} />
          <DocumentOverviewCard rows={overviewRows} />
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <OrderSummarySection order={mapped} isVatPayer={isVatPayer} />
      </div>

      {hasShipping && <ShippingSection order={mapped} onRefresh={refresh} />}

      {isCancelled && (
        <StornoSection
          stornoAt={mapped.stornoAt}
          stornoBy={mapped.stornoBy}
          stornoReason={mapped.stornoReason}
        />
      )}

      <OrderItemsSection order={mapped} isVatPayer={isVatPayer} />
    </ERPDetailPageLayout>
  )
}
