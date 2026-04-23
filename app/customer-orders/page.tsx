'use client'

import { ShoppingCart } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState, CustomerOrderDetail } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useCustomerOrders, useCustomerOrderActions,
  customerOrderColumns, mapCustomerOrderToOrderDetail,
  CreateCustomerOrderForm,
} from '@/features/customer-orders'

export const dynamic = 'force-dynamic'

export default function CustomerOrdersPage() {
  const { ep, filters, customers, products } = useCustomerOrders()
  const { isVatPayer }                        = useCompanySettings()
  const { handleMarkPaid, handleUpdateStatus, handlePrintPDF } = useCustomerOrderActions(ep.refresh)

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  const columns = customerOrderColumns(handleMarkPaid)

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Vystavené objednávky"
        icon={ShoppingCart}
        color="blue"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      {filters.bar('auto 1fr 1fr 1fr 1fr 1fr 1fr 1fr')}

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        firstHeader={
          <CreateCustomerOrderForm
            customers={customers}
            products={products}
            isVatPayer={isVatPayer}
            onSuccess={ep.refresh}
          />
        }
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={order => (
          <CustomerOrderDetail
            order={mapCustomerOrderToOrderDetail(order)}
            isVatPayer={isVatPayer}
            orderHref={`/customer-orders?highlight=${order.id}`}
            onPrintPdf={() => handlePrintPDF(order)}
            onUpdateStatus={status => handleUpdateStatus(order.id, status)}
            onRefresh={ep.refresh}
          />
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
