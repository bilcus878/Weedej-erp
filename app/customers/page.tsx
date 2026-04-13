// Stránka pro správu odběratelů (/customers)
// Přidat, upravit, smazat odběratele

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronRight, Users } from 'lucide-react'

interface Customer {
  id: string
  name: string
  entityType?: string // "company" nebo "individual"
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

export default function CustomersPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(highlightId ? new Set([highlightId]) : new Set())

  // Paginace
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Filtry
  const [filterName, setFilterName] = useState('')
  const [filterContact, setFilterContact] = useState('')
  const [filterEmail, setFilterEmail] = useState('')
  const [filterPhone, setFilterPhone] = useState('')
  const [filterWeb, setFilterWeb] = useState('')

  // Formulář
  const [formData, setFormData] = useState({
    name: '',
    entityType: 'company',
    contact: '',
    email: '',
    phone: '',
    ico: '',
    dic: '',
    bankAccount: '',
    website: '',
    address: '',
    note: '',
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  // Highlight paginace - když přijdeme z odkazu s highlight parametrem
  useEffect(() => {
    if (highlightId && filteredCustomers.length > 0) {
      const index = filteredCustomers.findIndex(item => item.id === highlightId)

      if (index !== -1) {
        const pageNumber = Math.floor(index / itemsPerPage) + 1
        setCurrentPage(pageNumber)

        setExpandedCustomers(new Set([highlightId]))

        setTimeout(() => {
          const element = document.getElementById(`customer-${highlightId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [highlightId, filteredCustomers, itemsPerPage])

  // Filtrování
  useEffect(() => {
    let filtered = customers

    // Filtr podle názvu
    if (filterName) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(filterName.toLowerCase())
      )
    }

    // Filtr podle kontaktní osoby
    if (filterContact) {
      filtered = filtered.filter(c =>
        (c.contact || '').toLowerCase().includes(filterContact.toLowerCase())
      )
    }

    // Filtr podle emailu
    if (filterEmail) {
      filtered = filtered.filter(c =>
        (c.email || '').toLowerCase().includes(filterEmail.toLowerCase())
      )
    }

    // Filtr podle telefonu
    if (filterPhone) {
      filtered = filtered.filter(c =>
        (c.phone || '').toLowerCase().includes(filterPhone.toLowerCase())
      )
    }

    // Filtr podle webu
    if (filterWeb) {
      filtered = filtered.filter(c =>
        (c.website || '').toLowerCase().includes(filterWeb.toLowerCase())
      )
    }

    setFilteredCustomers(filtered)
    setCurrentPage(1) // Reset stránky při změně filtrů
  }, [customers, filterName, filterContact, filterEmail, filterPhone, filterWeb])

  async function fetchCustomers() {
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()
      setCustomers(data)
    } catch (error) {
      console.error('Chyba při načítání odběratelů:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(customerId: string) {
    const newExpanded = new Set(expandedCustomers)
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId)
    } else {
      newExpanded.add(customerId)
    }
    setExpandedCustomers(newExpanded)
  }

  // Otevřít formulář pro přidání
  function handleAdd() {
    setEditingCustomer(null)
    setFormData({
      name: '',
      entityType: 'company',
      contact: '',
      email: '',
      phone: '',
      ico: '',
      dic: '',
      bankAccount: '',
      website: '',
      address: '',
      note: '',
    })
    setShowForm(true)
  }

  // Otevřít formulář pro úpravu
  function handleEdit(customer: Customer) {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      entityType: customer.entityType || 'company',
      contact: customer.contact || '',
      email: customer.email || '',
      phone: customer.phone || '',
      ico: customer.ico || '',
      dic: customer.dic || '',
      bankAccount: customer.bankAccount || '',
      website: customer.website || '',
      address: customer.address || '',
      note: customer.note || '',
    })
    setShowForm(true)
    // Scroll nahoru k formuláři
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Zrušit formulář
  function handleCancel() {
    setShowForm(false)
    setEditingCustomer(null)
    setFormData({
      name: '',
      entityType: 'company',
      contact: '',
      email: '',
      phone: '',
      ico: '',
      dic: '',
      bankAccount: '',
      website: '',
      address: '',
      note: '',
    })
  }

  // Odeslat formulář (přidat nebo upravit)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      if (editingCustomer) {
        // Upravit existujícího odběratele
        const response = await fetch(`/api/customers/${editingCustomer.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (response.ok) {
          alert('Odběratel úspěšně upraven!')
        } else {
          alert('Nepodařilo se upravit odběratele')
        }
      } else {
        // Přidat nového odběratele
        const response = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (response.ok) {
          alert('Odběratel úspěšně přidán!')
        } else {
          alert('Nepodařilo se přidat odběratele')
        }
      }

      // Znovu načti odběratele
      await fetchCustomers()
      handleCancel()
    } catch (error) {
      console.error('Chyba při ukládání odběratele:', error)
      alert('Nepodařilo se uložit odběratele')
    }
  }

  // Smazat odběratele
  async function handleDelete(customer: Customer) {
    if (!confirm(`Opravdu chceš smazat odběratele "${customer.name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Odběratel smazán!')
        await fetchCustomers()
      } else {
        alert('Nepodařilo se smazat odběratele')
      }
    } catch (error) {
      console.error('Chyba při mazání odběratele:', error)
      alert('Nepodařilo se smazat odběratele')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Načítání...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hlavička */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-l-4 border-blue-500 rounded-lg shadow-sm py-4 px-6 mb-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-600">
            Odběratelé
            <span className="text-sm font-normal text-gray-600 ml-3">
              (Zobrazeno <span className="font-semibold text-blue-600">{filteredCustomers.length}</span> z <span className="font-semibold text-gray-700">{customers.length}</span>)
            </span>
          </h1>
        </div>
      </div>

      {/* Formulář pro přidání/úpravu odběratele */}
      <Card className="mb-6 border-2 border-blue-300 bg-blue-50 shadow-lg">
        <CardHeader
          className="cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => {
            if (!showForm) {
              handleAdd()
            } else if (!editingCustomer) {
              setShowForm(false)
            }
          }}
        >
          <div className="flex items-center gap-2">
            {showForm ? (
              <ChevronDown className="h-6 w-6 text-blue-600" />
            ) : (
              <ChevronRight className="h-6 w-6 text-blue-600" />
            )}
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {editingCustomer ? 'Upravit odběratele' : 'Nový odběratel'}
            </CardTitle>
          </div>
        </CardHeader>

        {showForm && (
          <CardContent className="p-6 bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Karta: Základní údaje */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-l-4 border-purple-500 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Základní údaje
                <span className="text-red-500 text-sm">*</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Přepínač Firma / Fyzická osoba */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Typ subjektu *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="entityType"
                        value="company"
                        checked={formData.entityType === 'company'}
                        onChange={(e) => setFormData({ ...formData, entityType: e.target.value })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">🏢 Firma</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="entityType"
                        value="individual"
                        checked={formData.entityType === 'individual'}
                        onChange={(e) => setFormData({ ...formData, entityType: e.target.value })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">👤 Fyzická osoba</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.entityType === 'individual' ? 'Jméno a příjmení *' : 'Název odběratele *'}
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={formData.entityType === 'individual' ? 'Jan Novák' : 'Odběratel s.r.o.'}
                    className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    required
                  />
                </div>
                {formData.entityType === 'company' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kontaktní osoba</label>
                    <Input
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="Jan Novák"
                      className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Karta: Kontaktní údaje */}
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
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@odberatel.cz"
                    className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+420 123 456 789"
                    className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                </div>
                {formData.entityType === 'company' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Web</label>
                    <Input
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://www.odberatel.cz"
                      className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adresa *</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ulice 123, 110 00 Praha 1"
                    className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Karta: Finanční údaje */}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">IČO (Identifikační číslo)</label>
                    <Input
                      value={formData.ico}
                      onChange={(e) => setFormData({ ...formData, ico: e.target.value })}
                      placeholder="12345678"
                      className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                    />
                  </div>
                )}
                {formData.entityType === 'company' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">DIČ (Daňové identifikační číslo)</label>
                    <Input
                      value={formData.dic}
                      onChange={(e) => setFormData({ ...formData, dic: e.target.value })}
                      placeholder="CZ12345678"
                      className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                    />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Číslo účtu</label>
                  <Input
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    placeholder="123456789/0100"
                    className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                  />
                </div>
              </div>
            </div>

            {/* Karta: Poznámka */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-5 border-l-4 border-amber-500 shadow-sm">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Poznámka
              </h3>
              <Input
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Volitelná poznámka k odběrateli..."
                className="bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Zrušit
              </Button>
              <Button type="submit">
                {editingCustomer ? 'Uložit změny' : 'Přidat odběratele'}
              </Button>
            </div>
          </form>
          </CardContent>
        )}
      </Card>

      {/* Seznam odběratelů */}
      <div ref={sectionRef} className="space-y-2">
        {customers.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-gray-500 mb-4">Zatím nemáš žádné odběratele</p>
            <p className="text-sm text-gray-400">Klikni na modrý panel nahoře pro přidání prvního odběratele</p>
          </div>
        ) : (
          <>
            {/* Filtrační řádek */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
              {/* Tlačítko pro vymazání filtrů */}
              <button
                onClick={() => {
                  setFilterName('')
                  setFilterContact('')
                  setFilterEmail('')
                  setFilterPhone('')
                  setFilterWeb('')
                }}
                className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center"
                title="Vymazat filtry"
              >
                ✕
              </button>

              {/* Textový input - Název */}
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Název..."
                className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center placeholder:text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />

              {/* Textový input - Kontaktní osoba */}
              <input
                type="text"
                value={filterContact}
                onChange={(e) => setFilterContact(e.target.value)}
                placeholder="Kontakt..."
                className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center placeholder:text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />

              {/* Textový input - Email */}
              <input
                type="text"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                placeholder="Email..."
                className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center placeholder:text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />

              {/* Textový input - Telefon */}
              <input
                type="text"
                value={filterPhone}
                onChange={(e) => setFilterPhone(e.target.value)}
                placeholder="Telefon..."
                className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center placeholder:text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />

              {/* Textový input - Web */}
              <input
                type="text"
                value={filterWeb}
                onChange={(e) => setFilterWeb(e.target.value)}
                placeholder="Web..."
                className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center placeholder:text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Hlavička tabulky */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-700">
              <div className="w-8"></div>
              <div className="text-center">Název</div>
              <div className="text-center">Kontaktní osoba</div>
              <div className="text-center">Email</div>
              <div className="text-center">Telefon</div>
              <div className="text-center">Web</div>
            </div>

            {filteredCustomers
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((customer) => {
                const isExpanded = expandedCustomers.has(customer.id)

                return (
                  <div
                    key={customer.id}
                    id={`customer-${customer.id}`}
                    className={`border rounded-lg ${
                      highlightId === customer.id ? 'ring-2 ring-blue-500 bg-blue-50' :
                      isExpanded ? 'ring-2 ring-blue-400' : ''
                    }`}
                  >
                    {/* Hlavní řádek */}
                    <div className="p-4 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr] items-center gap-4 transition-colors hover:bg-gray-50">
                      {/* Rozbalit/sbalit */}
                      <button
                        onClick={() => toggleExpand(customer.id)}
                        className="flex-shrink-0 w-8"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      {/* Název */}
                      <div
                        className="cursor-pointer text-center"
                        onClick={() => toggleExpand(customer.id)}
                      >
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {customer.name}
                        </p>
                      </div>

                      {/* Kontaktní osoba */}
                      <div
                        className="cursor-pointer text-center"
                        onClick={() => toggleExpand(customer.id)}
                      >
                        <p className="text-sm text-gray-700 truncate">
                          {customer.contact || '-'}
                        </p>
                      </div>

                      {/* Email */}
                      <div
                        className="cursor-pointer text-center"
                        onClick={() => toggleExpand(customer.id)}
                      >
                        <p className="text-sm text-gray-700 truncate">
                          {customer.email || '-'}
                        </p>
                      </div>

                      {/* Telefon */}
                      <div
                        className="cursor-pointer text-center"
                        onClick={() => toggleExpand(customer.id)}
                      >
                        <p className="text-sm text-gray-700 truncate">
                          {customer.phone || '-'}
                        </p>
                      </div>

                      {/* Web */}
                      <div
                        className="cursor-pointer text-center"
                        onClick={() => toggleExpand(customer.id)}
                      >
                        <p className="text-sm text-gray-700 truncate">
                          {customer.website || '-'}
                        </p>
                      </div>
                    </div>

                    {/* Rozbalený detail */}
                    {isExpanded && (
                      <div className="border-t p-4 bg-gray-50">
                        {/* Sekce Detail o odběrateli - s rámečkem */}
                        <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                          <h4 className="font-semibold px-4 py-3 bg-gray-100 border-b">Detail o odběrateli</h4>
                          <div className="text-sm">
                            {(() => {
                              const entityType = customer.entityType || 'company'

                              return (
                                <>
                                  {/* Název a typ subjektu */}
                                  <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                    <div>
                                      <span className="text-gray-600">Název:</span>
                                      <span className="font-medium ml-2">{customer.name}</span>
                                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                        {entityType === 'company' ? '🏢 Firma' : '👤 FO'}
                                      </span>
                                    </div>
                                    <div className="border-l border-gray-200 mx-4"></div>
                                    {/* Kontaktní osoba pouze pro firmy */}
                                    {entityType === 'company' && (
                                      <div><span className="text-gray-600">Kontaktní osoba:</span> <span className="font-medium">{customer.contact || '-'}</span></div>
                                    )}
                                    {/* Pro FO zobrazíme Email */}
                                    {entityType === 'individual' && (
                                      <div><span className="text-gray-600">Email:</span> <span className="font-medium">{customer.email || '-'}</span></div>
                                    )}
                                  </div>

                                  {/* Adresa a Telefon - vždy */}
                                  <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                    <div><span className="text-gray-600">Adresa:</span> <span className="font-medium">{customer.address || '-'}</span></div>
                                    <div className="border-l border-gray-200 mx-4"></div>
                                    <div><span className="text-gray-600">Telefon:</span> <span className="font-medium">{customer.phone || '-'}</span></div>
                                  </div>

                                  {/* Pro FIRMU: IČO a Email */}
                                  {entityType === 'company' && (
                                    <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                      <div><span className="text-gray-600">IČO:</span> <span className="font-medium">{customer.ico || '-'}</span></div>
                                      <div className="border-l border-gray-200 mx-4"></div>
                                      <div><span className="text-gray-600">Email:</span> <span className="font-medium">{customer.email || '-'}</span></div>
                                    </div>
                                  )}

                                  {/* Pro FIRMU: DIČ a Web */}
                                  {entityType === 'company' && (
                                    <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                      <div><span className="text-gray-600">DIČ:</span> <span className="font-medium">{customer.dic || '-'}</span></div>
                                      <div className="border-l border-gray-200 mx-4"></div>
                                      <div><span className="text-gray-600">Web:</span> <span className="font-medium">{customer.website || '-'}</span></div>
                                    </div>
                                  )}

                                  {/* Bankovní účet a Poznámka - vždy */}
                                  <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                    <div><span className="text-gray-600">Bankovní účet:</span> <span className="font-medium">{customer.bankAccount || '-'}</span></div>
                                    <div className="border-l border-gray-200 mx-4"></div>
                                    <div><span className="text-gray-600">Poznámka:</span> <span className="font-medium">{customer.note || '-'}</span></div>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        </div>

                        {/* Tlačítka akcí - pravý dolní roh, pod sekcí detail */}
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(customer)
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                            title="Upravit"
                          >
                            <Edit2 className="h-4 w-4" />
                            Upravit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(customer)
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                            title="Smazat"
                          >
                            <Trash2 className="h-4 w-4" />
                            Smazat
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

            {/* Stránkování a výběr počtu záznamů */}
            {filteredCustomers.length > 0 && (() => {
              const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
              const pages = []

              // Logika pro zobrazení stránek (max 7 tlačítek)
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i)
                }
              } else {
                pages.push(1)
                if (currentPage <= 3) {
                  pages.push(2, 3, 4)
                  pages.push('...')
                  pages.push(totalPages)
                } else if (currentPage >= totalPages - 2) {
                  pages.push('...')
                  pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
                } else {
                  pages.push('...')
                  pages.push(currentPage - 1, currentPage, currentPage + 1)
                  pages.push('...')
                  pages.push(totalPages)
                }
              }

              const handlePageChange = (newPage: number) => {
                setCurrentPage(newPage)
                setTimeout(() => {
                  if (sectionRef.current) {
                    sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }, 50)
              }

              return (
                <div className="mt-4 flex items-center justify-between">
                  {/* Výběr počtu záznamů na stránku */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Zobrazit:</span>
                    {[10, 20, 50, 100].map(count => (
                      <button
                        key={count}
                        onClick={() => {
                          setItemsPerPage(count)
                          setCurrentPage(1)
                        }}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          itemsPerPage === count
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                    <span className="text-sm text-gray-500 ml-2">
                      ({filteredCustomers.length} celkem)
                    </span>
                  </div>

                  {/* Navigace mezi stránkami */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Předchozí
                      </button>

                      {pages.map((page, index) => {
                        if (page === '...') {
                          return (
                            <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                              ...
                            </span>
                          )
                        }

                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page as number)}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}

                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Další
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}
