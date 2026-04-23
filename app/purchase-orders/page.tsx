'use client'

import { Package } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState, SupplierOrderDetail } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  usePurchaseOrders, usePurchaseOrderActions, purchaseOrderColumns,
  CreatePurchaseOrderForm, mapPurchaseOrderToSupplierDetail,
} from '@/features/purchase-orders'

export const dynamic = 'force-dynamic'

export default function PurchaseOrdersPage() {
  const { ep, filters, suppliers, products } = usePurchaseOrders()
  const { isVatPayer }                        = useCompanySettings()
  const { handleDownloadPDF }                 = usePurchaseOrderActions(ep.rows)

  const columns = purchaseOrderColumns(suppliers, isVatPayer)

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Objednávky vydané"
        icon={Package}
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
          <CreatePurchaseOrderForm
            suppliers={suppliers}
            products={products}
            isVatPayer={isVatPayer}
            onSuccess={ep.refresh}
          />
        }
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={order => (
          <div className="mt-3">
            <SupplierOrderDetail
              order={mapPurchaseOrderToSupplierDetail(order)}
              isVatPayer={isVatPayer}
              onPrintPdf={() => handleDownloadPDF(order.id)}
              onRefresh={ep.refresh}
            />
          </div>
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
