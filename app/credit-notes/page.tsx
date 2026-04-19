// Stránka dobropisů (/credit-notes)
// Vizuálně kopíruje stránku vystavených faktur

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatPrice, formatQuantity } from '@/lib/utils'
import { ChevronDown, ChevronRight, XCircle, FileText } from 'lucide-react'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import { PageHeader, DetailSection, DetailRow, LinkedDocumentBanner, PartySection, ItemsTable, ActionToolbar } from '@/components/erp'
import type { ErpItem } from '@/components/erp'

export const dynamic = 'force-dynamic'

interface CreditNoteItem {
  id: string
  productName: string | null
  quantity: number
  unit: string
  price: number
  vatRate: number
  vatAmount: number
  priceWithVat: number
}

interface CreditNote {
  id: string
  creditNoteNumber: string
  issuedInvoiceId: string
  invoiceNumber: string
  creditNoteDate: string
  totalAmount: number
  totalAmountWithoutVat: number
  totalVatAmount: number
  reason: string | null
  note: string | null
  status: string
  stornoReason: string | null
  stornoAt: string | null
  customer: {
    id: string
    name: string
    entityType?: string
    ico?: string
    dic?: string
    address?: string
    phone?: string
    email?: string
    contact?: string
    website?: string
    bankAccount?: string
    note?: string
  } | null
  customerName: string | null
  customerEntityType: string | null
  customerEmail: string | null
  customerPhone: string | null
  customerAddress: string | null
  customerIco: string | null
  customerDic: string | null
  items: CreditNoteItem[]
  // Propojení přes fakturu
  customerOrderId: string | null
  customerOrderNumber: string | null
  transactionId: string | null
  transactionCode: string | null
}

