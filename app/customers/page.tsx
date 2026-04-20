'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Users, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { PartySection, ActionToolbar } from '@/components/erp'
import {
  useEntityPage, EntityPage, FilterInput, LoadingState, ErrorState,
} from '@/components/erp'
import type { ColumnDef } from '@/components/erp'

export const dynamic = 'force-dynamic'

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

export default function CustomersPage() {
  const highlightId = useSearchParams().get('highlight')

  const [showForm,        setShowForm]        = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData,        setFormData]        = useState({ ...emptyForm })

  const ep = useEntityPage<Customer>({
    fetchData: () => fetch('/api/customers').then(r => r.json()),
    getRowId: r => r.id,
    filterFn: (r, f) => {
      if (f.name    && !r.name.toLowerCase().includes(f.name.toLowerCase()))              return false
      if (f.contact && !(r.contact || '').toLowerCase().includes(f.contact.toLowerCase())) return false
      if (f.email   && !(r.email   || '').toLowerCase().includes(f.email.toLowerCase()))   return false
      if (f.phone   && !(r.phone   || '').toLowerCase().includes(f.phone.toLowerCase()))   return false
      if (f.web     && !(r.website || '').toLowerCase().includes(f.web.toLowerCase()))     return false
      return true
    },
    highlightId,
  })

  function handleAdd() {
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancel() {
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
        if (res.ok) alert('Odběratel úspěšně upraven!')
        else alert('Nepodařilo se upravit odběratele')
      } else {
        const res = await fetch('/api/customers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (res.ok) alert('Odběratel úspěšně přidán!')
        else alert('Nepodařilo se přidat odběratele')
      }
      await ep.refresh()
      handleCancel()
    } catch {
      alert('Nepodařilo se uložit odběratele')
    }
  }

  async function handleDelete(customer: Customer) {
    if (!confirm(`Opravdu chceš smazat odběratele "${customer.name}"?`)) return
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' })
      if (res.ok) { alert('Odběratel smazán!'); await ep.refresh() }
      else alert('Nepodařilo se smazat odběratele')
    } catch {
      alert('Nepodařilo se smazat odběratele')
    }
  }

  const columns: ColumnDef<Customer>[] = [
    { key: 'name',    header: 'Název',            render: r => <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p> },
    { key: 'contact', header: 'Kontaktní osoba',  render: r => <p className="text-sm text-gray-700 truncate">{r.contact || '-'}</p> },
    { key: 'email',   header: 'Email',             render: r => <p className="text-sm text-gray-700 truncate">{r.email || '-'}</p> },
    { key: 'phone',   header: 'Telefon',           render: r => <p className="text-sm text-gray-700 truncate">{r.phone || '-'}</p> },
    { key: 'website', header: 'Web',               render: r => <p className="text-sm text-gray-700 truncate">{r.website || '-'}</p> },
  ]

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

      {/* Add/Edit form card */}
      <Card className="border-2 border-blue-300 bg-blue-50 shadow-lg">
        <CardHeader
          className="cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => {
            if (!showForm) handleAdd()
            else if (!editingCustomer) setShowForm(false)
          }}
        >
          <div className="flex items-center gap-2">
            {showForm ? <ChevronDown className="h-6 w-6 text-blue-600" /> : <ChevronRight className="h-6 w-6 text-blue-600" />}
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {editingCustomer ? 'Upravit odběratele' : 'Nový odběratel'}
            </CardTitle>
          </div>
        </CardHeader>

        {showForm && (
          <CardContent className="p-6 bg-white">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-l-4 border-purple-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
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
                      {formData.entityType === 'individual' ? 'Jméno a příjmení *' : 'Název odběratele *'}
                    </label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder={formData.entityType === 'individual' ? 'Jan Novák' : 'Odběratel s.r.o.'} className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400" required />
                  </div>
                  {formData.entityType === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Kontaktní osoba</label>
                      <Input value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} placeholder="Jan Novák" className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400" />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border-l-4 border-blue-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Kontaktní údaje
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="info@odberatel.cz" className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                    <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+420 123 456 789" className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400" />
                  </div>
                  {formData.entityType === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Web</label>
                      <Input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://www.odberatel.cz" className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adresa *</label>
                    <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Ulice 123, 110 00 Praha 1" className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400" required />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border-l-4 border-green-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Finanční údaje
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {formData.entityType === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">IČO</label>
                      <Input value={formData.ico} onChange={e => setFormData({ ...formData, ico: e.target.value })} placeholder="12345678" className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400" />
                    </div>
                  )}
                  {formData.entityType === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">DIČ</label>
                      <Input value={formData.dic} onChange={e => setFormData({ ...formData, dic: e.target.value })} placeholder="CZ12345678" className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400" />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Číslo účtu</label>
                    <Input value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} placeholder="123456789/0100" className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-5 border-l-4 border-amber-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Poznámka
                </h3>
                <Input value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder="Volitelná poznámka k odběrateli..." className="bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400" />
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={handleCancel}>Zrušit</Button>
                <Button type="submit">{editingCustomer ? 'Uložit změny' : 'Přidat odběratele'}</Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      <EntityPage.Filters onClear={ep.clearFilters} columns="auto 1fr 1fr 1fr 1fr 1fr">
        <FilterInput value={ep.filters.name    ?? ''} onChange={v => ep.setFilter('name',    v)} placeholder="Název..." />
        <FilterInput value={ep.filters.contact ?? ''} onChange={v => ep.setFilter('contact', v)} placeholder="Kontakt..." />
        <FilterInput value={ep.filters.email   ?? ''} onChange={v => ep.setFilter('email',   v)} placeholder="Email..." />
        <FilterInput value={ep.filters.phone   ?? ''} onChange={v => ep.setFilter('phone',   v)} placeholder="Telefon..." />
        <FilterInput value={ep.filters.web     ?? ''} onChange={v => ep.setFilter('web',     v)} placeholder="Web..." />
      </EntityPage.Filters>

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
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
