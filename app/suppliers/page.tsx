'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Building2, Edit2, Trash2 } from 'lucide-react'
import {
  useEntityPage, useFilters, EntityPage, LoadingState, ErrorState,
  PartySection, ActionToolbar,
} from '@/components/erp'
import type { ColumnDef } from '@/components/erp'
import { CreateOrderPopup } from '@/components/warehouse/create/CreateOrderPopup'
import { EntityOrdersButton, type EntityOrder } from '@/components/warehouse/entity/EntityOrdersButton'

export const dynamic = 'force-dynamic'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
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

function SupplierOrdersFetcher({ supplierId, onAction }: { supplierId: string; onAction: (id: string) => void }) {
  const [orders, setOrders] = useState<EntityOrder[]>([])
  useEffect(() => {
    fetch(`/api/purchase-orders?supplierId=${supplierId}`)
      .then(r => r.json())
      .then((data: Array<{ id: string; orderNumber: string; orderDate: string; status: string; totalAmount?: number }>) =>
        setOrders(data.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderDate: o.orderDate, status: o.status, totalAmount: o.totalAmount })))
      )
      .catch(() => {})
  }, [supplierId])
  return <EntityOrdersButton entityType="supplier" entityId={supplierId} orders={orders} onAction={onAction} />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const highlightId = useSearchParams().get('highlight')
  const router      = useRouter()

  const [showForm,        setShowForm]        = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData,        setFormData]        = useState({ ...emptyForm })

  const resetPage = useRef<() => void>(() => {})

  const filters = useFilters<Supplier>([
    { key: 'name',    type: 'text', placeholder: 'Název...',    match: (r, v) => r.name.toLowerCase().includes(v.toLowerCase()) },
    { key: 'contact', type: 'text', placeholder: 'Kontakt...',  match: (r, v) => (r.contact  || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'email',   type: 'text', placeholder: 'Email...',    match: (r, v) => (r.email    || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'phone',   type: 'text', placeholder: 'Telefon...',  match: (r, v) => (r.phone    || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'website', type: 'text', placeholder: 'Web...',      match: (r, v) => (r.website  || '').toLowerCase().includes(v.toLowerCase()) },
  ], () => resetPage.current())

  const ep = useEntityPage<Supplier>({
    fetchData: () => fetch('/api/suppliers').then(r => r.json()),
    getRowId:  r => r.id,
    filterFn:  filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleOpenNew() {
    setEditingSupplier(null)
    setFormData({ ...emptyForm })
    setShowForm(true)
  }

  function handleEdit(supplier: Supplier) {
    setEditingSupplier(supplier)
    setFormData({
      name:        supplier.name,
      entityType:  supplier.entityType  || 'company',
      contact:     supplier.contact     || '',
      email:       supplier.email       || '',
      phone:       supplier.phone       || '',
      ico:         supplier.ico         || '',
      dic:         supplier.dic         || '',
      bankAccount: supplier.bankAccount || '',
      website:     supplier.website     || '',
      address:     supplier.address     || '',
      note:        supplier.note        || '',
    })
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditingSupplier(null)
    setFormData({ ...emptyForm })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingSupplier) {
        const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) { alert('Nepodařilo se upravit dodavatele'); return }
      } else {
        const res = await fetch('/api/suppliers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) { alert('Nepodařilo se přidat dodavatele'); return }
      }
      await ep.refresh()
      handleClose()
    } catch {
      alert('Nepodařilo se uložit dodavatele')
    }
  }

  async function handleDelete(supplier: Supplier) {
    if (!confirm(`Opravdu chceš smazat dodavatele "${supplier.name}"?`)) return
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, { method: 'DELETE' })
      if (res.ok) await ep.refresh()
      else alert('Nepodařilo se smazat dodavatele')
    } catch {
      alert('Nepodařilo se smazat dodavatele')
    }
  }

  // ─── Columns ────────────────────────────────────────────────────────────────

  const columns: ColumnDef<Supplier>[] = [
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
        title="Dodavatelé"
        icon={Building2}
        color="emerald"
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
            title={editingSupplier ? 'Upravit dodavatele' : 'Nový dodavatel'}
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
                      {formData.entityType === 'individual' ? 'Jméno a příjmení' : 'Název dodavatele'} *
                    </label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder={formData.entityType === 'individual' ? 'Jan Novák' : 'Dodavatel s.r.o.'} required />
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
                    <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="info@dodavatel.cz" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                    <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+420 123 456 789" />
                  </div>
                  {formData.entityType === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
                      <Input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://www.dodavatel.cz" />
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
                <Button type="submit">{editingSupplier ? 'Uložit změny' : 'Přidat dodavatele'}</Button>
              </div>
            </form>
          </CreateOrderPopup>
        }
        renderDetail={supplier => (
          <>
            <PartySection
              title="Detail dodavatele"
              icon={Building2}
              party={{
                name:        supplier.name,
                entityType:  supplier.entityType,
                contact:     supplier.contact,
                address:     supplier.address,
                phone:       supplier.phone,
                ico:         supplier.ico,
                dic:         supplier.dic,
                email:       supplier.email,
                website:     supplier.website,
                bankAccount: supplier.bankAccount,
                note:        supplier.note,
              }}
            />
            <ActionToolbar
              right={
                <>
                  <SupplierOrdersFetcher
                    supplierId={supplier.id}
                    onAction={id => router.push(`/purchase-orders?highlight=${id}`)}
                  />
                  <button
                    onClick={e => { e.stopPropagation(); handleEdit(supplier) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Upravit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(supplier) }}
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
