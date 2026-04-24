'use client'

import { useRef, useMemo } from 'react'
import { ShoppingCart, Plus } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState, CustomerOrderDetail } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useCustomerOrders, useCustomerOrderActions,
  createCustomerOrderColumns, mapCustomerOrderToOrderDetail,
  CreateCustomerOrderForm,
} from '@/features/customer-orders'

export const dynamic = 'force-dynamic'

export default function CustomerOrdersPage() {
  const { ep, filters, customers, products } = useCustomerOrders()
  const { isVatPayer }                        = useCompanySettings()
  const { handleMarkPaid, handleUpdateStatus, handlePrintPDF } = useCustomerOrderActions(ep.refresh)
  const openCreateRef = useRef<() => void>(() => {})

  const customerSuggestions = useMemo(() => {
    const names = ep.rows.map(r => r.customer?.name || r.customerName || '').filter(Boolean)
    return [...new Set(names)].sort() as string[]
  }, [ep.rows])

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  const columns = createCustomerOrderColumns(filters, handleMarkPaid, customerSuggestions)

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Vystavené objednávky"
        icon={ShoppingCart}
        color="blue"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
        actions={
          <button
            onClick={() => openCreateRef.current()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />Nová objednávka
          </button>
        }
      />

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        onClearFilters={filters.clear}
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

      <CreateCustomerOrderForm
        customers={customers}
        products={products}
        isVatPayer={isVatPayer}
        onSuccess={ep.refresh}
        openRef={openCreateRef}
        hideTrigger
      />
    </EntityPage>
  )
}
