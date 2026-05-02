'use client'

import { useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useCustomerOrders,
  createCustomerOrderColumns,
  CreateCustomerOrderForm,
  CustomerOrderMobileCard,
} from '@/features/customer-orders'

export const dynamic = 'force-dynamic'

export default function CustomerOrdersPage() {
  const router = useRouter()
  const { ep, filters, customers, products } = useCustomerOrders()
  const { isVatPayer }                        = useCompanySettings()
  const openCreateRef = useRef<() => void>(() => {})

  const customerSuggestions = useMemo(() => {
    const names = ep.rows.map(r => r.customer?.name || r.customerName || '').filter(Boolean)
    return [...new Set(names)].sort() as string[]
  }, [ep.rows])

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  const columns = createCustomerOrderColumns(filters, undefined, customerSuggestions)

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
        onClearFilters={filters.clear}
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
        onRowClick={r => router.push(`/customer-orders/${r.id}`)}
        renderMobileCard={r => (
          <CustomerOrderMobileCard
            order={r}
            onClick={() => router.push(`/customer-orders/${r.id}`)}
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
