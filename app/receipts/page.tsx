'use client'

import { useMemo } from 'react'
import { Package, FileDown, XCircle } from 'lucide-react'
import Button from '@/components/ui/Button'
import { EntityPage, LoadingState, ErrorState, ActionToolbar, SupplierOrderDetail } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import { ExpectedOrdersButton } from '@/components/warehouse/expected/ExpectedOrdersButton'
import { useToast } from '@/components/warehouse/shared/useToast'
import { Toast } from '@/components/warehouse/shared/Toast'
import {
  useReceipts, useReceiptActions, useReceiptProcessing,
  createReceiptColumns, ProcessReceiptModal, mapReceiptToSupplierDetail,
} from '@/features/receipts'

export const dynamic = 'force-dynamic'

export default function ReceiptsPage() {
  const { isVatPayer }    = useCompanySettings()
  const { toast, showToast } = useToast()
  const { ep, filters }   = useReceipts()
  const actions    = useReceiptActions(isVatPayer, showToast, ep.refresh)
  const processing = useReceiptProcessing(showToast, ep.refresh)

  const supplierSuggestions = useMemo(() => {
    const names = ep.rows.map(r =>
      r.purchaseOrder?.supplier?.name || r.supplier?.name || r.supplierName || ''
    ).filter(Boolean)
    return [...new Set(names)].sort() as string[]
  }, [ep.rows])

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Příjemky"
        icon={Package}
        color="amber"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      <EntityPage.Table
        columns={createReceiptColumns(filters, isVatPayer, supplierSuggestions)}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        firstHeader={
          <ExpectedOrdersButton
            orders={processing.pendingOrders.map((o: any) => ({
              id: o.id, orderNumber: o.orderNumber,
              partyName: o.supplier?.name || o.supplierName || '—', orderDate: o.orderDate,
            }))}
            headerLabel="Čeká na naskladnění"
            actionLabel="Naskladnit"
            searchPlaceholder="Hledat číslo obj. nebo dodavatel..."
            autoOpen={processing.pendingOrders.length > 0}
            onAction={processing.handleCreateFromOrder}
          />
        }
        rowClassName={r => r.status === 'storno' || r.status === 'cancelled' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={receipt => (
          <>
            <SupplierOrderDetail
              order={mapReceiptToSupplierDetail(receipt, isVatPayer)}
              isVatPayer={isVatPayer}
              orderHref={receipt.purchaseOrder ? `/purchase-orders?highlight=${receipt.purchaseOrder.id}` : undefined}
              showReceiptsSection={false}
            />
            <ActionToolbar
              right={
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => actions.handleDownloadPDF(receipt)}>
                    <FileDown className="w-4 h-4 mr-1" />Zobrazit PDF
                  </Button>
                  {receipt.status === 'active' && (
                    <Button size="sm" variant="danger" onClick={() => actions.handleStorno(receipt)}>
                      <XCircle className="w-4 h-4 mr-1" />Stornovat
                    </Button>
                  )}
                </div>
              }
            />
          </>
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />

      {processing.showProcessModal && (
        <ProcessReceiptModal
          isVatPayer={isVatPayer}
          processingOrderId={processing.processingOrderId}
          processingReceiptItems={processing.processingReceiptItems}
          receivedQuantities={processing.receivedQuantities}
          setReceivedQuantities={processing.setReceivedQuantities}
          invoiceData={processing.invoiceData}
          setInvoiceData={processing.setInvoiceData}
          processReceiptDate={processing.processReceiptDate}
          setProcessReceiptDate={processing.setProcessReceiptDate}
          hasExistingInvoice={processing.hasExistingInvoice}
          isInvoiceSectionExpanded={processing.isInvoiceSectionExpanded}
          setIsInvoiceSectionExpanded={processing.setIsInvoiceSectionExpanded}
          isProcessing={processing.isProcessing}
          onConfirm={processing.handleConfirmProcess}
          onClose={processing.closeProcessModal}
        />
      )}

      {toast && <Toast toast={toast} />}
    </EntityPage>
  )
}
