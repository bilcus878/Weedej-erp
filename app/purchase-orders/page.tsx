// Stránka pro objednávky (Purchase Orders)
// URL: /purchase-orders

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Package, Clock, CheckCircle, XCircle, ChevronDown, ChevronRight, Trash2, FileDown, ExternalLink } from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'
import { generatePurchaseOrderPDF, openPDFInNewTab } from '@/lib/pdfGenerator'
import CustomerSupplierSelector from '@/components/CustomerSupplierSelector'
import { CZECH_VAT_RATES, calculateVatFromNet, calculateVatFromGross, calculateLineVat, calculateVatSummary, isNonVatPayer, NON_VAT_PAYER_RATE, DEFAULT_VAT_RATE, VAT_RATE_LABELS, type VatLineItem } from '@/lib/vatCalculation'

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
}

interface Product {
  id: string
  name: string
  unit: string
  purchasePrice?: number
  vatRate?: number
  category?: {
    id: string
    name: string
  }
}

interface PurchaseOrderItem {
  id?: string
  productId?: string
  productName?: string
  isManual: boolean
  quantity: number
  alreadyReceivedQuantity?: number
  unit: string
  expectedPrice: number
  vatRate: number
  vatAmount?: number
  priceWithVat?: number
  product?: Product
}

interface ReceiptItem {
  id: string
  quantity: number
  receivedQuantity?: number
  purchasePrice: number
  unit: string
  product?: {
    name: string
  }
  productName?: string
}

interface Receipt {
  id: string
  receiptNumber: string
  receiptDate: string
  status: string
  stornoReason?: string
  supplier?: {
    name: string
  }
  items?: ReceiptItem[]
}

interface ReceivedInvoice {
  id: string
  invoiceNumber: string
}

interface PurchaseOrder {
  id: string
  orderNumber: string
  orderDate: string
  expectedDate?: string
  status: string
  note?: string
  stornoReason?: string
  stornoAt?: string
  stornoBy?: string
  totalAmount?: number
  totalAmountWithoutVat?: number
  totalVatAmount?: number
  supplier?: Supplier
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
  items: PurchaseOrderItem[]
  receipts?: Receipt[]
  invoice?: ReceivedInvoice
}

