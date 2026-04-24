'use client'

import { useRouter } from 'next/navigation'
import { Building2, Edit2, Trash2 } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState, PartySection, ActionToolbar } from '@/components/erp'
import {
  useSuppliers, useSupplierForm, createSupplierColumns,
  SupplierFormPopup, SupplierOrdersFetcher,
} from '@/features/suppliers'

export const dynamic = 'force-dynamic'

export default function SuppliersPage() {
  const router        = useRouter()
  const { ep, filters } = useSuppliers()
  const form          = useSupplierForm(ep.refresh)

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Dodavatelé"
        icon={Building2}
        color="emerald"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      <EntityPage.Table
        columns={createSupplierColumns(filters)}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        firstHeader={<SupplierFormPopup form={form} />}
        renderDetail={supplier => (
          <>
            <PartySection
              title="Detail dodavatele"
              icon={Building2}
              party={{
                name: supplier.name, entityType: supplier.entityType,
                contact: supplier.contact, address: supplier.address,
                phone: supplier.phone, ico: supplier.ico, dic: supplier.dic,
                email: supplier.email, website: supplier.website,
                bankAccount: supplier.bankAccount, note: supplier.note,
              }}
            />
            <ActionToolbar
              right={
                <>
                  <SupplierOrdersFetcher
                    supplierId={supplier.id}
                    onAction={id => router.push(`/purchase-orders?highlight=${id}`)}
                  />
                  <button onClick={e => { e.stopPropagation(); form.handleEdit(supplier) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                    <Edit2 className="h-3.5 w-3.5" />Upravit
                  </button>
                  <button onClick={e => { e.stopPropagation(); form.handleDelete(supplier) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />Smazat
                  </button>
                </>
              }
            />
          </>
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
