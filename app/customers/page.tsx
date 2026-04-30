'use client'

import { useRouter } from 'next/navigation'
import { Users, Edit2, Plus, Trash2 } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState, PartySection, ActionToolbar } from '@/components/erp'
import {
  useCustomers, useCustomerForm, createCustomerColumns,
  CustomerFormPopup, CustomerOrdersFetcher,
} from '@/features/customers'
import { CustomerCrmPanel } from '@/features/crm'

export const dynamic = 'force-dynamic'

export default function CustomersPage() {
  const router          = useRouter()
  const { ep, filters } = useCustomers()
  const form            = useCustomerForm(ep.refresh)

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Odběratelé"
        icon={Users}
        color="blue"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
        actions={
          <button
            onClick={form.handleOpenNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />Nový odběratel
          </button>
        }
      />

      <EntityPage.Table
        columns={createCustomerColumns(filters)}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        onClearFilters={filters.clear}
        renderDetail={customer => (
          <>
            <PartySection
              title="Detail odběratele"
              icon={Users}
              party={{
                name: customer.name, entityType: customer.entityType,
                contact: customer.contact, address: customer.address,
                phone: customer.phone, ico: customer.ico, dic: customer.dic,
                email: customer.email, website: customer.website,
                bankAccount: customer.bankAccount, note: customer.note,
              }}
            />
            <ActionToolbar
              right={
                <>
                  <CustomerOrdersFetcher
                    customerId={customer.id}
                    onAction={id => router.push(`/customer-orders?highlight=${id}`)}
                  />
                  <button onClick={e => { e.stopPropagation(); form.handleEdit(customer) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    <Edit2 className="h-3.5 w-3.5" />Upravit
                  </button>
                  <button onClick={e => { e.stopPropagation(); form.handleDelete(customer) }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />Smazat
                  </button>
                </>
              }
            />
            <CustomerCrmPanel customerId={customer.id} customerName={customer.name} />
          </>
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />

      <CustomerFormPopup form={form} />
    </EntityPage>
  )
}
