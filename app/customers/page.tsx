'use client'

import { useRouter } from 'next/navigation'
import { Users, Edit2, Trash2 } from 'lucide-react'
import { EntityPage, LoadingState, ErrorState, PartySection, ActionToolbar } from '@/components/erp'
import {
  useCustomers, useCustomerForm, customerColumns,
  CustomerFormPopup, CustomerOrdersFetcher,
} from '@/features/customers'

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
      />

      {filters.bar('auto 1fr 1fr 1fr 1fr 1fr')}

      <EntityPage.Table
        columns={customerColumns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        firstHeader={<CustomerFormPopup form={form} />}
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
          </>
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
