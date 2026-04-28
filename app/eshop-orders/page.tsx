'use client'

import { Globe } from 'lucide-react'
import Button from '@/components/ui/Button'
import { EntityPage, LoadingState, ErrorState, CustomerOrderDetail, DetailActionFooter, EmptyState } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useEshopOrders, useEshopOrderActions,
  createEshopOrderColumns, mapEshopOrderToOrderDetail,
} from '@/features/eshop-orders'

export const dynamic = 'force-dynamic'

export default function EshopOrdersPage() {
  const { ep, filters }                                      = useEshopOrders()
  const { isVatPayer }                                       = useCompanySettings()
  const { processingId, handleUpdateStatus, handlePrintPDF } = useEshopOrderActions(ep.refresh)

  if (ep.loading) return <LoadingState message="Načítání eshop objednávek..." />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  const columns = createEshopOrderColumns(filters, isVatPayer)

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Eshop objednávky"
        icon={Globe}
        color="blue"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        onClearFilters={filters.clear}
        rowClassName={r => ['cancelled', 'storno'].includes(r.status) ? 'opacity-60' : ''}
        empty={
          <EmptyState
            icon={Globe}
            message={ep.rows.length === 0
              ? 'Žádné eshop objednávky. Objednávky se zobrazí automaticky po platbě přes e-shop.'
              : 'Žádné objednávky neodpovídají zvoleným filtrům.'}
            action={ep.rows.length > 0
              ? <Button onClick={filters.clear} variant="secondary" size="sm">Vymazat filtry</Button>
              : undefined}
          />
        }
        renderDetail={rawOrder => {
          const order = mapEshopOrderToOrderDetail(rawOrder)
          const hasActiveDeliveryNote = order.deliveryNotes?.some(dn => dn.status === 'active') ?? false
          const isProcessing = processingId === rawOrder.id
          return (
            <>
              <CustomerOrderDetail
                order={order}
                isVatPayer={isVatPayer}
                onRefresh={ep.refresh}
              />
              <DetailActionFooter
                flow="outgoing"
                onPrintPdf={() => handlePrintPDF(rawOrder)}
                showInventory={(order.status === 'paid' || order.status === 'processing') && !hasActiveDeliveryNote}
                showDelivered={order.status === 'shipped'}
                onDelivered={() => handleUpdateStatus(rawOrder.id, 'delivered')}
                processingStatus={isProcessing}
                showStorno={['paid', 'shipped'].includes(order.status)}
                onStorno={() => {
                  if (confirm(`Opravdu zrušit objednávku ${order.orderNumber}?`)) {
                    handleUpdateStatus(rawOrder.id, 'cancelled')
                  }
                }}
                stornoLabel="Zrušit"
              />
            </>
          )
        }}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
