'use client'

import Link from 'next/link'
import { RotateCcw } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState } from '@/components/erp'
import {
  useReturns,
  createReturnColumns,
  ReturnStatusBadge,
  ReturnTypeBadge,
} from '@/features/returns'

export const dynamic = 'force-dynamic'

export default function ReturnsPage() {
  const { ep, filters } = useReturns()

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Reklamace"
        icon={RotateCcw}
        color="rose"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      <EntityPage.Table
        columns={createReturnColumns(filters)}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        onClearFilters={filters.clear}
        rowClassName={r =>
          r.status === 'cancelled' ? 'opacity-50' :
          r.status === 'closed'    ? 'opacity-70' : ''
        }
        renderDetail={r => (
          <div className="px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <ReturnStatusBadge status={r.status} />
              <ReturnTypeBadge   type={r.type}   />
              {r.customerEmail && (
                <a href={`mailto:${r.customerEmail}`} className="text-xs text-indigo-600 hover:underline">
                  {r.customerEmail}
                </a>
              )}
              <span className="text-xs text-gray-500">{r.itemCount} položek, {r.approvedItemCount} schváleno</span>
            </div>
            <Link
              href={`/returns/${r.id}`}
              className="self-start text-xs text-violet-600 hover:underline font-medium"
            >
              Otevřít detail &rarr;
            </Link>
          </div>
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
