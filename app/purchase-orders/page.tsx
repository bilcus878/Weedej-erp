'use client'

import { useMemo } from 'react'
import { Package } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState, SupplierOrderDetail } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  usePurchaseOrders, usePurchaseOrderActions, createPurchaseOrderColumns,
  CreatePurchaseOrderForm, mapPurchaseOrderToSupplierDetail,
} from '@/features/purchase-orders'

export const dynamic = 'force-dynamic'

export default function PurchaseOrdersPage() {
  const { ep, filters, suppliers, products } = usePurchaseOrders()
  const { isVatPayer }                        = useCompanySettings()
  const { handleDownloadPDF }                 = usePurchaseOrderActions(ep.rows)

  const supplierSuggestions = useMemo(() => {
    const names = ep.rows.map(r => r.supplier?.name || r.supplierName || '').filter(Boolean)
    return [...new Set(names)].sort() as string[]
  }, [ep.rows])

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

      <EntityPage.Table
        columns={createPurchaseOrderColumns(filters, suppliers, isVatPayer, supplierSuggestions)}
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
