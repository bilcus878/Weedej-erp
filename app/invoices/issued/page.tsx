// Stránka transakcí (/transactions)
// Zobrazení všech transakcí + manuální přidání + kalendář + mazání

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { formatPrice, formatQuantity, formatDateTime } from '@/lib/utils'
import { formatVariantQty } from '@/lib/formatVariantQty'
import { generateInvoicePDF } from '@/lib/generateInvoicePDF'
import { ChevronDown, ChevronRight, Trash2, FileText, ExternalLink, XCircle, FileOutput, Plus, X } from 'lucide-react'
import { isNonVatPayer, NON_VAT_PAYER_RATE, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'

export const dynamic = 'force-dynamic'

interface TransactionItem {
  id: string
  quantity: number
  unit: string
  price: number | null
  vatRate?: number
  vatAmount?: number
  priceWithVat?: number
  productId?: string
  productName?: string
  product: {
    id: string
    name: string
  }
}

interface DeliveryNote {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status?: string
  items?: {
    id: string
    quantity: number
    unit: string
    productName?: string | null
    price?: number | null
    priceWithVat?: number | null
    vatAmount?: number | null
    vatRate?: number | null
    product?: {
      price: number
      vatRate?: number
    }
  }[]
  totalAmount?: number
}

interface Transaction {
  id: string
  transactionCode: string
  totalAmount: number
  paymentType: string
  status: string
  transactionDate: string
  items: TransactionItem[]
  customer?: {
    id: string
    name: string
  } | null
  customerOrderId?: string
  customerOrderNumber?: string
  customerOrderSource?: string
  transactionId?: string
  transactionCode_sumup?: string
  receiptId?: string
  deliveryNotes?: DeliveryNote[]
  _original?: {
    customerOrder?: {
      paidAt?: string
      shippedAt?: string
    }
  }
}

interface Product {
  id: string
  name: string
  price: number
  unit: string
  vatRate?: number
  category?: {
    id: string
    name: string
  } | null
}

interface Customer {
  id: string
  name: string
}

interface CreditNoteData {
  id: string
  creditNoteNumber: string
  creditNoteDate: string
  totalAmount: number
  reason: string | null
  status: string
  items: {
    id: string
    productName: string | null
    quantity: number
    unit: string
    price: number
    vatRate: number
  }[]
}

export default function TransactionsPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set())
  const [showSyncForm, setShowSyncForm] = useState(false)
  const [isVatPayer, setIsVatPayer] = useState<boolean>(true) // Nastavení z settings

  // Dobropisy
  const [creditNotesMap, setCreditNotesMap] = useState<Record<string, CreditNoteData[]>>({})
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false)
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<Transaction | null>(null)
  const [creditNoteItems, setCreditNoteItems] = useState<Array<{
    productName: string
    quantity: string
    unit: string
    price: string
    vatRate: string
  }>>([])
  const [creditNoteReason, setCreditNoteReason] = useState('')
  const [creditNoteNote, setCreditNoteNote] = useState('')

  // Filter state
  const [filteredInvoices, setFilteredInvoices] = useState<Transaction[]>([])
  const [filterNumber, setFilterNumber] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterCustomerDropdownOpen, setFilterCustomerDropdownOpen] = useState(false)
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterPaymentDropdownOpen, setFilterPaymentDropdownOpen] = useState(false)
  const [filterMinItems, setFilterMinItems] = useState('')
  const [filterMinValue, setFilterMinValue] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStatusDropdownOpen, setFilterStatusDropdownOpen] = useState(false)

  const filterCustomerRef = useRef<HTMLDivElement>(null)
  const filterPaymentRef = useRef<HTMLDivElement>(null)
  const filterStatusRef = useRef<HTMLDivElement>(null)

  // Paginace
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Formulář pro synchronizaci
  const [syncFromDate, setSyncFromDate] = useState(
    new Date().toISOString().split('T')[0] // Dnešní datum
  )


  useEffect(() => {
    fetchData()
  }, [])

  // Automaticky rozbal a scrolluj k highlightnuté transakci
  useEffect(() => {
    if (highlightId && filteredInvoices.length > 0) {
      const index = filteredInvoices.findIndex(item => item.id === highlightId)

      if (index !== -1) {
        const pageNumber = Math.floor(index / itemsPerPage) + 1
        setCurrentPage(pageNumber)

        setExpandedTransactions(new Set([highlightId]))

        // Načti dobropisy pro highlightnutou fakturu
        fetchCreditNotes(highlightId)

        setTimeout(() => {
          const element = document.getElementById(`transaction-${highlightId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [highlightId, filteredInvoices, itemsPerPage])

  // Zavřít dropdown při kliknutí mimo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterCustomerRef.current && !filterCustomerRef.current.contains(event.target as Node)) {
        setFilterCustomerDropdownOpen(false)
      }
      if (filterPaymentRef.current && !filterPaymentRef.current.contains(event.target as Node)) {
        setFilterPaymentDropdownOpen(false)
      }
      if (filterStatusRef.current && !filterStatusRef.current.contains(event.target as Node)) {
        setFilterStatusDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter invoices
  useEffect(() => {
    let filtered = [...transactions]

    if (filterNumber) {
      filtered = filtered.filter(inv =>
        inv.transactionCode.toLowerCase().includes(filterNumber.toLowerCase())
      )
    }

    if (filterDate) {
      filtered = filtered.filter(inv => {
        const invDate = new Date(inv.transactionDate).toISOString().split('T')[0]
        return invDate === filterDate
      })
    }

    if (filterCustomer) {
      if (filterCustomer === '__anonymous__') {
        filtered = filtered.filter(inv => !inv.customer && !(inv as any).customerName)
      } else {
        filtered = filtered.filter(inv => {
          const name = inv.customer?.name || (inv as any).customerName || ''
          return name.toLowerCase().includes(filterCustomer.toLowerCase())
        })
      }
    }

    if (filterPayment !== 'all') {
      filtered = filtered.filter(inv => {
        if (filterPayment === 'none') {
          return !inv.paymentType
        }
        return inv.paymentType === filterPayment
      })
    }

    // Filtr podle minimálního počtu položek
    if (filterMinItems) {
      const minItems = parseInt(filterMinItems)
      filtered = filtered.filter(inv => (inv.items?.length || 0) >= minItems)
    }

    // Filtr podle minimální hodnoty
    if (filterMinValue) {
      const minVal = parseFloat(filterMinValue)
      filtered = filtered.filter(inv => inv.totalAmount >= minVal)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(inv => inv.status === filterStatus)
    }

    setFilteredInvoices(filtered)
    setCurrentPage(1)
  }, [transactions, filterNumber, filterDate, filterCustomer, filterPayment, filterMinItems, filterMinValue, filterStatus])

  async function fetchData() {
    try {
      const [transactionsRes, productsRes, customersRes, settingsRes] = await Promise.all([
        fetch('/api/issued-invoices'),
        fetch('/api/products'),
        fetch('/api/customers'),
        fetch('/api/settings'),
      ])
      const transactionsData = await transactionsRes.json()
      const productsData = await productsRes.json()
      const customersData = await customersRes.json()
      const settingsData = await settingsRes.json()
      setTransactions(transactionsData)
      setProducts(productsData)
      setCustomers(customersData)
      setIsVatPayer(settingsData.isVatPayer ?? true)
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
    } finally {
      setLoading(false)
    }
  }

  // Načti dobropisy pro konkrétní fakturu
  async function fetchCreditNotes(invoiceId: string) {
    try {
      const res = await fetch(`/api/issued-invoices/${invoiceId}/credit-notes`)
      const data = await res.json()
      setCreditNotesMap(prev => ({ ...prev, [invoiceId]: data }))
    } catch (error) {
      console.error('Chyba při načítání dobropisů:', error)
    }
  }

  // Otevřít modal pro vystavení dobropisu
  function handleOpenCreditNoteModal(transaction: Transaction) {
    setCreditNoteInvoice(transaction)
    setCreditNoteReason('')
    setCreditNoteNote('')
    // Předvyplnit položky z faktury
    const prefillItems = transaction.items.map((item: any) => ({
      productName: item.product?.name || item.productName || '',
      quantity: String(item.quantity),
      unit: item.unit || 'ks',
      price: String(item.price || 0),
      vatRate: String(item.vatRate || 21),
    }))
    setCreditNoteItems(prefillItems.length > 0 ? prefillItems : [{
      productName: '',
      quantity: '',
      unit: 'ks',
      price: '',
      vatRate: '21',
    }])
    setShowCreditNoteModal(true)
  }

  // Přidat položku do dobropisu
  function handleAddCreditNoteItem() {
    setCreditNoteItems([...creditNoteItems, {
      productName: '',
      quantity: '',
      unit: 'ks',
      price: '',
      vatRate: '21',
    }])
  }

  // Odebrat položku z dobropisu
  function handleRemoveCreditNoteItem(index: number) {
    setCreditNoteItems(creditNoteItems.filter((_, i) => i !== index))
  }

  // Odeslat dobropis
  async function handleSubmitCreditNote(e: React.FormEvent) {
    e.preventDefault()
    if (!creditNoteInvoice) return

    if (creditNoteItems.length === 0) {
      alert('Dobropis musí mít alespoň jednu položku')
      return
    }

    const validItems = creditNoteItems.filter(item =>
      item.productName && parseFloat(item.quantity) > 0 && parseFloat(item.price) > 0
    )

    if (validItems.length === 0) {
      alert('Vyplň alespoň jednu platnou položku (název, množství, cena)')
      return
    }

    try {
      const response = await fetch('/api/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuedInvoiceId: creditNoteInvoice.id,
          reason: creditNoteReason || null,
          note: creditNoteNote || null,
          items: validItems.map(item => ({
            productName: item.productName,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            price: parseFloat(item.price),
            vatRate: parseFloat(item.vatRate),
          }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Dobropis ${data.creditNoteNumber} byl úspěšně vytvořen!`)
        setShowCreditNoteModal(false)
        setCreditNoteInvoice(null)
        // Aktualizovat dobropisy pro tuto fakturu
        fetchCreditNotes(creditNoteInvoice.id)
      } else {
        const err = await response.json()
        alert(`Chyba při vytváření dobropisu: ${err.error}`)
      }
    } catch (error) {
      console.error('Chyba při vytváření dobropisu:', error)
      alert('Nepodařilo se vytvořit dobropis')
    }
  }

  // Synchronizovat transakce ze SumUp
  async function handleSync() {
    setSyncing(true)
    try {
      const endDate = new Date()
      const startDate = new Date(syncFromDate)

      const response = await fetch('/api/transactions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      })

      const data = await response.json()
      alert(`Synchronizováno ${data.transactions?.length || 0} nových transakcí`)

      await fetchData()
      setShowSyncForm(false)
    } catch (error) {
      console.error('Chyba při synchronizaci:', error)
      alert('Nepodařilo se synchronizovat transakce')
    } finally {
      setSyncing(false)
    }
  }

  // Otevřít formulář pro synchronizaci
  function handleOpenSyncForm() {
    setSyncFromDate(new Date().toISOString().split('T')[0]) // Vždy dnešní datum
    setShowSyncForm(true)
  }

  // Tisknout fakturu
  async function handlePrintInvoice(transaction: Transaction) {
    try {
      console.log('Začátek generování PDF pro transakci:', transaction)

      // Načti nastavení
      const settingsRes = await fetch('/api/settings')
      if (!settingsRes.ok) {
        throw new Error(`Chyba při načítání nastavení: ${settingsRes.status}`)
      }
      const settings = await settingsRes.json()
      console.log('Načtená nastavení:', settings)

      // Validace dat
      if (!transaction.transactionCode) {
        throw new Error('Transakce nemá číslo faktury')
      }
      if (!transaction.items || transaction.items.length === 0) {
        throw new Error('Transakce nemá žádné položky')
      }

      console.log('Volám generateInvoicePDF s daty:', { transaction, settings })

      // Vygeneruj PDF
      await generateInvoicePDF(transaction, settings)

      console.log('PDF úspěšně vygenerováno')
    } catch (error) {
      console.error('Chyba při generování PDF:', error)
      if (error instanceof Error) {
        alert(`Nepodařilo se vygenerovat PDF faktury: ${error.message}`)
      } else {
        alert('Nepodařilo se vygenerovat PDF faktury')
      }
    }
  }

  // Smazat jednu transakci
  async function handleDelete(transaction: Transaction) {
    if (!confirm(`Opravdu chceš smazat transakci ${transaction.transactionCode}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Transakce smazána!')
        await fetchData()
      } else {
        alert('Nepodařilo se smazat transakci')
      }
    } catch (error) {
      console.error('Chyba při mazání transakce:', error)
      alert('Nepodařilo se smazat transakci')
    }
  }


  // Stornovat fakturu
  async function handleStorno(transaction: Transaction) {
    const reason = prompt(`Opravdu chceš stornovat fakturu ${transaction.transactionCode}?\n\nZadej důvod storna (volitelně):`)

    if (reason === null) {
      // Uživatel klikl na Zrušit
      return
    }

    try {
      const response = await fetch(`/api/invoices/issued/${transaction.id}/storno`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason || undefined })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Faktura byla stornována!\n\n⚠️ ${data.warning}`)
        await fetchData()
      } else {
        alert(`Nepodařilo se stornovat fakturu: ${data.error}`)
      }
    } catch (error) {
      console.error('Chyba při stornování faktury:', error)
      alert('Nepodařilo se stornovat fakturu')
    }
  }

  // Toggle rozbalení transakce
  function toggleExpand(transactionId: string) {
    const newExpanded = new Set(expandedTransactions)
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId)
    } else {
      newExpanded.add(transactionId)
      // Načti dobropisy při rozbalení
      if (!creditNotesMap[transactionId]) {
        fetchCreditNotes(transactionId)
      }
    }
    setExpandedTransactions(newExpanded)
  }

  // Funkce pro barevný status badge
  function getStatusBadge(transaction: Transaction) {
    if (transaction.status === 'storno') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          STORNO
        </span>
      )
    }

    if (transaction.status === 'new') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Nová (neuhrazená)
        </span>
      )
    }

    if (transaction.status === 'paid') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Zaplacená
        </span>
      )
    }

    if (transaction.status === 'processing') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Připravuje se
        </span>
      )
    }

    if (transaction.status === 'shipped') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Odesláno
        </span>
      )
    }

    if (transaction.status === 'delivered') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Předáno
        </span>
      )
    }

    if (transaction.status === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Zrušená
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {transaction.status || 'Aktivní'}
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
      {/* Hlavička */}
      <div className="bg-gradient-to-r from-slate-50 to-emerald-50 border-l-4 border-emerald-500 rounded-lg shadow-sm py-4 px-6 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-emerald-600">
            Vystavené faktury
            <span className="text-sm font-normal text-gray-600 ml-3">
              (Zobrazeno <span className="font-semibold text-emerald-600">{filteredInvoices.length}</span> z <span className="font-semibold text-gray-700">{transactions.length}</span>)
            </span>
          </h1>
        </div>
      </div>

      {/* Filtry - přesně odpovídající sloupcům tabulky */}
      <div className="mb-4">
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">

          {/* Vymazat filtry - úplně vlevo nad šipkou */}
          <button
            onClick={() => {
              setFilterNumber('')
              setFilterDate('')
              setFilterCustomer('')
              setFilterPayment('all')
              setFilterMinItems('')
              setFilterMinValue('')
              setFilterStatus('all')
            }}
            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center"
            title="Vymazat filtry"
          >
            ✕
          </button>

          {/* Textový input - Číslo */}
          <input
            type="text"
            value={filterNumber}
            onChange={(e) => setFilterNumber(e.target.value)}
            placeholder="Číslo..."
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Datový input - Datum */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Textový input s dropdownem - Odběratel */}
          <div ref={filterCustomerRef} className="relative">
            <input
              type="text"
              value={filterCustomer === '__anonymous__' ? 'Anonymní' : filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              onFocus={() => setFilterCustomerDropdownOpen(true)}
              placeholder="Odběratel..."
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />

            {filterCustomerDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                {/* Anonymní */}
                <div
                  onClick={() => {
                    setFilterCustomer('__anonymous__')
                    setFilterCustomerDropdownOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-gray-500 italic"
                >
                  Anonymní odběratel
                </div>

                {/* Seznam odběratelů */}
                {customers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => {
                      setFilterCustomer(customer.name)
                      setFilterCustomerDropdownOpen(false)
                    }}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs"
                  >
                    {customer.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dropdown select - Typ platby (CENTER aligned) */}
          <div ref={filterPaymentRef} className="relative">
            <div
              onClick={() => setFilterPaymentDropdownOpen(!filterPaymentDropdownOpen)}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-blue-500 flex items-center justify-center"
            >
              {filterPayment === 'all' && 'Vše'}
              {filterPayment === 'none' && '-'}
              {filterPayment === 'cash' && 'Hotovost'}
              {filterPayment === 'card' && 'Karta'}
              {filterPayment === 'transfer' && 'Převod'}
            </div>

            {filterPaymentDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
                <div onClick={() => { setFilterPayment('all'); setFilterPaymentDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center">Vše</div>
                <div onClick={() => { setFilterPayment('none'); setFilterPaymentDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center">-</div>
                <div onClick={() => { setFilterPayment('cash'); setFilterPaymentDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center">Hotovost</div>
                <div onClick={() => { setFilterPayment('card'); setFilterPaymentDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center">Karta</div>
                <div onClick={() => { setFilterPayment('transfer'); setFilterPaymentDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center">Převod</div>
              </div>
            )}
          </div>

          {/* Číselný input - Položek (≥ N) */}
          <input
            type="number"
            value={filterMinItems}
            onChange={(e) => setFilterMinItems(e.target.value)}
            placeholder="≥"
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Číselný input - Hodnota (≥ částka) */}
          <input
            type="number"
            value={filterMinValue}
            onChange={(e) => setFilterMinValue(e.target.value)}
            placeholder="≥"
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Dropdown select - Status (CENTER aligned, BAREVNÝ) */}
          <div ref={filterStatusRef} className="relative">
            <div
              onClick={() => setFilterStatusDropdownOpen(!filterStatusDropdownOpen)}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-blue-500 flex items-center justify-center"
            >
              {filterStatus === 'all' && <span>Vše</span>}
              {filterStatus === 'new' && <span className="text-yellow-600">Nová</span>}
              {filterStatus === 'paid' && <span className="text-green-600">Zaplacená</span>}
              {filterStatus === 'processing' && <span className="text-blue-600">Připravuje se</span>}
              {filterStatus === 'shipped' && <span className="text-purple-600">Odesláno</span>}
              {filterStatus === 'delivered' && <span className="text-teal-600">Předáno</span>}
              {filterStatus === 'cancelled' && <span className="text-red-600">Zrušená</span>}
              {filterStatus === 'storno' && <span className="text-red-600">STORNO</span>}
            </div>

            {filterStatusDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
                <div onClick={() => { setFilterStatus('all'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center">Vše</div>
                <div onClick={() => { setFilterStatus('new'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-yellow-600">Nová</div>
                <div onClick={() => { setFilterStatus('paid'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-green-600">Zaplacená</div>
                <div onClick={() => { setFilterStatus('processing'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-blue-600">Připravuje se</div>
                <div onClick={() => { setFilterStatus('shipped'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-purple-600">Odesláno</div>
                <div onClick={() => { setFilterStatus('delivered'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-teal-600">Předáno</div>
                <div onClick={() => { setFilterStatus('cancelled'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-red-600">Zrušená</div>
                <div onClick={() => { setFilterStatus('storno'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-red-600">STORNO</div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Seznam faktur */}
      <div ref={sectionRef} className="space-y-2">
        {filteredInvoices.length === 0 ? (
          <p className="text-gray-500">
            {transactions.length === 0 ? 'Žádné vystavené faktury' : 'Žádné faktury odpovídají filtrům'}
          </p>
        ) : (
          <>
              {/* Hlavička tabulky */}
              <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-700">
                <div className="w-8"></div>
                <div className="text-center">Číslo</div>
                <div className="text-center">Datum</div>
                <div className="text-center">Odběratel</div>
                <div className="text-center">Typ platby</div>
                <div className="text-center">Položek</div>
                <div className="text-center">Hodnota</div>
                <div className="text-center">Status</div>
              </div>

              {filteredInvoices
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((transaction) => {
                const isExpanded = expandedTransactions.has(transaction.id)
                const hasNoItems = transaction.items.length === 0

                return (
                  <div
                    key={transaction.id}
                    id={`transaction-${transaction.id}`}
                    className={`border rounded-lg ${
                      highlightId === transaction.id ? 'ring-2 ring-blue-500 bg-blue-50' :
                      isExpanded ? 'ring-2 ring-blue-400' : ''
                    } ${
                      hasNoItems ? 'bg-red-50 border-red-300' : ''
                    }`}
                  >
                    <div className={`p-4 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 transition-colors ${transaction.status === 'storno' ? 'bg-red-50 opacity-70' : 'hover:bg-gray-50'}`}>
                      {/* Rozbalit/sbalit */}
                      <button
                        onClick={() => toggleExpand(transaction.id)}
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
                        onClick={() => toggleExpand(transaction.id)}
                      >
                        <p className={`text-sm font-semibold text-gray-900 truncate ${transaction.status === 'storno' ? 'line-through' : ''}`}>
                          {transaction.transactionCode}
                        </p>
                      </div>

                      {/* Datum */}
                      <div
                        className="cursor-pointer text-center"
                        onClick={() => toggleExpand(transaction.id)}
                      >
                        <p className="text-sm text-gray-700">
                          {new Date(transaction.transactionDate).toLocaleDateString('cs-CZ')}
                        </p>
                      </div>

                      {/* Odběratel */}
                      <div className="text-center">
                        {transaction.customer && transaction.customer.id ? (
                          <a
                            href={`/customers?highlight=${transaction.customer.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {transaction.customer.name}
                          </a>
                        ) : (transaction as any).customerName && (transaction as any).customerName !== 'Anonymní zákazník' && (transaction as any).customerName !== 'Anonymní odběratel' ? (
                          <p
                            className="text-sm text-gray-700 truncate cursor-pointer"
                            onClick={() => toggleExpand(transaction.id)}
                          >
                            {(transaction as any).customerName}
                            <span className="text-xs text-gray-500 ml-1">(ruční)</span>
                          </p>
                        ) : (
                          <p
                            className="text-sm text-gray-400 italic cursor-pointer"
                            onClick={() => toggleExpand(transaction.id)}
                          >
                            {transaction.transactionId && !transaction.customerOrderId ? (
                              <>
                                Anonymní zákazník
                                <span className="text-xs text-gray-500 ml-1">(SumUp)</span>
                              </>
                            ) : (transaction as any).customerName === 'Anonymní odběratel' ? (
                              <>
                                Anonymní odběratel
                                <span className="text-xs text-gray-500 ml-1">(ruční)</span>
                              </>
                            ) : (
                              'Bez odběratele'
                            )}
                          </p>
                        )}
                      </div>

                      {/* Typ platby */}
                      <div className="cursor-pointer text-center" onClick={() => toggleExpand(transaction.id)}>
                        <p className="text-sm">
                          {transaction.paymentType === 'cash' && 'Hotovost'}
                          {transaction.paymentType === 'card' && 'Karta'}
                          {transaction.paymentType === 'transfer' && 'Převod'}
                          {!transaction.paymentType && '-'}
                        </p>
                      </div>

                      {/* Položek */}
                      <div
                        className="cursor-pointer text-center"
                        onClick={() => toggleExpand(transaction.id)}
                      >
                        <p className="text-sm text-gray-600">
                          {transaction.items.filter((item: any) => item.productId !== null).length}
                        </p>
                      </div>

                      {/* Hodnota */}
                      <div
                        className="cursor-pointer text-center"
                        onClick={() => toggleExpand(transaction.id)}
                      >
                        <p className="text-sm font-bold text-gray-900">
                          {formatPrice(transaction.totalAmount)}
                        </p>
                      </div>

                      {/* Status */}
                      <div
                        className="cursor-pointer text-center"
                        onClick={() => toggleExpand(transaction.id)}
                      >
                        {getStatusBadge(transaction)}
                      </div>

                    </div>

                    {/* Rozbalené položky transakce */}
                    {isExpanded && (
                      <div className="border-t p-4 bg-gray-50">
                        <div>
                          {/* Modrý rámeček s odkazy */}
                          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                            <div className="text-sm text-center">
                              <div className="flex items-center justify-center gap-4 flex-wrap">
                                {/* Pokud je objednávka zákazníka */}
                                {transaction.customerOrderId && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Objednávka: </span>
                                    <a
                                      href={`/${transaction.customerOrderSource === 'eshop' ? 'eshop-orders' : 'customer-orders'}?highlight=${transaction.customerOrderId}`}
                                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {transaction.customerOrderNumber || 'Zobrazit objednávku'}
                                      <ExternalLink className="w-3 h-3 inline ml-1" />
                                    </a>
                                  </div>
                                )}

                                {/* Pokud je transakce SumUp */}
                                {transaction.transactionId && !transaction.customerOrderId && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Transakce: </span>
                                    <a
                                      href={`/transactions?highlight=${transaction.transactionId}`}
                                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {transaction.transactionCode_sumup || 'Zobrazit transakci'}
                                      <ExternalLink className="w-3 h-3 inline ml-1" />
                                    </a>
                                  </div>
                                )}

                                {/* SumUp účtenka - pokud existuje */}
                                {transaction.receiptId && (() => {
                                  const match = transaction.receiptId.match(/urn:sumup:pos:sale:([^:]+):([a-f0-9-]{36})[:;]/)
                                  if (!match) return null

                                  const merchantCode = match[1]
                                  const saleId = match[2]
                                  const receiptUrl = `https://sales-receipt.sumup.com/pos/public/v1/${merchantCode}/receipt/${saleId}?format=html`

                                  return (
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-600">Účtenka: </span>
                                      <a
                                        href={receiptUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Zobrazit
                                        <ExternalLink className="w-3 h-3 inline ml-1" />
                                      </a>
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Informace o faktuře */}
                          <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                            <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Informace o faktuře</h4>

                            <div className="border-b">
                              <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Obecné</h5>
                              <div className="text-sm">
                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                  <div><span className="text-gray-600">Datum vytvoření:</span> <span className="font-medium">{new Date(transaction.transactionDate).toLocaleDateString('cs-CZ')}</span></div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  <div><span className="text-gray-600">Odesláno / Vydáno:</span> <span className="font-medium">{transaction.customerOrderId && transaction.deliveryNotes && transaction.deliveryNotes.length > 0 ? transaction.deliveryNotes.map((dn: any) => new Date(dn.deliveryDate).toLocaleDateString('cs-CZ')).join(', ') : transaction.transactionId && !transaction.customerOrderId ? new Date(transaction.transactionDate).toLocaleDateString('cs-CZ') : '-'}</span></div>
                                </div>

                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                  <div><span className="text-gray-600">Datum splatnosti:</span> <span className="font-medium">{(transaction as any).dueDate ? new Date((transaction as any).dueDate).toLocaleDateString('cs-CZ') : '-'}</span></div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  <div><span className="text-gray-600">Typ platby:</span> <span className="font-medium">
                                    {transaction.paymentType === 'cash' && 'Hotovost'}
                                    {transaction.paymentType === 'card' && 'Karta'}
                                    {transaction.paymentType === 'transfer' && 'Bankovní převod'}
                                    {!transaction.paymentType && '-'}
                                  </span></div>
                                </div>

                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                  <div><span className="text-gray-600">Zaplaceno:</span> <span className="font-medium">{transaction.status === 'paid' || transaction.status === 'delivered' || (transaction._original as any)?.customerOrder?.paidAt || (transaction._original as any)?.transaction ? ((transaction._original as any)?.customerOrder?.paidAt ? new Date((transaction._original as any).customerOrder.paidAt).toLocaleDateString('cs-CZ') : new Date(transaction.transactionDate).toLocaleDateString('cs-CZ')) : '-'}</span></div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  <div><span className="text-gray-600">Poznámka:</span> <span className="font-medium">{(transaction as any).note || '-'}</span></div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Odběratel / Zákazník</h5>
                              <div className="text-sm">
                                {(() => {
                                  // Pokud je to SumUp transakce bez odběratele, zobraz "Anonymní zákazník (SumUp)"
                                  const isSumUpTransaction = transaction.transactionId && !transaction.customerOrderId && !transaction.customer && !(transaction as any).customerName
                                  const displayName = isSumUpTransaction
                                    ? 'Anonymní zákazník'
                                    : ((transaction as any).customerName || transaction.customer?.name || 'Anonymní zákazník')

                                  const customerName = displayName
                                  const isAnonymous = customerName === 'Anonymní odběratel' || customerName === 'Anonymní zákazník'

                                  // Pro anonymní zákazníky zobrazíme jen 1 řádek s názvem
                                  if (isAnonymous) {
                                    return (
                                      <div className="px-4 py-2 bg-white">
                                        <span className="text-gray-600">Název:</span>
                                        <span className="font-medium ml-2">
                                          {customerName}
                                          {isSumUpTransaction && <span className="text-xs text-gray-500 ml-1">(SumUp)</span>}
                                        </span>
                                      </div>
                                    )
                                  }

                                  // Pro normální zákazníky zobrazíme všechny detaily
                                  const entityType = (transaction.customer as any)?.entityType || (transaction as any).customerEntityType || 'company'

                                  return (
                                    <>
                                      {/* Název a typ subjektu */}
                                      <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                        <div>
                                          <span className="text-gray-600">Název:</span>
                                          <span className="font-medium">{customerName}</span>
                                          {entityType && (
                                            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                              {entityType === 'company' ? '🏢 Firma' : '👤 FO'}
                                            </span>
                                          )}
                                        </div>
                                        <div className="border-l border-gray-200 mx-4"></div>
                                        {/* Kontaktní osoba pouze pro firmy */}
                                        {entityType === 'company' && (
                                          <div><span className="text-gray-600">Kontaktní osoba:</span> <span className="font-medium">{(transaction as any).customerContactPerson || (transaction.customer as any)?.contact || '-'}</span></div>
                                        )}
                                        {/* Pro FO zobrazíme Email */}
                                        {entityType === 'individual' && (
                                          <div><span className="text-gray-600">Email:</span> <span className="font-medium">{(transaction as any).customerEmail || (transaction.customer as any)?.email || '-'}</span></div>
                                        )}
                                      </div>

                                      {/* Adresa a Telefon - vždy */}
                                      <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                        <div><span className="text-gray-600">Adresa:</span> <span className="font-medium">{(transaction as any).customerAddress || (transaction.customer as any)?.address || '-'}</span></div>
                                        <div className="border-l border-gray-200 mx-4"></div>
                                        <div><span className="text-gray-600">Telefon:</span> <span className="font-medium">{(transaction as any).customerPhone || (transaction.customer as any)?.phone || '-'}</span></div>
                                      </div>

                                      {/* Pro FIRMU: IČO a Email */}
                                      {entityType === 'company' && (
                                        <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                          <div><span className="text-gray-600">IČO:</span> <span className="font-medium">{(transaction as any).customerIco || (transaction.customer as any)?.ico || '-'}</span></div>
                                          <div className="border-l border-gray-200 mx-4"></div>
                                          <div><span className="text-gray-600">Email:</span> <span className="font-medium">{(transaction as any).customerEmail || (transaction.customer as any)?.email || '-'}</span></div>
                                        </div>
                                      )}

                                      {/* Pro FIRMU: DIČ a Web */}
                                      {entityType === 'company' && (
                                        <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                          <div><span className="text-gray-600">DIČ:</span> <span className="font-medium">{(transaction as any).customerDic || (transaction.customer as any)?.dic || '-'}</span></div>
                                          <div className="border-l border-gray-200 mx-4"></div>
                                          <div><span className="text-gray-600">Web:</span> <span className="font-medium">{(transaction as any).customerWebsite || (transaction.customer as any)?.website || '-'}</span></div>
                                        </div>
                                      )}

                                      {/* Bankovní účet a Poznámka - vždy */}
                                      <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                        <div><span className="text-gray-600">Bankovní účet:</span> <span className="font-medium">{(transaction as any).customerBankAccount || (transaction.customer as any)?.bankAccount || '-'}</span></div>
                                        <div className="border-l border-gray-200 mx-4"></div>
                                        <div><span className="text-gray-600">Poznámka:</span> <span className="font-medium">{(transaction.customer as any)?.note || '-'}</span></div>
                                      </div>
                                    </>
                                  )
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Položky */}
                        {transaction.items.length === 0 ? (
                          <p className="text-red-600 mt-6 mb-6">Faktura nemá žádné položky!</p>
                        ) : (
                          <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                            <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Položky ({transaction.items.filter((item: any) => item.productId !== null || item.productName === 'Doprava').length})</h4>
                            <div className="text-sm">
                              {/* Hlavička - různá pro plátce a neplátce DPH */}
                              {isVatPayer ? (
                                <div className="grid grid-cols-[3fr_repeat(6,1fr)] gap-2 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b text-xs">
                                  <div>Produkt</div>
                                  <div className="text-center">Množství</div>
                                  <div className="text-center">DPH</div>
                                  <div className="text-center">Cena/ks</div>
                                  <div className="text-center">DPH/ks</div>
                                  <div className="text-center">S DPH/ks</div>
                                  <div className="text-center">Celkem</div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
                                  <div>Produkt</div>
                                  <div className="text-right">Množství</div>
                                  <div className="text-right">Cena za kus</div>
                                  <div className="text-right">Celkem</div>
                                </div>
                              )}

                              {/* Řádky položek */}
                              {transaction.items
                                .filter((item: any) => item.productId !== null)
                                .sort((a: any, b: any) => {
                                  const aShip = /(doprav|shipping)/i.test(a.productName || '') ? 1 : 0
                                  const bShip = /(doprav|shipping)/i.test(b.productName || '') ? 1 : 0
                                  return aShip - bShip
                                })
                                .map((item: any, i: number) => {
                                  const catalogProduct = products.find(p => p.id === item.product?.id)
                                  const qty         = Number(item.quantity)
                                  const qtyDisplay  = formatVariantQty(qty, item.productName, item.unit)
                                  const unitPrice   = Number(item.price ?? catalogProduct?.price ?? 0)
                                  const itemVatRate = Number(item.vatRate ?? catalogProduct?.vatRate ?? DEFAULT_VAT_RATE)
                                  const isItemNonVat = isNonVatPayer(itemVatRate)

                                  // Preferuj uložené hodnoty (stejný přístup jako eshop-orders)
                                  const vatPerUnit     = item.vatAmount != null
                                    ? Number(item.vatAmount)
                                    : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
                                  const priceWithVatPU = item.priceWithVat != null
                                    ? Number(item.priceWithVat)
                                    : unitPrice + vatPerUnit

                                  // Backward-compat: staré záznamy mají priceWithVat = celková cena řádku
                                  const rawRowTotal = priceWithVatPU * qty
                                  const rowTotal = rawRowTotal > Number(transaction.totalAmount) * 1.05
                                    ? priceWithVatPU
                                    : rawRowTotal

                                  return isVatPayer ? (
                                    <div key={item.id} className={`grid grid-cols-[3fr_repeat(6,1fr)] gap-2 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-xs`}>
                                      <div className="font-medium text-gray-900">
                                        {item.product?.name || item.productName}
                                        {item.productName && !item.product?.name && <span className="text-xs ml-1 text-gray-400">(ruční)</span>}
                                      </div>
                                      <div className="text-center text-gray-600">{qtyDisplay}</div>
                                      <div className="text-center text-gray-500">{isItemNonVat ? '-' : `${itemVatRate}%`}</div>
                                      <div className="text-center text-gray-600">{formatPrice(unitPrice)}</div>
                                      <div className="text-center text-gray-500">{isItemNonVat ? '-' : formatPrice(vatPerUnit)}</div>
                                      <div className="text-center text-gray-700">{formatPrice(priceWithVatPU)}</div>
                                      <div className="text-center font-semibold text-gray-900">{formatPrice(rowTotal)}</div>
                                    </div>
                                  ) : (
                                    <div key={item.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                      <div className="font-medium text-gray-900">
                                        {item.product?.name || item.productName}
                                        {item.productName && !item.product?.name && <span className="text-xs ml-1 text-gray-400">(ruční)</span>}
                                      </div>
                                      <div className="text-right text-gray-600">{qtyDisplay}</div>
                                      <div className="text-right text-gray-600">{formatPrice(priceWithVatPU)}</div>
                                      <div className="text-right font-semibold text-gray-900">{formatPrice(rowTotal)}</div>
                                    </div>
                                  )
                              })}

                              {/* Mezisoučet / Doprava / Sleva */}
                              {(() => {
                                const colGrid  = isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'
                                const labelSpan = isVatPayer ? 'col-span-6' : 'col-span-3'

                                // Katalogové položky (productId !== null) — stejný rowTotal výpočet jako výše
                                const catalogSubtotal = transaction.items
                                  .filter((item: any) => item.productId !== null)
                                  .reduce((sum: number, item: any) => {
                                    const pwv = item.priceWithVat != null
                                      ? Number(item.priceWithVat)
                                      : (Number(item.price ?? 0) * (1 + Number(item.vatRate ?? DEFAULT_VAT_RATE) / 100))
                                    const raw = pwv * Number(item.quantity)
                                    return sum + (raw > Number(transaction.totalAmount) * 1.05 ? pwv : raw)
                                  }, 0)

                                // Rozlišení: doprava vs. sleva podle názvu
                                const nullItems    = transaction.items.filter((item: any) => item.productId === null)
                                const shippingItem = nullItems.find((item: any) =>
                                  /(doprav|shipping)/i.test(item.productName || '')
                                )
                                const discountItem = nullItems.find((item: any) =>
                                  !/(doprav|shipping)/i.test(item.productName || '')
                                )

                                const shippingTotal = shippingItem
                                  ? Number(shippingItem.priceWithVat ?? shippingItem.price ?? 0) * Number(shippingItem.quantity ?? 1)
                                  : 0
                                const discountTotal = discountItem
                                  ? Number(discountItem.priceWithVat ?? discountItem.price ?? 0) * Number(discountItem.quantity ?? 1)
                                  : 0

                                if (shippingTotal === 0 && discountTotal === 0) return null

                                return (
                                  <>
                                    {/* Mezisoučet — vždy zobrazen pokud existuje extra řádek */}
                                    <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-gray-50 border-t text-sm`}>
                                      <div className={`${labelSpan} text-gray-600`}>Mezisoučet</div>
                                      <div className="text-center font-medium text-gray-800">{formatPrice(catalogSubtotal)}</div>
                                    </div>

                                    {/* Doprava */}
                                    {shippingTotal !== 0 && (
                                      <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-blue-50 border-t text-sm`}>
                                        <div className={`${labelSpan} font-medium text-gray-900`}>
                                          {shippingItem?.productName || 'Doprava'}
                                        </div>
                                        <div className="text-center text-blue-700 font-medium">{formatPrice(shippingTotal)}</div>
                                      </div>
                                    )}

                                    {/* Sleva */}
                                    {discountTotal !== 0 && (
                                      <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-yellow-50 border-t text-sm`}>
                                        <div className={`${labelSpan} font-medium text-gray-900`}>
                                          {discountItem?.productName || 'Sleva'}
                                        </div>
                                        <div className="text-center text-red-600 font-medium">{formatPrice(discountTotal)}</div>
                                      </div>
                                    )}
                                  </>
                                )
                              })()}

                              {/* Celkem zaplaceno */}
                              <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                                <div className={isVatPayer ? 'col-span-6' : 'col-span-3'}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                                <div className="text-center">{formatPrice(transaction.totalAmount)}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Výdejky */}
                        {(transaction as any).deliveryNotes && (transaction as any).deliveryNotes.length > 0 && (
                          <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                            <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Výdejky ({(transaction as any).deliveryNotes.length})</h4>

                            <div className="text-sm">
                              {/* Hlavička mini-tabulky */}
                              <div className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
                                <div>Číslo výdejky</div>
                                <div>Datum</div>
                                <div className="text-center">Položek</div>
                                <div className="text-right">Částka</div>
                                <div className="w-4"></div>
                              </div>

                              {/* Řádky výdejek */}
                              {(transaction as any).deliveryNotes.map((deliveryNote: any, idx: number) => {
                                const deliveryTotal = (deliveryNote.items as DeliveryNote['items'] ?? []).reduce((sum, item) => {
                                  const hasSaved = item.price != null && item.priceWithVat != null
                                  const unitPrice = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
                                  const itemVatRate = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
                                  const isItemNonVat = isNonVatPayer(itemVatRate)
                                  const vatPerUnit = hasSaved ? Number(item.vatAmount ?? 0) : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
                                  const priceWithVatPU = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
                                  // Convert base-unit qty → pack count for variant items (e.g. 9 ml / 3 ml = 3 packs)
                                  let packs = Number(item.quantity)
                                  if (item.productName?.includes(' — ') && item.unit !== 'ks') {
                                    const variantLabel = item.productName.split(' — ').slice(-1)[0]
                                    const match = variantLabel.match(/^([\d.]+)/)
                                    if (match) {
                                      const packSize = parseFloat(match[1])
                                      if (packSize > 0) packs = Math.round((packs / packSize) * 1000) / 1000
                                    }
                                  }
                                  return sum + (packs * (isVatPayer ? priceWithVatPU : unitPrice))
                                }, 0)

                                return (
                                  <a
                                    key={deliveryNote.id}
                                    href={`/delivery-notes?highlight=${deliveryNote.id}`}
                                    className={`grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-3 hover:bg-blue-50 transition-colors items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                      {/* Číslo výdejky + Status */}
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-blue-600 hover:underline text-sm">
                                          {deliveryNote.deliveryNumber}
                                        </span>
                                        {deliveryNote.status === 'storno' && (
                                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                                            STORNO
                                          </span>
                                        )}
                                      </div>

                                      <div className="text-sm text-gray-700">
                                        {new Date(deliveryNote.deliveryDate).toLocaleDateString('cs-CZ')}
                                      </div>

                                      <div className="text-sm text-gray-700 text-center">
                                        {deliveryNote.items?.length || 0}
                                      </div>

                                      <div className="text-sm font-semibold text-gray-900 text-right">
                                        {deliveryTotal.toLocaleString('cs-CZ')} Kč
                                      </div>

                                      <div className="flex justify-end">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      </div>
                                    </a>
                                  )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Dobropisy */}
                        {(() => {
                          const invoiceCreditNotes = creditNotesMap[transaction.id] || []
                          return (
                            <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                              <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Dobropisy ({invoiceCreditNotes.length})</h4>

                              {invoiceCreditNotes.length === 0 ? (
                                <div className="px-4 py-3 text-sm text-gray-500">
                                  K této faktuře nejsou vystaveny žádné dobropisy.
                                </div>
                              ) : (
                                <div className="text-sm">
                                  {/* Hlavička mini-tabulky */}
                                  <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
                                    <div>Číslo dobropisu</div>
                                    <div>Datum</div>
                                    <div className="text-center">Položek</div>
                                    <div className="text-right">Částka</div>
                                    <div className="w-4"></div>
                                  </div>

                                  {invoiceCreditNotes.map((cn: any, idx: number) => (
                                    <a
                                      key={cn.id}
                                      href={`/credit-notes?highlight=${cn.id}`}
                                      className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 hover:bg-purple-50 transition-colors items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-purple-600 hover:underline text-sm">
                                          {cn.creditNoteNumber}
                                        </span>
                                        {cn.status === 'storno' && (
                                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                                            STORNO
                                          </span>
                                        )}
                                      </div>

                                      <div className="text-sm text-gray-700">
                                        {new Date(cn.creditNoteDate).toLocaleDateString('cs-CZ')}
                                      </div>

                                      <div className="text-sm text-gray-700 text-center">
                                        {cn.items?.length || 0}
                                      </div>

                                      <div className="text-sm font-semibold text-red-600 text-right">
                                        {formatPrice(cn.totalAmount)}
                                      </div>

                                      <div className="flex justify-end">
                                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        {/* Tlačítka */}
                        <div className="mt-4 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handlePrintInvoice(transaction)}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded flex items-center gap-1"
                            >
                              <FileText className="w-4 h-4" />
                              Zobrazit fakturu
                            </button>

                            {/* Tlačítko Vystavit dobropis - jen pokud není stornováno */}
                            {transaction.status !== 'storno' && (
                              <button
                                onClick={() => handleOpenCreditNoteModal(transaction)}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded flex items-center gap-1"
                              >
                                <FileOutput className="w-4 h-4" />
                                Vystavit dobropis
                              </button>
                            )}
                          </div>

                          {/* Tlačítko STORNO - jen pokud není stornováno */}
                          {transaction.status !== 'storno' && (
                            <button
                              onClick={() => handleStorno(transaction)}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded flex items-center gap-1"
                            >
                              <XCircle className="w-4 h-4" />
                              Stornovat
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Stránkování a výběr počtu záznamů */}
              {filteredInvoices.length > 0 && (() => {
                const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage)
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
                        ({filteredInvoices.length} celkem)
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

      {/* Modal pro vystavení dobropisu */}
      {showCreditNoteModal && creditNoteInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileOutput className="w-6 h-6" />
                <div>
                  <h3 className="text-lg font-bold">Vystavit dobropis</h3>
                  <p className="text-sm text-purple-200">K faktuře {creditNoteInvoice.transactionCode}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreditNoteModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmitCreditNote} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Důvod a poznámka */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Důvod dobropisu</label>
                  <input
                    type="text"
                    value={creditNoteReason}
                    onChange={(e) => setCreditNoteReason(e.target.value)}
                    placeholder="Např. Reklamace, chybná fakturace..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
                  <input
                    type="text"
                    value={creditNoteNote}
                    onChange={(e) => setCreditNoteNote(e.target.value)}
                    placeholder="Volitelná poznámka..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Info box */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                Položky dobropisu jsou předvyplněny z faktury. Uprav množství, ceny nebo odeber položky, které nechceš dobropisovat.
              </div>

              {/* Položky */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Položky dobropisu</h4>
                  <button
                    type="button"
                    onClick={handleAddCreditNoteItem}
                    className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Přidat položku
                  </button>
                </div>

                <div className="space-y-2">
                  {/* Hlavička */}
                  <div className="grid grid-cols-[3fr_1fr_0.7fr_1fr_0.8fr_auto] gap-2 px-2 text-xs font-semibold text-gray-600">
                    <div>Název produktu</div>
                    <div className="text-center">Množství</div>
                    <div className="text-center">Jedn.</div>
                    <div className="text-center">Cena bez DPH</div>
                    <div className="text-center">DPH %</div>
                    <div className="w-8"></div>
                  </div>

                  {creditNoteItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-[3fr_1fr_0.7fr_1fr_0.8fr_auto] gap-2 items-center">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => {
                          const newItems = [...creditNoteItems]
                          newItems[index] = { ...newItems[index], productName: e.target.value }
                          setCreditNoteItems(newItems)
                        }}
                        placeholder="Název..."
                        className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-purple-500"
                      />
                      <input
                        type="number"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...creditNoteItems]
                          newItems[index] = { ...newItems[index], quantity: e.target.value }
                          setCreditNoteItems(newItems)
                        }}
                        placeholder="0"
                        className="px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-purple-500"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => {
                          const newItems = [...creditNoteItems]
                          newItems[index] = { ...newItems[index], unit: e.target.value }
                          setCreditNoteItems(newItems)
                        }}
                        className="px-1 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="ks">ks</option>
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="kg">kg</option>
                        <option value="l">l</option>
                        <option value="m">m</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => {
                          const newItems = [...creditNoteItems]
                          newItems[index] = { ...newItems[index], price: e.target.value }
                          setCreditNoteItems(newItems)
                        }}
                        placeholder="0.00"
                        className="px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-purple-500"
                      />
                      <select
                        value={item.vatRate}
                        onChange={(e) => {
                          const newItems = [...creditNoteItems]
                          newItems[index] = { ...newItems[index], vatRate: e.target.value }
                          setCreditNoteItems(newItems)
                        }}
                        className="px-1 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="21">21%</option>
                        <option value="12">12%</option>
                        <option value="0">0%</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveCreditNoteItem(index)}
                        className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Souhrn */}
                {creditNoteItems.length > 0 && (() => {
                  let totalWithoutVat = 0
                  let totalVat = 0
                  let totalWithVat = 0

                  creditNoteItems.forEach(item => {
                    const qty = parseFloat(item.quantity) || 0
                    const price = parseFloat(item.price) || 0
                    const vatRate = parseFloat(item.vatRate) || 0
                    const lineTotal = qty * price
                    const lineVat = lineTotal * vatRate / 100
                    totalWithoutVat += lineTotal
                    totalVat += lineVat
                    totalWithVat += lineTotal + lineVat
                  })

                  return (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Bez DPH:</span>
                          <span className="font-semibold ml-2 text-red-600">-{formatPrice(Math.round(totalWithoutVat * 100) / 100)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">DPH:</span>
                          <span className="font-semibold ml-2 text-red-600">-{formatPrice(Math.round(totalVat * 100) / 100)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Celkem s DPH:</span>
                          <span className="font-bold ml-2 text-red-600">-{formatPrice(Math.round(totalWithVat * 100) / 100)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Tlačítka */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreditNoteModal(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2"
                >
                  <FileOutput className="w-4 h-4" />
                  Vystavit dobropis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
