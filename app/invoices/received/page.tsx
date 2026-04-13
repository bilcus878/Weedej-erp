'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Edit, ChevronDown, ChevronRight, FileText, ExternalLink, XCircle, FileEdit } from 'lucide-react'
import InvoiceDetailsModal from '@/components/InvoiceDetailsModal'
import { isNonVatPayer, NON_VAT_PAYER_RATE, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import { formatPrice } from '@/lib/utils'

type Supplier = {
  id: string
  name: string
}

type Product = {
  id: string
  name: string
}

type ReceiptItem = {
  id: string
  quantity: number
  receivedQuantity?: number
  unit: string
  purchasePrice: number
  product?: Product
  productName?: string
}

type Receipt = {
  id: string
  receiptNumber: string
  receiptDate: string
  status: string
  supplierId?: string
  supplier?: Supplier
  items: ReceiptItem[]
}

type OrderItem = {
  id: string
  quantity: number
  unit: string
  expectedPrice: number
  product?: Product
  productName?: string
}

type PurchaseOrder = {
  id: string
  orderNumber: string
  expectedDate?: string | null
  supplierId?: string
  supplierName?: string
  supplierEntityType?: string
  supplierICO?: string
  supplierDIC?: string
  supplierAddress?: string
  supplierContactPerson?: string
  supplierEmail?: string
  supplierPhone?: string
  supplierBankAccount?: string
  supplierWebsite?: string
  supplier?: Supplier
  items?: OrderItem[]
  note?: string
}

type ReceivedInvoice = {
  id: string
  invoiceNumber: string
  isTemporary: boolean // TRUE pokud je faktura dočasná (TEMP-XXX)
  invoiceDate: string
  dueDate?: string | null
  totalAmount: number
  paymentType: string
  attachmentUrl?: string | null
  note?: string | null
  variableSymbol?: string
  constantSymbol?: string
  specificSymbol?: string
  supplierName?: string
  supplierEntityType?: string
  supplierContactPerson?: string
  supplierEmail?: string
  supplierPhone?: string
  supplierIco?: string
  supplierDic?: string
  supplierBankAccount?: string
  supplierWebsite?: string
  supplierAddress?: string
  supplierNote?: string
  status?: string
  stornoReason?: string
  stornoAt?: string
  stornoBy?: string
  receipts?: Receipt[] // MANY-TO-ONE: více příjemek k jedné faktuře
  purchaseOrder?: PurchaseOrder | null // Objednávka (pokud faktura vznikla při objednání)
  createdAt: string
}

export default function ReceivedInvoicesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [invoices, setInvoices] = useState<ReceivedInvoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<ReceivedInvoice[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(highlightId ? new Set([highlightId]) : new Set())
  const [isVatPayer, setIsVatPayer] = useState<boolean>(true) // Nastavení z settings

  // Filtry
  const [filterNumber, setFilterNumber] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterSupplierDropdownOpen, setFilterSupplierDropdownOpen] = useState(false)
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterPaymentDropdownOpen, setFilterPaymentDropdownOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStatusDropdownOpen, setFilterStatusDropdownOpen] = useState(false)
  const [filterMinItems, setFilterMinItems] = useState('')
  const [filterMinValue, setFilterMinValue] = useState('')

  const filterSupplierRef = useRef<HTMLDivElement>(null)
  const filterPaymentRef = useRef<HTMLDivElement>(null)
  const filterStatusRef = useRef<HTMLDivElement>(null)

  // Paginace
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Modal pro doplnění faktury
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState<ReceivedInvoice | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  // Funkce pro barevný status badge
  function getStatusBadge(status: string) {
    if (status === 'storno') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          STORNO
        </span>
      )
    }

    if (status === 'pending') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Čeká
        </span>
      )
    }

    if (status === 'confirmed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Potvrzena
        </span>
      )
    }

    if (status === 'partially_received') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Částečně přijata
        </span>
      )
    }

    if (status === 'received') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Přijata
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Aktivní
      </span>
    )
  }

  useEffect(() => {
    if (highlightId && filteredInvoices.length > 0) {
      const index = filteredInvoices.findIndex(item => item.id === highlightId)

      if (index !== -1) {
        const pageNumber = Math.floor(index / itemsPerPage) + 1
        setCurrentPage(pageNumber)

        setExpandedInvoices(new Set([highlightId]))

        setTimeout(() => {
          const element = document.getElementById(`invoice-${highlightId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [highlightId, filteredInvoices, itemsPerPage])

  function toggleExpand(invoiceId: string) {
    const newExpanded = new Set(expandedInvoices)
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId)
    } else {
      newExpanded.add(invoiceId)
    }
    setExpandedInvoices(newExpanded)
  }

  // Zavřít dropdown při kliknutí mimo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterSupplierRef.current && !filterSupplierRef.current.contains(event.target as Node)) {
        setFilterSupplierDropdownOpen(false)
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

  // Filtrování
  useEffect(() => {
    let filtered = [...invoices]

    // Filtr podle čísla faktury
    if (filterNumber) {
      filtered = filtered.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(filterNumber.toLowerCase())
      )
    }

    // Filtr podle data vystavení
    if (filterDate) {
      filtered = filtered.filter(inv => {
        const invDate = new Date(inv.invoiceDate).toISOString().split('T')[0]
        return invDate === filterDate
      })
    }

    // Filtr podle dodavatele - textové vyhledávání
    if (filterSupplier) {
      if (filterSupplier === '__anonymous__') {
        filtered = filtered.filter(inv => {
          const supplier = inv.receipts?.[0]?.supplier || inv.purchaseOrder?.supplier
          return !supplier
        })
      } else {
        filtered = filtered.filter(inv => {
          const supplier = inv.receipts?.[0]?.supplier || inv.purchaseOrder?.supplier
          const name = supplier?.name || ''
          return name.toLowerCase().includes(filterSupplier.toLowerCase())
        })
      }
    }

    // Filtr podle typu platby
    if (filterPayment !== 'all') {
      filtered = filtered.filter(inv => {
        if (filterPayment === 'none') {
          return !inv.paymentType
        }
        return inv.paymentType === filterPayment
      })
    }

    // Filtr podle statusu
    if (filterStatus !== 'all') {
      filtered = filtered.filter(inv => inv.status === filterStatus)
    }

    // Filtr podle minimálního počtu položek
    if (filterMinItems) {
      const minItems = parseInt(filterMinItems)
      filtered = filtered.filter(inv => ((inv as any).items?.length || 0) >= minItems)
    }

    // Filtr podle minimální hodnoty
    if (filterMinValue) {
      const minVal = parseFloat(filterMinValue)
      filtered = filtered.filter(inv => inv.totalAmount >= minVal)
    }

    setFilteredInvoices(filtered)
    setCurrentPage(1)
  }, [invoices, filterNumber, filterDate, filterSupplier, filterPayment, filterStatus, filterMinItems, filterMinValue])

  async function loadData() {
    try {
      const [invoicesRes, suppliersRes, settingsRes] = await Promise.all([
        fetch('/api/invoices/received'),
        fetch('/api/suppliers'),
        fetch('/api/settings')
      ])
      const invoicesData = await invoicesRes.json()
      const suppliersData = await suppliersRes.json()
      const settingsData = await settingsRes.json()
      setInvoices(invoicesData)
      setSuppliers(suppliersData)
      setIsVatPayer(settingsData.isVatPayer ?? true)
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
      alert('Nepodařilo se načíst data')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, invoiceId: string) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/', 'application/pdf']
    const isAllowed = allowedTypes.some(type => file.type.startsWith(type))

    if (!isAllowed) {
      alert('Prosím nahrajte obrázek (JPG, PNG, atd.) nebo PDF')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Soubor je příliš velký. Maximum je 10MB.')
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Nepodařilo se nahrát soubor')
      }

      const data = await response.json()

      // Update invoice with attachment URL
      const updateRes = await fetch(`/api/received-invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentUrl: data.url })
      })

      if (!updateRes.ok) {
        throw new Error('Nepodařilo se uložit přílohu')
      }

      loadData()
      alert('Soubor byl úspěšně nahrán!')
    } catch (error) {
      console.error('Chyba při nahrávání souboru:', error)
      alert('Nepodařilo se nahrát soubor')
    }
  }


  async function handleStorno(invoiceId: string) {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (!invoice) return

    if (invoice.status === 'storno') {
      alert('Tato faktura je již stornována')
      return
    }

    const reason = prompt(`Opravdu chceš stornovat fakturu ${invoice.invoiceNumber}?\n\nZadej důvod storna (volitelně):`)

    if (reason === null) {
      // Uživatel klikl na Zrušit
      return
    }

    try {
      const res = await fetch(`/api/invoices/received/${invoiceId}/storno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Nepodařilo se stornovat fakturu')
      }

      alert(`Faktura byla stornována!\n\n⚠️ ${data.warning}`)
      loadData()
    } catch (error: any) {
      console.error('Chyba při stornování:', error)
      alert(`Chyba: ${error.message}`)
    }
  }

  function handleOpenDetailsModal(invoice: ReceivedInvoice) {
    setSelectedInvoiceForDetails(invoice)
    setShowDetailsModal(true)
  }

  async function handleSaveInvoiceDetails(details: any) {
    if (!selectedInvoiceForDetails) return

    console.log('🟡 handleSaveInvoiceDetails - details:', details)
    console.log('🟡 supplierWebsite:', details.supplierWebsite)

    try {
      const res = await fetch(`/api/invoices/received/${selectedInvoiceForDetails.id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Nepodařilo se uložit údaje')
      }

      alert('Údaje faktury byly uloženy')
      await loadData()
      setShowDetailsModal(false)
      setSelectedInvoiceForDetails(null)
    } catch (error: any) {
      console.error('Chyba při ukládání:', error)
      throw error
    }
  }

  async function handleApplyDiscount(invoiceId: string, discountType: string, discountValue: string) {
    if (!discountValue) {
      alert('Zadejte hodnotu slevy')
      return
    }

    if (!confirm('Opravdu chcete uplatnit slevu dodavatele? Tato akce upraví ceny položek v objednávce a faktuře.')) {
      return
    }

    try {
      const res = await fetch(`/api/received-invoices/${invoiceId}/apply-discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discountType,
          discountValue: parseFloat(discountValue)
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Chyba při uplatňování slevy')
      }

      alert('Sleva dodavatele byla úspěšně uplatněna!')
      await loadData()
    } catch (error: any) {
      console.error('Chyba při uplatňování slevy:', error)
      alert(error.message || 'Nepodařilo se uplatnit slevu')
    }
  }

  async function handleSaveAsSupplier(details: any) {
    if (!selectedInvoiceForDetails) return

    console.log('🔵 handleSaveAsSupplier - details:', details)
    console.log('🔵 supplierWebsite:', details.supplierWebsite)

    // ✅ VALIDACE NEJDŘÍV - před jakýmkoliv ukládáním
    if (!details.supplierName) {
      throw new Error('Vyplňte alespoň název dodavatele')
    }

    try {
      // Nejdřív vytvoř dodavatele v DB
      const supplierData = {
        name: details.supplierName,
        entityType: details.supplierEntityType || 'company',
        contact: details.supplierContactPerson,
        email: details.supplierEmail,
        phone: details.supplierPhone,
        ico: details.supplierIco,
        dic: details.supplierDic,
        bankAccount: details.supplierBankAccount,
        website: details.supplierWebsite,
        address: details.supplierAddress,
        note: details.supplierNote
      }
      console.log('🟢 Posílám na /api/suppliers:', supplierData)

      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Nepodařilo se uložit dodavatele')
      }

      const newSupplier = await res.json()

      // Teď ulož data do faktury a objednávky
      await handleSaveInvoiceDetails(details)

      await loadData()
    } catch (error: any) {
      console.error('Chyba při ukládání dodavatele:', error)
      throw error
    }
  }


  if (loading) {
    return (
      <div className="p-8">
        <p>Načítání...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hlavička */}
      <div className="bg-gradient-to-r from-slate-50 to-emerald-50 border-l-4 border-emerald-500 rounded-lg shadow-sm py-4 px-6 mb-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-emerald-600">
            Přijaté faktury
            <span className="text-sm font-normal text-gray-600 ml-3">
              (Zobrazeno <span className="font-semibold text-emerald-600">{filteredInvoices.length}</span> z <span className="font-semibold text-gray-700">{invoices.length}</span>)
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
              setFilterSupplier('')
              setFilterPayment('all')
              setFilterStatus('all')
              setFilterMinItems('')
              setFilterMinValue('')
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

          {/* Textový input s dropdownem - Dodavatel */}
          <div ref={filterSupplierRef} className="relative">
            <input
              type="text"
              value={filterSupplier === '__anonymous__' ? 'Anonymní' : filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              onFocus={() => setFilterSupplierDropdownOpen(true)}
              placeholder="Dodavatel..."
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />

            {filterSupplierDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                {/* Anonymní */}
                <div
                  onClick={() => {
                    setFilterSupplier('__anonymous__')
                    setFilterSupplierDropdownOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-gray-500 italic text-center"
                >
                  Anonymní dodavatel
                </div>

                {/* Seznam dodavatelů */}
                {suppliers.map(supplier => (
                  <div
                    key={supplier.id}
                    onClick={() => {
                      setFilterSupplier(supplier.name)
                      setFilterSupplierDropdownOpen(false)
                    }}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center"
                  >
                    {supplier.name}
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
              {filterStatus === 'pending' && <span className="text-yellow-600">Čeká</span>}
              {filterStatus === 'partially_received' && <span className="text-orange-600">Částečně</span>}
              {filterStatus === 'received' && <span className="text-green-600">Přijato</span>}
              {filterStatus === 'storno' && <span className="text-red-600">Storno</span>}
            </div>

            {filterStatusDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
                <div onClick={() => { setFilterStatus('all'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center">Vše</div>
                <div onClick={() => { setFilterStatus('pending'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-yellow-600">Čeká</div>
                <div onClick={() => { setFilterStatus('partially_received'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-orange-600">Částečně</div>
                <div onClick={() => { setFilterStatus('received'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-green-600">Přijato</div>
                <div onClick={() => { setFilterStatus('storno'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-red-600">Storno</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div ref={sectionRef} className="space-y-2">
        {invoices.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-gray-500 mb-4">Zatím nemáte žádné přijaté faktury</p>
            <p className="text-sm text-gray-400">
              Faktury se automaticky vytvoří při zpracování příjemky, nebo můžete vytvořit fakturu ručně
            </p>
          </div>
        ) : (
          <>
            {/* Hlavička tabulky */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-700">
              <div className="w-8"></div>
              <div className="text-center">Číslo</div>
              <div className="text-center">Datum</div>
              <div className="text-center">Dodavatel</div>
              <div className="text-center">Typ platby</div>
              <div className="text-center">Položek</div>
              <div className="text-center">Hodnota</div>
              <div className="text-center">Status</div>
            </div>

            {filteredInvoices
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((invoice) => (
            <div
              key={invoice.id}
              id={`invoice-${invoice.id}`}
              className={`border rounded-lg ${
                highlightId === invoice.id ? 'ring-2 ring-blue-500 bg-blue-50' :
                expandedInvoices.has(invoice.id) ? 'ring-2 ring-blue-400' : ''
              } ${
                invoice.isTemporary ? 'border-orange-400 bg-orange-50' : ''
              }`}
            >
              <div className={`p-4 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 transition-colors ${invoice.status === 'storno' ? 'bg-red-50 opacity-70' : 'hover:bg-gray-50'}`}>
                {/* Rozbalit/sbalit */}
                <button
                  onClick={() => toggleExpand(invoice.id)}
                  className="flex-shrink-0 w-8"
                >
                  {expandedInvoices.has(invoice.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {/* Číslo */}
                <div
                  className="cursor-pointer text-center"
                  onClick={() => toggleExpand(invoice.id)}
                >
                  <p className={`text-sm font-semibold text-gray-900 truncate ${invoice.status === 'storno' ? 'line-through' : ''}`}>
                    {invoice.invoiceNumber}
                  </p>
                  {invoice.isTemporary && invoice.status !== 'storno' && (
                    <p className="text-xs text-orange-600 mt-0.5">
                      Doplň údaje o faktuře
                    </p>
                  )}
                </div>

                {/* Datum */}
                <div
                  className="cursor-pointer text-center"
                  onClick={() => toggleExpand(invoice.id)}
                >
                  <p className="text-sm text-gray-700">
                    {new Date(invoice.invoiceDate).toLocaleDateString('cs-CZ')}
                  </p>
                </div>

                {/* Dodavatel */}
                <div className="text-center">
                  {(() => {
                    // Zkus najít dodavatele z příjemky nebo objednávky
                    let supplier = invoice.receipts?.[0]?.supplier || invoice.purchaseOrder?.supplier

                    // Pokud není na příjemce ani objednávce, zkus najít podle jména z faktury
                    if (!supplier && invoice.supplierName) {
                      supplier = suppliers.find(s => s.name === invoice.supplierName)
                    }

                    if (supplier && supplier.id) {
                      return (
                        <a
                          href={`/suppliers?highlight=${supplier.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {supplier.name}
                        </a>
                      )
                    }
                    return (
                      <p
                        className="text-sm text-gray-700 truncate cursor-pointer"
                        onClick={() => toggleExpand(invoice.id)}
                      >
                        {invoice.supplierName || invoice.purchaseOrder?.supplierName || '-'}
                      </p>
                    )
                  })()}
                </div>

                {/* Typ platby */}
                <div className="cursor-pointer text-center" onClick={() => toggleExpand(invoice.id)}>
                  <p className="text-sm">
                    {invoice.paymentType === 'cash' && 'Hotovost'}
                    {invoice.paymentType === 'card' && 'Karta'}
                    {invoice.paymentType === 'transfer' && 'Převod'}
                    {!invoice.paymentType && '-'}
                  </p>
                </div>

                {/* Položek */}
                <div
                  className="cursor-pointer text-center"
                  onClick={() => toggleExpand(invoice.id)}
                >
                  <p className="text-sm text-gray-600">
                    {invoice.purchaseOrder?.items?.length || invoice.receipts?.reduce((sum, r) => sum + (r.items?.length || 0), 0) || 0}
                  </p>
                </div>

                {/* Hodnota */}
                <div
                  className="cursor-pointer text-center"
                  onClick={() => toggleExpand(invoice.id)}
                >
                  <p className="text-sm font-bold text-gray-900">
                    {Number(invoice.totalAmount).toLocaleString('cs-CZ')} Kč
                  </p>
                </div>

                {/* Status */}
                <div
                  className="cursor-pointer text-center"
                  onClick={() => toggleExpand(invoice.id)}
                >
                  {getStatusBadge(invoice.status || 'pending')}
                </div>

              </div>

              {expandedInvoices.has(invoice.id) && (
                <div className="border-t p-4 bg-gray-50">
                  {/* Detail příjemky / objednávky */}
                  <div>
                    {/* Modrý rámeček s objednávkou */}
                    {invoice.purchaseOrder && (
                      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-sm text-center">
                          <span className="text-gray-600">Objednávka: </span>
                          <a
                            href={`/purchase-orders?highlight=${invoice.purchaseOrder.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {invoice.purchaseOrder.orderNumber}
                            <ExternalLink className="w-3 h-3 inline ml-1" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Informace o faktuře */}
                    <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                      <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Informace o faktuře</h4>

                      <div className="border-b">
                        <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Obecné</h5>
                        <div className="text-sm">
                          <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                            <div><span className="text-gray-600">Datum vytvoření:</span> <span className="font-medium">{invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('cs-CZ') : '-'}</span></div>
                            <div className="border-l border-gray-200 mx-4"></div>
                            <div><span className="text-gray-600">Datum dodání:</span> <span className="font-medium">{invoice.receipts && invoice.receipts.length > 0 ? invoice.receipts.map(r => new Date(r.receiptDate).toLocaleDateString('cs-CZ')).join(', ') : '-'}</span></div>
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                            <div><span className="text-gray-600">Očekávané dodání:</span> <span className="font-medium">{invoice.purchaseOrder?.expectedDate ? new Date(invoice.purchaseOrder.expectedDate).toLocaleDateString('cs-CZ') : '-'}</span></div>
                            <div className="border-l border-gray-200 mx-4"></div>
                            <div><span className="text-gray-600">Typ platby:</span> <span className="font-medium">
                              {invoice.paymentType === 'cash' && 'Hotovost'}
                              {invoice.paymentType === 'card' && 'Karta'}
                              {invoice.paymentType === 'transfer' && 'Bankovní převod'}
                              {!['cash', 'card', 'transfer'].includes(invoice.paymentType) && invoice.paymentType}
                            </span></div>
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                            <div><span className="text-gray-600">Datum splatnosti:</span> <span className="font-medium">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('cs-CZ') : '-'}</span></div>
                            <div className="border-l border-gray-200 mx-4"></div>
                            <div><span className="text-gray-600">Poznámka:</span> <span className="font-medium">{invoice.note || '-'}</span></div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Dodavatel</h5>
                        <div className="text-sm">
                          {(() => {
                            // Zjistíme typ entity (firma/FO) - PRIORITA: faktura → objednávka → supplier
                            const po = invoice.purchaseOrder as any
                            const entityType = (invoice as any).supplierEntityType || po?.supplierEntityType || po?.supplier?.entityType || 'company'

                            return (
                              <>
                                {/* Název a typ subjektu */}
                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                  <div>
                                    <span className="text-gray-600">Název:</span>
                                    <span className="font-medium">{(invoice as any).supplierName || po?.supplierName || po?.supplier?.name || (invoice as any).receipts?.[0]?.supplier?.name || 'Anonymní dodavatel'}</span>
                                    {entityType && (
                                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                        {entityType === 'company' ? '🏢 Firma' : '👤 FO'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  {/* Kontaktní osoba pouze pro firmy */}
                                  {entityType === 'company' && (
                                    <div><span className="text-gray-600">Kontaktní osoba:</span> <span className="font-medium">{(invoice as any).supplierContactPerson || po?.supplierContactPerson || po?.supplier?.contact || '-'}</span></div>
                                  )}
                                  {/* Pro FO zobrazíme Email */}
                                  {entityType === 'individual' && (
                                    <div><span className="text-gray-600">Email:</span> <span className="font-medium">{(invoice as any).supplierEmail || po?.supplierEmail || po?.supplier?.email || '-'}</span></div>
                                  )}
                                </div>

                                {/* Adresa a Telefon - vždy */}
                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                  <div><span className="text-gray-600">Adresa:</span> <span className="font-medium">{(invoice as any).supplierAddress || po?.supplierAddress || po?.supplier?.address || '-'}</span></div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  <div><span className="text-gray-600">Telefon:</span> <span className="font-medium">{(invoice as any).supplierPhone || po?.supplierPhone || po?.supplier?.phone || '-'}</span></div>
                                </div>

                                {/* Pro FIRMU: IČO a Email */}
                                {entityType === 'company' && (
                                  <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                    <div><span className="text-gray-600">IČO:</span> <span className="font-medium">{(invoice as any).supplierIco || po?.supplierICO || po?.supplier?.ico || '-'}</span></div>
                                    <div className="border-l border-gray-200 mx-4"></div>
                                    <div><span className="text-gray-600">Email:</span> <span className="font-medium">{(invoice as any).supplierEmail || po?.supplierEmail || po?.supplier?.email || '-'}</span></div>
                                  </div>
                                )}

                                {/* Pro FIRMU: DIČ a Web */}
                                {entityType === 'company' && (
                                  <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                    <div><span className="text-gray-600">DIČ:</span> <span className="font-medium">{(invoice as any).supplierDic || po?.supplierDIC || po?.supplier?.dic || '-'}</span></div>
                                    <div className="border-l border-gray-200 mx-4"></div>
                                    <div><span className="text-gray-600">Web:</span> <span className="font-medium">{(invoice as any).supplierWebsite || po?.supplierWebsite || po?.supplier?.website || '-'}</span></div>
                                  </div>
                                )}

                                {/* Bankovní účet a Poznámka - vždy */}
                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                  <div><span className="text-gray-600">Bankovní účet:</span> <span className="font-medium">{(invoice as any).supplierBankAccount || po?.supplierBankAccount || po?.supplier?.bankAccount || '-'}</span></div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  <div><span className="text-gray-600">Poznámka:</span> <span className="font-medium">{invoice.note || po?.note || po?.supplier?.note || '-'}</span></div>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Položky objednávky */}
                    {invoice.purchaseOrder?.items && invoice.purchaseOrder.items.length > 0 ? (
                      <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Položky ({invoice.purchaseOrder.items.length})</h4>
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
                          {invoice.purchaseOrder.items.map((item: any, i: number) => {
                            const unitPrice = Number(item.expectedPrice || 0)
                            const itemVatRate = Number(item.vatRate || DEFAULT_VAT_RATE)
                            const isItemNonVat = isNonVatPayer(itemVatRate)

                            // Výpočty DPH
                            const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                            const priceWithVatPerUnit = unitPrice + vatPerUnit
                            const totalWithoutVat = Number(item.quantity) * unitPrice
                            const totalWithVat = Number(item.quantity) * priceWithVatPerUnit

                            return isVatPayer ? (
                              <div key={i} className={`grid grid-cols-[3fr_repeat(6,1fr)] gap-2 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-xs`}>
                                <div className="text-gray-900">{item.product?.name || item.productName}</div>
                                <div className="text-center text-gray-700">{item.quantity} {item.unit}</div>
                                <div className="text-center text-gray-500">{isItemNonVat ? '-' : `${itemVatRate}%`}</div>
                                <div className="text-center text-gray-700">{formatPrice(unitPrice)}</div>
                                <div className="text-center text-gray-500">{isItemNonVat ? '-' : formatPrice(vatPerUnit)}</div>
                                <div className="text-center text-gray-700">{formatPrice(priceWithVatPerUnit)}</div>
                                <div className="text-center font-semibold text-gray-900">{formatPrice(totalWithVat)}</div>
                              </div>
                            ) : (
                              <div key={i} className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                <div className="text-gray-900">{item.product?.name || item.productName}</div>
                                <div className="text-right text-gray-700">{item.quantity} {item.unit}</div>
                                <div className="text-right text-gray-700">{formatPrice(unitPrice)}</div>
                                <div className="text-right font-semibold text-gray-900">{formatPrice(totalWithoutVat)}</div>
                              </div>
                            )
                          })}

                          {/* Mezisoučet / Sleva / Celková částka */}
                          {(invoice as any).discountAmount && (invoice as any).discountAmount > 0 ? (
                            <>
                              {/* Mezisoučet před slevou */}
                              <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-50 border-t text-sm`}>
                                <div className={isVatPayer ? 'col-span-6' : 'col-span-3'} style={{ fontWeight: 500, color: '#374151' }}>Mezisoučet</div>
                                <div className="text-center font-medium text-gray-700">
                                  {(() => {
                                    const subtotal = parseFloat(invoice.totalAmount.toString()) + parseFloat((invoice as any).discountAmount.toString())
                                    return formatPrice(subtotal)
                                  })()}
                                </div>
                              </div>

                              {/* Sleva */}
                              <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-yellow-50 text-sm`}>
                                <div className={isVatPayer ? 'col-span-6' : 'col-span-3'} style={{ fontWeight: 500, color: '#111827' }}>
                                  Sleva dodavatele
                                  {(invoice as any).discountType === 'percentage' && (invoice as any).discountValue && (
                                    <span className="text-sm text-gray-600 ml-2">
                                      ({(invoice as any).discountValue}%)
                                    </span>
                                  )}
                                  {(invoice as any).discountType === 'fixed' && (
                                    <span className="text-sm text-gray-600 ml-2">
                                      (pevná částka)
                                    </span>
                                  )}
                                </div>
                                <div className="text-center font-medium text-red-600">
                                  -{formatPrice((invoice as any).discountAmount)}
                                </div>
                              </div>

                              {/* Celková částka po slevě */}
                              <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                                <div className={isVatPayer ? 'col-span-6' : 'col-span-3'}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                                <div className="text-center">
                                  {formatPrice(invoice.totalAmount)}
                                </div>
                              </div>
                            </>
                          ) : (
                            /* Celková částka bez slevy */
                            <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                              <div className={isVatPayer ? 'col-span-6' : 'col-span-3'}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                              <div className="text-center">
                                {formatPrice(invoice.totalAmount)}
                              </div>
                            </div>
                          )}

                          {/* Sleva od dodavatele - uplatnění */}
                          {invoice.status !== 'storno' && !(invoice as any).discountAmount && (
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-t-2 border-orange-300">
                              <div className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 text-orange-900 font-semibold flex-shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm">Uplatnit slevu dodavatele</span>
                                  </div>

                                  <select
                                    value={(invoice as any)._tempDiscountType || 'percentage'}
                                    onChange={(event) => {
                                      const selectedType = event.target.value;
                                      (invoice as any)._tempDiscountType = selectedType;
                                      (invoice as any)._tempDiscountValue = '';
                                      setInvoices([...invoices]);
                                    }}
                                    className="px-2 py-1 border border-orange-300 rounded text-xs focus:border-orange-500 focus:ring-orange-500 bg-white"
                                  >
                                    <option value="percentage">%</option>
                                    <option value="fixed">Kč</option>
                                  </select>

                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={(invoice as any)._tempDiscountType === 'percentage' ? '100' : undefined}
                                    value={(invoice as any)._tempDiscountValue || ''}
                                    onChange={(event) => {
                                      const inputValue = event.target.value;
                                      (invoice as any)._tempDiscountValue = inputValue;
                                      setInvoices([...invoices]);
                                    }}
                                    placeholder={(invoice as any)._tempDiscountType === 'fixed' ? '100' : '10'}
                                    className="w-24 px-2 py-1 border border-orange-300 rounded text-xs focus:border-orange-500 focus:ring-orange-500 bg-white"
                                  />

                                  {(invoice as any)._tempDiscountValue && (() => {
                                    const subtotal = invoice.purchaseOrder.items.reduce((sum: number, item: any) =>
                                      sum + (item.quantity * (item.expectedPrice || 0)), 0)
                                    const discountType = (invoice as any)._tempDiscountType || 'percentage'
                                    const discountAmount = discountType === 'percentage'
                                      ? (subtotal * parseFloat((invoice as any)._tempDiscountValue)) / 100
                                      : parseFloat((invoice as any)._tempDiscountValue)
                                    const newTotal = subtotal - discountAmount

                                    return (
                                      <>
                                        <div className="flex items-center gap-2 text-xs text-orange-700">
                                          <span className="text-gray-500">→</span>
                                          <span>Sleva:</span>
                                          <span className="font-bold">-{discountAmount.toLocaleString('cs-CZ')} Kč</span>
                                          <span className="text-gray-500">|</span>
                                          <span>Nová cena:</span>
                                          <span className="font-bold text-orange-900">{newTotal.toLocaleString('cs-CZ')} Kč</span>
                                        </div>

                                        <button
                                          onClick={() => handleApplyDiscount(invoice.id, discountType, (invoice as any)._tempDiscountValue)}
                                          className="ml-auto px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded font-medium transition-colors"
                                        >
                                          Uplatnit
                                        </button>
                                      </>
                                    )
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* Příjemky - zobrazit pouze pokud existují */}
                    {invoice.receipts && invoice.receipts.length > 0 && (
                      <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Příjemky ({invoice.receipts.length})</h4>

                        <div className="text-sm">
                          {/* Hlavička mini-tabulky */}
                          <div className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
                            <div>Číslo příjemky</div>
                            <div>Datum</div>
                            <div className="text-center">Položek</div>
                            <div className="text-right">Částka</div>
                            <div className="w-4"></div>
                          </div>

                          {/* Řádky příjemek */}
                          {invoice.receipts.map((receipt, idx) => {
                            const receiptTotal = receipt.items?.reduce(
                              (sum, item) => {
                                const actualQuantity = item.receivedQuantity || item.quantity
                                return sum + (Number(actualQuantity) * Number(item.purchasePrice))
                              },
                              0
                            ) || 0

                            return (
                              <a
                                key={receipt.id}
                                href={`/receipts?highlight=${receipt.id}`}
                                className={`grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-2 hover:bg-blue-50 transition-colors items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Číslo příjemky + Status */}
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-blue-600 hover:underline text-sm">
                                    {receipt.receiptNumber}
                                  </span>
                                  {receipt.status === 'storno' && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                                      STORNO
                                    </span>
                                  )}
                                </div>

                                <div className="text-sm text-gray-700">
                                  {new Date(receipt.receiptDate).toLocaleDateString('cs-CZ')}
                                </div>

                                <div className="text-sm text-gray-700 text-center">
                                  {receipt.items?.length || 0}
                                </div>

                                <div className="text-sm font-semibold text-gray-900 text-right">
                                  {receiptTotal.toLocaleString('cs-CZ')} Kč
                                </div>

                                <div className="flex justify-end">
                                  <ExternalLink className="w-4 h-4 text-blue-600" />
                                </div>
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Storno info */}
                    {invoice.status === 'storno' && invoice.stornoReason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm font-medium text-red-900">Stornováno</p>
                        <p className="text-sm text-red-700 mt-1">Důvod: {invoice.stornoReason}</p>
                        {invoice.stornoAt && (
                          <p className="text-xs text-red-600 mt-1">
                            Datum storna: {new Date(invoice.stornoAt).toLocaleDateString('cs-CZ')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Tlačítka akcí */}
                    {invoice.status !== 'storno' && (
                      <div className="mt-3 flex justify-between items-end">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenDetailsModal(invoice)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center gap-1"
                          >
                            <FileEdit className="w-4 h-4" />
                            Doplnit fakturu
                          </button>
                          {invoice.attachmentUrl ? (
                            <a
                              href={invoice.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded flex items-center gap-1"
                            >
                              <FileText className="w-4 h-4" />
                              Zobrazit fakturu
                            </a>
                          ) : (
                            <label className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded flex items-center gap-1 cursor-pointer">
                              <FileText className="w-4 h-4" />
                              Nahrát soubor
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, invoice.id)}
                              />
                            </label>
                          )}
                        </div>
                        <button
                          onClick={() => handleStorno(invoice.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded flex items-center gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          Stornovat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

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

      {/* Modal pro doplnění faktury */}
      <InvoiceDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false)
          setSelectedInvoiceForDetails(null)
        }}
        onSave={handleSaveInvoiceDetails}
        onSaveAsSupplier={handleSaveAsSupplier}
        initialData={selectedInvoiceForDetails ? {
          invoiceDate: selectedInvoiceForDetails.invoiceDate ? new Date(selectedInvoiceForDetails.invoiceDate).toISOString().split('T')[0] : '',
          dueDate: selectedInvoiceForDetails.dueDate ? new Date(selectedInvoiceForDetails.dueDate).toISOString().split('T')[0] : '',
          expectedDeliveryDate: selectedInvoiceForDetails.purchaseOrder?.expectedDate ? new Date(selectedInvoiceForDetails.purchaseOrder.expectedDate).toISOString().split('T')[0] : '',
          paymentType: selectedInvoiceForDetails.paymentType || '',
          variableSymbol: selectedInvoiceForDetails.variableSymbol || '',
          constantSymbol: selectedInvoiceForDetails.constantSymbol || '',
          specificSymbol: selectedInvoiceForDetails.specificSymbol || '',
          // ✅ OPRAVENO: Preferuj údaje z faktury, pak z objednávky (supplierName nebo supplier.name), pak z příjemky
          supplierName: (selectedInvoiceForDetails as any).supplierName ||
                        (selectedInvoiceForDetails.purchaseOrder as any)?.supplierName ||
                        (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.name ||
                        (selectedInvoiceForDetails as any).receipts?.[0]?.supplier?.name || '',
          supplierContactPerson: (selectedInvoiceForDetails as any).supplierContactPerson ||
                                 (selectedInvoiceForDetails.purchaseOrder as any)?.supplierContactPerson ||
                                 (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.contact || '',
          supplierEmail: (selectedInvoiceForDetails as any).supplierEmail ||
                        (selectedInvoiceForDetails.purchaseOrder as any)?.supplierEmail ||
                        (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.email || '',
          supplierPhone: (selectedInvoiceForDetails as any).supplierPhone ||
                        (selectedInvoiceForDetails.purchaseOrder as any)?.supplierPhone ||
                        (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.phone || '',
          supplierIco: (selectedInvoiceForDetails as any).supplierIco ||
                      (selectedInvoiceForDetails.purchaseOrder as any)?.supplierICO ||
                      (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.ico || '',
          supplierDic: (selectedInvoiceForDetails as any).supplierDic ||
                      (selectedInvoiceForDetails.purchaseOrder as any)?.supplierDIC ||
                      (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.dic || '',
          supplierBankAccount: (selectedInvoiceForDetails as any).supplierBankAccount ||
                              (selectedInvoiceForDetails.purchaseOrder as any)?.supplierBankAccount ||
                              (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.bankAccount || '',
          supplierWebsite: (selectedInvoiceForDetails as any).supplierWebsite ||
                          (selectedInvoiceForDetails.purchaseOrder as any)?.supplierWebsite ||
                          (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.website || '',
          supplierAddress: (selectedInvoiceForDetails as any).supplierAddress ||
                          (selectedInvoiceForDetails.purchaseOrder as any)?.supplierAddress ||
                          (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.address || '',
          supplierEntityType: (selectedInvoiceForDetails as any).supplierEntityType ||
                             (selectedInvoiceForDetails.purchaseOrder as any)?.supplierEntityType ||
                             (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.entityType || 'company',
          supplierNote: (selectedInvoiceForDetails as any).supplierNote || '',
          note: selectedInvoiceForDetails.note ||
                (selectedInvoiceForDetails.purchaseOrder as any)?.note || ''
        } : undefined}
        type="received"
      />
    </div>
  )
}
