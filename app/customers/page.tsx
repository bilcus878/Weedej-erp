'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Users, Edit2, Trash2 } from 'lucide-react'
import {
  useEntityPage, useFilters, EntityPage, LoadingState, ErrorState,
  PartySection, ActionToolbar,
} from '@/components/erp'
import type { ColumnDef } from '@/components/erp'
import { CreateOrderPopup } from '@/components/warehouse/create/CreateOrderPopup'
import { EntityOrdersButton, type EntityOrder } from '@/components/warehouse/entity/EntityOrdersButton'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: string
  name: string
  entityType?: string
  contact?: string
  email?: string
  phone?: string
  ico?: string
  dic?: string
  bankAccount?: string
  website?: string
  address?: string
  note?: string
}

const emptyForm = {
  name: '', entityType: 'company', contact: '', email: '', phone: '',
  ico: '', dic: '', bankAccount: '', website: '', address: '', note: '',
}

// ─── Lazy order fetcher ───────────────────────────────────────────────────────

function CustomerOrdersFetcher({ customerId, onAction }: { customerId: string; onAction: (id: string) => void }) {
  const [orders, setOrders] = useState<EntityOrder[]>([])
  useEffect(() => {
    fetch(`/api/customer-orders?customerId=${customerId}`)
      .then(r => r.json())
      .then((data: Array<{ id: string; orderNumber: string; orderDate: string; status: string; totalAmount?: number }>) =>
        setOrders(data.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderDate: o.orderDate, status: o.status, totalAmount: o.totalAmount })))
      )
      .catch(() => {})
  }, [customerId])
  return <EntityOrdersButton entityType="customer" entityId={customerId} orders={orders} onAction={onAction} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const highlightId = useSearchParams().get('highlight')
  const router      = useRouter()

  const [showForm,        setShowForm]        = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData,        setFormData]        = useState({ ...emptyForm })

  const resetPage = useRef<() => void>(() => {})

  const filters = useFilters<Customer>([
    { key: 'name',    type: 'text', placeholder: 'Název...',    match: (r, v) => r.name.toLowerCase().includes(v.toLowerCase()) },
    { key: 'contact', type: 'text', placeholder: 'Kontakt...',  match: (r, v) => (r.contact  || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'email',   type: 'text', placeholder: 'Email...',    match: (r, v) => (r.email    || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'phone',   type: 'text', placeholder: 'Telefon...',  match: (r, v) => (r.phone    || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'web',     type: 'text', placeholder: 'Web...',      match: (r, v) => (r.website  || '').toLowerCase().includes(v.toLowerCase()) },
  ], () => resetPage.current())

  const ep = useEntityPage<Customer>({
    fetchData: () => fetch('/api/customers').then(r => r.json()),
    getRowId:  r => r.id,
    filterFn:  filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleOpenNew() {
    setEditingCustomer(null)
    setFormData({ ...emptyForm })
    setShowForm(true)
  }

  function handleEdit(customer: Customer) {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name, entityType: customer.entityType || 'company',
      contact: customer.contact || '', email: customer.email || '',
      phone: customer.phone || '', ico: customer.ico || '',
      dic: customer.dic || '', bankAccount: customer.bankAccount || '',
      website: customer.website || '', address: customer.address || '',
      note: customer.note || '',
    })
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditingCustomer(null)
    setFormData({ ...emptyForm })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingCustomer) {
        const res = await fetch(`/api/customers/${editingCustomer.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) { alert('Nepodařilo se upravit odběratele'); return }
      } else {
        const res = await fetch('/api/customers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) { alert('Nepodařilo se přidat odběratele'); return }
      }
      await ep.refresh()
      handleClose()
    } catch {
      alert('Nepodařilo se uložit odběratele')
    }
  }

  async function handleDelete(customer: Customer) {
    if (!confirm(`Opravdu chceš smazat odběratele "${customer.name}"?`)) return
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' })
      if (res.ok) await ep.refresh()
      else alert('Nepodařilo se smazat odběratele')
    } catch {
      alert('Nepodařilo se smazat odběratele')
    }
  }

  // ─── Columns ────────────────────────────────────────────────────────────────

  const columns: ColumnDef<Customer>[] = [
    { key: 'name',    header: 'Název',           render: r => <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p> },
    { key: 'contact', header: 'Kontaktní osoba', render: r => <p className="text-sm text-gray-600 truncate">{r.contact || '–'}</p> },
    { key: 'email',   header: 'Email',           render: r => <p className="text-sm text-gray-600 truncate">{r.email   || '–'}</p> },
    { key: 'phone',   header: 'Telefon',         render: r => <p className="text-sm text-gray-600 truncate">{r.phone   || '–'}</p> },
    { key: 'website', header: 'Web',             render: r => <p className="text-sm text-gray-600 truncate">{r.website || '–'}</p> },
  ]

  // ─── Render ─────────────────────────────────────────────────────────────────

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
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        firstHeader={
          <CreateOrderPopup
            title={editingCustomer ? 'Upravit odběratele' : 'Nový odběratel'}
            open={showForm}
            onOpen={handleOpenNew}
            onClose={handleClose}
          >
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Základní údaje */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-200">
                  <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Základní údaje</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Typ subjektu *</label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="entityType" value="company"
                          checked={formData.entityType === 'company'}
                          onChange={e => setFormData({ ...formData, entityType: e.target.value })} className="w-4 h-4" />
                        <span className="text-sm">🏢 Firma</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="entityType" value="individual"
                          checked={formData.entityType === 'individual'}
                          onChange={e => setFormData({ ...formData, entityType: e.target.value })} className="w-4 h-4" />
                        <span className="text-sm">👤 Fyzická osoba</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.entityType === 'individual' ? 'Jméno a příjmení' : 'Název odběratele'} *
                    </label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder={formData.entityType === 'individual' ? 'Jan Novák' : 'Odběratel s.r.o.'} required />
                  </div>
                  {formData.entityType === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kontaktní osoba</label>
                      <Input value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} placeholder="Jan Novák" />
                    </div>
                  )}
                </div>
              </div>

              {/* Kontaktní údaje */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-200">
                  <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Kontaktní údaje</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="info@odberatel.cz" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                    <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+420 123 456 789" />
                  </div>
                  {formData.entityType === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
                      <Input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://www.odberatel.cz" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresa *</label>
                    <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Ulice 123, 110 00 Praha 1" required />
                  </div>
                </div>
              </div>

              {/* Finanční údaje */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-green-50 px-4 py-2.5 border-b border-green-200">
                  <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide">Finanční údaje</h3>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  {formData.entityType === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IČO</label>
                      <Input value={formData.ico} onChange={e => setFormData({ ...formData, ico: e.target.value })} placeholder="12345678" />
                    </div>
                  )}
                  {formData.entityType === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">DIČ</label>
                      <Input value={formData.dic} onChange={e => setFormData({ ...formData, dic: e.target.value })} placeholder="CZ12345678" />
                    </div>
                  )}
                  <div className={formData.entityType === 'company' ? '' : 'col-span-2'}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Číslo účtu</label>
                    <Input value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} placeholder="123456789/0100" />
                  </div>
                </div>
              </div>

              {/* Poznámka */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200">
                  <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Poznámka</h3>
                </div>
                <div className="p-4">
                  <Input value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder="Volitelná poznámka..." />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={handleClose}>Zrušit</Button>
                <Button type="submit">{editingCustomer ? 'Uložit změny' : 'Přidat odběratele'}</Button>
              </div>
            </form>
          </CreateOrderPopup>
        }
        renderDetail={customer => (
          <>
            <PartySection
              title="Detail odběratele"
              icon={Users}
              party={{
                name:        customer.name,
                entityType:  customer.entityType,
                contact:     customer.contact,
                address:     customer.address,
                phone:       customer.phone,
                ico:         customer.ico,
                dic:         customer.dic,
                email:       customer.email,
                website:     customer.website,
                bankAccount: customer.bankAccount,
                note:        customer.note,
              }}
            />
            <ActionToolbar
              right={
                <>
                  <CustomerOrdersFetcher
                    customerId={customer.id}
                    onAction={id => router.push(`/customer-orders?highlight=${id}`)}
                  />
                  <button
                    onClick={e => { e.stopPropagation(); handleEdit(customer) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Upravit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(customer) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Smazat
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
