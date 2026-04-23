'use client'

import { FileText, FileEdit, XCircle } from 'lucide-react'
import InvoiceDetailsModal from '@/components/InvoiceDetailsModal'
import { EntityPage, LoadingState, ErrorState, ActionToolbar, SupplierOrderDetail } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useReceivedInvoices, useReceivedInvoiceActions, receivedInvoiceColumns,
  InvoiceDiscountWidget, mapInvoiceToSupplierDetail, buildModalInitialData,
} from '@/features/invoices-received'

export const dynamic = 'force-dynamic'

export default function ReceivedInvoicesPage() {
  const { ep, filters, suppliers } = useReceivedInvoices()
  const { isVatPayer }              = useCompanySettings()
  const actions = useReceivedInvoiceActions(ep.rows, ep.refresh)

  const columns = receivedInvoiceColumns(suppliers)

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <>
      <EntityPage highlightId={ep.highlightId}>
        <EntityPage.Header
          title="Přijaté faktury"
          icon={FileText}
          color="amber"
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
          rowClassName={r =>
            r.isTemporary && r.status !== 'storno' ? 'border-orange-400 bg-orange-50'
            : r.status === 'storno' ? 'bg-red-50 opacity-70'
            : ''
          }
          renderDetail={inv => (
            <>
              <div className="mt-3">
                <SupplierOrderDetail
                  order={mapInvoiceToSupplierDetail(inv)}
                  isVatPayer={isVatPayer}
                  orderHref={inv.purchaseOrder ? `/purchase-orders?highlight=${inv.purchaseOrder.id}` : undefined}
                  onRefresh={ep.refresh}
                />
              </div>

              {inv.status !== 'storno' && !inv.discountAmount && (inv.purchaseOrder?.items?.length ?? 0) > 0 && (
                <InvoiceDiscountWidget invoice={inv} onApplyDiscount={actions.handleApplyDiscount} />
              )}

              {inv.status !== 'storno' && (
                <ActionToolbar
                  left={
                    <>
                      <button
                        onClick={() => actions.handleOpenDetailsModal(inv)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        Doplnit fakturu
                      </button>
                      {inv.attachmentUrl ? (
                        <a
                          href={inv.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Zobrazit fakturu
                        </a>
                      ) : (
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer">
                          <FileText className="w-3.5 h-3.5" />
                          Nahrát soubor
                          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => actions.handleFileUpload(e, inv.id)} />
                        </label>
                      )}
                    </>
                  }
                  right={
                    <button
                      onClick={() => actions.handleStorno(inv.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Stornovat
                    </button>
                  }
                />
              )}
            </>
          )}
        />

        <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
      </EntityPage>

      <InvoiceDetailsModal
        isOpen={actions.showDetailsModal}
        onClose={actions.handleCloseDetailsModal}
        onSave={actions.handleSaveDetails}
        onSaveAsSupplier={actions.handleSaveAsSupplier}
        initialData={actions.selectedInvoice ? buildModalInitialData(actions.selectedInvoice) : undefined}
        type="received"
      />
    </>
  )
}
