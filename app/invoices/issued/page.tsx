'use client'

import { useMemo } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState, ActionsDropdown } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useIssuedInvoices,
  createInvoiceColumns,
} from '@/features/issued-invoices'

export const dynamic = 'force-dynamic'

export default function IssuedInvoicesPage() {
  const { ep, filters } = useIssuedInvoices()
  const { isVatPayer }  = useCompanySettings()

  const customerSuggestions = useMemo(() => {
    const names = ep.rows.map(r => r.customer?.name || r.customerName || '').filter(Boolean)
    return [...new Set(names)].sort() as string[]
  }, [ep.rows])

  const columns = createInvoiceColumns(filters, customerSuggestions)

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
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
        onClearFilters={filters.clear}
        rowClassName={r => {
          if (r.items.length === 0) return 'bg-red-50 border-red-300'
          if (r.status === 'storno') return 'bg-red-50 opacity-70'
          return ''
        }}
        emptyMessage={ep.rows.length === 0 ? 'Žádné vystavené faktury' : 'Žádné faktury odpovídají filtrům'}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
