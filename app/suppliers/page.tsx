'use client'

import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Building2, ChevronDown, ChevronRight, Edit2, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  useEntityPage, useFilters, EntityPage, LoadingState, ErrorState,
  PartySection, ActionToolbar,
} from '@/components/erp'
import type { ColumnDef } from '@/components/erp'

export const dynamic = 'force-dynamic'

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

export default function SuppliersPage() {
  const highlightId = useSearchParams().get('highlight')

  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })

  const resetPage = useRef<() => void>(() => {})

  const filters = useFilters<Supplier>([
    { key: 'name',    type: 'text', placeholder: 'Název...',    match: (r, v) => r.name.toLowerCase().includes(v.toLowerCase()) },
    { key: 'contact', type: 'text', placeholder: 'Kontakt...',  match: (r, v) => (r.contact || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'email',   type: 'text', placeholder: 'Email...',    match: (r, v) => (r.email   || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'phone',   type: 'text', placeholder: 'Telefon...',  match: (r, v) => (r.phone   || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'website', type: 'text', placeholder: 'Web...',      match: (r, v) => (r.website || '').toLowerCase().includes(v.toLowerCase()) },
  ], () => resetPage.current())

  const ep = useEntityPage<Supplier>({
    fetchData: async () => {
      const res = await fetch('/api/suppliers')
      return res.json()
    },
    getRowId: r => r.id,
    filterFn: filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  const columns: ColumnDef<Supplier>[] = [
    { key: 'name',    header: 'Název',           render: r => <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p> },
    { key: 'contact', header: 'Kontaktní osoba', render: r => <p className="text-sm text-gray-700 truncate">{r.contact || '-'}</p> },
    { key: 'email',   header: 'Email',           render: r => <p className="text-sm text-gray-700 truncate">{r.email || '-'}</p> },
    { key: 'phone',   header: 'Telefon',         render: r => <p className="text-sm text-gray-700 truncate">{r.phone || '-'}</p> },
    { key: 'website', header: 'Web',             render: r => <p className="text-sm text-gray-700 truncate">{r.website || '-'}</p> },
  ]

  function handleAdd() {
    setEditingSupplier(null)
    setFormData({ ...emptyForm })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
    setShowForm(false)
    setEditingSupplier(null)
    setFormData({ ...emptyForm })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editingSupplier) {
        const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) alert('Dodavatel úspěšně upraven!')
        else        alert('Nepodařilo se upravit dodavatele')
      } else {
        const res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) alert('Dodavatel úspěšně přidán!')
        else        alert('Nepodařilo se přidat dodavatele')
      }
      await ep.refresh()
      handleCancel()
    } catch {
      alert('Nepodařilo se uložit dodavatele')
    }
  }

  async function handleDelete(supplier: Supplier) {
    if (!confirm(`Opravdu chceš smazat dodavatele "${supplier.name}"?`)) return
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, { method: 'DELETE' })
      if (res.ok) { alert('Dodavatel smazán!'); await ep.refresh() }
      else        alert('Nepodařilo se smazat dodavatele')
    } catch {
      alert('Nepodařilo se smazat dodavatele')
    }
  }

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Dodavatelé"
        icon={Building2}
        color="blue"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      {/* Form card */}
      <Card className="border-2 border-blue-300 bg-blue-50 shadow-lg">
        <CardHeader
          className="cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => {
            if (!showForm) handleAdd()
            else if (!editingSupplier) setShowForm(false)
          }}
        >
          <div className="flex items-center gap-2">
            {showForm
              ? <ChevronDown className="h-6 w-6 text-blue-600" />
              : <ChevronRight className="h-6 w-6 text-blue-600" />
            }
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {editingSupplier ? 'Upravit dodavatele' : 'Nový dodavatel'}
            </CardTitle>
          </div>
        </CardHeader>

        {showForm && (
          <CardContent className="p-6 bg-white">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Základní údaje */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-l-4 border-purple-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  Základní údaje <span className="text-red-500 text-sm">*</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Typ subjektu *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="entityType" value="company" checked={formData.entityType === 'company'} onChange={e => setFormData({ ...formData, entityType: e.target.value })} className="w-4 h-4" />
                        <span className="text-sm">🏢 Firma</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="entityType" value="individual" checked={formData.entityType === 'individual'} onChange={e => setFormData({ ...formData, entityType: e.target.value })} className="w-4 h-4" />
                        <span className="text-sm">👤 Fyzická osoba</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.entityType === 'individual' ? 'Jméno a příjmení *' : 'Název dodavatele *'}
                    </label>
                    <Input
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder={formData.entityType === 'individual' ? 'Jan Novák' : 'Dodavatel s.r.o.'}
                      className="bg-white border-purple-200 focus:border-purple-400"
                      required
                    />
                  </div>
                  {formData.entityType === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Kontaktní osoba</label>
                      <Input value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} placeholder="Jan Novák" className="bg-white border-purple-200 focus:border-purple-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Kontaktní údaje */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border-l-4 border-blue-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Kontaktní údaje</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="info@dodavatel.cz" className="bg-white border-blue-200 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                    <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+420 123 456 789" className="bg-white border-blue-200 focus:border-blue-400" />
                  </div>
                  {formData.entityType === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Web</label>
                      <Input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://www.dodavatel.cz" className="bg-white border-blue-200 focus:border-blue-400" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adresa *</label>
                    <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Ulice 123, 110 00 Praha 1" className="bg-white border-blue-200 focus:border-blue-400" required />
                  </div>
                </div>
              </div>

              {/* Finanční údaje */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border-l-4 border-green-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Finanční údaje</h3>
                <div className="grid grid-cols-2 gap-4">
                  {formData.entityType === 'company' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">IČO</label>
                        <Input value={formData.ico} onChange={e => setFormData({ ...formData, ico: e.target.value })} placeholder="12345678" className="bg-white border-green-200 focus:border-green-400" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">DIČ</label>
                        <Input value={formData.dic} onChange={e => setFormData({ ...formData, dic: e.target.value })} placeholder="CZ12345678" className="bg-white border-green-200 focus:border-green-400" />
                      </div>
                    </>
                  )}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Číslo účtu</label>
                    <Input value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} placeholder="123456789/0100" className="bg-white border-green-200 focus:border-green-400" />
                  </div>
                </div>
              </div>

              {/* Poznámka */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-5 border-l-4 border-amber-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">Poznámka</h3>
                <Input value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder="Volitelná poznámka k dodavateli..." className="bg-white border-amber-200 focus:border-amber-400" />
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={handleCancel}>Zrušit</Button>
                <Button type="submit">{editingSupplier ? 'Uložit změny' : 'Přidat dodavatele'}</Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {filters.bar('auto 1fr 1fr 1fr 1fr 1fr')}

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        renderDetail={supplier => (
          <>
            <PartySection
              title="Detail dodavatele"
              party={{
                name:        supplier.name,
                entityType:  supplier.entityType  || 'company',
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
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Upravit
                  </button>
                  <button
                    onClick={() => handleDelete(supplier)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Smazat
                  </button>
                </div>
              }
            />
          </>
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
