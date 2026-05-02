'use client'

import { useMemo } from 'react'
import { FileText } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useReceivedInvoices, createReceivedInvoiceColumns,
} from '@/features/invoices-received'

export const dynamic = 'force-dynamic'

export default function ReceivedInvoicesPage() {
  const { ep, filters, suppliers } = useReceivedInvoices()
  const { isVatPayer }              = useCompanySettings()

  const supplierSuggestions = useMemo(() => {
    const names = ep.rows.map(r => r.supplierName || r.purchaseOrder?.supplierName || '').filter(Boolean)
    return [...new Set(names)].sort() as string[]
  }, [ep.rows])

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Přijaté faktury"
        icon={FileText}
        color="amber"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      <EntityPage.Table
        columns={createReceivedInvoiceColumns(filters, suppliers, supplierSuggestions)}
        rows={ep.paginated}
        getRowId={r => r.id}
        onClearFilters={filters.clear}
        rowClassName={r =>
          r.isTemporary && r.status !== 'storno' ? 'border-orange-400 bg-orange-50'
          : r.status === 'storno' ? 'bg-red-50 opacity-70'
          : ''
        }
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
