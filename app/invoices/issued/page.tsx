// Stránka transakcí (/transactions)
// Zobrazení všech transakcí + manuální přidání + kalendář + mazání

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/generateInvoicePDF'
import { ChevronDown, ChevronRight, Trash2, FileText, ExternalLink, XCircle, FileOutput, Plus, X } from 'lucide-react'
import { LinkedDocumentBanner, ActionToolbar, EshopOrderDetail } from '@/components/erp'
import type { OrderDetailData } from '@/components/erp'
import { DEFAULT_VAT_RATE } from '@/lib/vatCalculation'

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

  function transactionToOrderDetail(transaction: Transaction): OrderDetailData {
    const t = transaction as any
    const isPaid = ['paid', 'shipped', 'delivered'].includes(transaction.status)
    const custName = t.customerName || transaction.customer?.name || 'Anonymní zákazník'
    const paidAt = t._original?.customerOrder?.paidAt
      || (isPaid ? transaction.transactionDate : null)

    return {
      id: transaction.customerOrderId || transaction.id,
      orderNumber: transaction.customerOrderNumber || transaction.transactionCode,
      orderDate: transaction.transactionDate,
      status: transaction.status,
      totalAmount: transaction.totalAmount,
      paidAt: paidAt || null,
      shippedAt: t.shippedAt || null,
      customerName: custName,
      customerEmail: t.customerEmail || (transaction.customer as any)?.email || null,
      customerPhone: t.customerPhone || (transaction.customer as any)?.phone || null,
      customerAddress: t.customerAddress || null,
      paymentReference: t.paymentReference || t.variableSymbol || null,
      trackingNumber: t.trackingNumber || null,
      carrier: t.carrier || null,
      note: t.note || null,
      shippingMethod: t.shippingMethod || null,
      pickupPointId: t.pickupPointId || null,
      pickupPointName: t.pickupPointName || null,
      pickupPointAddress: t.pickupPointAddress || null,
      pickupPointCarrier: t.pickupPointCarrier || null,
      billingName: t.billingName || null,
      billingCompany: t.billingCompany || null,
      billingIco: t.billingIco || t.customerIco || (transaction.customer as any)?.ico || null,
      billingStreet: t.billingStreet || null,
      billingCity: t.billingCity || null,
      billingZip: t.billingZip || null,
      billingCountry: t.billingCountry || null,
      items: transaction.items.map(item => ({
        id: item.id,
        productId: item.productId || item.product?.id || null,
        productName: item.productName || item.product?.name || null,
        quantity: Number(item.quantity),
        unit: item.unit,
        price: Number(item.price ?? 0),
        vatRate: Number(item.vatRate ?? DEFAULT_VAT_RATE),
        vatAmount: Number(item.vatAmount ?? 0),
        priceWithVat: Number(item.priceWithVat ?? item.price ?? 0),
        product: item.product ? { id: item.product.id, name: item.product.name, price: Number((item.product as any).price ?? 0), unit: item.unit } : null,
      })),
      issuedInvoice: {
        id: transaction.id,
        invoiceNumber: transaction.transactionCode,
        paymentStatus: isPaid ? 'paid' : 'unpaid',
        status: transaction.status,
        invoiceDate: transaction.transactionDate,
      },
      deliveryNotes: (transaction.deliveryNotes || []).map(dn => ({
        id: dn.id,
        deliveryNumber: dn.deliveryNumber,
        deliveryDate: dn.deliveryDate,
        status: dn.status || 'active',
        items: (dn.items || []).map(item => ({
          id: item.id,
          quantity: Number(item.quantity),
          unit: item.unit,
          productName: item.productName || null,
          price: item.price != null ? Number(item.price) : null,
          priceWithVat: item.priceWithVat != null ? Number(item.priceWithVat) : null,
          vatRate: item.vatRate != null ? Number(item.vatRate) : null,
          vatAmount: item.vatAmount != null ? Number(item.vatAmount) : null,
          product: item.product ? { id: '', name: '', price: Number(item.product.price || 0) } : null,
        })),
      })),
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
                      <div className="border-t p-4 bg-gray-50 space-y-4">
                        <div className="space-y-4">

                          {/* Propojené dokumenty */}
                          {(transaction.customerOrderId || transaction.transactionId || transaction.receiptId) && (() => {
                            const links: { label: string; value: string; href: string }[] = []
                            if (transaction.customerOrderId) {
                              links.push({
                                label: 'Objednávka',
                                value: transaction.customerOrderNumber || 'Zobrazit objednávku',
                                href: `/${transaction.customerOrderSource === 'eshop' ? 'eshop-orders' : 'customer-orders'}?highlight=${transaction.customerOrderId}`,
                              })
                            }
                            if (transaction.transactionId && !transaction.customerOrderId) {
                              links.push({
                                label: 'Transakce',
                                value: transaction.transactionCode_sumup || 'Zobrazit transakci',
                                href: `/transactions?highlight=${transaction.transactionId}`,
                              })
                            }
                            if (transaction.receiptId) {
                              const match = transaction.receiptId.match(/urn:sumup:pos:sale:([^:]+):([a-f0-9-]{36})[:;]/)
                              if (match) {
                                links.push({
                                  label: 'Účtenka',
                                  value: 'Zobrazit',
                                  href: `https://sales-receipt.sumup.com/pos/public/v1/${match[1]}/receipt/${match[2]}?format=html`,
                                })
                              }
                            }
                            return links.length > 0 ? <LinkedDocumentBanner links={links} color="blue" /> : null
                          })()}

                        </div>

                        <EshopOrderDetail
                          order={transactionToOrderDetail(transaction)}
                          isVatPayer={isVatPayer}
                          onRefresh={fetchData}
                        />



                        {/* Dobropisy */}
                        {(() => {
                          const invoiceCreditNotes = creditNotesMap[transaction.id] || []
                          return (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
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

                        <ActionToolbar
                          left={
                            <>
                              <button
                                onClick={() => handlePrintInvoice(transaction)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Zobrazit fakturu
                              </button>
                              {transaction.status !== 'storno' && (
                                <button
                                  onClick={() => handleOpenCreditNoteModal(transaction)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
                                >
                                  <FileOutput className="w-3.5 h-3.5" />
                                  Vystavit dobropis
                                </button>
                              )}
                            </>
                          }
                          right={
                            transaction.status !== 'storno' ? (
                              <button
                                onClick={() => handleStorno(transaction)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Stornovat
                              </button>
                            ) : undefined
                          }
                        />
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
