'use client'

import { RefreshCw } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState, CustomerOrderDetail } from '@/components/erp'
import { useCompanySettings } from '@/components/erp/hooks/useCompanySettings'
import {
  useTransactions, useTransactionActions,
  createTransactionColumns, SyncDropdown, SumUpReceiptLink,
  mapTransactionToOrderDetail,
} from '@/features/transactions'

export const dynamic = 'force-dynamic'

export default function TransactionsPage() {
  const { ep, filters }                        = useTransactions()
  const { isVatPayer }                         = useCompanySettings()
  const { syncing, handleSync, handlePrintPDF } = useTransactionActions(ep.refresh)

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Sumup objednávky"
        icon={RefreshCw}
        color="emerald"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        actions={<SyncDropdown syncing={syncing} onSync={handleSync} />}
      />

      <EntityPage.Table
        columns={createTransactionColumns(filters)}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        onClearFilters={filters.clear}
        rowClassName={r => {
          if (r.items.length === 0) return 'bg-red-100 border-red-500'
          if (r.status === 'storno') return 'bg-red-50 opacity-70'
          return ''
        }}
        emptyMessage={ep.rows.length === 0
          ? 'Žádné faktury. Synchronizuj transakce ze SumUp API.'
          : 'Žádné faktury odpovídají zvoleným filtrům.'}
        renderDetail={tx => (
          <>
            <SumUpReceiptLink receiptId={tx.receiptId} />
            <CustomerOrderDetail
              order={mapTransactionToOrderDetail(tx)}
              isVatPayer={isVatPayer}
              onPrintPdf={tx.transactionCode.match(/^\d{7}$/) ? () => handlePrintPDF(tx) : undefined}
            />
          </>
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
