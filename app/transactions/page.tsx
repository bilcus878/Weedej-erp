// Stránka Sumup objednávek (/transactions)
// Zobrazení všech Sumup objednávek + synchronizace ze SumUp + mazání

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { formatPrice, formatQuantity, formatDateTime } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/generateInvoicePDF'
import { RefreshCw, ChevronDown, ChevronRight, X, Trash2, Calendar, ExternalLink } from 'lucide-react'
import { isNonVatPayer, NON_VAT_PAYER_RATE, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'

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

interface Transaction {
  id: string
  transactionCode: string
  sumupTransactionCode?: string | null
  totalAmount: number
  paymentType: string
  status: string
  transactionDate: string
  receiptId?: string | null
  items: TransactionItem[]
  customer?: {
    id: string
    name: string
  } | null
  customerName?: string | null
  deliveryNote?: {
    id: string
    deliveryNumber: string
    deliveryDate: string
    items?: {
      id: string
      quantity: number
      product?: {
        price: number
      }
    }[]
    customerOrder?: {
      id: string
      orderNumber: string
      orderDate: string
      note?: string | null
      customer?: {
        id: string
        name: string
      } | null
    } | null
  } | null
  issuedInvoice?: {
    id: string
    invoiceNumber: string
  } | null
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

export default function TransactionsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const highlightId = searchParams.get('highlight')
  const highlightRef = useRef<HTMLDivElement>(null)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set())
  const [showSyncDropdown, setShowSyncDropdown] = useState(false)
  const [isVatPayer, setIsVatPayer] = useState<boolean>(true) // Nastavení z settings

  // Filtry
  const [filterCode, setFilterCode] = useState('')
  const [filterSumupCode, setFilterSumupCode] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterMinValue, setFilterMinValue] = useState('')
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterPaymentDropdownOpen, setFilterPaymentDropdownOpen] = useState(false)
  const [filterItemsCount, setFilterItemsCount] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStatusDropdownOpen, setFilterStatusDropdownOpen] = useState(false)

  // Refs pro zavírání dropdownů
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

  // Zavři dropdown při kliknutí mimo
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showSyncDropdown && !target.closest('.relative')) {
        setShowSyncDropdown(false)
      }
    }

    if (showSyncDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSyncDropdown])

  // Zavřít dropdown filtry při kliknutí mimo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

  // Filtrování transakcí
  useEffect(() => {
    let filtered = [...transactions]

    // Filtr podle SUP čísla
    if (filterCode) {
      filtered = filtered.filter(t =>
        t.transactionCode.toLowerCase().includes(filterCode.toLowerCase())
      )
    }

    // Filtr podle SumUp kódu
    if (filterSumupCode) {
      filtered = filtered.filter(t =>
        t.sumupTransactionCode?.toLowerCase().includes(filterSumupCode.toLowerCase())
      )
    }

    // Filtr podle data
    if (filterDate) {
      filtered = filtered.filter(t => {
        const tDate = new Date(t.transactionDate).toISOString().split('T')[0]
        return tDate === filterDate
      })
    }

    // Filtr podle minimální hodnoty
    if (filterMinValue) {
      const minVal = parseFloat(filterMinValue)
      filtered = filtered.filter(t => t.totalAmount >= minVal)
    }

    // Filtr podle typu platby
    if (filterPayment !== 'all') {
      if (filterPayment === 'none') {
        filtered = filtered.filter(t => !t.paymentType)
      } else {
        filtered = filtered.filter(t => t.paymentType === filterPayment)
      }
    }

    // Filtr podle počtu položek
    if (filterItemsCount) {
      const count = parseInt(filterItemsCount)
      if (!isNaN(count)) {
        filtered = filtered.filter(t => t.items.length === count)
      }
    }

    // Filtr podle statusu
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus)
    }

    setFilteredTransactions(filtered)
    setCurrentPage(1)
  }, [transactions, filterCode, filterSumupCode, filterDate, filterMinValue, filterPayment, filterItemsCount, filterStatus])

  function getStatusBadge(status: string) {
    if (status === 'storno') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          STORNO
        </span>
      )
    }

    if (status === 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Dokončeno
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {status}
      </span>
    )
  }

  // Automaticky rozbal a scrolluj k highlightnuté transakci
  useEffect(() => {
    if (highlightId && filteredTransactions.length > 0) {
      // Najdi index highlightnuté transakce ve filtrovaných datech
      const index = filteredTransactions.findIndex(t => t.id === highlightId)

      if (index !== -1) {
        // Vypočítej na které stránce se nachází
        const pageNumber = Math.floor(index / itemsPerPage) + 1
        setCurrentPage(pageNumber)

        // Rozbal transakci
        setExpandedTransactions(new Set([highlightId]))

        // Scrolluj k transakci po malé pauze (aby se stránka načetla)
        setTimeout(() => {
          const element = document.getElementById(`transaction-${highlightId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [highlightId, filteredTransactions, itemsPerPage])

  async function fetchData() {
    try {
      setLoading(true)
      const [transactionsRes, productsRes, customersRes, settingsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/products'),
        fetch('/api/customers'),
        fetch('/api/settings'),
      ])
      const transactionsData = await transactionsRes.json()
      const productsData = await productsRes.json()
      const customersData = await customersRes.json()
      const settingsData = await settingsRes.json()

      setTransactions(transactionsData.transactions || transactionsData)
      setProducts(productsData)
      setCustomers(customersData)
      setIsVatPayer(settingsData.isVatPayer ?? true)
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
    } finally {
      setLoading(false)
    }
  }

  // Synchronizovat transakce ze SumUp
  async function handleSync() {
    setSyncing(true)
    try {
      const endDate = new Date()

      // OPRAVA: Vytvoř startDate v UTC, ne v lokálním čase!
      // syncFromDate je "2025-12-01" (string), musíme vytvořit datum v UTC
      const [year, month, day] = syncFromDate.split('-').map(Number)
      const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))

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
      setShowSyncDropdown(false)
    } catch (error) {
      console.error('Chyba při synchronizaci:', error)
      alert('Nepodařilo se synchronizovat transakce')
    } finally {
      setSyncing(false)
    }
  }

  // Otevřít formulář pro synchronizaci
  // Tisknout fakturu
  async function handlePrintInvoice(transaction: Transaction) {
    try {
      // Načti nastavení
      const settingsRes = await fetch('/api/settings')
      const settings = await settingsRes.json()

      // Vygeneruj PDF
      await generateInvoicePDF(transaction as any, settings)
    } catch (error) {
      console.error('Chyba při generování PDF:', error)
      alert('Nepodařilo se vygenerovat PDF faktury')
    }
  }



  // Toggle rozbalení transakce
  function toggleExpand(transactionId: string) {
    const newExpanded = new Set(expandedTransactions)
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId)
    } else {
      newExpanded.add(transactionId)
    }
    setExpandedTransactions(newExpanded)
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
        <div className="relative">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-emerald-600">
              Sumup objednávky
              <span className="text-sm font-normal text-gray-600 ml-3">
                (Zobrazeno <span className="font-semibold text-emerald-600">{filteredTransactions.length}</span> z <span className="font-semibold text-gray-700">{transactions.length}</span>)
              </span>
            </h1>
          </div>

          {/* Tlačítka - absolutně vpravo */}
          <div className="absolute top-0 right-0 flex gap-3">
          <div className="relative">
            <button
              onClick={() => setShowSyncDropdown(!showSyncDropdown)}
              disabled={syncing}
              className="group relative px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-emerald-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Synchronizuji...' : 'Synchronizovat ze SumUp'}</span>
            </button>

            {/* Dropdown menu */}
            {showSyncDropdown && !syncing && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Synchronizovat od data:
                    </label>
                    <input
                      type="date"
                      value={syncFromDate}
                      onChange={(e) => setSyncFromDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Synchronizují se transakce od tohoto data do dnes
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowSyncDropdown(false)
                        handleSync()
                      }}
                      className="flex-1"
                      size="sm"
                    >
                      Synchronizovat
                    </Button>
                    <Button
                      onClick={() => setShowSyncDropdown(false)}
                      variant="secondary"
                      size="sm"
                    >
                      Zrušit
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Filtry - přesně odpovídající sloupcům tabulky */}
      <div className="mb-4">
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">

          {/* Vymazat filtry - úplně vlevo nad šipkou */}
          <button
            onClick={() => {
              setFilterCode('')
              setFilterSumupCode('')
              setFilterDate('')
              setFilterMinValue('')
              setFilterPayment('all')
              setFilterItemsCount('')
              setFilterStatus('all')
            }}
            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center"
            title="Vymazat filtry"
          >
            ✕
          </button>

          {/* Textový input - SUP Číslo */}
          <input
            type="text"
            value={filterCode}
            onChange={(e) => setFilterCode(e.target.value)}
            placeholder="SUP..."
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Datový input - Datum */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Textový input - Kód SumUp */}
          <input
            type="text"
            value={filterSumupCode}
            onChange={(e) => setFilterSumupCode(e.target.value)}
            placeholder="MS9W..."
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

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

          {/* Číselný input - Počet položek */}
          <input
            type="number"
            value={filterItemsCount}
            onChange={(e) => setFilterItemsCount(e.target.value)}
            placeholder="="
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Číselný input - Částka (≥ částka, CENTER aligned) */}
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
              {filterStatus === 'completed' && <span className="text-green-600">Dokončeno</span>}
              {filterStatus === 'pending' && <span className="text-yellow-600">Čeká</span>}
              {filterStatus === 'storno' && <span className="text-red-600">Storno</span>}
            </div>

            {filterStatusDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
                <div onClick={() => { setFilterStatus('all'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center">Vše</div>
                <div onClick={() => { setFilterStatus('completed'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-green-600">Dokončeno</div>
                <div onClick={() => { setFilterStatus('pending'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-yellow-600">Čeká</div>
                <div onClick={() => { setFilterStatus('storno'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-red-600">Storno</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabulka transakcí */}
      <div ref={sectionRef} className="space-y-2">
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">
                {transactions.length === 0
                  ? 'Žádné faktury. Synchronizuj transakce ze SumUp API.'
                  : 'Žádné faktury odpovídají zvoleným filtrům.'}
              </p>
              <div className="flex gap-3 justify-center">
                {transactions.length === 0 && (
                  <Button onClick={() => setShowSyncDropdown(true)} variant="secondary">
                    Synchronizovat ze SumUp
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Hlavička tabulky */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 border rounded-lg text-xs text-gray-700">
              <div className="w-8"></div>
              <div className="text-center font-bold">Číslo</div>
              <div className="text-center font-semibold">Datum</div>
              <div className="text-center font-bold">Kód SumUp</div>
              <div className="text-center font-semibold">Typ platby</div>
              <div className="text-center font-semibold">Položek</div>
              <div className="text-center font-semibold">Částka</div>
              <div className="text-center font-semibold">Status</div>
            </div>

            {/* Transakce */}
            {filteredTransactions
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((transaction, index) => {
                  const isExpanded = expandedTransactions.has(transaction.id)
                  const hasNoItems = transaction.items.length === 0

                  return (
                    <div
                      key={transaction.id}
                      id={`transaction-${transaction.id}`}
                      className={`border rounded-lg ${
                        highlightId === transaction.id ? 'border-blue-500 bg-blue-50' :
                        isExpanded ? 'ring-2 ring-blue-400' : ''
                      } ${hasNoItems ? 'bg-red-100 border-red-500' : ''}`}
                    >
                      {/* Hlavní řádek transakce */}
                      <div className={`p-4 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 transition-colors ${hasNoItems ? '' : transaction.status === 'storno' ? 'bg-red-50 opacity-70' : 'hover:bg-gray-50'}`}>
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

                        {/* Číslo transakce (SUP20250001) */}
                        <div
                          className="cursor-pointer text-center"
                          onClick={() => toggleExpand(transaction.id)}
                        >
                          <p className="text-sm font-bold text-gray-700">
                            {transaction.transactionCode}
                          </p>
                        </div>

                        {/* Datum */}
                        <div
                          className="cursor-pointer text-center"
                          onClick={() => toggleExpand(transaction.id)}
                        >
                          <p className="text-sm text-gray-900 truncate">
                            {formatDateTime(transaction.transactionDate)}
                          </p>
                        </div>

                        {/* Kód SumUp */}
                        <div
                          className="cursor-pointer text-center"
                          onClick={() => toggleExpand(transaction.id)}
                        >
                          <p className={`text-sm font-bold text-gray-700 truncate ${transaction.status === 'storno' ? 'line-through' : ''}`}>
                            {transaction.sumupTransactionCode || '-'}
                          </p>
                        </div>

                        {/* Typ platby */}
                        <div
                          className="cursor-pointer text-center"
                          onClick={() => toggleExpand(transaction.id)}
                        >
                          <p className="text-sm text-gray-700">
                            {transaction.paymentType === 'card' ? 'Karta' : 'Hotovost'}
                          </p>
                        </div>

                        {/* Počet položek */}
                        <div
                          className="cursor-pointer text-center"
                          onClick={() => toggleExpand(transaction.id)}
                        >
                          <p className="text-sm text-gray-700">
                            {transaction.items.filter((item: any) => item.productId !== null).length}
                          </p>
                        </div>

                        {/* Částka */}
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
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>

                      {/* Rozbalené položky transakce */}
                      {isExpanded && (
                        <div className="border-t p-4 bg-gray-50 space-y-4">
                          {/* SumUp účtenka + Faktura - modrý rámeček rozcestník */}
                          {transaction.receiptId && (() => {
                            const match = transaction.receiptId.match(/urn:sumup:pos:sale:([^:]+):([a-f0-9-]{36})[:;]/)
                            if (!match) return null

                            const merchantCode = match[1]
                            const saleId = match[2]
                            const receiptUrl = `https://sales-receipt.sumup.com/pos/public/v1/${merchantCode}/receipt/${saleId}?format=html`

                            return (
                              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                <div className="text-sm text-center flex items-center justify-center gap-4">
                                  {transaction.issuedInvoice && (
                                    <>
                                      <span className="text-gray-600">Faktura: </span>
                                      <Link
                                        href={`/invoices/issued?highlight=${transaction.issuedInvoice.id}`}
                                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                      >
                                        {transaction.issuedInvoice.invoiceNumber}
                                        <ExternalLink className="w-3 h-3 inline ml-1" />
                                      </Link>
                                    </>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">SumUp účtenka: </span>
                                    <a
                                      href={receiptUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                    >
                                      Zobrazit
                                      <ExternalLink className="w-3 h-3 inline ml-1" />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}

                          {/* PDF faktura */}
                          {transaction.transactionCode.match(/^\d{7}$/) && (
                            <div className="mb-3">
                              <span className="text-sm font-medium text-gray-700">PDF faktura: </span>
                              <button
                                onClick={() => handlePrintInvoice(transaction)}
                                className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                              >
                                Generovat
                              </button>
                            </div>
                          )}

                          {/* Informace o transakci */}
                          <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                            <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Informace o transakci</h4>

                            <div className="border-b">
                              <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Obecné</h5>
                              <div className="text-sm">
                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                  <div><span className="text-gray-600">Datum vytvoření:</span> <span className="font-medium">{new Date(transaction.transactionDate).toLocaleDateString('cs-CZ')}</span></div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  <div><span className="text-gray-600">Vydáno:</span> <span className="font-medium">{transaction.deliveryNote ? new Date(transaction.deliveryNote.deliveryDate).toLocaleDateString('cs-CZ') : new Date(transaction.transactionDate).toLocaleDateString('cs-CZ')}</span></div>
                                </div>

                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                  <div><span className="text-gray-600">Zaplaceno:</span> <span className="font-medium">{new Date(transaction.transactionDate).toLocaleDateString('cs-CZ')}</span></div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  <div><span className="text-gray-600">Typ platby:</span> <span className="font-medium">
                                    {transaction.paymentType === 'cash' && 'Hotovost'}
                                    {transaction.paymentType === 'card' && 'Karta'}
                                    {transaction.paymentType === 'transfer' && 'Bankovní převod'}
                                    {!transaction.paymentType && '-'}
                                  </span></div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Odběratel / Zákazník</h5>
                              <div className="text-sm">
                                <div className="px-4 py-2 bg-white">
                                  <span className="text-gray-600">Název:</span>
                                  <span className="font-medium ml-2">
                                    {transaction.deliveryNote?.customerOrder?.customer?.name || transaction.customer?.name || transaction.customerName || 'Anonymní zákazník'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Položky */}
                          <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                            <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Položky ({transaction.items.filter((item: any) => item.productId !== null).length})</h4>
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
                                // 🛡️ VYFILTRUJ SLEVY: sleva má productId = null, nezobrazuj ji mezi položkami
                                .filter((item: any) => item.productId !== null)
                                .map((item: any, i: number) => {

                                // Najdi produkt v katalogu
                                const catalogProduct = products.find(p => p.id === item.product.id)
                                const itemVatRate = Number(item.vatRate || (catalogProduct as any)?.vatRate || DEFAULT_VAT_RATE)
                                const isItemNonVat = isNonVatPayer(itemVatRate)

                                // ✅ V DB jsou uložené JEDNOTKOVÉ ceny (Kč/g nebo Kč/ks)
                                const unitPrice = Number(item.price || 0) // Jednotková cena bez DPH
                                const vatPerUnit = Number(item.vatAmount || 0) // Jednotkové DPH
                                const priceWithVatPerUnit = Number(item.priceWithVat || 0) // Jednotková cena s DPH

                                // Vypočítej celkové částky (vynásob s množstvím)
                                const totalWithoutVat = unitPrice * Number(item.quantity)
                                const totalVat = vatPerUnit * Number(item.quantity)
                                const totalWithVat = priceWithVatPerUnit * Number(item.quantity)

                                return isVatPayer ? (
                                  <div key={item.id} className={`grid grid-cols-[3fr_repeat(6,1fr)] gap-2 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-xs`}>
                                    <div className="text-gray-900">{item.product.name}</div>
                                    <div className="text-center text-gray-700">{formatQuantity(item.quantity, item.unit)}</div>
                                    <div className="text-center text-gray-500">{isItemNonVat ? '-' : `${itemVatRate}%`}</div>
                                    <div className="text-center text-gray-700">{formatPrice(unitPrice)}</div>
                                    <div className="text-center text-gray-500">{isItemNonVat ? '-' : formatPrice(vatPerUnit)}</div>
                                    <div className="text-center text-gray-700">{formatPrice(priceWithVatPerUnit)}</div>
                                    <div className="text-center font-semibold text-gray-900">{formatPrice(totalWithVat)}</div>
                                  </div>
                                ) : (
                                  <div key={item.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <div className="text-gray-900">{item.product.name}</div>
                                    <div className="text-right text-gray-700">{formatQuantity(item.quantity, item.unit)}</div>
                                    <div className="text-right text-gray-700">{formatPrice(unitPrice)}</div>
                                    <div className="text-right font-semibold text-gray-900">{formatPrice(totalWithoutVat)}</div>
                                  </div>
                                )
                              })}

                              {/* Mezisoučet (katalogové ceny) */}
                              {(() => {
                                const catalogTotal = transaction.items
                                  .filter((item: any) => item.productId !== null)
                                  .reduce((sum: number, item: any) => {
                                    return sum + (Number(item.priceWithVat || item.price || 0) * Number(item.quantity || 1))
                                  }, 0)

                                const discountItem = transaction.items.find((item: any) => item.productId === null)
                                const discountAmount = discountItem
                                  ? (Number(discountItem.priceWithVat) || Number(discountItem.price) || 0) * Number(discountItem.quantity || 1)
                                  : 0

                                // Zobraz mezisoučet a slevu pouze pokud existuje sleva
                                if (discountAmount !== 0) {
                                  return (
                                    <>
                                      {/* Mezisoučet */}
                                      <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-50 border-t text-sm`}>
                                        <div className={isVatPayer ? 'col-span-6' : 'col-span-3'}>Mezisoučet</div>
                                        <div className="text-center">{formatPrice(catalogTotal)}</div>
                                      </div>

                                      {/* Sleva */}
                                      <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-yellow-50 border-t text-sm`}>
                                        <div className={isVatPayer ? 'col-span-6' : 'col-span-3'} style={{ fontWeight: 500, color: '#111827' }}>Sleva</div>
                                        <div className="text-center text-red-600 font-medium">{formatPrice(discountAmount)}</div>
                                      </div>
                                    </>
                                  )
                                }
                                return null
                              })()}

                              {/* Celkem zaplaceno */}
                              <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                                <div className={isVatPayer ? 'col-span-6' : 'col-span-3'}>{isVatPayer ? 'Celkem zaplaceno s DPH' : 'Celkem zaplaceno'}</div>
                                <div className="text-center">{formatPrice(transaction.totalAmount)}</div>
                              </div>
                            </div>
                          </div>

                          {/* Výdejky */}
                          {transaction.deliveryNote && (
                            <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                              <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Výdejky (1)</h4>

                              <div className="text-sm">
                                {/* Hlavička mini-tabulky */}
                                <div className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
                                  <div>Číslo výdejky</div>
                                  <div>Datum</div>
                                  <div className="text-center">Položek</div>
                                  <div className="text-right">Částka</div>
                                  <div className="w-4"></div>
                                </div>

                                {/* Řádek výdejky */}
                                <Link
                                  href={`/delivery-notes?highlight=${transaction.deliveryNote.id}`}
                                  className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-3 bg-white hover:bg-blue-50 transition-colors items-center"
                                >
                                  {/* Číslo výdejky */}
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-blue-600 hover:underline">
                                      {transaction.deliveryNote.deliveryNumber}
                                    </span>
                                  </div>

                                  <div className="text-gray-700">
                                    {new Date(transaction.deliveryNote.deliveryDate).toLocaleDateString('cs-CZ')}
                                  </div>

                                  <div className="text-gray-700 text-center">
                                    {transaction.deliveryNote.items?.length || 0}
                                  </div>

                                  <div className="font-semibold text-gray-900 text-right">
                                    {(() => {
                                      const deliveryTotal = transaction.deliveryNote.items?.reduce((sum: number, item: any) => {
                                        return sum + (Number(item.quantity) * Number(item.product?.price || 0))
                                      }, 0) || 0
                                      return deliveryTotal.toLocaleString('cs-CZ') + ' Kč'
                                    })()}
                                  </div>

                                  <div className="flex justify-end">
                                    <ExternalLink className="w-4 h-4 text-blue-600" />
                                  </div>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

              {/* Stránkování a výběr počtu záznamů */}
              {filteredTransactions.length > 0 && (() => {
                const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
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
                        ({filteredTransactions.length} celkem)
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
