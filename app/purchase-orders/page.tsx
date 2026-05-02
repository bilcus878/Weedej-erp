'use client'

import { useRef, useMemo } from 'react'
import { Package, Plus } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  usePurchaseOrders, createPurchaseOrderColumns,
  CreatePurchaseOrderForm,
} from '@/features/purchase-orders'

export const dynamic = 'force-dynamic'

export default function PurchaseOrdersPage() {
  const { ep, filters, suppliers, products } = usePurchaseOrders()
  const { isVatPayer }                       = useCompanySettings()
  const openCreateRef = useRef<() => void>(() => {})

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
        columns={createPurchaseOrderColumns(filters, suppliers, isVatPayer, supplierSuggestions)}
        rows={ep.paginated}
        getRowId={r => r.id}
        onClearFilters={filters.clear}
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />

      <CreatePurchaseOrderForm
        suppliers={suppliers}
        products={products}
        isVatPayer={isVatPayer}
        onSuccess={ep.refresh}
        openRef={openCreateRef}
        hideTrigger
      />
    </EntityPage>
  )
}
