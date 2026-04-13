// Stránka pro příjemky (Receipts)
// URL: /receipts

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Package, CheckCircle, FileText, ChevronDown, ChevronRight, Trash2, XCircle, FileDown, ExternalLink } from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'
import { generateReceiptPDF, openPDFInNewTab } from '@/lib/pdfGenerator'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'

interface Supplier {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  unit: string
  purchasePrice?: number
  vatRate?: number
}

interface PurchaseOrder {
  id: string
  orderNumber: string
  status: string
  supplier?: Supplier
  items: any[]
}

interface ReceiptItem {
  id?: string
  productId?: string
  productName?: string
  isManual: boolean
  quantity: number
  receivedQuantity?: number // Skutečně přijaté množství
  unit: string
  purchasePrice: number
  vatRate?: number
  vatAmount?: number
  priceWithVat?: number
  product?: Product
  inventoryItemId?: string // Pro propojení se skladovým pohybem
}

interface ReceivedInvoice {
  id: string
  invoiceNumber: string
}

interface Receipt {
  id: string
  receiptNumber: string
  receiptDate: string
  status: string
  stornoReason?: string
  stornoAt?: string
  stornoBy?: string
  processedAt?: string
  note?: string
  supplier?: Supplier
  supplierName?: string
  purchaseOrder?: PurchaseOrder
  receivedInvoice?: ReceivedInvoice
  items: ReceiptItem[]
  inventoryItems?: any[]
}

