'use client'

import { useState } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState, CustomerOrderDetail, ActionsDropdown } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useIssuedInvoices, useCreditNotes, useInvoiceActions,
  CreditNotesList, CreditNoteModal, InvoiceActions,
  mapInvoiceToOrderDetail, createInvoiceColumns,
} from '@/features/issued-invoices'
import type { IssuedInvoice, CreditNoteFormItem } from '@/features/issued-invoices'

export const dynamic = 'force-dynamic'

export default function IssuedInvoicesPage() {
  const { ep, filters }    = useIssuedInvoices()
  const { isVatPayer }     = useCompanySettings()
  const { creditNotesMap, loadCreditNotes, submitCreditNote } = useCreditNotes(ep.expanded, ep.highlightId)
  const { handleStorno, handlePrintPDF }                      = useInvoiceActions(ep.refresh)

  const [creditNoteInvoice, setCreditNoteInvoice] = useState<IssuedInvoice | null>(null)

  const columns = createInvoiceColumns(filters)

  async function handleSubmitCreditNote(items: CreditNoteFormItem[], reason: string, note: string) {
    if (!creditNoteInvoice) return
    try {
      const number = await submitCreditNote(creditNoteInvoice, items, reason, note)
      alert(`Dobropis ${number} byl úspěšně vytvořen!`)
      setCreditNoteInvoice(null)
    } catch (e) {
      alert(e instanceof Error ? `Chyba při vytváření dobropisu: ${e.message}` : 'Nepodařilo se vytvořit dobropis')
    }
  }

  function handleToggle(id: string) {
    const expanding = !ep.expanded.has(id)
    ep.toggleExpand(id)
    if (expanding && !creditNotesMap[id]) loadCreditNotes(id)
  }

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <>
      <EntityPage highlightId={ep.highlightId}>
        <EntityPage.Header
          title="Vystavené faktury"
          icon={FileText}
          color="blue"
          total={ep.rows.length}
          filtered={ep.filtered.length}
          onRefresh={ep.refresh}
          actions={
            <ActionsDropdown
              items={[
                { label: 'Obnovit', icon: <RefreshCw className="w-4 h-4" />, onClick: ep.refresh },
              ]}
            />
          }
        />

        <EntityPage.Table
          columns={columns}
          rows={ep.paginated}
          getRowId={r => r.id}
          expanded={ep.expanded}
          onToggle={handleToggle}
          onClearFilters={filters.clear}
          rowClassName={r => {
            if (r.items.length === 0) return 'bg-red-50 border-red-300'
            if (r.status === 'storno') return 'bg-red-50 opacity-70'
            return ''
          }}
          emptyMessage={ep.rows.length === 0 ? 'Žádné vystavené faktury' : 'Žádné faktury odpovídají filtrům'}
          renderDetail={invoice => (
            <>
              <CustomerOrderDetail
                order={mapInvoiceToOrderDetail(invoice)}
                isVatPayer={isVatPayer}
                onRefresh={ep.refresh}
              />
              <CreditNotesList creditNotes={creditNotesMap[invoice.id] || []} />
              <InvoiceActions
                invoice={invoice}
                onPrint={() => handlePrintPDF(invoice)}
                onCreditNote={() => setCreditNoteInvoice(invoice)}
                onStorno={() => handleStorno(invoice)}
              />
            </>
          )}
        />

        <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
      </EntityPage>

      {creditNoteInvoice && (
        <CreditNoteModal
          invoice={creditNoteInvoice}
          onSubmit={handleSubmitCreditNote}
          onClose={() => setCreditNoteInvoice(null)}
        />
      )}
    </>
  )
}