export default function CreditNotesPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [isVatPayer, setIsVatPayer] = useState<boolean>(true)

  // Filter state
  const [filteredNotes, setFilteredNotes] = useState<CreditNote[]>([])
  const [filterNumber, setFilterNumber] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterInvoice, setFilterInvoice] = useState('')
  const [filterMinItems, setFilterMinItems] = useState('')
  const [filterMinValue, setFilterMinValue] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStatusDropdownOpen, setFilterStatusDropdownOpen] = useState(false)

  const filterStatusRef = useRef<HTMLDivElement>(null)

  // Paginace
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (highlightId && filteredNotes.length > 0) {
      const index = filteredNotes.findIndex(item => item.id === highlightId)
      if (index !== -1) {
        const pageNumber = Math.floor(index / itemsPerPage) + 1
        setCurrentPage(pageNumber)
        setExpandedNotes(new Set([highlightId]))
        setTimeout(() => {
          const element = document.getElementById(`creditnote-${highlightId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [highlightId, filteredNotes, itemsPerPage])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterStatusRef.current && !filterStatusRef.current.contains(event.target as Node)) {
        setFilterStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter
  useEffect(() => {
    let filtered = [...creditNotes]

    if (filterNumber) {
      filtered = filtered.filter(cn =>
        cn.creditNoteNumber.toLowerCase().includes(filterNumber.toLowerCase())
      )
    }

    if (filterDate) {
      filtered = filtered.filter(cn => {
        const d = new Date(cn.creditNoteDate).toISOString().split('T')[0]
        return d === filterDate
      })
    }

    if (filterCustomer) {
      filtered = filtered.filter(cn => {
        const name = cn.customer?.name || cn.customerName || ''
        return name.toLowerCase().includes(filterCustomer.toLowerCase())
      })
    }

    if (filterInvoice) {
      filtered = filtered.filter(cn =>
        cn.invoiceNumber.toLowerCase().includes(filterInvoice.toLowerCase())
      )
    }

    if (filterMinItems) {
      const minItems = parseInt(filterMinItems)
      filtered = filtered.filter(cn => (cn.items?.length || 0) >= minItems)
    }

    if (filterMinValue) {
      const minVal = parseFloat(filterMinValue)
      filtered = filtered.filter(cn => Math.abs(cn.totalAmount) >= minVal)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(cn => cn.status === filterStatus)
    }

    setFilteredNotes(filtered)
    setCurrentPage(1)
  }, [creditNotes, filterNumber, filterDate, filterCustomer, filterInvoice, filterMinItems, filterMinValue, filterStatus])

  async function fetchData() {
    try {
      const [creditNotesRes, settingsRes] = await Promise.all([
        fetch('/api/credit-notes'),
        fetch('/api/settings'),
      ])
      const creditNotesData = await creditNotesRes.json()
      const settingsData = await settingsRes.json()
      setCreditNotes(creditNotesData)
      setIsVatPayer(settingsData.isVatPayer ?? true)
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleStorno(creditNote: CreditNote) {
    const reason = prompt(`Opravdu chceš stornovat dobropis ${creditNote.creditNoteNumber}?\n\nZadej důvod storna (volitelně):`)

    if (reason === null) return

    try {
      const response = await fetch(`/api/credit-notes/${creditNote.id}/storno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Dobropis byl stornován!`)
        await fetchData()
      } else {
        alert(`Nepodařilo se stornovat dobropis: ${data.error}`)
      }
    } catch (error) {
      console.error('Chyba při stornování dobropisu:', error)
      alert('Nepodařilo se stornovat dobropis')
    }
  }

  function toggleExpand(id: string) {
    const newExpanded = new Set(expandedNotes)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedNotes(newExpanded)
  }

  function getStatusBadge(creditNote: CreditNote) {
    if (creditNote.status === 'storno') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          STORNO
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        Aktivní
      </span>
    )
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
      <PageHeader title="Dobropisy" icon={FileText} color="purple" total={creditNotes.length} filtered={filteredNotes.length} onRefresh={fetchData} />

      {/* Filtry */}
      <div className="mb-4">
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Vymazat filtry */}
          <button
            onClick={() => {
              setFilterNumber('')
              setFilterDate('')
              setFilterCustomer('')
              setFilterInvoice('')
              setFilterMinItems('')
              setFilterMinValue('')
              setFilterStatus('all')
            }}
            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center"
            title="Vymazat filtry"
          >
            ✕
          </button>

          {/* Číslo dobropisu */}
          <input
            type="text"
            value={filterNumber}
            onChange={(e) => setFilterNumber(e.target.value)}
            placeholder="Číslo..."
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Datum */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Odběratel */}
          <input
            type="text"
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            placeholder="Odběratel..."
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Faktura */}
          <input
            type="text"
            value={filterInvoice}
            onChange={(e) => setFilterInvoice(e.target.value)}
            placeholder="Faktura..."
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Položek */}
          <input
            type="number"
            value={filterMinItems}
            onChange={(e) => setFilterMinItems(e.target.value)}
            placeholder="≥"
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Hodnota */}
          <input
            type="number"
            value={filterMinValue}
            onChange={(e) => setFilterMinValue(e.target.value)}
            placeholder="≥"
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Status */}
          <div ref={filterStatusRef} className="relative">
            <div
              onClick={() => setFilterStatusDropdownOpen(!filterStatusDropdownOpen)}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-blue-500 flex items-center justify-center"
            >
              {filterStatus === 'all' && <span>Vše</span>}
              {filterStatus === 'active' && <span className="text-purple-600">Aktivní</span>}
              {filterStatus === 'storno' && <span className="text-red-600">STORNO</span>}
            </div>

            {filterStatusDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
                <div onClick={() => { setFilterStatus('all'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center">Vše</div>
                <div onClick={() => { setFilterStatus('active'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-purple-600">Aktivní</div>
                <div onClick={() => { setFilterStatus('storno'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-red-600">STORNO</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seznam dobropisů */}
      <div ref={sectionRef} className="space-y-2">
        {filteredNotes.length === 0 ? (
          <p className="text-gray-500">
            {creditNotes.length === 0 ? 'Žádné dobropisy' : 'Žádné dobropisy odpovídají filtrům'}
          </p>
        ) : (
          <>
            {/* Hlavička tabulky */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-700">
              <div className="w-8"></div>
              <div className="text-center">Číslo</div>
              <div className="text-center">Datum</div>
              <div className="text-center">Odběratel</div>
              <div className="text-center">Faktura</div>
              <div className="text-center">Položek</div>
              <div className="text-center">Hodnota</div>
              <div className="text-center">Status</div>
            </div>

            {filteredNotes
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((creditNote) => {
              const isExpanded = expandedNotes.has(creditNote.id)

              return (
                <div
                  key={creditNote.id}
                  id={`creditnote-${creditNote.id}`}
                  className={`border rounded-lg ${
                    highlightId === creditNote.id ? 'ring-2 ring-purple-500 bg-purple-50' :
                    isExpanded ? 'ring-2 ring-purple-400' : ''
                  }`}
                >
                  <div className={`p-4 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 transition-colors ${creditNote.status === 'storno' ? 'bg-red-50 opacity-70' : 'hover:bg-gray-50'}`}>
                    {/* Rozbalit/sbalit */}
                    <button
                      onClick={() => toggleExpand(creditNote.id)}
                      className="flex-shrink-0 w-8"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    {/* Číslo */}
                    <div
                      className="cursor-pointer text-center"
                      onClick={() => toggleExpand(creditNote.id)}
                    >
                      <p className={`text-sm font-semibold text-gray-900 truncate ${creditNote.status === 'storno' ? 'line-through' : ''}`}>
                        {creditNote.creditNoteNumber}
                      </p>
                    </div>

                    {/* Datum */}
                    <div
                      className="cursor-pointer text-center"
                      onClick={() => toggleExpand(creditNote.id)}
                    >
                      <p className="text-sm text-gray-700">
                        {new Date(creditNote.creditNoteDate).toLocaleDateString('cs-CZ')}
                      </p>
                    </div>

                    {/* Odběratel */}
                    <div className="text-center">
                      {creditNote.customer && creditNote.customer.id ? (
                        <a
                          href={`/customers?highlight=${creditNote.customer.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {creditNote.customer.name}
                        </a>
                      ) : creditNote.customerName ? (
                        <p className="text-sm text-gray-700 truncate cursor-pointer" onClick={() => toggleExpand(creditNote.id)}>
                          {creditNote.customerName}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic cursor-pointer" onClick={() => toggleExpand(creditNote.id)}>
                          Bez odběratele
                        </p>
                      )}
                    </div>

                    {/* Faktura */}
                    <div className="text-center">
                      <a
                        href={`/invoices/issued?highlight=${creditNote.issuedInvoiceId}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {creditNote.invoiceNumber}
                      </a>
                    </div>

                    {/* Položek */}
                    <div
                      className="cursor-pointer text-center"
                      onClick={() => toggleExpand(creditNote.id)}
                    >
                      <p className="text-sm text-gray-600">
                        {creditNote.items.length}
                      </p>
                    </div>

                    {/* Hodnota */}
                    <div
                      className="cursor-pointer text-center"
                      onClick={() => toggleExpand(creditNote.id)}
                    >
                      <p className="text-sm font-bold text-red-600">
                        {formatPrice(creditNote.totalAmount)}
                      </p>
                    </div>

                    {/* Status */}
                    <div
                      className="cursor-pointer text-center"
                      onClick={() => toggleExpand(creditNote.id)}
                    >
                      {getStatusBadge(creditNote)}
                    </div>
                  </div>

                  {/* Rozbalený detail */}
                  {isExpanded && (
                    <div className="border-t p-4 bg-gray-50 space-y-4">
                      {/* Rozcestník - odkazy na fakturu, objednávku, transakci */}
                      {(() => {
                        const links = [
                          { label: 'Faktura', value: creditNote.invoiceNumber, href: `/invoices/issued?highlight=${creditNote.issuedInvoiceId}` },
                          ...(creditNote.customerOrderId ? [{ label: 'Objednávka', value: creditNote.customerOrderNumber || 'Zobrazit', href: `/customer-orders?highlight=${creditNote.customerOrderId}` }] : []),
                          ...(!creditNote.customerOrderId && creditNote.transactionId ? [{ label: 'Transakce', value: creditNote.transactionCode || 'Zobrazit', href: `/transactions?highlight=${creditNote.transactionId}` }] : []),
                        ]
                        return <LinkedDocumentBanner links={links} color="purple" />
                      })()}

                      {/* Info + Odběratel */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailSection title="Informace o dobropisu" icon={FileText}>
                          <div className="space-y-1.5">
                            <DetailRow label="Datum vystavení" value={new Date(creditNote.creditNoteDate).toLocaleDateString('cs-CZ')} />
                            <DetailRow label="Původní faktura" value={creditNote.invoiceNumber} />
                            <DetailRow label="Důvod" value={creditNote.reason || undefined} />
                            <DetailRow label="Poznámka" value={creditNote.note || undefined} />
                            {creditNote.status === 'storno' && (
                              <>
                                <DetailRow label="Důvod storna" value={<span className="text-red-600">{creditNote.stornoReason || '—'}</span>} />
                                <DetailRow label="Datum storna" value={creditNote.stornoAt ? <span className="text-red-600">{new Date(creditNote.stornoAt).toLocaleDateString('cs-CZ')}</span> : undefined} />
                              </>
                            )}
                          </div>
                        </DetailSection>

                        <PartySection
                          title="Odběratel / Zákazník"
                          party={{
                            name: creditNote.customer?.name || creditNote.customerName || 'Bez odběratele',
                            entityType: creditNote.customer?.entityType || creditNote.customerEntityType || 'company',
                            contact: creditNote.customer?.contact,
                            address: creditNote.customerAddress || creditNote.customer?.address,
                            phone: creditNote.customerPhone || creditNote.customer?.phone,
                            ico: creditNote.customerIco || creditNote.customer?.ico,
                            dic: creditNote.customerDic || creditNote.customer?.dic,
                            email: creditNote.customerEmail || creditNote.customer?.email,
                            website: creditNote.customer?.website,
                            bankAccount: creditNote.customer?.bankAccount,
                            note: creditNote.customer?.note,
                          }}
                        />
                      </div>

                      {/* Položky */}
                      {creditNote.items.length === 0 ? (
                        <p className="text-red-600">Dobropis nemá žádné položky!</p>
                      ) : (
                        <ItemsTable
                          items={creditNote.items.map(item => ({
                            id: item.id,
                            productName: item.productName,
                            quantity: item.quantity,
                            unit: item.unit,
                            price: item.price,
                            vatRate: item.vatRate,
                            vatAmount: item.vatAmount,
                            priceWithVat: item.priceWithVat,
                          }) as ErpItem)}
                          isVatPayer={isVatPayer}
                          showNegative={true}
                          totalAmount={creditNote.totalAmount}
                          formatQty={(qty, unit) => formatQuantity(qty, unit || '')}
                        />
                      )}

                      {creditNote.status !== 'storno' && (
                        <ActionToolbar
                          right={
                            <button
                              onClick={() => handleStorno(creditNote)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Stornovat
                            </button>
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Stránkování */}
            {filteredNotes.length > 0 && (() => {
              const totalPages = Math.ceil(filteredNotes.length / itemsPerPage)
              const pages: (number | string)[] = []

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
                      ({filteredNotes.length} celkem)
                    </span>
                  </div>

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