export default function ReceiptsPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [pendingOrders, setPendingOrders] = useState<PurchaseOrder[]>([]) // Očekávané objednávky
  const [pendingOrdersError, setPendingOrdersError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedReceipts, setExpandedReceipts] = useState<Set<string>>(new Set())
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([])
  const [filterNumber, setFilterNumber] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterMinItems, setFilterMinItems] = useState('')
  const [filterMinValue, setFilterMinValue] = useState('')
  const [filterSupplierDropdownOpen, setFilterSupplierDropdownOpen] = useState(false)
  const [filterStatusDropdownOpen, setFilterStatusDropdownOpen] = useState(false)
  const highlightRef = useRef<HTMLDivElement>(null)
  const filterSupplierRef = useRef<HTMLDivElement>(null)
  const filterStatusRef = useRef<HTMLDivElement>(null)

  // Stránkování pro příjemky
  const [receiptsCurrentPage, setReceiptsCurrentPage] = useState(1)
  const [receiptsItemsPerPage, setReceiptsItemsPerPage] = useState(20)
  const receiptsSectionRef = useRef<HTMLDivElement>(null)

  // Filtry pro očekávané příjemky
  const [pendingFilterOrderNumber, setPendingFilterOrderNumber] = useState('')
  const [pendingFilterSupplier, setPendingFilterSupplier] = useState('')
  const [pendingFilterDate, setPendingFilterDate] = useState('')
  const [pendingFilterSupplierDropdownOpen, setPendingFilterSupplierDropdownOpen] = useState(false)
  const pendingFilterSupplierRef = useRef<HTMLDivElement>(null)
  const [filteredPendingOrders, setFilteredPendingOrders] = useState<PurchaseOrder[]>([])
  const [expandedPendingOrders, setExpandedPendingOrders] = useState<Set<string>>(new Set())

  // Rozkliknutí sekce očekávaných příjemek - výchozí stav: rozbaleno
  const [isPendingSectionExpanded, setIsPendingSectionExpanded] = useState(true)

  // DPH nastavení
  const [isVatPayer, setIsVatPayer] = useState(true)

  // Stránkování pro očekávané příjemky
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1)
  const [pendingItemsPerPage, setPendingItemsPerPage] = useState(10)
  const pendingSectionRef = useRef<HTMLDivElement>(null)

  // Modal pro zpracování s fakturou
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [processingReceiptId, setProcessingReceiptId] = useState<string | null>(null)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null) // Pro přímé naskladnění
  const [processingReceiptItems, setProcessingReceiptItems] = useState<ReceiptItem[]>([])
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({})
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    note: ''
  })
  const [processReceiptDate, setProcessReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [hasExistingInvoice, setHasExistingInvoice] = useState(false) // Sleduj, jestli už má objednávka vyplněnou fakturu
  const [isInvoiceSectionExpanded, setIsInvoiceSectionExpanded] = useState(false) // Rozkliknutí sekce faktury

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (highlightId && filteredReceipts.length > 0) {
      const index = filteredReceipts.findIndex(item => item.id === highlightId)

      if (index !== -1) {
        const pageNumber = Math.floor(index / receiptsItemsPerPage) + 1
        setReceiptsCurrentPage(pageNumber)

        setExpandedReceipts(new Set([highlightId]))

        setTimeout(() => {
          const element = document.getElementById(`item-${highlightId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [highlightId, filteredReceipts, receiptsItemsPerPage])

  // Zavřít dropdown filtry při kliknutí mimo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterSupplierRef.current && !filterSupplierRef.current.contains(event.target as Node)) {
        setFilterSupplierDropdownOpen(false)
      }
      if (filterStatusRef.current && !filterStatusRef.current.contains(event.target as Node)) {
        setFilterStatusDropdownOpen(false)
      }
      if (pendingFilterSupplierRef.current && !pendingFilterSupplierRef.current.contains(event.target as Node)) {
        setPendingFilterSupplierDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    let filtered = [...receipts]

    if (filterNumber) {
      filtered = filtered.filter(r =>
        r.receiptNumber.toLowerCase().includes(filterNumber.toLowerCase())
      )
    }

    if (filterDate) {
      filtered = filtered.filter(r => {
        const rDate = new Date(r.receiptDate).toISOString().split('T')[0]
        return rDate === filterDate
      })
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'received') {
        // "Přijato" = všechny příjemky KROMĚ storno
        filtered = filtered.filter(r => r.status !== 'storno' && r.status !== 'cancelled')
      } else if (filterStatus === 'storno') {
        // "Storno" = storno nebo cancelled
        filtered = filtered.filter(r => r.status === 'storno' || r.status === 'cancelled')
      }
    }

    if (filterSupplier) {
      filtered = filtered.filter(r => {
        const supplierName = r.purchaseOrder?.supplier?.name || r.supplier?.name || r.supplierName || ''
        return supplierName.toLowerCase().includes(filterSupplier.toLowerCase())
      })
    }

    // Filtr podle minimálního počtu položek
    if (filterMinItems) {
      const minItems = parseInt(filterMinItems)
      filtered = filtered.filter(r => (r.items?.length || 0) >= minItems)
    }

    // Filtr podle minimální hodnoty
    if (filterMinValue) {
      const minVal = parseFloat(filterMinValue)
      filtered = filtered.filter(r => {
        const total = r.items.reduce((sum, item) => {
          const actualQuantity = item.receivedQuantity || item.quantity
          return sum + (actualQuantity * item.purchasePrice)
        }, 0)
        return total >= minVal
      })
    }

    setFilteredReceipts(filtered)
    setReceiptsCurrentPage(1) // Reset stránky při změně filtrů
  }, [receipts, filterNumber, filterDate, filterStatus, filterSupplier, filterMinItems, filterMinValue])

  // Filtrování očekávaných příjemek
  useEffect(() => {
    let filtered = [...pendingOrders]

    if (pendingFilterOrderNumber) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(pendingFilterOrderNumber.toLowerCase())
      )
    }

    if (pendingFilterSupplier) {
      filtered = filtered.filter(order => {
        const supplierName = order.supplier?.name || ''
        return supplierName.toLowerCase().includes(pendingFilterSupplier.toLowerCase())
      })
    }

    if (pendingFilterDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date((order as any).orderDate).toISOString().split('T')[0]
        return orderDate === pendingFilterDate
      })
    }

    setFilteredPendingOrders(filtered)
    setPendingCurrentPage(1) // Reset stránky při změně filtrů
  }, [pendingOrders, pendingFilterOrderNumber, pendingFilterSupplier, pendingFilterDate])

  async function loadData() {
    try {
      const [receiptsRes, suppliersRes, productsRes, pendingOrdersRes, settingsRes] = await Promise.all([
        fetch('/api/receipts'),
        fetch('/api/suppliers'),
        fetch('/api/products'),
        fetch('/api/purchase-orders/pending', { cache: 'no-store' }), // NOVÝ endpoint pro očekávané objednávky
        fetch('/api/settings')
      ])

      const [receiptsData, suppliersData, productsData, pendingOrdersData, settingsData] = await Promise.all([
        receiptsRes.json(),
        suppliersRes.json(),
        productsRes.json(),
        pendingOrdersRes.json(),
        settingsRes.json()
      ])

      setReceipts(Array.isArray(receiptsData) ? receiptsData : [])
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
      setProducts(Array.isArray(productsData) ? productsData : [])

      if (!pendingOrdersRes.ok || !Array.isArray(pendingOrdersData)) {
        const errMsg = pendingOrdersData?.error || `Chyba serveru (HTTP ${pendingOrdersRes.status})`
        console.error('[Příjemky] Chyba při načítání očekávaných příjemek:', errMsg)
        setPendingOrdersError(errMsg)
        setPendingOrders([])
      } else {
        setPendingOrders(pendingOrdersData)
        setPendingOrdersError(null)
      }

      setIsVatPayer(settingsData.isVatPayer !== false)
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
      alert('Nepodařilo se načíst data')
      setReceipts([])
      setSuppliers([])
      setProducts([])
      setPendingOrders([])
    } finally {
      setLoading(false)
    }
  }

  function togglePendingExpanded(orderId: string) {
    setExpandedPendingOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  function handleCreateFromOrder(orderId: string) {
    // Najdi objednávku v pendingOrders
    const order: any = pendingOrders.find(o => o.id === orderId)
    if (!order) return

    // Nastav processingOrder ID (ne receiptId!)
    setProcessingOrderId(orderId)
    setProcessingReceiptId(null) // Vyčisti receipt ID

    // Nastav položky z objednávky (jen ty se zbývajícím množstvím)
    const itemsWithRemaining = order.items
      .filter((item: any) => item.remainingQuantity > 0)
      .map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        product: item.product,
        quantity: item.quantity,
        receivedQuantity: item.remainingQuantity, // Předvyplněno zbývající množství
        unit: item.unit,
        purchasePrice: item.expectedPrice || 0,
        isManual: false,
        remainingQuantity: item.remainingQuantity, // Pro zobrazení v modalu
        alreadyReceived: Number(item.alreadyReceivedQuantity) // Pro zobrazení
      }))

    setProcessingReceiptItems(itemsWithRemaining)

    // Inicializuj receivedQuantities se zbývajícím množstvím
    const initialQuantities: Record<string, number> = {}
    itemsWithRemaining.forEach((item: any) => {
      initialQuantities[item.id] = item.remainingQuantity
    })
    setReceivedQuantities(initialQuantities)

    // Zkontroluj, jestli už objednávka má vyplněnou fakturu
    const invoice = (order as any).invoice
    const hasInvoice = !!(invoice && invoice.isTemporary === false)

    setHasExistingInvoice(hasInvoice)

    // Reset invoice data nebo načti existující
    if (hasInvoice) {
      setInvoiceData({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        note: invoice.note || ''
      })
    } else {
      setInvoiceData({
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        note: ''
      })
    }

    setShowProcessModal(true)
  }

  function handleProcessReceipt(receiptId: string) {
    // Najdi příjemku
    const receipt = receipts.find(r => r.id === receiptId)
    if (!receipt) return

    setProcessingReceiptId(receiptId)
    setProcessingReceiptItems(receipt.items || [])

    // Inicializuj receivedQuantities s receivedQuantity (už předvyplněno z BE)
    const initialQuantities: Record<string, number> = {}
    receipt.items.forEach(item => {
      if (item.id) {
        // Použij receivedQuantity pokud existuje, jinak quantity
        initialQuantities[item.id] = item.receivedQuantity ?? Number(item.quantity)
      }
    })
    setReceivedQuantities(initialQuantities)

    // Zkontroluj, jestli už příjemka má vyplněnou fakturu
    // Faktura je "vyplněná" = má receivedInvoice A ta faktura NENÍ dočasná (má reálné číslo)
    const invoice = (receipt as any).receivedInvoice
    const hasInvoice = !!(invoice && invoice.isTemporary === false)

    setHasExistingInvoice(hasInvoice)

    // Reset invoice data nebo načti existující
    if (hasInvoice) {
      setInvoiceData({
        invoiceNumber: invoice?.invoiceNumber || '',
        invoiceDate: invoice?.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        note: invoice?.note || ''
      })
    } else {
      setInvoiceData({
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        note: ''
      })
    }

    setShowProcessModal(true)
  }

  async function handleConfirmProcess(createInvoice: boolean = true) {
    // Rozlišuj mezi OBJEDNÁVKOU (přímé naskladnění) a PŘÍJEMKOU (staré)
    const isDirectReceive = processingOrderId !== null

    if (!processingOrderId && !processingReceiptId) return

    try {
      let res, url, body

      if (isDirectReceive) {
        // NOVÝ WORKFLOW: Přímé naskladnění z objednávky (ATOMIC)
        const items = processingReceiptItems.map((item: any) => ({
          productId: item.productId!,
          receivedQuantity: receivedQuantities[item.id!] || 0
        }))

        url = `/api/purchase-orders/${processingOrderId}/receive`
        body = {
          items,
          invoiceData,
          receiptDate: processReceiptDate
        }
      } else {
        // STARÝ WORKFLOW: Zpracování už existující příjemky
        const items = processingReceiptItems.map(item => ({
          id: item.id!,
          receivedQuantity: receivedQuantities[item.id!] || 0
        }))

        url = `/api/receipts/${processingReceiptId}/process`
        body = {
          items,
          createInvoice,
          invoiceData: createInvoice ? invoiceData : undefined,
          receiptDate: processReceiptDate
        }
      }

      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Chyba při zpracování')
      }

      const message = isDirectReceive
        ? '✅ Příjem úspěšně zpracován a naskladněn!'
        : 'Příjemka zpracována a naskladněna!'

      alert(message)
      setShowProcessModal(false)
      setProcessingReceiptId(null)
      setProcessingOrderId(null)
      setProcessingReceiptItems([])
      setReceivedQuantities({})
      setProcessReceiptDate(new Date().toISOString().split('T')[0])
      loadData()
    } catch (error: any) {
      console.error('Chyba:', error)
      alert(error.message || 'Nepodařilo se zpracovat příjem')
    }
  }

  function toggleExpanded(receiptId: string) {
    const newExpanded = new Set(expandedReceipts)
    if (newExpanded.has(receiptId)) {
      newExpanded.delete(receiptId)
    } else {
      newExpanded.add(receiptId)
    }
    setExpandedReceipts(newExpanded)
  }


  async function handleStorno(receiptId: string) {
    const receipt = receipts.find(r => r.id === receiptId)
    if (!receipt) return

    if (receipt.status === 'storno') {
      alert('Tato příjemka je již stornována')
      return
    }

    if (receipt.status === 'draft') {
      alert('Koncept lze přímo smazat, ne stornovat')
      return
    }

    const reason = prompt('Zadejte důvod storna (povinné):')
    if (!reason || reason.trim().length === 0) {
      return // Uživatel zrušil nebo nezadal důvod
    }

    if (!confirm(`Opravdu stornovat příjemku ${receipt.receiptNumber}?\n\nDůvod: ${reason}\n\nTato akce je nevratná a automaticky:\n- Odečte zboží ze skladu\n- Uvolní množství v objednávce pro nový příjem\n- Odpojí příjemku od faktury`)) {
      return
    }

    try {
      const res = await fetch(`/api/receipts/${receiptId}/storno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, userId: 'user' })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Nepodařilo se stornovat příjemku')
      }

      alert('Příjemka byla úspěšně stornována')
      loadData() // Refresh
    } catch (error: any) {
      console.error('Chyba při stornování:', error)
      alert(`Chyba: ${error.message}`)
    }
  }

  function handleDownloadPDF(receiptId: string) {
    const receipt = receipts.find(r => r.id === receiptId)
    if (!receipt) return

    try {
      const supplier = receipt.supplier as any
      const pdfData = {
        receiptNumber: receipt.receiptNumber,
        receiptDate: receipt.receiptDate,
        supplierName: supplier?.name || receipt.supplierName || 'Neznámý dodavatel',
        supplierAddress: supplier?.address,
        supplierICO: supplier?.ico,
        supplierDIC: supplier?.dic,
        items: receipt.items.map(item => ({
          productName: item.product?.name || item.productName || 'Neznámý produkt',
          quantity: Number(item.receivedQuantity || item.quantity),
          unit: item.unit,
          price: Number(item.purchasePrice)
        })),
        totalAmount: receipt.items.reduce((sum, item) =>
          sum + (Number(item.receivedQuantity || item.quantity) * Number(item.purchasePrice)), 0
        ),
        note: receipt.note,
        status: receipt.status,
        stornoReason: receipt.stornoReason,
        stornoAt: receipt.stornoAt
      }

      const pdfBlob = generateReceiptPDF(pdfData)
      openPDFInNewTab(pdfBlob)
    } catch (error: any) {
      console.error('Chyba při generování PDF:', error)
      alert(`Chyba při generování PDF: ${error.message}`)
    }
  }

  function getStatusBadge(status: string) {
    // Zjednodušené statusy: jen "Přijato" (zelený) nebo "STORNO" (červený)
    if (status === 'storno' || status === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          STORNO
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Přijato
      </span>
    )
  }

  if (loading) {
    return <div className="p-6">Načítání...</div>
  }

  return (
    <div className="space-y-6">
      {/* Hlavička */}
      <div className="bg-gradient-to-r from-slate-50 to-orange-50 border-l-4 border-orange-500 rounded-lg shadow-sm py-4 px-6 mb-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            <span className="text-orange-600">Příjemky</span>
            <span className="text-sm font-normal text-gray-600 ml-3">
              (Zobrazeno <span className="font-semibold text-orange-600">{filteredReceipts.length}</span> z <span className="font-semibold text-gray-700">{receipts.length}</span>)
            </span>
          </h1>
        </div>
      </div>

      {/* Očekávané příjemky (TAHOVÁ LOGIKA) */}
      <div ref={pendingSectionRef}>
        <Card className={`mb-6 border-2 ${pendingOrdersError ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'}`}>
          <CardHeader
            className={`cursor-pointer transition-colors ${pendingOrdersError ? 'hover:bg-red-100' : 'hover:bg-orange-100'}`}
            onClick={() => setIsPendingSectionExpanded(!isPendingSectionExpanded)}
          >
            <div className="flex items-center gap-2">
              {isPendingSectionExpanded ? (
                <ChevronDown className={`h-6 w-6 ${pendingOrdersError ? 'text-red-600' : 'text-orange-600'}`} />
              ) : (
                <ChevronRight className={`h-6 w-6 ${pendingOrdersError ? 'text-red-600' : 'text-orange-600'}`} />
              )}
              <CardTitle className={pendingOrdersError ? 'text-red-900' : 'text-orange-900'}>
                {pendingOrdersError
                  ? `⚠️ Chyba načítání očekávaných příjemek`
                  : `📦 Očekávané příjemky (čeká na příjem) — ${filteredPendingOrders.length} objednávek`
                }
              </CardTitle>
              <button
                onClick={(e) => { e.stopPropagation(); loadData() }}
                className="ml-auto text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50"
                title="Načíst znovu"
              >
                ↻ Obnovit
              </button>
            </div>
            {pendingOrdersError && (
              <p className="text-red-700 text-sm mt-1 ml-8">{pendingOrdersError}</p>
            )}
          </CardHeader>
          {isPendingSectionExpanded && (
          <CardContent>
            {/* Filtry pro očekávané příjemky */}
            <div className="mb-4">
              <div className="grid grid-cols-[auto_auto_1fr_1fr_1fr_auto] items-center gap-4 px-4 py-3 bg-white border border-orange-300 rounded-lg">
                {/* Vymazat filtry */}
                <button
                  onClick={() => {
                    setPendingFilterOrderNumber('')
                    setPendingFilterSupplier('')
                    setPendingFilterDate('')
                  }}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center"
                  title="Vymazat filtry"
                >
                  ✕
                </button>

                {/* Šipka - prázdný prostor */}
                <div className="w-8"></div>

                {/* Číslo obj. */}
                <input
                  type="text"
                  value={pendingFilterOrderNumber}
                  onChange={(e) => setPendingFilterOrderNumber(e.target.value)}
                  placeholder="Číslo obj..."
                  className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />

                {/* Dodavatel */}
                <div ref={pendingFilterSupplierRef} className="relative">
                  <input
                    type="text"
                    value={pendingFilterSupplier}
                    onChange={(e) => setPendingFilterSupplier(e.target.value)}
                    onFocus={() => setPendingFilterSupplierDropdownOpen(true)}
                    placeholder="Dodavatel..."
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  />

                  {pendingFilterSupplierDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                      {suppliers
                        .filter(s => s.name.toLowerCase().includes(pendingFilterSupplier.toLowerCase()))
                        .map(supplier => (
                          <div
                            key={supplier.id}
                            onClick={() => {
                              setPendingFilterSupplier(supplier.name)
                              setPendingFilterSupplierDropdownOpen(false)
                            }}
                            className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-xs truncate"
                          >
                            {supplier.name}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Datum objednávky */}
                <input
                  type="date"
                  value={pendingFilterDate}
                  onChange={(e) => setPendingFilterDate(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />

                {/* Tlačítko - prázdný prostor */}
                <div className="w-32"></div>
              </div>
            </div>

            {/* Hlavička seznamu */}
            <div className="grid grid-cols-[auto_auto_1fr_1fr_1fr_auto] items-center gap-4 px-4 py-3 bg-orange-100 border border-orange-300 rounded-lg text-xs font-semibold text-orange-900 mb-2">
              <div className="w-8"></div>
              <div className="w-8"></div>
              <div className="text-center">Číslo obj.</div>
              <div className="text-center">Dodavatel</div>
              <div className="text-center">Datum objednávky</div>
              <div className="w-32"></div>
            </div>

            {/* Seznam objednávek */}
            <div className="space-y-2">
              {filteredPendingOrders
                .slice((pendingCurrentPage - 1) * pendingItemsPerPage, pendingCurrentPage * pendingItemsPerPage)
                .map((order: any) => {
                const isExpanded = expandedPendingOrders.has(order.id)
                const totalAmount = order.items?.reduce((sum: number, item: any) =>
                  sum + (Number(item.quantity) * Number(item.expectedPrice || 0)), 0) || 0

                return (
                  <div key={order.id} className="border-2 border-orange-300 rounded-lg bg-white">
                    <div className="p-4 grid grid-cols-[auto_auto_1fr_1fr_1fr_auto] items-center gap-4 hover:bg-orange-50 transition-colors">
                      {/* Prázdný prostor pro zarovnání */}
                      <div className="w-8"></div>

                      {/* Rozbalit/sbalit */}
                      <button
                        onClick={() => togglePendingExpanded(order.id)}
                        className="w-8"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-orange-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-orange-600" />
                        )}
                      </button>

                      {/* Číslo objednávky */}
                      <div className="cursor-pointer text-center" onClick={() => togglePendingExpanded(order.id)}>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {order.orderNumber}
                        </p>
                      </div>

                      {/* Dodavatel */}
                      <div className="cursor-pointer text-center" onClick={() => togglePendingExpanded(order.id)}>
                        {order.supplier?.id ? (
                          <Link
                            href={`/suppliers?highlight=${order.supplier.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium truncate block mx-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.supplier.name}
                          </Link>
                        ) : (
                          <p className="text-sm text-gray-700 truncate">
                            {order.supplierName || '-'}
                          </p>
                        )}
                      </div>

                      {/* Datum objednávky */}
                      <div className="cursor-pointer text-center" onClick={() => togglePendingExpanded(order.id)}>
                        <p className="text-sm text-gray-700">
                          {formatDate(order.orderDate)}
                        </p>
                      </div>

                      {/* Tlačítko naskladnit */}
                      <Button
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => handleCreateFromOrder(order.id)}
                      >
                        <Package className="w-4 h-4 mr-1" />
                        Naskladnit
                      </Button>
                    </div>

                    {/* Detail položek */}
                    {isExpanded && (
                      <div className="border-t-2 border-orange-300 p-4 bg-gray-50">
                        <div className="border rounded-lg overflow-hidden">
                          {/* Hlavička - různá pro plátce a neplátce DPH */}
                          {isVatPayer ? (
                            <div className="grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.5fr_0.8fr_0.5fr_0.8fr_1fr] gap-2 px-3 py-1.5 bg-gray-100 text-[11px] font-semibold text-gray-700 border-b">
                              <div>Položky k přijetí</div>
                              <div className="text-center">Objednáno</div>
                              <div className="text-center">Naskladněno</div>
                              <div className="text-center">Zbývá</div>
                              <div className="text-center">DPH</div>
                              <div className="text-center">Cena/ks</div>
                              <div className="text-center">DPH/ks</div>
                              <div className="text-center">S DPH/ks</div>
                              <div className="text-center">Celkem</div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-3 py-1.5 bg-gray-100 text-[11px] font-semibold text-gray-700 border-b">
                              <div>Položky k přijetí</div>
                              <div className="text-right">Objednáno</div>
                              <div className="text-right">Naskladněno</div>
                              <div className="text-right">Zbývá</div>
                              <div className="text-right">Cena/ks</div>
                              <div className="text-right">Celkem</div>
                            </div>
                          )}

                          {/* Řádky položek - střídání bílá/šedá */}
                          {order.items.map((item: any, i: number) => {
                            const received = Number(item.alreadyReceivedQuantity || 0)
                            const ordered = Number(item.quantity)
                            const remaining = Number(item.remainingQuantity || 0)
                            const unitPrice = Number(item.expectedPrice || 0)
                            const itemVatRate = Number(item.vatRate || item.product?.vatRate || DEFAULT_VAT_RATE)
                            const isItemNonVat = isNonVatPayer(itemVatRate)
                            const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                            const priceWithVat = unitPrice + vatPerUnit
                            const total = ordered * (isVatPayer ? priceWithVat : unitPrice)

                            // Barvy podle stavu naskladnění
                            const receivedColor = received === 0
                              ? 'text-gray-400'
                              : received >= ordered
                                ? 'text-green-600'
                                : 'text-orange-500'
                            const remainingColor = remaining === 0
                              ? 'text-green-600'
                              : remaining === ordered
                                ? 'text-red-600'
                                : 'text-orange-600'

                            return isVatPayer ? (
                              <div
                                key={item.id}
                                className={`grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.5fr_0.8fr_0.5fr_0.8fr_1fr] gap-2 px-3 py-1.5 ${
                                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }`}
                              >
                                <div className="text-[13px] text-gray-900">
                                  {item.product?.name || item.productName || 'Neznámý produkt'}
                                </div>
                                <div className="text-[13px] text-gray-700 text-center">
                                  {ordered.toLocaleString('cs-CZ')} {item.unit}
                                </div>
                                <div className={`text-[13px] font-semibold text-center ${receivedColor}`}>
                                  {received.toLocaleString('cs-CZ')} {item.unit}
                                </div>
                                <div className={`text-[13px] font-semibold text-center ${remainingColor}`}>
                                  {remaining.toLocaleString('cs-CZ')} {item.unit}
                                </div>
                                <div className="text-[13px] text-gray-500 text-center">
                                  {isItemNonVat ? '-' : `${itemVatRate}%`}
                                </div>
                                <div className="text-[13px] text-gray-700 text-center">
                                  {formatPrice(unitPrice)}
                                </div>
                                <div className="text-[13px] text-gray-500 text-center">
                                  {isItemNonVat ? '-' : formatPrice(vatPerUnit)}
                                </div>
                                <div className="text-[13px] text-gray-700 text-center">
                                  {formatPrice(priceWithVat)}
                                </div>
                                <div className="text-[13px] font-semibold text-gray-900 text-center">
                                  {formatPrice(total)}
                                </div>
                              </div>
                            ) : (
                              <div
                                key={item.id}
                                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-3 py-1.5 ${
                                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }`}
                              >
                                <div className="text-[13px] text-gray-900">
                                  {item.product?.name || item.productName || 'Neznámý produkt'}
                                </div>
                                <div className="text-[13px] text-gray-700 text-right">
                                  {ordered.toLocaleString('cs-CZ')} {item.unit}
                                </div>
                                <div className={`text-[13px] font-semibold text-right ${receivedColor}`}>
                                  {received.toLocaleString('cs-CZ')} {item.unit}
                                </div>
                                <div className={`text-[13px] font-semibold text-right ${remainingColor}`}>
                                  {remaining.toLocaleString('cs-CZ')} {item.unit}
                                </div>
                                <div className="text-[13px] text-gray-700 text-right">
                                  {formatPrice(unitPrice)}
                                </div>
                                <div className="text-[13px] font-semibold text-gray-900 text-right">
                                  {formatPrice(total)}
                                </div>
                              </div>
                            )
                          })}

                          {/* Celková částka - tučný řádek */}
                          <div className={`grid ${isVatPayer ? 'grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.5fr_0.8fr_0.5fr_0.8fr_1fr]' : 'grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'} gap-2 px-3 py-1.5 bg-gray-100 border-t-2 font-bold`}>
                            <div className={`${isVatPayer ? 'col-span-8' : 'col-span-5'} text-[13px]`}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka objednávky'}</div>
                            <div className="text-[13px] text-center">
                              {formatPrice(order.items.reduce((sum: number, item: any) => {
                                const unitPrice = Number(item.expectedPrice || 0)
                                const itemVatRate = Number(item.vatRate || item.product?.vatRate || DEFAULT_VAT_RATE)
                                const isItemNonVat = isNonVatPayer(itemVatRate)
                                const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                                const priceWithVat = unitPrice + vatPerUnit
                                return sum + (Number(item.quantity) * (isVatPayer ? priceWithVat : unitPrice))
                              }, 0))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredPendingOrders.length === 0 && !pendingOrdersError && (
                <div className="py-8 text-center text-gray-500 text-sm">
                  {pendingOrders.length === 0
                    ? 'Žádné objednávky čekající na příjem. Klikněte ↻ Obnovit pro aktualizaci.'
                    : 'Žádné objednávky neodpovídají zadaným filtrům.'}
                </div>
              )}
            </div>

            {/* Stránkování a výběr počtu záznamů */}
            {filteredPendingOrders.length > 0 && (() => {
              const totalPages = Math.ceil(filteredPendingOrders.length / pendingItemsPerPage)
              const pages = []

              // Logika pro zobrazení stránek (max 7 tlačítek)
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i)
                }
              } else {
                pages.push(1)
                if (pendingCurrentPage <= 3) {
                  pages.push(2, 3, 4)
                  pages.push('...')
                  pages.push(totalPages)
                } else if (pendingCurrentPage >= totalPages - 2) {
                  pages.push('...')
                  pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
                } else {
                  pages.push('...')
                  pages.push(pendingCurrentPage - 1, pendingCurrentPage, pendingCurrentPage + 1)
                  pages.push('...')
                  pages.push(totalPages)
                }
              }

              const handlePageChange = (newPage: number) => {
                setPendingCurrentPage(newPage)
                setTimeout(() => {
                  if (pendingSectionRef.current) {
                    pendingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
                          setPendingItemsPerPage(count)
                          setPendingCurrentPage(1)
                        }}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          pendingItemsPerPage === count
                            ? 'bg-orange-600 text-white'
                            : 'bg-orange-100 text-orange-900 hover:bg-orange-200'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                    <span className="text-sm text-gray-500 ml-2">
                      ({filteredPendingOrders.length} celkem)
                    </span>
                  </div>

                  {/* Navigace mezi stránkami */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(Math.max(1, pendingCurrentPage - 1))}
                        disabled={pendingCurrentPage === 1}
                        className="px-3 py-1.5 bg-orange-100 text-orange-900 rounded hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
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
                              pendingCurrentPage === page
                                ? 'bg-orange-600 text-white'
                                : 'bg-orange-100 text-orange-900 hover:bg-orange-200'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}

                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, pendingCurrentPage + 1))}
                        disabled={pendingCurrentPage >= totalPages}
                        className="px-3 py-1.5 bg-orange-100 text-orange-900 rounded hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Další
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
          )}
        </Card>
      </div>

      {/* Filtry - přesně odpovídající sloupcům tabulky */}
      <div ref={receiptsSectionRef} className="mb-4">
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">

          {/* Vymazat filtry - úplně vlevo nad šipkou */}
          <button
            onClick={() => {
              setFilterNumber('')
              setFilterDate('')
              setFilterSupplier('')
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
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />

          {/* Datový input - Datum */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />

          {/* Textový input s autocomplete - Dodavatel */}
          <div ref={filterSupplierRef} className="relative">
            <input
              type="text"
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              onFocus={() => setFilterSupplierDropdownOpen(true)}
              placeholder="Dodavatel..."
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />

            {filterSupplierDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                {suppliers
                  .filter(s => s.name.toLowerCase().includes(filterSupplier.toLowerCase()))
                  .map(supplier => (
                    <div
                      key={supplier.id}
                      onClick={() => {
                        setFilterSupplier(supplier.name)
                        setFilterSupplierDropdownOpen(false)
                      }}
                      className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-xs truncate"
                    >
                      {supplier.name}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Číselný input - Položek (≥ N) */}
          <input
            type="number"
            value={filterMinItems}
            onChange={(e) => setFilterMinItems(e.target.value)}
            placeholder="≥"
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />

          {/* Číselný input - Hodnota (≥ částka) */}
          <input
            type="number"
            value={filterMinValue}
            onChange={(e) => setFilterMinValue(e.target.value)}
            placeholder="≥"
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
          />

          {/* Dropdown - Status (BAREVNÝ) */}
          <div ref={filterStatusRef} className="relative">
            <div
              onClick={() => setFilterStatusDropdownOpen(!filterStatusDropdownOpen)}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-orange-500 flex items-center justify-center"
            >
              {filterStatus === 'all' && <span>Vše</span>}
              {filterStatus === 'received' && <span className="text-green-600">Přijato</span>}
              {filterStatus === 'storno' && <span className="text-red-600">Storno</span>}
            </div>

            {filterStatusDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
                <div onClick={() => { setFilterStatus('all'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-xs text-center">Vše</div>
                <div onClick={() => { setFilterStatus('received'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-xs text-center text-green-600">Přijato</div>
                <div onClick={() => { setFilterStatus('storno'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-xs text-center text-red-600">Storno</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seznam příjemek */}
      <div className="space-y-2">
        {filteredReceipts.length === 0 && receipts.length > 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              Žádné příjemky neodpovídají zvoleným filtrům
            </CardContent>
          </Card>
        ) : receipts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              Zatím nemáte žádné příjemky
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Hlavička tabulky */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-700">
              <div className="w-8"></div>
              <div className="text-center">Číslo</div>
              <div className="text-center">Datum</div>
              <div className="text-center">Dodavatel</div>
              <div className="text-center">Položek</div>
              <div className="text-center">Hodnota</div>
              <div className="text-center">Status</div>
            </div>

            {/* Příjemky */}
            {filteredReceipts
              .slice((receiptsCurrentPage - 1) * receiptsItemsPerPage, receiptsCurrentPage * receiptsItemsPerPage)
              .map((receipt) => (
              <div
                id={`item-${receipt.id}`}
                key={receipt.id}
                ref={receipt.id === highlightId ? highlightRef : null}
                className={`border rounded-lg ${
                  receipt.id === highlightId ? 'ring-2 ring-blue-500 bg-blue-50' :
                  expandedReceipts.has(receipt.id) ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                <div className={`p-4 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 transition-colors ${receipt.status === 'storno' ? 'bg-red-50 opacity-70' : 'hover:bg-gray-50'}`}>
                  {/* Rozbalit/sbalit */}
                  <button
                    onClick={() => toggleExpanded(receipt.id)}
                    className="w-8"
                  >
                    {expandedReceipts.has(receipt.id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>

                  {/* Číslo */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(receipt.id)}
                  >
                    <p className={`text-sm font-semibold text-gray-900 truncate ${receipt.status === 'storno' ? 'line-through' : ''}`}>
                      {receipt.receiptNumber}
                    </p>
                  </div>

                  {/* Datum */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(receipt.id)}
                  >
                    <p className="text-sm text-gray-700">
                      {formatDate(receipt.receiptDate)}
                    </p>
                  </div>

                  {/* Dodavatel */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(receipt.id)}
                  >
                    {(receipt.purchaseOrder?.supplier?.id || receipt.supplier?.id) ? (
                      <Link
                        href={`/suppliers?highlight=${receipt.purchaseOrder?.supplier?.id || receipt.supplier?.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium truncate block mx-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {receipt.purchaseOrder?.supplier?.name || receipt.supplier?.name}
                      </Link>
                    ) : (
                      <p className="text-sm text-gray-700 truncate">
                        {receipt.supplierName || '-'}
                      </p>
                    )}
                  </div>

                  {/* Položek */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(receipt.id)}
                  >
                    <p className="text-sm text-gray-600">
                      {receipt.items.length}
                    </p>
                  </div>

                  {/* Hodnota */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(receipt.id)}
                  >
                    <p className="text-sm font-bold text-gray-900">
                      {formatPrice(receipt.items.reduce((sum, item) => {
                        const actualQuantity = Number(item.receivedQuantity || item.quantity)
                        const unitPrice = Number(item.purchasePrice || 0)
                        const itemVatRate = Number(item.vatRate || item.product?.vatRate || 21)
                        const isItemNonVat = isNonVatPayer(itemVatRate)
                        const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                        const priceWithVat = isVatPayer ? (unitPrice + vatPerUnit) : unitPrice
                        return sum + (actualQuantity * priceWithVat)
                      }, 0))}
                    </p>
                  </div>

                  {/* Status */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(receipt.id)}
                  >
                    {getStatusBadge(receipt.status)}
                  </div>
                </div>

                {/* Detail položek */}
                {expandedReceipts.has(receipt.id) && (
                  <div className="border-t p-4 bg-gray-50">
                    {/* Odkazy na související dokumenty - modrý řádek */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-900">Objednávka:</span>
                        {receipt.purchaseOrder ? (
                          <Link
                            href={`/purchase-orders?highlight=${receipt.purchaseOrder.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                          >
                            {receipt.purchaseOrder.orderNumber}
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-900">Faktura:</span>
                        {receipt.receivedInvoice ? (
                          <Link
                            href={`/invoices/received?highlight=${receipt.receivedInvoice.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                          >
                            {receipt.receivedInvoice.invoiceNumber}
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </div>
                    </div>

                    {/* Hlavní Sekce: Položky příjemky */}
                    {receipt.items.length === 0 ? (
                      <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">
                          Položky příjemky (0)
                        </h4>
                        <div className="px-4 py-4 text-sm text-gray-500 italic">Žádné položky</div>
                      </div>
                    ) : (
                      <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">
                          Položky příjemky ({receipt.items.length})
                        </h4>

                        {isVatPayer ? (
                          <div className="text-sm">
                            {/* Hlavička tabulky - plátce DPH */}
                            <div className="grid grid-cols-[3fr_1fr_1fr_0.5fr_1fr_0.5fr_1fr_1fr] gap-2 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b text-xs">
                              <div>Produkt</div>
                              <div className="text-center">Pohyb</div>
                              <div className="text-center">Množství</div>
                              <div className="text-center">DPH</div>
                              <div className="text-center">Cena/ks</div>
                              <div className="text-center">DPH/ks</div>
                              <div className="text-center">S DPH/ks</div>
                              <div className="text-center">Celkem</div>
                            </div>

                            {/* Řádky položek */}
                            {receipt.items.map((item: any, i: number) => {
                              const actualQuantity = item.receivedQuantity || item.quantity
                              const unitPrice = Number(item.purchasePrice) || 0
                              const itemVatRate = Number(item.vatRate || item.product?.vatRate || 21)
                              const isItemNonVat = isNonVatPayer(itemVatRate)
                              const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                              const priceWithVat = unitPrice + vatPerUnit
                              const lineTotal = actualQuantity * priceWithVat

                              return (
                                <div key={i} className={`grid grid-cols-[3fr_1fr_1fr_0.5fr_1fr_0.5fr_1fr_1fr] gap-2 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-xs`}>
                                  <div className="font-medium text-gray-900">
                                    {item.product?.name || item.productName || '(Neznámé)'}
                                  </div>
                                  <div className="text-center">
                                    {item.productId && item.inventoryItemId ? (
                                      <Link
                                        href={`/inventory?selectedProduct=${item.productId}&highlightMovement=${item.inventoryItemId}`}
                                        className="inline-flex items-center px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Zobrazit
                                      </Link>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </div>
                                  <div className="text-center text-gray-600">
                                    {Number(actualQuantity).toLocaleString('cs-CZ')} {item.unit}
                                    {item.receivedQuantity && item.receivedQuantity !== item.quantity && (
                                      <span className="text-orange-600 text-xs block mt-1">
                                        (z {Number(item.quantity).toLocaleString('cs-CZ')})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-center text-gray-500">
                                    {isItemNonVat ? '-' : `${itemVatRate}%`}
                                  </div>
                                  <div className="text-center text-gray-600">
                                    {formatPrice(unitPrice)}
                                  </div>
                                  <div className="text-center text-gray-500">
                                    {isItemNonVat ? '-' : formatPrice(vatPerUnit)}
                                  </div>
                                  <div className="text-center text-gray-700">
                                    {formatPrice(priceWithVat)}
                                  </div>
                                  <div className="text-center font-semibold text-gray-900">
                                    {formatPrice(lineTotal)}
                                  </div>
                                </div>
                              )
                            })}

                            {/* Celková částka */}
                            <div className="grid grid-cols-[3fr_1fr_1fr_0.5fr_1fr_0.5fr_1fr_1fr] gap-2 px-4 py-2 bg-gray-100 border-t font-bold text-sm">
                              <div className="col-span-7">Celková částka s DPH</div>
                              <div className="text-center">
                                {formatPrice(receipt.items.reduce((sum, item) => {
                                  const actualQuantity = item.receivedQuantity || item.quantity
                                  const unitPrice = Number(item.purchasePrice) || 0
                                  const itemVatRate = Number(item.vatRate || item.product?.vatRate || 21)
                                  const isItemNonVat = isNonVatPayer(itemVatRate)
                                  const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                                  const priceWithVat = unitPrice + vatPerUnit
                                  return sum + (actualQuantity * priceWithVat)
                                }, 0))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm">
                            {/* Hlavička tabulky - neplátce DPH */}
                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 bg-gray-50 font-semibold text-gray-700 border-b">
                              <div>Produkt</div>
                              <div className="text-center">Skladový pohyb</div>
                              <div className="text-right">Množství</div>
                              <div className="text-right">Nákupní cena</div>
                              <div className="text-right">Celkem</div>
                            </div>

                            {/* Řádky položek */}
                            {receipt.items.map((item: any, i: number) => {
                              const actualQuantity = item.receivedQuantity || item.quantity
                              const lineTotal = actualQuantity * item.purchasePrice

                              return (
                                <div key={i} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                  <div className="font-medium text-gray-900">
                                    {item.product?.name || item.productName || '(Neznámé)'}
                                  </div>
                                  <div className="text-center">
                                    {item.productId && item.inventoryItemId ? (
                                      <Link
                                        href={`/inventory?selectedProduct=${item.productId}&highlightMovement=${item.inventoryItemId}`}
                                        className="inline-flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Zobrazit
                                      </Link>
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </div>
                                  <div className="text-right text-gray-600">
                                    {Number(actualQuantity).toLocaleString('cs-CZ')} {item.unit}
                                    {item.receivedQuantity && item.receivedQuantity !== item.quantity && (
                                      <span className="text-orange-600 text-xs block mt-1">
                                        (z {Number(item.quantity).toLocaleString('cs-CZ')} obj.)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right text-gray-600">
                                    {Number(item.purchasePrice).toLocaleString('cs-CZ')} Kč
                                  </div>
                                  <div className="text-right font-semibold text-gray-900">
                                    {Number(lineTotal).toLocaleString('cs-CZ')} Kč
                                  </div>
                                </div>
                              )
                            })}

                            {/* Celková částka */}
                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 bg-gray-100 border-t-2 font-bold">
                              <div className="col-span-4">Celková částka</div>
                              <div className="text-right">
                                {receipt.items.reduce((sum, item) => {
                                  const actualQuantity = item.receivedQuantity || item.quantity
                                  return sum + (actualQuantity * item.purchasePrice)
                                }, 0).toLocaleString('cs-CZ')} Kč
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Poznámka */}
                    {receipt.note && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold text-gray-900">Poznámka:</span> {receipt.note}
                        </p>
                      </div>
                    )}

                    {receipt.status === 'storno' && receipt.stornoReason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm font-medium text-red-900">Stornováno</p>
                        <p className="text-sm text-red-700 mt-1">Důvod: {receipt.stornoReason}</p>
                        {receipt.stornoAt && (
                          <p className="text-xs text-red-600 mt-1">
                            Datum storna: {formatDate(receipt.stornoAt)}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex justify-between items-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadPDF(receipt.id)}
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        Zobrazit PDF
                      </Button>
                      {receipt.status === 'active' && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleStorno(receipt.id)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Stornovat
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {/* Stránkování a výběr počtu záznamů */}
            {filteredReceipts.length > 0 && (() => {
              const totalPages = Math.ceil(filteredReceipts.length / receiptsItemsPerPage)
              const pages = []

              // Logika pro zobrazení stránek (max 7 tlačítek)
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i)
                }
              } else {
                pages.push(1)
                if (receiptsCurrentPage <= 3) {
                  pages.push(2, 3, 4)
                  pages.push('...')
                  pages.push(totalPages)
                } else if (receiptsCurrentPage >= totalPages - 2) {
                  pages.push('...')
                  pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
                } else {
                  pages.push('...')
                  pages.push(receiptsCurrentPage - 1, receiptsCurrentPage, receiptsCurrentPage + 1)
                  pages.push('...')
                  pages.push(totalPages)
                }
              }

              const handlePageChange = (newPage: number) => {
                setReceiptsCurrentPage(newPage)
                setTimeout(() => {
                  if (receiptsSectionRef.current) {
                    receiptsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
                          setReceiptsItemsPerPage(count)
                          setReceiptsCurrentPage(1)
                        }}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          receiptsItemsPerPage === count
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                    <span className="text-sm text-gray-500 ml-2">
                      ({filteredReceipts.length} celkem)
                    </span>
                  </div>

                  {/* Navigace mezi stránkami */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(Math.max(1, receiptsCurrentPage - 1))}
                        disabled={receiptsCurrentPage === 1}
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
                              receiptsCurrentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}

                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, receiptsCurrentPage + 1))}
                        disabled={receiptsCurrentPage >= totalPages}
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

      {/* Modal pro zpracování s částečným naskladněním */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full my-8 max-h-[90vh] overflow-y-auto">
            {/* Header s gradientem */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-5 rounded-t-xl">
              <div className="flex items-center gap-3">
                <Package className="w-7 h-7" />
                <div>
                  <h2 className="text-2xl font-bold">
                    {processingOrderId ? 'Přímé naskladnění z objednávky' : 'Zpracovat příjemku'}
                  </h2>
                  <p className="text-orange-100 text-sm mt-1">
                    Nastav množství k naskladnění a vyplň údaje o faktuře
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Karta: Položky k naskladnění */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-l-4 border-purple-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Položky k naskladnění
                </h3>

                <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-purple-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-purple-100 to-purple-50">
                      <tr>
                        <th className="text-left px-3 py-3 font-semibold text-gray-700">Produkt</th>
                        <th className="text-right px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">Objednáno</th>
                        {processingOrderId && (
                          <th className="text-right px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">Přijato</th>
                        )}
                        <th className="text-right px-3 py-3 font-semibold text-green-700 bg-green-50 whitespace-nowrap">Nyní přijmout</th>
                        <th className="text-right px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">{isVatPayer ? 'Bez DPH/ks' : 'Cena/ks'}</th>
                        {isVatPayer && <th className="text-right px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">S DPH/ks</th>}
                        <th className="text-right px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">Celkem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processingReceiptItems.map((item: any, idx: number) => {
                        const received = receivedQuantities[item.id!] || 0
                        const unitPrice = Number(item.purchasePrice || 0)
                        const itemVatRate = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
                        const itemIsNonVat = isNonVatPayer(itemVatRate)
                        const vatPerUnit = (isVatPayer && !itemIsNonVat) ? unitPrice * itemVatRate / 100 : 0
                        const priceWithVat = unitPrice + vatPerUnit
                        const total = received * (isVatPayer ? priceWithVat : unitPrice)
                        const maxAllowed = item.remainingQuantity || Number(item.quantity)
                        const alreadyReceived = item.alreadyReceived || 0

                        return (
                          <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'} hover:bg-purple-100/40 transition-colors`}>
                            <td className="px-3 py-3 font-medium text-gray-800">
                              {item.product?.name || item.productName || 'Neznámý produkt'}
                            </td>
                            <td className="text-right px-3 py-3 text-gray-600 whitespace-nowrap">
                              {Number(item.quantity)} {item.unit}
                            </td>
                            {processingOrderId && (
                              <td className="text-right px-3 py-3 text-gray-500 whitespace-nowrap">
                                {alreadyReceived} {item.unit}
                              </td>
                            )}
                            <td className="text-right px-3 py-3 bg-green-50">
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  value={received || ''}
                                  onChange={(e) => {
                                    const inputValue = e.target.value
                                    if (inputValue === '') {
                                      setReceivedQuantities({
                                        ...receivedQuantities,
                                        [item.id!]: ''
                                      })
                                      return
                                    }

                                    const numValue = Number(inputValue)

                                    if (numValue > maxAllowed) {
                                      setReceivedQuantities({
                                        ...receivedQuantities,
                                        [item.id!]: ''
                                      })
                                      return
                                    }

                                    if (numValue < 0) {
                                      setReceivedQuantities({
                                        ...receivedQuantities,
                                        [item.id!]: ''
                                      })
                                      return
                                    }

                                    setReceivedQuantities({
                                      ...receivedQuantities,
                                      [item.id!]: numValue
                                    })
                                  }}
                                  min="0"
                                  max={maxAllowed}
                                  step="1"
                                  className="w-16 px-2 py-2 border-2 border-green-300 rounded-lg text-right font-medium focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                                />
                                <span className="text-gray-600 font-medium w-6 text-left text-xs">{item.unit}</span>
                              </div>
                              {processingOrderId && maxAllowed < Number(item.quantity) && (
                                <p className="text-xs text-orange-600 mt-1 font-medium text-right">
                                  Max: {maxAllowed}
                                </p>
                              )}
                            </td>
                            <td className="text-right px-3 py-3 text-gray-700 whitespace-nowrap">
                              {formatPrice(unitPrice)}
                            </td>
                            {isVatPayer && (
                              <td className="text-right px-3 py-3 whitespace-nowrap">
                                {itemIsNonVat ? (
                                  <span className="text-gray-500">—</span>
                                ) : (
                                  <div>
                                    <div className="font-medium text-blue-700">{formatPrice(priceWithVat)}</div>
                                    <div className="text-xs text-gray-400">+{itemVatRate}% ({formatPrice(vatPerUnit)})</div>
                                  </div>
                                )}
                              </td>
                            )}
                            <td className="text-right px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">
                              {formatPrice(total)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50 font-bold border-t-2 border-purple-300">
                      <tr>
                        <td colSpan={processingOrderId ? (isVatPayer ? 5 : 4) : (isVatPayer ? 4 : 3)} className="px-3 py-3 text-left text-gray-800">
                          CELKEM:
                        </td>
                        <td colSpan={2} className="text-right px-3 py-3 text-lg text-purple-700 whitespace-nowrap">
                          {formatPrice(
                            processingReceiptItems.reduce((sum, item: any) => {
                              const received = receivedQuantities[item.id!] || 0
                              const unitPrice = Number(item.purchasePrice || 0)
                              const itemVatRate = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
                              const itemIsNonVat = isNonVatPayer(itemVatRate)
                              const vatPerUnit = (isVatPayer && !itemIsNonVat) ? unitPrice * itemVatRate / 100 : 0
                              const priceWithVat = unitPrice + vatPerUnit
                              return sum + (received * (isVatPayer ? priceWithVat : unitPrice))
                            }, 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Karta: Datum příjmu */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border-l-4 border-blue-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Datum příjmu
                </h3>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Kdy zboží fyzicky dorazilo? <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={processReceiptDate}
                    onChange={(e) => setProcessReceiptDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                  {(() => {
                    const selectedDate = new Date(processReceiptDate)
                    const today = new Date()
                    const daysDiff = Math.floor((today.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24))

                    if (selectedDate > today) {
                      return <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Datum nesmí být v budoucnosti</p>
                    } else if (daysDiff > 30) {
                      return <p className="text-xs text-orange-600 mt-2 font-medium">⚠️ Datum je starší než 30 dní</p>
                    }
                    return null
                  })()}
                </div>
              </div>

              {/* Karta: Faktura - zobraz pouze pokud ještě není vyplněná */}
              {!hasExistingInvoice && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-l-4 border-green-500 shadow-sm">
                  {/* Rozklikávací hlavička */}
                  <div
                    className="px-5 py-4 cursor-pointer hover:bg-green-100/50 transition-colors rounded-t-lg"
                    onClick={() => setIsInvoiceSectionExpanded(!isInvoiceSectionExpanded)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Faktura od dodavatele
                        <span className="text-sm font-normal text-gray-600 ml-2">(volitelné - klikni pro rozbalení)</span>
                      </h3>
                      {isInvoiceSectionExpanded ? (
                        <ChevronDown className="h-6 w-6 text-green-600" />
                      ) : (
                        <ChevronRight className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                  </div>

                  {/* Obsah faktury - zobraz pouze když je rozbaleno */}
                  {isInvoiceSectionExpanded && (
                    <div className="px-5 pb-5 space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Číslo faktury <span className="text-orange-600 text-xs">(můžeš nechat prázdné - doplníš později)</span>
                      </label>
                      <Input
                        value={invoiceData.invoiceNumber}
                        onChange={(e) => setInvoiceData({...invoiceData, invoiceNumber: e.target.value})}
                        placeholder="např. FA-2025-001 (nebo prázdné = dočasná)"
                        className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                      />
                      <p className="text-xs text-gray-600 mt-2">
                        💡 Pokud nemáš číslo faktury, nech prázdné. Vytvoří se dočasná faktura s číslem objednávky.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Datum faktury</label>
                        <Input
                          type="date"
                          value={invoiceData.invoiceDate}
                          onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})}
                          className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Splatnost <span className="text-gray-500 text-xs">(volitelné)</span>
                        </label>
                        <Input
                          type="date"
                          value={invoiceData.dueDate}
                          onChange={(e) => setInvoiceData({...invoiceData, dueDate: e.target.value})}
                          className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Poznámka <span className="text-gray-500 text-xs">(volitelné)</span>
                      </label>
                      <textarea
                        value={invoiceData.note}
                        onChange={(e) => setInvoiceData({...invoiceData, note: e.target.value})}
                        className="w-full border-2 border-green-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all bg-white"
                        rows={3}
                        placeholder="Volitelná poznámka k faktuře..."
                      />
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* Tlačítka */}
              <div className="flex gap-3 justify-end pt-4 border-t-2 border-gray-200">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowProcessModal(false)
                    setProcessingReceiptId(null)
                    setProcessingOrderId(null)
                    setProcessingReceiptItems([])
                    setReceivedQuantities({})
                    setProcessReceiptDate(new Date().toISOString().split('T')[0])
                  }}
                  className="px-6 py-2 hover:bg-gray-100 transition-colors"
                >
                  Zrušit
                </Button>
                <Button
                  onClick={() => handleConfirmProcess(true)}
                  className="px-8 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Zpracovat a naskladnit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
