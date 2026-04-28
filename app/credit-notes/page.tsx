'use client'

import { useMemo } from 'react'
import { FileText } from 'lucide-react'
import {
  EntityPage, LoadingState, ErrorState,
  LinkedDocumentBanner, DetailActionFooter, CustomerOrderDetail,
} from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useCreditNotes, useCreditNoteActions, createCreditNoteColumns, mapCreditNoteToOrderDetail,
} from '@/features/credit-notes'

export const dynamic = 'force-dynamic'

export default function CreditNotesPage() {
  const { isVatPayer }   = useCompanySettings()
  const { ep, filters }  = useCreditNotes()
  const { handleStorno } = useCreditNoteActions(ep.refresh)

  const customerSuggestions = useMemo(() => {
    const names = ep.rows.map(r => r.customerName || r.customer?.name || '').filter(Boolean)
    return [...new Set(names)].sort() as string[]
  }, [ep.rows])

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Dobropisy"
        icon={FileText}
        color="purple"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      <EntityPage.Table
        columns={createCreditNoteColumns(filters, customerSuggestions)}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        onClearFilters={filters.clear}
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={cn => {
          const links = [
            { label: 'Faktura',    value: cn.invoiceNumber,               href: `/invoices/issued?highlight=${cn.issuedInvoiceId}` },
            ...(cn.customerOrderId
              ? [{ label: 'Objednávka', value: cn.customerOrderNumber || 'Zobrazit', href: `/customer-orders?highlight=${cn.customerOrderId}` }]
              : []),
            ...(!cn.customerOrderId && cn.transactionId
              ? [{ label: 'Transakce', value: cn.transactionCode || 'Zobrazit', href: `/transactions?highlight=${cn.transactionId}` }]
              : []),
          ]
          return (
            <>
              <LinkedDocumentBanner links={links} color="purple" />
              <CustomerOrderDetail order={mapCreditNoteToOrderDetail(cn)} isVatPayer={isVatPayer} />
              <DetailActionFooter
                showStorno={cn.status !== 'storno'}
                onStorno={() => handleStorno(cn)}
                stornoLabel="Stornovat"
              />
            </>
          )
        }}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