export default function PurchaseOrdersPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const highlightRef = useRef<HTMLDivElement>(null)

  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [isVatPayer, setIsVatPayer] = useState<boolean>(true) // Nastavení z settings

  // Paginace
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Filtry
  const [filterNumber, setFilterNumber] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterSupplier, setFilterSupplier] = useState('')
  const [filterSupplierDropdownOpen, setFilterSupplierDropdownOpen] = useState(false)
  const [filterPaymentType, setFilterPaymentType] = useState('all')
  const [filterPaymentTypeDropdownOpen, setFilterPaymentTypeDropdownOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStatusDropdownOpen, setFilterStatusDropdownOpen] = useState(false)
  const [filterMinValue, setFilterMinValue] = useState('')
  const [filterMaxValue, setFilterMaxValue] = useState('')
  const [filterMinItems, setFilterMinItems] = useState('')
  const [filterMaxItems, setFilterMaxItems] = useState('')
  const filterSupplierRef = useRef<HTMLDivElement>(null)
  const filterPaymentTypeRef = useRef<HTMLDivElement>(null)
  const filterStatusRef = useRef<HTMLDivElement>(null)

  // Formulář
  const [orderNumber, setOrderNumber] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<PurchaseOrderItem[]>([])
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [categoryRect, setCategoryRect] = useState<DOMRect | null>(null)
  const categoryMenuRef = useRef<HTMLDivElement>(null)
  const hideSubmenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // DPH - přepínač cen
  const [pricesIncludeVat, setPricesIncludeVat] = useState(false)

  // Nová pole pro platební detaily (nepovinné)
  const [dueDate, setDueDate] = useState('')
  const [paymentType, setPaymentType] = useState('')
  const [variableSymbol, setVariableSymbol] = useState('')
  const [constantSymbol, setConstantSymbol] = useState('')
  const [specificSymbol, setSpecificSymbol] = useState('')

  // Manuální zadání dodavatele
  const [isManualSupplier, setIsManualSupplier] = useState(false)
  const [isAnonymousSupplier, setIsAnonymousSupplier] = useState(false)
  const [saveSupplierToDatabase, setSaveSupplierToDatabase] = useState(false)
  const [manualSupplierData, setManualSupplierData] = useState({
    name: '',
    entityType: 'company',
    contactPerson: '',
    email: '',
    phone: '',
    ico: '',
    dic: '',
    bankAccount: '',
    website: '',
    address: '',
    note: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  // Auto-expand a scroll k highlighted objednávce
  useEffect(() => {
    if (highlightId && filteredOrders.length > 0) {
      const index = filteredOrders.findIndex(order => order.id === highlightId)

      if (index !== -1) {
        const pageNumber = Math.floor(index / itemsPerPage) + 1
        setCurrentPage(pageNumber)

        setExpandedOrders(new Set([highlightId]))

        setTimeout(() => {
          if (highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [highlightId, filteredOrders, itemsPerPage])

  // Zavřít dropdown při kliknutí mimo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterSupplierRef.current && !filterSupplierRef.current.contains(event.target as Node)) {
        setFilterSupplierDropdownOpen(false)
      }
      if (filterPaymentTypeRef.current && !filterPaymentTypeRef.current.contains(event.target as Node)) {
        setFilterPaymentTypeDropdownOpen(false)
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
    let filtered = [...orders]

    // Filtr podle čísla objednávky
    if (filterNumber) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(filterNumber.toLowerCase())
      )
    }

    // Filtr podle data
    if (filterDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate).toISOString().split('T')[0]
        return orderDate === filterDate
      })
    }

    // Filtr podle dodavatele - vyhledávání v názvu nebo anonymní
    if (filterSupplier) {
      if (filterSupplier === '__anonymous__') {
        // Filtr pro anonymní dodavatele (žádný supplier ani supplierName)
        filtered = filtered.filter(order => !order.supplier && !order.supplierName)
      } else {
        // Textové vyhledávání v názvu dodavatele
        filtered = filtered.filter(order => {
          const supplierName = order.supplier?.name || order.supplierName || ''
          return supplierName.toLowerCase().includes(filterSupplier.toLowerCase())
        })
      }
    }

    // Filtr podle typu platby (z faktury)
    if (filterPaymentType !== 'all') {
      filtered = filtered.filter(order => {
        if (filterPaymentType === 'none') {
          return !(order.invoice as any)?.paymentType
        }
        return (order.invoice as any)?.paymentType === filterPaymentType
      })
    }

    // Filtr podle statusu
    if (filterStatus !== 'all') {
      filtered = filtered.filter(order => order.status === filterStatus)
    }

    // Filtr podle hodnoty (min/max)
    if (filterMinValue) {
      const minVal = parseFloat(filterMinValue)
      filtered = filtered.filter(order => {
        const total = order.items.reduce((sum, item) =>
          sum + (Number(item.quantity) * Number(item.expectedPrice || 0)), 0
        )
        return total >= minVal
      })
    }
    if (filterMaxValue) {
      const maxVal = parseFloat(filterMaxValue)
      filtered = filtered.filter(order => {
        const total = order.items.reduce((sum, item) =>
          sum + (Number(item.quantity) * Number(item.expectedPrice || 0)), 0
        )
        return total <= maxVal
      })
    }

    // Filtr podle počtu položek (min/max)
    if (filterMinItems) {
      const minItems = parseInt(filterMinItems)
      filtered = filtered.filter(order => order.items.length >= minItems)
    }
    if (filterMaxItems) {
      const maxItems = parseInt(filterMaxItems)
      filtered = filtered.filter(order => order.items.length <= maxItems)
    }

    setFilteredOrders(filtered)
    setCurrentPage(1)
  }, [orders, filterNumber, filterDate, filterSupplier, filterPaymentType, filterStatus, filterMinValue, filterMaxValue, filterMinItems, filterMaxItems])

  async function loadData() {
    try {
      const [ordersRes, suppliersRes, productsRes, settingsRes] = await Promise.all([
        fetch('/api/purchase-orders'),
        fetch('/api/suppliers'),
        fetch('/api/products'),
        fetch('/api/settings')
      ])

      const [ordersData, suppliersData, productsData, settingsData] = await Promise.all([
        ordersRes.json(),
        suppliersRes.json(),
        productsRes.json(),
        settingsRes.json()
      ])

      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
      setProducts(Array.isArray(productsData) ? productsData : [])
      setIsVatPayer(settingsData.isVatPayer ?? true)
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
      alert('Nepodařilo se načíst data')
      setOrders([])
      setSuppliers([])
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenForm() {
    // Získej další číslo objednávky (podle aktuálního orderDate)
    const res = await fetch(`/api/purchase-orders/next-number?date=${orderDate}`)
    const data = await res.json()
    setOrderNumber(data.nextNumber)
    // Přidej defaultně 1 prázdnou položku
    // Pro neplátce DPH automaticky nastavit sazbu na -1
    const defaultVatRate = isVatPayer ? DEFAULT_VAT_RATE : NON_VAT_PAYER_RATE
    setItems([{
      productId: '',
      productName: '',
      isManual: false,
      quantity: 1,
      unit: 'ks',
      expectedPrice: 0,
      vatRate: defaultVatRate
    }])
    setShowForm(true)
  }

  // Automaticky aktualizuj číslo objednávky když se změní datum
  async function handleOrderDateChange(newDate: string) {
    setOrderDate(newDate)
    // Aktualizuj číslo objednávky
    const res = await fetch(`/api/purchase-orders/next-number?date=${newDate}`)
    const data = await res.json()
    setOrderNumber(data.nextNumber)
  }

  function handleAddItem() {
    // Pro neplátce DPH automaticky nastavit sazbu na -1
    const defaultVatRate = isVatPayer ? DEFAULT_VAT_RATE : NON_VAT_PAYER_RATE
    setItems([...items, {
      productId: '',
      productName: '',
      isManual: false,
      quantity: 1,
      unit: 'ks',
      expectedPrice: 0,
      vatRate: defaultVatRate
    }])
  }

  function handleRemoveItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function handleItemChange(index: number, field: string, value: any) {
    const newItems = [...items]

    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) {
        // Pro neplátce DPH vždy použij -1 bez ohledu na nastavení produktu
        const effectiveVatRate = isVatPayer ? Number(product.vatRate || DEFAULT_VAT_RATE) : NON_VAT_PAYER_RATE
        newItems[index] = {
          ...newItems[index],
          productId: value,
          productName: '',
          isManual: false,
          unit: product.unit,
          expectedPrice: product.purchasePrice || 0,
          vatRate: effectiveVatRate
        }
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }

    setItems(newItems)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // POVINNÁ VALIDACE: Musí být vybrán dodavatel (ze selectu, ručně, nebo anonymní)
    if (!supplierId && !isManualSupplier && !isAnonymousSupplier) {
      alert('Vyberte dodavatele, zadejte ho ručně nebo zvolte anonymního dodavatele')
      return
    }

    // Pokud je manuální, validuj minimální údaje
    if (isManualSupplier && !manualSupplierData.name.trim()) {
      alert('Vyplňte alespoň název dodavatele')
      return
    }

    if (items.length === 0) {
      alert('Přidejte alespoň jednu položku')
      return
    }

    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          supplierId: isManualSupplier || isAnonymousSupplier ? null : supplierId,
          orderDate,
          expectedDate: expectedDate || null,
          dueDate: dueDate || null,
          paymentType: paymentType || null,
          variableSymbol: variableSymbol || null,
          constantSymbol: constantSymbol || null,
          specificSymbol: specificSymbol || null,
          note,
          // Manuální nebo anonymní dodavatel
          isManualSupplier,
          isAnonymousSupplier,
          saveSupplierToDatabase,
          manualSupplierData: isManualSupplier ? manualSupplierData : null,
          items: items.map(item => ({
            productId: item.isManual ? null : item.productId,
            productName: item.isManual ? item.productName : null,
            isManual: item.isManual,
            quantity: item.quantity,
            unit: item.unit,
            expectedPrice: item.expectedPrice
          }))
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Chyba při vytváření objednávky')
      }

      setShowForm(false)
      resetForm()
      loadData()
      alert('Objednávka vytvořena!')
    } catch (error: any) {
      console.error('Chyba:', error)
      alert(error.message || 'Nepodařilo se vytvořit objednávku')
    }
  }

  function resetForm() {
    setOrderNumber('')
    setSupplierId('')
    setOrderDate(new Date().toISOString().split('T')[0])
    setExpectedDate('')
    setNote('')
    setItems([])
    setDueDate('')
    setPaymentType('')
    setVariableSymbol('')
    setConstantSymbol('')
    setSpecificSymbol('')
    setIsManualSupplier(false)
    setIsAnonymousSupplier(false)
    setSaveSupplierToDatabase(false)
    setManualSupplierData({
      name: '',
      entityType: 'company',
      contactPerson: '',
      email: '',
      phone: '',
      ico: '',
      dic: '',
      bankAccount: '',
      website: '',
      address: '',
      note: ''
    })
  }

  function toggleExpanded(orderId: string) {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }


  async function handleDownloadPDF(orderId: string) {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    try {
      const pdfData = {
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        expectedDate: order.expectedDate,
        supplierName: order.supplier?.name || order.supplierName || 'Neznámý dodavatel',
        supplierAddress: order.supplier?.address,
        supplierICO: order.supplier?.ico,
        supplierDIC: order.supplier?.dic,
        items: order.items.map(item => ({
          productName: item.product?.name || item.productName || 'Neznámý produkt',
          quantity: Number(item.quantity),
          unit: item.unit,
          price: Number(item.expectedPrice || 0)
        })),
        totalAmount: order.items.reduce((sum, item) =>
          sum + (Number(item.quantity) * Number(item.expectedPrice || 0)), 0
        ),
        note: order.note,
        status: order.status,
        stornoReason: order.stornoReason,
        stornoAt: order.stornoAt
      }

      const settingsRes = await fetch('/api/settings')
      const settings = await settingsRes.json()
      const pdfBlob = await generatePurchaseOrderPDF(pdfData, settings)
      openPDFInNewTab(pdfBlob)
    } catch (error: any) {
      console.error('Chyba při generování PDF:', error)
      alert(`Chyba při generování PDF: ${error.message}`)
    }
  }

  function getStatusBadge(status: string) {
    if (status === 'storno') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          STORNO
        </span>
      )
    }

    if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Zrušena
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
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Čeká
      </span>
    )
  }

  if (loading) {
    return <div className="p-6">Načítání...</div>
  }

  return (
    <div className="space-y-6">
      {/* Hlavička */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-l-4 border-blue-500 rounded-lg shadow-sm py-4 px-6 mb-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-600">
            Objednávky vydané
            <span className="text-sm font-normal text-gray-600 ml-3">
              (Zobrazeno <span className="font-semibold text-blue-600">{filteredOrders.length}</span> z <span className="font-semibold text-gray-700">{orders.length}</span>)
            </span>
          </h1>
        </div>
      </div>

      {/* Formulář - klikací nadpis */}
      <Card className="mb-6 border-2 border-blue-300 bg-blue-50 shadow-lg">
        <CardHeader
          className="cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => {
            if (!showForm) {
              handleOpenForm()
            } else {
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
              <Package className="w-5 h-5" />
              Nová objednávka dodavateli
              {showForm && orderNumber && (
                <span className="text-sm font-mono bg-blue-800 text-white px-3 py-1 rounded ml-2">
                  #{orderNumber}
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        {showForm && (
          <CardContent className="p-6 bg-white">
            <form onSubmit={handleSubmit} className="space-y-3">

              {/* Hlavní pole formuláře — flat layout bez nested karet */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1.5fr_1.5fr] gap-4 items-start">

                  {/* Dodavatel */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Dodavatel</label>
                    <CustomerSupplierSelector
                      compact
                      type="supplier"
                      entities={suppliers}
                      selectedId={supplierId}
                      onSelectedIdChange={setSupplierId}
                      manualData={manualSupplierData}
                      onManualDataChange={setManualSupplierData}
                      isManual={isManualSupplier}
                      onIsManualChange={setIsManualSupplier}
                      isAnonymous={isAnonymousSupplier}
                      onIsAnonymousChange={setIsAnonymousSupplier}
                      saveToDatabase={saveSupplierToDatabase}
                      onSaveToDatabaseChange={setSaveSupplierToDatabase}
                      required={false}
                    />
                  </div>

                  {/* Datum objednávky */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Datum obj.</label>
                    <Input type="date" value={orderDate} onChange={(e) => handleOrderDateChange(e.target.value)} />
                  </div>

                  {/* Očekávané dodání */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Dodání</label>
                    <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
                  </div>

                  {/* Datum splatnosti */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Splatnost</label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>

                  {/* Forma úhrady */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Forma úhrady</label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    >
                      <option value="">Vyberte...</option>
                      <option value="cash">Hotově</option>
                      <option value="card">Kartou</option>
                      <option value="transfer">Převodem</option>
                    </select>
                  </div>

                  {/* Poznámka */}
                  <div>
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Poznámka</label>
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Volitelná poznámka..."
                    />
                  </div>
                </div>

                {/* Bankovní symboly — zobrazí se jen pro převod */}
                {paymentType === 'transfer' && (
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Variabilní symbol</label>
                      <Input value={variableSymbol} onChange={(e) => setVariableSymbol(e.target.value)} placeholder="VS" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Konstantní symbol</label>
                      <Input value={constantSymbol} onChange={(e) => setConstantSymbol(e.target.value)} placeholder="KS" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">Specifický symbol</label>
                      <Input value={specificSymbol} onChange={(e) => setSpecificSymbol(e.target.value)} placeholder="SS" />
                    </div>
                  </div>
                )}
              </div>

              {/* Manuální formulář dodavatele — plná šířka pod řádkem */}
              {isManualSupplier && !isAnonymousSupplier && (
                <div className="border border-blue-200 rounded-lg bg-blue-50/30">
                  <div className="bg-blue-50 px-3 py-2 border-b border-blue-200 rounded-t-lg flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Údaje o dodavateli — ruční zadání</h3>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={saveSupplierToDatabase} onChange={(e) => setSaveSupplierToDatabase(e.target.checked)} className="w-3.5 h-3.5" />
                      <span className="text-xs text-blue-700">Uložit do databáze</span>
                    </label>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-4 gap-2">
                      {/* Typ subjektu */}
                      <div className="col-span-4 flex items-center gap-4 mb-1">
                        <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                          <input type="radio" name="supplierEntityType" value="company" checked={manualSupplierData.entityType === 'company'} onChange={() => setManualSupplierData({...manualSupplierData, entityType: 'company'})} className="w-3.5 h-3.5" />
                          🏢 Firma
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                          <input type="radio" name="supplierEntityType" value="individual" checked={manualSupplierData.entityType === 'individual'} onChange={() => setManualSupplierData({...manualSupplierData, entityType: 'individual'})} className="w-3.5 h-3.5" />
                          👤 Fyzická osoba
                        </label>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">{manualSupplierData.entityType === 'individual' ? 'Jméno a příjmení' : 'Název'} *</label>
                        <Input value={manualSupplierData.name} onChange={(e) => setManualSupplierData({...manualSupplierData, name: e.target.value})} placeholder={manualSupplierData.entityType === 'individual' ? 'Jan Novák' : 'Název firmy'} required />
                      </div>
                      {manualSupplierData.entityType === 'company' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Kontaktní osoba</label>
                          <Input value={manualSupplierData.contactPerson} onChange={(e) => setManualSupplierData({...manualSupplierData, contactPerson: e.target.value})} placeholder="Kontaktní osoba" />
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Email</label>
                        <Input type="email" value={manualSupplierData.email} onChange={(e) => setManualSupplierData({...manualSupplierData, email: e.target.value})} placeholder="email@example.com" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Telefon</label>
                        <Input value={manualSupplierData.phone} onChange={(e) => setManualSupplierData({...manualSupplierData, phone: e.target.value})} placeholder="+420 123 456 789" />
                      </div>
                      {manualSupplierData.entityType === 'company' && (<>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">IČO</label>
                          <Input value={manualSupplierData.ico} onChange={(e) => setManualSupplierData({...manualSupplierData, ico: e.target.value})} placeholder="IČO" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">DIČ</label>
                          <Input value={manualSupplierData.dic} onChange={(e) => setManualSupplierData({...manualSupplierData, dic: e.target.value})} placeholder="DIČ" />
                        </div>
                      </>)}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Číslo účtu</label>
                        <Input value={manualSupplierData.bankAccount} onChange={(e) => setManualSupplierData({...manualSupplierData, bankAccount: e.target.value})} placeholder="123456789/0100" />
                      </div>
                      {manualSupplierData.entityType === 'company' && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Web</label>
                          <Input value={manualSupplierData.website} onChange={(e) => setManualSupplierData({...manualSupplierData, website: e.target.value})} placeholder="https://example.com" />
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Adresa *</label>
                        <Input value={manualSupplierData.address} onChange={(e) => setManualSupplierData({...manualSupplierData, address: e.target.value})} placeholder="Ulice, Město, PSČ" required />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Poznámka</label>
                        <Input value={manualSupplierData.note} onChange={(e) => setManualSupplierData({...manualSupplierData, note: e.target.value})} placeholder="Volitelná poznámka..." />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Anonymní info */}
              {isAnonymousSupplier && (
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
                  Dodavatel bude uložen jako „Anonymní dodavatel" bez dalších údajů.
                </div>
              )}

              {/* Položky */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-lg flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    Položky objednávky
                    <span className="text-red-400 ml-0.5">*</span>
                  </h3>
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    size="sm"
                    className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Přidat
                  </Button>
                </div>
                <div className="p-3">

                {items.map((item, index) => (
                  <div key={index} className={`grid ${isVatPayer ? 'grid-cols-[4fr_2fr_1fr_1fr_2fr_2fr_auto]' : 'grid-cols-12'} gap-2 mb-1.5 items-end bg-white rounded border border-gray-200 hover:border-blue-300 transition-colors px-2 py-1.5`}>
                    <div className={isVatPayer ? '' : 'col-span-4'} style={{ position: 'relative' }}>
                      {/* Windows-style cascading menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenDropdownIndex(openDropdownIndex === index ? null : index)}
                          onBlur={(e) => {
                            // Zavři dropdown po kliknutí mimo (s malým timeoutem kvůli hover efektu)
                            const target = e.currentTarget
                            setTimeout(() => {
                              if (target && !target.contains(document.activeElement)) {
                                setOpenDropdownIndex(null)
                                setHoveredCategory(null)
                              }
                            }, 200)
                          }}
                          className="w-full border rounded px-2 py-2 text-sm text-left bg-white hover:bg-gray-50 flex items-center justify-between"
                        >
                          <span className={item.productId ? 'text-gray-900' : 'text-gray-500'}>
                            {item.productId
                              ? products.find(p => p.id === item.productId)?.name
                              : 'Vyberte produkt...'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>

                        {/* Kategorie dropdown */}
                        {openDropdownIndex === index && (
                          <>
                            {/* Hlavní menu s kategoriemi */}
                            <div
                              ref={categoryMenuRef}
                              className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-[500px] overflow-y-auto"
                              onMouseLeave={() => {
                                // Zpoždění před zavřením submenu - dává čas najet na submenu
                                hideSubmenuTimeoutRef.current = setTimeout(() => {
                                  setHoveredCategory(null)
                                  setCategoryRect(null)
                                }, 500)
                              }}
                              onMouseEnter={() => {
                                // Zruš timeout pokud se myš vrátí
                                if (hideSubmenuTimeoutRef.current) {
                                  clearTimeout(hideSubmenuTimeoutRef.current)
                                  hideSubmenuTimeoutRef.current = null
                                }
                              }}
                            >
                              {(() => {
                                // Získej unikátní kategorie
                                const categories = new Set<string>()
                                products.forEach(p => {
                                  if (p.category) {
                                    categories.add(p.category.name)
                                  }
                                })
                                const categoryArray = Array.from(categories).sort()

                                return (
                                  <>
                                    {categoryArray.map(cat => (
                                      <div
                                        key={cat}
                                        className="relative"
                                        onMouseEnter={(e) => {
                                          // Zruš jakýkoliv pending timeout
                                          if (hideSubmenuTimeoutRef.current) {
                                            clearTimeout(hideSubmenuTimeoutRef.current)
                                            hideSubmenuTimeoutRef.current = null
                                          }
                                          setHoveredCategory(cat)
                                          setCategoryRect(e.currentTarget.getBoundingClientRect())
                                        }}
                                        onMouseLeave={(e) => {
                                          // Pokud myš jde doprava (k submenu), vůbec neskrývej
                                          const rect = e.currentTarget.getBoundingClientRect()
                                          if (e.clientX > rect.right) {
                                            // Vyčisti případný starý timeout, ale nenastavuj nový
                                            if (hideSubmenuTimeoutRef.current) {
                                              clearTimeout(hideSubmenuTimeoutRef.current)
                                              hideSubmenuTimeoutRef.current = null
                                            }
                                            return
                                          }
                                          // Jinak nastav timeout pro skrytí
                                          hideSubmenuTimeoutRef.current = setTimeout(() => {
                                            setHoveredCategory(null)
                                            setCategoryRect(null)
                                          }, 500)
                                        }}
                                      >
                                        <div className="px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center gap-2 select-none">
                                          <span>{cat}</span>
                                          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                                        </div>
                                      </div>
                                    ))}

                                    {/* Produkty bez kategorie */}
                                    {products.filter(p => !p.category).length > 0 && (
                                      <div
                                        className="relative"
                                        onMouseEnter={(e) => {
                                          // Zruš jakýkoliv pending timeout
                                          if (hideSubmenuTimeoutRef.current) {
                                            clearTimeout(hideSubmenuTimeoutRef.current)
                                            hideSubmenuTimeoutRef.current = null
                                          }
                                          setHoveredCategory('__no_category__')
                                          setCategoryRect(e.currentTarget.getBoundingClientRect())
                                        }}
                                        onMouseLeave={(e) => {
                                          // Pokud myš jde doprava (k submenu), vůbec neskrývej
                                          const rect = e.currentTarget.getBoundingClientRect()
                                          if (e.clientX > rect.right) {
                                            // Vyčisti případný starý timeout, ale nenastavuj nový
                                            if (hideSubmenuTimeoutRef.current) {
                                              clearTimeout(hideSubmenuTimeoutRef.current)
                                              hideSubmenuTimeoutRef.current = null
                                            }
                                            return
                                          }
                                          // Jinak nastav timeout pro skrytí
                                          hideSubmenuTimeoutRef.current = setTimeout(() => {
                                            setHoveredCategory(null)
                                            setCategoryRect(null)
                                          }, 500)
                                        }}
                                      >
                                        <div className="px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center gap-2 select-none">
                                          <span className="italic text-gray-600">Bez kategorie</span>
                                          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )
                              })()}
                            </div>

                            {/* Submenu s produkty - MIMO scrollovací container, použije fixed positioning */}
                            {hoveredCategory && categoryRect && categoryMenuRef.current && (() => {
                              // Vypočítej dynamickou šířku podle nejdelšího názvu produktu
                              const filteredProducts = products.filter(p =>
                                hoveredCategory === '__no_category__'
                                  ? !p.category
                                  : p.category?.name === hoveredCategory
                              )

                              // Odhadni šířku: ~7px na znak + padding
                              const maxLength = Math.max(
                                ...filteredProducts.map(p => p.name.length + (p.unit?.length || 0) + 3)
                              )
                              const estimatedWidth = Math.min(Math.max(maxLength * 7 + 60, 250), 600)

                              return (
                                <div
                                  className="fixed bg-white border border-gray-300 rounded shadow-xl max-h-[500px] overflow-y-auto z-[60]"
                                  style={{
                                    width: `${estimatedWidth}px`,
                                    left: `${categoryRect.right}px`,
                                    top: `${categoryRect.top}px`,
                                  }}
                                  onMouseEnter={() => {
                                    // Zruš timeout když najedeme na submenu
                                    if (hideSubmenuTimeoutRef.current) {
                                      clearTimeout(hideSubmenuTimeoutRef.current)
                                      hideSubmenuTimeoutRef.current = null
                                    }
                                  }}
                                  onMouseLeave={() => {
                                    // Zpoždění i při opuštění submenu, pro případ že se vrací zpět
                                    hideSubmenuTimeoutRef.current = setTimeout(() => {
                                      setHoveredCategory(null)
                                      setCategoryRect(null)
                                    }, 200)
                                  }}
                                >
                                  {filteredProducts.map(p => (
                                    <div
                                      key={p.id}
                                      onMouseDown={(e) => {
                                        e.preventDefault() // Zabrání triggeru onBlur na buttonu
                                        handleItemChange(index, 'productId', p.id)
                                        setOpenDropdownIndex(null)
                                        setHoveredCategory(null)
                                        setCategoryRect(null)
                                      }}
                                      className="px-4 py-2.5 hover:bg-blue-100 cursor-pointer text-sm flex items-center gap-2"
                                    >
                                      <span>{p.name}</span>
                                      <span className="text-xs text-gray-500">
                                        ({p.unit})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}
                          </>
                        )}
                      </div>
                    </div>

                    <div className={isVatPayer ? '' : 'col-span-2'}>
                      <label className="text-xs text-gray-600 mb-1 block">Množství</label>
                      <Input
                        type="number"
                        step="1"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="0"
                        className="bg-white"
                      />
                    </div>

                    <div className={isVatPayer ? '' : 'col-span-2'}>
                      <label className="text-xs text-gray-600 mb-1 block">Jedn.</label>
                      <Input
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        placeholder="ks"
                        className="bg-white"
                      />
                    </div>

                    {isVatPayer && (
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">DPH</label>
                        <div className={`px-2 py-2 border rounded text-sm text-center ${
                          isNonVatPayer(item.vatRate)
                            ? 'bg-gray-100 text-gray-500 border-gray-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {isNonVatPayer(item.vatRate) ? '-' : (VAT_RATE_LABELS[item.vatRate] || `${item.vatRate}%`)}
                        </div>
                      </div>
                    )}

                    <div className={isVatPayer ? '' : 'col-span-3'}>
                      <label className="text-xs text-gray-600 mb-1 block">Cena/ks</label>
                      <Input
                        type="number"
                        step="1"
                        value={item.expectedPrice || ''}
                        onChange={(e) => handleItemChange(index, 'expectedPrice', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="0.00"
                        className="bg-white"
                      />
                    </div>

                    {isVatPayer && (
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Celkem</label>
                        {(() => {
                          const total = !isNonVatPayer(item.vatRate)
                            ? calculateLineVat(item.quantity || 0, item.expectedPrice || 0, item.vatRate).totalWithVat
                            : (item.quantity || 0) * (item.expectedPrice || 0)
                          return (
                            <div className="px-2 py-2 border rounded text-sm text-right font-medium bg-gray-50 text-gray-800 border-gray-200">
                              {total.toLocaleString('cs-CZ')} Kč
                            </div>
                          )
                        })()}
                      </div>
                    )}

                    <div className={isVatPayer ? '' : 'col-span-1'}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                        className="hover:bg-red-100 hover:text-red-700 transition-colors w-full"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Souhrn s DPH - pod položkami */}
                {isVatPayer && items.length > 0 && (() => {
                  const vatLineItems: VatLineItem[] = items.map(item =>
                    calculateLineVat(item.quantity || 0, item.expectedPrice || 0, item.vatRate)
                  )
                  const summary = calculateVatSummary(vatLineItems)

                  return (
                    <div className="mt-2 bg-gray-50 rounded border border-gray-200 overflow-hidden">
                      <div className="p-4 space-y-2">
                        {/* Základ bez DPH */}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Základ bez DPH:</span>
                          <span className="font-medium text-gray-900">{summary.totalWithoutVat.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                        </div>

                        {/* Rekapitulace DPH podle sazeb */}
                        {Object.entries(summary.byRate)
                          .filter(([rate]) => !isNonVatPayer(Number(rate)))
                          .map(([rate, breakdown]) => (
                          <div key={rate} className="flex justify-between text-sm pl-4">
                            <span className="text-gray-500">
                              DPH {VAT_RATE_LABELS[Number(rate)] || `${rate}%`}:
                            </span>
                            <span className="text-gray-700">{breakdown.vat.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                          </div>
                        ))}

                        {/* Celkem s DPH */}
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <span className="font-semibold text-gray-800">Celkem s DPH:</span>
                          <span className="font-bold text-gray-900 text-base">{summary.totalWithVat.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
                </div>{/* /p-3 */}
              </div>{/* /items card */}

              {/* Tlačítka */}
              <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="px-5 hover:bg-gray-100"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  className="px-6 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Vytvořit objednávku
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Filtry - přesně odpovídající sloupcům tabulky */}
      <div className="mb-4">
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          {/* Vymazat filtry - úplně vlevo nad šipkou */}
          <button
            onClick={() => {
              setFilterNumber('')
              setFilterDate('')
              setFilterSupplier('')
              setFilterPaymentType('all')
              setFilterStatus('all')
              setFilterMinValue('')
              setFilterMaxValue('')
              setFilterMinItems('')
              setFilterMaxItems('')
            }}
            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center"
            title="Vymazat filtry"
          >
            ✕
          </button>

          {/* Číslo */}
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

          {/* Dodavatel - textové vyhledávání s dropdownem */}
          <div ref={filterSupplierRef} className="relative">
            <input
              type="text"
              value={filterSupplier}
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
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-gray-500 italic"
                >
                  Anonymní dodavatel
                </div>

                {/* Dodavatelé */}
                {suppliers.map(supplier => (
                  <div
                    key={supplier.id}
                    onClick={() => {
                      setFilterSupplier(supplier.name)
                      setFilterSupplierDropdownOpen(false)
                    }}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs"
                  >
                    {supplier.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Typ platby - dropdown */}
          <div ref={filterPaymentTypeRef} className="relative">
            <div
              onClick={() => setFilterPaymentTypeDropdownOpen(!filterPaymentTypeDropdownOpen)}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-blue-500 flex items-center justify-center"
            >
              {filterPaymentType === 'all' && 'Vše'}
              {filterPaymentType === 'none' && '-'}
              {filterPaymentType === 'cash' && 'Hotovost'}
              {filterPaymentType === 'card' && 'Karta'}
              {filterPaymentType === 'transfer' && 'Převod'}
            </div>

            {filterPaymentTypeDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
                <div
                  onClick={() => {
                    setFilterPaymentType('all')
                    setFilterPaymentTypeDropdownOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center"
                >
                  Vše
                </div>
                <div
                  onClick={() => {
                    setFilterPaymentType('none')
                    setFilterPaymentTypeDropdownOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center"
                >
                  -
                </div>
                <div
                  onClick={() => {
                    setFilterPaymentType('cash')
                    setFilterPaymentTypeDropdownOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center"
                >
                  Hotovost
                </div>
                <div
                  onClick={() => {
                    setFilterPaymentType('card')
                    setFilterPaymentTypeDropdownOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center"
                >
                  Karta
                </div>
                <div
                  onClick={() => {
                    setFilterPaymentType('transfer')
                    setFilterPaymentTypeDropdownOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center"
                >
                  Převod
                </div>
              </div>
            )}
          </div>

          {/* Počet položek */}
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
            placeholder="≥ Kč"
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Status - dropdown vpravo */}
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
                <div
                  onClick={() => {
                    setFilterStatus('all')
                    setFilterStatusDropdownOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center"
                >
                  Vše
                </div>
                <div
                  onClick={() => {
                    setFilterStatus('pending')
                    setFilterStatusDropdownOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-yellow-600"
                >
                  Čeká
                </div>
                <div
                  onClick={() => {
                    setFilterStatus('partially_received')
                    setFilterStatusDropdownOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-orange-600"
                >
                  Částečně
                </div>
                <div
                  onClick={() => {
                    setFilterStatus('received')
                    setFilterStatusDropdownOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-green-600"
                >
                  Přijato
                </div>
                <div
                  onClick={() => {
                    setFilterStatus('storno')
                    setFilterStatusDropdownOpen(false)
                  }}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-red-600"
                >
                  Storno
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seznam objednávek */}
      <div ref={sectionRef} className="space-y-2">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              Zatím nemáte žádné objednávky
            </CardContent>
          </Card>
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

            {/* Objednávky */}
            {filteredOrders
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((order) => (
              <div
                key={order.id}
                ref={order.id === highlightId ? highlightRef : null}
                className={`border rounded-lg ${
                  order.id === highlightId ? 'ring-2 ring-blue-500 bg-blue-50' :
                  expandedOrders.has(order.id) ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                <div className={`p-4 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 transition-colors ${order.status === 'storno' ? 'bg-red-50 opacity-70' : 'hover:bg-gray-50'}`}>
                  {/* Rozbalit/sbalit */}
                  <button
                    onClick={() => toggleExpanded(order.id)}
                    className="w-8"
                  >
                    {expandedOrders.has(order.id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>

                  {/* Číslo */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(order.id)}
                  >
                    <p className={`text-sm font-semibold text-gray-900 truncate ${order.status === 'storno' ? 'line-through' : ''}`}>
                      {order.orderNumber}
                    </p>
                  </div>

                  {/* Datum */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(order.id)}
                  >
                    <p className="text-sm text-gray-700">
                      {formatDate(order.orderDate)}
                    </p>
                  </div>

                  {/* Dodavatel */}
                  <div className="text-center">
                    {(() => {
                      // Zkus najít dodavatele z objednávky
                      let supplier = order.supplier

                      // Pokud není propojený, zkus najít podle jména
                      if (!supplier && order.supplierName) {
                        supplier = suppliers.find(s => s.name === order.supplierName)
                      }

                      if (supplier && supplier.id) {
                        return (
                          <a
                            href={`/suppliers?highlight=${supplier.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate inline-block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {supplier.name}
                          </a>
                        )
                      }
                      return (
                        <p
                          className="text-sm text-gray-700 truncate cursor-pointer"
                          onClick={() => toggleExpanded(order.id)}
                        >
                          {order.supplierName || '-'}
                        </p>
                      )
                    })()}
                  </div>

                  {/* Typ platby */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(order.id)}
                  >
                    <p className="text-sm text-gray-700">
                      {(order.invoice as any)?.paymentType === 'cash' && 'Hotovost'}
                      {(order.invoice as any)?.paymentType === 'card' && 'Karta'}
                      {(order.invoice as any)?.paymentType === 'transfer' && 'Převod'}
                      {!(order.invoice as any)?.paymentType && '-'}
                    </p>
                  </div>

                  {/* Položek */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(order.id)}
                  >
                    <p className="text-sm text-gray-600">
                      {order.items.length}
                    </p>
                  </div>

                  {/* Hodnota */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(order.id)}
                  >
                    <p className="text-sm font-bold text-gray-900">
                      {formatPrice(order.items.reduce((sum, item) => {
                        const unitPrice = Number(item.expectedPrice || 0)
                        const itemVatRate = Number(item.vatRate || 21)
                        const isItemNonVat = isNonVatPayer(itemVatRate)
                        const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                        const priceWithVat = isVatPayer ? (unitPrice + vatPerUnit) : unitPrice
                        return sum + (Number(item.quantity) * priceWithVat)
                      }, 0))}
                    </p>
                  </div>

                  {/* Status */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(order.id)}
                  >
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Detail položek */}
                {expandedOrders.has(order.id) && (
                  <div className="border-t p-4 bg-gray-50">
                    {/* Rozcestník - pouze odkazy */}
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-sm text-center">
                        <span className="text-gray-600">Faktura: </span>
                        {order.invoice ? (
                          <a
                            href={`/invoices/received?highlight=${order.invoice.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.invoice.invoiceNumber}
                            <ExternalLink className="w-3 h-3 inline ml-1" />
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>

                    {/* Informace o objednávce */}
                    <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                      <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Informace o objednávce</h4>

                      <div className="border-b">
                        <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Obecné</h5>
                        <div className="text-sm">
                          <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                            <div><span className="text-gray-600">Datum vytvoření:</span> <span className="font-medium">{formatDate(order.orderDate)}</span></div>
                            <div className="border-l border-gray-200 mx-4"></div>
                            <div><span className="text-gray-600">Datum dodání:</span> <span className="font-medium">{order.receipts && order.receipts.length > 0 ? order.receipts.map(r => formatDate(r.receiptDate)).join(', ') : '-'}</span></div>
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                            <div><span className="text-gray-600">Očekávané dodání:</span> <span className="font-medium">{order.expectedDate ? formatDate(order.expectedDate) : '-'}</span></div>
                            <div className="border-l border-gray-200 mx-4"></div>
                            <div><span className="text-gray-600">Typ platby:</span> <span className="font-medium">
                              {(order.invoice as any)?.paymentType === 'cash' && 'Hotovost'}
                              {(order.invoice as any)?.paymentType === 'card' && 'Karta'}
                              {(order.invoice as any)?.paymentType === 'transfer' && 'Bankovní převod'}
                              {!(order.invoice as any)?.paymentType && '-'}
                            </span></div>
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                            <div><span className="text-gray-600">Datum splatnosti:</span> <span className="font-medium">{(order.invoice as any)?.dueDate ? formatDate((order.invoice as any).dueDate) : '-'}</span></div>
                            <div className="border-l border-gray-200 mx-4"></div>
                            <div><span className="text-gray-600">Poznámka:</span> <span className="font-medium">{order.note || '-'}</span></div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Dodavatel</h5>
                        <div className="text-sm">
                          {(() => {
                            const supplierName = order.supplierName || order.supplier?.name || 'Anonymní dodavatel'
                            const isAnonymous = supplierName === 'Anonymní dodavatel'

                            // Pokud je anonymní, zobraz jen název
                            if (isAnonymous) {
                              return (
                                <div className="px-4 py-2 bg-white">
                                  <span className="text-gray-600">Název: </span>
                                  <span className="font-bold text-gray-900">Anonymní dodavatel</span>
                                </div>
                              )
                            }

                            // Pro ostatní zobraz plné detaily
                            const supplier = order.supplier as any
                            const entityType = order.supplierEntityType || supplier?.entityType || 'company'

                            return (
                              <>
                                {/* Název a typ subjektu */}
                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                  <div>
                                    <span className="text-gray-600">Název:</span>
                                    <span className="font-medium">{supplierName}</span>
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                      {entityType === 'company' ? '🏢 Firma' : '👤 FO'}
                                    </span>
                                  </div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  {/* Kontaktní osoba pouze pro firmy */}
                                  {entityType === 'company' && (
                                    <div><span className="text-gray-600">Kontaktní osoba:</span> <span className="font-medium">{order.supplierContactPerson || supplier?.contact || '-'}</span></div>
                                  )}
                                  {/* Pro FO zobrazíme Email */}
                                  {entityType === 'individual' && (
                                    <div><span className="text-gray-600">Email:</span> <span className="font-medium">{order.supplierEmail || supplier?.email || '-'}</span></div>
                                  )}
                                </div>
                                {/* Adresa a Telefon - vždy */}
                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                  <div><span className="text-gray-600">Adresa:</span> <span className="font-medium">{order.supplierAddress || supplier?.address || '-'}</span></div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  <div><span className="text-gray-600">Telefon:</span> <span className="font-medium">{order.supplierPhone || supplier?.phone || '-'}</span></div>
                                </div>

                                {/* Pro FIRMU: IČO a Email */}
                                {entityType === 'company' && (
                                  <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                    <div><span className="text-gray-600">IČO:</span> <span className="font-medium">{order.supplierICO || supplier?.ico || '-'}</span></div>
                                    <div className="border-l border-gray-200 mx-4"></div>
                                    <div><span className="text-gray-600">Email:</span> <span className="font-medium">{order.supplierEmail || supplier?.email || '-'}</span></div>
                                  </div>
                                )}

                                {/* Pro FIRMU: DIČ a Web */}
                                {entityType === 'company' && (
                                  <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                    <div><span className="text-gray-600">DIČ:</span> <span className="font-medium">{order.supplierDIC || supplier?.dic || '-'}</span></div>
                                    <div className="border-l border-gray-200 mx-4"></div>
                                    <div><span className="text-gray-600">Web:</span> <span className="font-medium">{order.supplierWebsite || supplier?.website || '-'}</span></div>
                                  </div>
                                )}

                                {/* Bankovní účet a Poznámka - vždy */}
                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                  <div><span className="text-gray-600">Bankovní účet:</span> <span className="font-medium">{order.supplierBankAccount || supplier?.bankAccount || '-'}</span></div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  <div><span className="text-gray-600">Poznámka:</span> <span className="font-medium">{order.note || supplier?.note || '-'}</span></div>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Položky objednávky */}
                    <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                      <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Položky objednávky ({order.items.length})</h4>

                      {order.items.length > 0 ? (
                        <div className="text-sm">
                          {/* Hlavička - různá pro plátce a neplátce DPH */}
                          {isVatPayer ? (
                            <div className="grid grid-cols-[3fr_repeat(8,1fr)] gap-2 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b text-xs">
                              <div>Produkt</div>
                              <div className="text-center">Obj.</div>
                              <div className="text-center">Přijato</div>
                              <div className="text-center">Zbývá</div>
                              <div className="text-center">DPH</div>
                              <div className="text-center">Cena/ks</div>
                              <div className="text-center">DPH/ks</div>
                              <div className="text-center">S DPH/ks</div>
                              <div className="text-center">Celkem</div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
                              <div>Produkt</div>
                              <div className="text-right">Objednáno</div>
                              <div className="text-right">Přijato</div>
                              <div className="text-right">Zbývá</div>
                              <div className="text-right">Cena/ks</div>
                              <div className="text-right">Cena celkem</div>
                            </div>
                          )}

                          {/* Řádky položek */}
                          {order.items.map((item, i) => {
                            const received = Number(item.alreadyReceivedQuantity || 0)
                            const ordered = Number(item.quantity)
                            const remaining = ordered - received
                            const isFullyReceived = received >= ordered
                            const isPartiallyReceived = received > 0 && received < ordered
                            const unitPrice = Number(item.expectedPrice || 0)
                            const itemVatRate = Number(item.vatRate || 21)
                            const isItemNonVatPayer = isNonVatPayer(itemVatRate)

                            // Výpočty DPH pro položku
                            const vatPerUnit = isItemNonVatPayer ? 0 : unitPrice * itemVatRate / 100
                            const priceWithVatPerUnit = unitPrice + vatPerUnit
                            const totalWithoutVat = ordered * unitPrice
                            const totalVat = ordered * vatPerUnit
                            const totalWithVat = totalWithoutVat + totalVat

                            // Určení pozadí podle stavu
                            let bgColor = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            if (isFullyReceived) {
                              bgColor = 'bg-green-50'
                            } else if (isPartiallyReceived) {
                              bgColor = 'bg-orange-50'
                            }

                            return isVatPayer ? (
                              <div
                                key={i}
                                className={`grid grid-cols-[3fr_repeat(8,1fr)] gap-2 px-4 py-2 ${bgColor} text-xs`}
                              >
                                <div className="font-medium">{item.product?.name || item.productName}</div>
                                <div className="text-center text-gray-600">
                                  {ordered} {item.unit}
                                </div>
                                <div className="text-center font-medium" style={{ color: received > 0 ? '#10b981' : '#6b7280' }}>
                                  {received} {item.unit}
                                </div>
                                <div className="text-center font-medium" style={{
                                  color: remaining === 0 ? '#10b981' : remaining < ordered ? '#f59e0b' : '#374151'
                                }}>
                                  {remaining.toFixed(3)} {item.unit}
                                </div>
                                <div className="text-center text-gray-500">
                                  {isItemNonVatPayer ? '-' : `${itemVatRate}%`}
                                </div>
                                <div className="text-center text-gray-600">
                                  {formatPrice(unitPrice)}
                                </div>
                                <div className="text-center text-gray-500">
                                  {isItemNonVatPayer ? '-' : formatPrice(vatPerUnit)}
                                </div>
                                <div className="text-center text-gray-700">
                                  {formatPrice(priceWithVatPerUnit)}
                                </div>
                                <div className="text-center font-semibold text-gray-900">
                                  {formatPrice(totalWithVat)}
                                </div>
                              </div>
                            ) : (
                              <div
                                key={i}
                                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2 ${bgColor}`}
                              >
                                <div className="font-medium">{item.product?.name || item.productName}</div>
                                <div className="text-right text-gray-600">
                                  {ordered} {item.unit}
                                </div>
                                <div className="text-right font-medium" style={{ color: received > 0 ? '#10b981' : '#6b7280' }}>
                                  {received} {item.unit}
                                </div>
                                <div className="text-right font-medium" style={{
                                  color: remaining === 0 ? '#10b981' : remaining < ordered ? '#f59e0b' : '#374151'
                                }}>
                                  {remaining.toFixed(3)} {item.unit}
                                </div>
                                <div className="text-right text-gray-600">
                                  {formatPrice(unitPrice)}
                                </div>
                                <div className="text-right font-semibold text-gray-900">
                                  {formatPrice(totalWithoutVat)}
                                </div>
                              </div>
                            )
                          })}

                          {/* Mezisoučet / Sleva / Celková částka */}
                          {(order as any).discountAmount && (order as any).discountAmount > 0 ? (
                            <>
                              {/* Mezisoučet před slevou */}
                              <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(8,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-50 border-t text-sm`}>
                                <div className={isVatPayer ? 'col-span-8' : 'col-span-5'} style={{ fontWeight: 500, color: '#374151' }}>Mezisoučet</div>
                                <div className="text-center font-medium text-gray-700">
                                  {(() => {
                                    const subtotal = parseFloat((order as any).totalAmount?.toString() || '0') + parseFloat((order as any).discountAmount?.toString() || '0')
                                    return formatPrice(subtotal)
                                  })()}
                                </div>
                              </div>

                              {/* Sleva dodavatele */}
                              <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(8,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-yellow-50 text-sm`}>
                                <div className={isVatPayer ? 'col-span-8' : 'col-span-5'} style={{ fontWeight: 500, color: '#111827' }}>
                                  Sleva dodavatele
                                  {(order as any).discountType === 'percentage' && (order as any).discountValue && (
                                    <span className="text-sm text-gray-600 ml-2">
                                      ({(order as any).discountValue}%)
                                    </span>
                                  )}
                                  {(order as any).discountType === 'fixed' && (
                                    <span className="text-sm text-gray-600 ml-2">
                                      (pevná částka)
                                    </span>
                                  )}
                                </div>
                                <div className="text-center font-medium text-red-600">
                                  -{formatPrice((order as any).discountAmount)}
                                </div>
                              </div>

                              {/* Celková částka po slevě */}
                              <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(8,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                                <div className={isVatPayer ? 'col-span-8' : 'col-span-5'}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                                <div className="text-center">
                                  {formatPrice((order as any).totalAmount || 0)}
                                </div>
                              </div>
                            </>
                          ) : (
                            /* Celková částka bez slevy */
                            <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(8,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                              <div className={isVatPayer ? 'col-span-8' : 'col-span-5'}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                              <div className="text-center">
                                {(() => {
                                  // Pro plátce DPH spočítáme celkovou částku včetně DPH
                                  const total = order.items.reduce((sum, item) => {
                                    const unitPrice = Number(item.expectedPrice || 0)
                                    const itemVatRate = Number(item.vatRate || 21)
                                    const itemIsNonVat = isNonVatPayer(itemVatRate)
                                    const vatPerUnit = itemIsNonVat ? 0 : unitPrice * itemVatRate / 100
                                    const priceWithVat = unitPrice + vatPerUnit
                                    return sum + (Number(item.quantity) * (isVatPayer ? priceWithVat : unitPrice))
                                  }, 0)
                                  return formatPrice(total)
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 italic">Žádné položky</div>
                      )}
                    </div>

                    {/* Příjemky */}
                    {order.receipts && order.receipts.length > 0 && (
                      <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Příjemky ({order.receipts.length})</h4>

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
                          {order.receipts.map((receipt, idx) => {
                            // Spočítej celkovou částku příjemky PODLE SKUTEČNĚ PŘIJATÉHO MNOŽSTVÍ
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
                                className={`grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-3 hover:bg-blue-50 transition-colors items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Číslo příjemky + Status */}
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-blue-600 hover:underline">
                                    {receipt.receiptNumber}
                                  </span>
                                  {receipt.status === 'storno' && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                                      STORNO
                                    </span>
                                  )}
                                </div>

                                {/* Datum */}
                                <div className="text-gray-700">
                                  {new Date(receipt.receiptDate).toLocaleDateString('cs-CZ')}
                                </div>

                                {/* Položek */}
                                <div className="text-gray-700 text-center">
                                  {receipt.items?.length || 0}
                                </div>

                                {/* Částka */}
                                <div className="font-semibold text-gray-900 text-right">
                                  {receiptTotal.toLocaleString('cs-CZ')} Kč
                                </div>

                                {/* Ikona external link */}
                                <div className="flex justify-end">
                                  <ExternalLink className="w-4 h-4 text-blue-600" />
                                </div>
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {order.status === 'storno' && order.stornoReason && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm font-medium text-red-900">Stornováno</p>
                        <p className="text-sm text-red-700 mt-1">Důvod: {order.stornoReason}</p>
                        {order.stornoAt && (
                          <p className="text-xs text-red-600 mt-1">
                            Datum storna: {formatDate(order.stornoAt)}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadPDF(order.id)}
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        Zobrazit PDF
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Stránkování a výběr počtu záznamů */}
            {filteredOrders.length > 0 && (() => {
              const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
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
                      ({filteredOrders.length} celkem)
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
