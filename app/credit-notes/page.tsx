'use client'

import { useMemo } from 'react'
import { FileText } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState } from '@/components/erp'
import {
  useCreditNotes, createCreditNoteColumns,
} from '@/features/credit-notes'

export const dynamic = 'force-dynamic'

export default function CreditNotesPage() {
  const { ep, filters } = useCreditNotes()

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
        onClearFilters={filters.clear}
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
