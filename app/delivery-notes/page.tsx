'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Package } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import { ExpectedOrdersButton } from '@/components/erp/widgets/ExpectedOrdersButton'
import { useNavbarMeta } from '@/components/erp/navbar/NavbarMetaContext'
import { useToast } from '@/components/ui/useToast'
import { Toast } from '@/components/ui/Toast'
import {
  useDeliveryNotes, useShipmentProcessing,
  createDeliveryNoteColumns, ProcessShipmentModal,
} from '@/features/delivery-notes'

export const dynamic = 'force-dynamic'

export default function DeliveryNotesPage() {
  const searchParams   = useSearchParams()
  const autoOrderId    = searchParams.get('orderId')
  const autoOpened     = useRef(false)

  const { isVatPayer }    = useCompanySettings()
  const { toast, showToast } = useToast()
  const { ep, filters }   = useDeliveryNotes()
  const processing = useShipmentProcessing(showToast, ep.refresh)
  const { setMeta } = useNavbarMeta()

  const handlePrepareShipmentRef = useRef(processing.handlePrepareShipment)
  handlePrepareShipmentRef.current = processing.handlePrepareShipment

  // Auto-open the fulfillment modal when navigated from Vyskladnit on order detail
  useEffect(() => {
    if (!autoOrderId || autoOpened.current || processing.pendingOrders.length === 0) return
    const found = processing.pendingOrders.find(o => o.id === autoOrderId)
    if (!found) return
    autoOpened.current = true
    handlePrepareShipmentRef.current(autoOrderId)
  }, [autoOrderId, processing.pendingOrders])

  useEffect(() => {
    const orders = processing.pendingOrders.map(o => ({
      id: o.id, orderNumber: o.orderNumber,
      partyName:  o.customer?.name || o.customerName || 'Anonymní zákazník',
      orderDate:  o.orderDate,
      badge:      'Zaplaceno',
      itemCount:  o.items.filter(i => i.productId !== null).length,
      value:      Number(o.totalAmount),
    }))
    setMeta({
      actions: (
        <ExpectedOrdersButton
          orders={orders}
          headerLabel="Čeká na expedici"
          actionLabel="Vyskladnit"
          buttonLabel="Očekávaný výdej"
          align="right"
          searchPlaceholder="Hledat číslo obj. nebo odběratel..."
          autoOpen={processing.pendingOrders.length > 0}
          onAction={id => handlePrepareShipmentRef.current(id)}
        />
      ),
    })
  }, [processing.pendingOrders, setMeta]) // eslint-disable-line react-hooks/exhaustive-deps

  const customerSuggestions = useMemo(() => {
    const names = ep.rows.map(r => r.customer?.name || r.customerName || '').filter(Boolean)
    return [...new Set(names)].sort() as string[]
  }, [ep.rows])

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

      <EntityPage.Table
        columns={createDeliveryNoteColumns(filters, isVatPayer, customerSuggestions)}
        rows={ep.paginated}
        getRowId={r => r.id}
        onClearFilters={filters.clear}
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />

      {processing.showProcessModal && (
        <ProcessShipmentModal
          isVatPayer={isVatPayer}
          isCustomerOrder={processing.pendingOrders.some(o => o.id === processing.processingNoteId)}
          processingOrder={processing.pendingOrders.find(o => o.id === processing.processingNoteId) ?? null}
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
