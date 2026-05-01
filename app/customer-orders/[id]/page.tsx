'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, RefreshCw } from 'lucide-react'
import { LoadingState } from '@/components/erp'
import { ERPDetailPageLayout } from '@/components/erp/detail'
import { CustomerOrderDetail, DetailActionFooter } from '@/components/erp'
import { useNavbarMeta } from '@/components/erp/navbar/NavbarMetaContext'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useCustomerOrderDetail,
  useCustomerOrderActions,
  CustomerOrderStatusBadge,
  mapCustomerOrderToOrderDetail,
} from '@/features/customer-orders'

export const dynamic = 'force-dynamic'

const BREADCRUMBS = [{ label: 'Objednávky', href: '/customer-orders' }]

export default function CustomerOrderDetailPage({ params }: { params: { id: string } }) {
  const router  = useRouter()
  const { order, loading, error, refresh } = useCustomerOrderDetail(params.id)
  const { isVatPayer }   = useCompanySettings()
  const { handleMarkPaid, handleUpdateStatus, handlePrintPDF } = useCustomerOrderActions(refresh)
  const { setMeta } = useNavbarMeta()

  useEffect(() => {
    if (order) setMeta({ subTitle: order.orderNumber, pageTitleOnClick: () => router.push('/customer-orders') })
  }, [order?.orderNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  const breadcrumbs = order
    ? [...BREADCRUMBS, { label: order.orderNumber }]
    : [...BREADCRUMBS, { label: '...' }]

  if (error === 'not_found') {
    return (
      <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Objednávka nenalezena" notFound />
    )
  }

  if (error) {
    return (
      <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Chyba" error={error} />
    )
  }

  if (loading || !order) {
    return (
      <ERPDetailPageLayout breadcrumbs={breadcrumbs} title="Načítání..." isLoading />
    )
  }

  const mapped              = mapCustomerOrderToOrderDetail(order)
  const isCancelled         = ['cancelled', 'storno'].includes(order.status)
  const hasActiveDeliveryNote = mapped.deliveryNotes?.some(dn => dn.status === 'active') ?? false

  return (
    <ERPDetailPageLayout
      breadcrumbs={breadcrumbs}
      title={order.orderNumber}
      subtitle={mapped.customerName ?? undefined}
      statusBadge={<CustomerOrderStatusBadge status={order.status} />}
      actions={
        <button
          onClick={refresh}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
          title="Obnovit"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      }
    >
      <CustomerOrderDetail
        order={mapped}
        isVatPayer={isVatPayer}
        onRefresh={refresh}
      />

      <DetailActionFooter
        flow="outgoing"
        onPrintPdf={() => handlePrintPDF(order)}
        showInventory={!isCancelled && (order.status === 'paid' || order.status === 'processing') && !hasActiveDeliveryNote}
        showDelivered={!isCancelled && order.status === 'shipped'}
        onDelivered={() => handleUpdateStatus(order.id, 'delivered')}
        extraLeft={
          order.status === 'new' ? (
            <button
              onClick={() => handleMarkPaid(order.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Zaplaceno
            </button>
          ) : undefined
        }
        showStorno={!isCancelled}
        onStorno={() => handleUpdateStatus(order.id, 'cancelled')}
      />
    </ERPDetailPageLayout>
  )
}
