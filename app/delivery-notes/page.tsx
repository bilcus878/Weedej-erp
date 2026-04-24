'use client'

import { Package, FileDown, XCircle } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState, ActionToolbar, CustomerOrderDetail } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import { ExpectedOrdersButton } from '@/components/warehouse/expected/ExpectedOrdersButton'
import { useToast } from '@/components/warehouse/shared/useToast'
import { Toast } from '@/components/warehouse/shared/Toast'
import {
  useDeliveryNotes, useDeliveryNoteActions, useShipmentProcessing,
  deliveryNoteColumns, ProcessShipmentModal, mapDeliveryNoteToOrderDetail,
} from '@/features/delivery-notes'

export const dynamic = 'force-dynamic'

export default function DeliveryNotesPage() {
  const { isVatPayer }    = useCompanySettings()
  const { toast, showToast } = useToast()
  const { ep, filters }   = useDeliveryNotes()
  const actions    = useDeliveryNoteActions(ep.rows, isVatPayer, showToast, ep.refresh)
  const processing = useShipmentProcessing(showToast, ep.refresh)

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Výdejky"
        icon={Package}
        color="amber"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      {filters.bar('auto 1fr 1fr 1fr 1fr 1fr 1fr')}

      <EntityPage.Table
        columns={deliveryNoteColumns(isVatPayer)}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        firstHeader={
          <ExpectedOrdersButton
            orders={processing.pendingOrders.map(o => ({
              id: o.id, orderNumber: o.orderNumber,
              partyName: o.customer?.name || o.customerName || 'Anonymní zákazník',
              orderDate: o.orderDate, badge: 'Zaplaceno',
            }))}
            headerLabel="Čeká na expedici"
            actionLabel="Vyskladnit"
            searchPlaceholder="Hledat číslo obj. nebo odběratel..."
            autoOpen={processing.pendingOrders.length > 0}
            onAction={processing.handlePrepareShipment}
          />
        }
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={note => {
          const orderHref = note.customerOrder
            ? `/${note.customerOrder.orderNumber?.startsWith('ESH') ? 'eshop-orders' : 'customer-orders'}?highlight=${note.customerOrder.id}`
            : undefined
          return (
            <>
              <CustomerOrderDetail
                order={mapDeliveryNoteToOrderDetail(note, isVatPayer)}
                isVatPayer={isVatPayer}
                orderHref={orderHref}
                showDeliveryNotes={false}
                disableTrackingEdit={true}
              />
              {note.note && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Poznámka</h4>
                  <div className="px-4 py-3 text-sm text-gray-700 bg-white">{note.note}</div>
                </div>
              )}
              <ActionToolbar
                left={
                  <button onClick={() => actions.handleDownloadPDF(note.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg transition-colors">
                    <FileDown className="w-3.5 h-3.5" />Zobrazit PDF
                  </button>
                }
                right={
                  note.status !== 'storno' ? (
                    <button onClick={() => actions.handleStorno(note.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors">
                      <XCircle className="w-3.5 h-3.5" />Stornovat
                    </button>
                  ) : undefined
                }
              />
            </>
          )
        }}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />

      {processing.showProcessModal && (
        <ProcessShipmentModal
          isVatPayer={isVatPayer}
          isCustomerOrder={processing.pendingOrders.some(o => o.id === processing.processingNoteId)}
          processingNoteItems={processing.processingNoteItems}
          shippedQuantities={processing.shippedQuantities}
          setShippedQuantities={processing.setShippedQuantities}
          processNote={processing.processNote}
          setProcessNote={processing.setProcessNote}
          isProcessing={processing.isProcessing}
          onConfirm={processing.handleConfirmProcess}
          onClose={processing.closeProcessModal}
        />
      )}

      {toast && <Toast toast={toast} />}
    </EntityPage>
  )
}
