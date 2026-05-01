'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { LoadingState } from '@/components/erp'
import { ERPDetailPageLayout } from '@/components/erp/detail'
import { useNavbarMeta }       from '@/components/erp/navbar/NavbarMetaContext'
import { useCompanySettings }  from '@/components/erp/hooks/useCompanySettings'
import {
  useCustomerOrderDetail,
  useCustomerOrderActions,
  CustomerOrderStatusBadge,
  mapCustomerOrderToOrderDetail,
  OrderCustomerSection,
  OrderSummarySection,
  OrderShippingSection,
  OrderItemsSection,
  OrderStornoSection,
  OrderActionsCard,
  OrderTimelineCard,
  OrderOverviewCard,
} from '@/features/customer-orders'

export const dynamic = 'force-dynamic'

const BASE_CRUMBS = [{ label: 'Objednávky', href: '/customer-orders' }]

export default function CustomerOrderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
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
  const hasActiveDeliveryNote = mapped.deliveryNotes?.some(dn => dn.status === 'active') ?? false
  const hasShipping           = !!(order.shippingMethod || order.pickupPointId)

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
          <OrderActionsCard
            order={order}
            hasActiveDeliveryNote={hasActiveDeliveryNote}
            onMarkPaid={handleMarkPaid}
            onUpdateStatus={handleUpdateStatus}
            onPrintPDF={handlePrintPDF}
          />
          <OrderTimelineCard order={mapped} />
          <OrderOverviewCard order={mapped} />
        </div>
      }
    >
      {/* Customer info + Order summary — 2 cols on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <OrderCustomerSection order={mapped} />
        <OrderSummarySection  order={mapped} isVatPayer={isVatPayer} />
      </div>

      {/* Shipping — only when the order has delivery data */}
      {hasShipping && (
        <OrderShippingSection order={mapped} onRefresh={refresh} />
      )}

      {/* Storno info — only for cancelled orders */}
      {isCancelled && (
        <OrderStornoSection order={mapped} />
      )}

      {/* Items table */}
      <OrderItemsSection order={mapped} isVatPayer={isVatPayer} />
    </ERPDetailPageLayout>
  )
}
