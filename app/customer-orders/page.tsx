// Stránka pro vystavené objednávky (dříve objednávky zákazníků)
// URL: /customer-orders

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, ShoppingCart, Clock, CheckCircle, XCircle, Package, ChevronDown, ChevronRight, Truck, Trash2, ExternalLink, FileText, FileDown } from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'
import Link from 'next/link'
import { generateInvoicePDF } from '@/lib/generateInvoicePDF'
import { VAT_RATE_LABELS, isNonVatPayer, calculateLineVat, calculateVatSummary, DEFAULT_VAT_RATE, NON_VAT_PAYER_RATE, type VatLineItem } from '@/lib/vatCalculation'
import CustomerSupplierSelector from '@/components/CustomerSupplierSelector'
import PaymentDetailsSelector from '@/components/PaymentDetailsSelector'

export const dynamic = 'force-dynamic'

interface Customer {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  unit: string
  price: number
  vatRate: number
  category?: {
    id: string
    name: string
  }
}

interface CustomerOrderItem {
  id?: string
  productId?: string
  productName?: string
  quantity: number
  shippedQuantity?: number // Už vyskladněné množství
  unit: string
  price: number
  vatRate: number // DPH sazba z produktu
  vatAmount?: number
  priceWithVat?: number
  product?: Product
}

interface DeliveryNote {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status?: string
  note?: string
  items?: {
    id: string
    quantity: number
    product?: {
      price: number
    }
  }[]
}

interface IssuedInvoice {
  id: string
  invoiceNumber: string
  paymentType: string
}

interface CustomerOrder {
  id: string
  orderNumber: string
  orderDate: string
  status: string
  totalAmount: number
  totalAmountWithoutVat?: number
  totalVatAmount?: number
  paidAt?: string
  shippedAt?: string
  note?: string
  customer?: Customer
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  items: CustomerOrderItem[]
  reservations?: any[]
  deliveryNotes?: DeliveryNote[]
  issuedInvoice?: IssuedInvoice
}

export default function CustomerOrdersPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const highlightRef = useRef<HTMLDivElement>(null)

  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [isVatPayer, setIsVatPayer] = useState<boolean>(true) // Nastavení z settings
  const [filteredOrders, setFilteredOrders] = useState<CustomerOrder[]>([])
  const [filterNumber, setFilterNumber] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterCustomerDropdownOpen, setFilterCustomerDropdownOpen] = useState(false)
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterPaymentDropdownOpen, setFilterPaymentDropdownOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStatusDropdownOpen, setFilterStatusDropdownOpen] = useState(false)
  const [filterMinValue, setFilterMinValue] = useState('')
  const [filterMinItems, setFilterMinItems] = useState('')

  const filterCustomerRef = useRef<HTMLDivElement>(null)
  const filterPaymentRef = useRef<HTMLDivElement>(null)
  const filterStatusRef = useRef<HTMLDivElement>(null)

  // Paginace
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Formulář
  const [orderNumber, setOrderNumber] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<CustomerOrderItem[]>([])

  // Cascading dropdown state
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null)
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [categoryRect, setCategoryRect] = useState<DOMRect | null>(null)
  const categoryMenuRef = useRef<HTMLDivElement>(null)
  const hideSubmenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Nová pole pro platební detaily (POVINNÉ pro vystavené objednávky)
  const [dueDate, setDueDate] = useState(() => {
    const today = new Date()
    today.setDate(today.getDate() + 14)
    return today.toISOString().split('T')[0]
  })
  const [paymentType, setPaymentType] = useState('')
  const [variableSymbol, setVariableSymbol] = useState('')
  const [constantSymbol, setConstantSymbol] = useState('')
  const [specificSymbol, setSpecificSymbol] = useState('')

  // Manuální zadání zákazníka
  const [isManualCustomer, setIsManualCustomer] = useState(false)
  const [isAnonymousCustomer, setIsAnonymousCustomer] = useState(false)
  const [saveCustomerToDatabase, setSaveCustomerToDatabase] = useState(false)
  const [manualCustomerData, setManualCustomerData] = useState({
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

  // Sleva
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | 'none'>('none')
  const [discountValue, setDiscountValue] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  // Auto-expand a scroll k highlighted objednávce
  useEffect(() => {
    if (highlightId && filteredOrders.length > 0) {
      const index = filteredOrders.findIndex(item => item.id === highlightId)

      if (index !== -1) {
        const pageNumber = Math.floor(index / itemsPerPage) + 1
        setCurrentPage(pageNumber)

        setExpandedOrders(new Set([highlightId]))

        setTimeout(() => {
          const element = document.getElementById(`item-${highlightId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [highlightId, filteredOrders, itemsPerPage])

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

  useEffect(() => {
    let filtered = [...orders]

    if (filterNumber) {
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(filterNumber.toLowerCase())
      )
    }

    if (filterDate) {
      filtered = filtered.filter(o => {
        const oDate = new Date(o.orderDate).toISOString().split('T')[0]
        return oDate === filterDate
      })
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(o => o.status === filterStatus)
    }

    if (filterPayment !== 'all') {
      filtered = filtered.filter(o => {
        if (filterPayment === 'none') {
          return !o.issuedInvoice?.paymentType
        }
        return o.issuedInvoice?.paymentType === filterPayment
      })
    }

    if (filterCustomer) {
      if (filterCustomer === '__anonymous__') {
        filtered = filtered.filter(o => !o.customer && !o.customerName)
      } else {
        filtered = filtered.filter(o => {
          const name = o.customer?.name || o.customerName || ''
          return name.toLowerCase().includes(filterCustomer.toLowerCase())
        })
      }
    }

    // Filtr podle minimální hodnoty
    if (filterMinValue) {
      const minVal = parseFloat(filterMinValue)
      filtered = filtered.filter(o => o.totalAmount >= minVal)
    }

    // Filtr podle minimálního počtu položek
    if (filterMinItems) {
      const minItems = parseInt(filterMinItems)
      filtered = filtered.filter(o => o.items.length >= minItems)
    }

    setFilteredOrders(filtered)
    setCurrentPage(1)
  }, [orders, filterNumber, filterDate, filterStatus, filterPayment, filterCustomer, filterMinValue, filterMinItems])

  async function loadData() {
    try {
      const [ordersRes, customersRes, productsRes, settingsRes] = await Promise.all([
        fetch('/api/customer-orders'),
        fetch('/api/customers'),
        fetch('/api/products'),
        fetch('/api/settings')
      ])

      const [ordersData, customersData, productsData, settingsData] = await Promise.all([
        ordersRes.json(),
        customersRes.json(),
        productsRes.json(),
        settingsRes.json()
      ])

      setOrders(ordersData)
      setCustomers(customersData)
      setProducts(productsData)
      setIsVatPayer(settingsData.isVatPayer ?? true)
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
      alert('Nepodařilo se načíst data')
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenForm() {
    // Získej další číslo objednávky
    const res = await fetch('/api/customer-orders/next-number')
    const data = await res.json()
    setOrderNumber(data.nextNumber)
    // Přidej defaultně 1 prázdnou položku
    // Pro neplátce DPH automaticky nastavit sazbu na -1
    const defaultVatRate = isVatPayer ? DEFAULT_VAT_RATE : NON_VAT_PAYER_RATE
    setItems([{
      productId: '',
      productName: '',
      quantity: 1,
      unit: 'ks',
      price: 0,
      vatRate: defaultVatRate
    }])
    setShowForm(true)
  }

  function handleAddItem() {
    // Pro neplátce DPH automaticky nastavit sazbu na -1
    const defaultVatRate = isVatPayer ? DEFAULT_VAT_RATE : NON_VAT_PAYER_RATE
    setItems([...items, {
      productId: '',
      productName: '',
      quantity: 1,
      unit: 'ks',
      price: 0,
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
        const effectiveVatRate = isVatPayer ? Number(product.vatRate) : NON_VAT_PAYER_RATE
        newItems[index] = {
          ...newItems[index],
          productId: value,
          productName: '',
          unit: product.unit,
          price: Number(product.price),
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

    // POVINNÁ VALIDACE pro Vystavené objednávky:

    // 1. Musí být buď vybrán zákazník, nebo zadán ručně, nebo anonymní
    if (!customerId && !isManualCustomer && !isAnonymousCustomer) {
      alert('Vyberte zákazníka, zadejte ho ručně nebo zvolte anonymního zákazníka')
      return
    }

    // 2. Pokud je manuální, validuj minimální údaje (Jméno, Příjmení, Adresa)
    if (isManualCustomer && !isAnonymousCustomer) {
      if (!manualCustomerData.name.trim()) {
        alert('Vyplňte název zákazníka')
        return
      }
      if (!manualCustomerData.address.trim()) {
        alert('Vyplňte adresu zákazníka')
        return
      }
    }

    // 3. Datum splatnosti je POVINNÉ
    if (!dueDate) {
      alert('Zadejte datum splatnosti')
      return
    }

    // 4. Forma úhrady je POVINNÁ
    if (!paymentType) {
      alert('Vyberte formu úhrady')
      return
    }

    if (items.length === 0) {
      alert('Přidejte alespoň jednu položku')
      return
    }

    try {
      const res = await fetch('/api/customer-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: isManualCustomer || isAnonymousCustomer ? null : customerId,
          customerName,
          customerEmail,
          customerPhone,
          customerAddress,
          note,
          dueDate,
          paymentType,
          variableSymbol: variableSymbol || null,
          constantSymbol: constantSymbol || null,
          specificSymbol: specificSymbol || null,
          // Manuální nebo anonymní zákazník
          isManualCustomer,
          isAnonymousCustomer,
          saveCustomerToDatabase,
          manualCustomerData: isManualCustomer ? manualCustomerData : null,
          // Sleva
          discountType: discountType !== 'none' ? discountType : null,
          discountValue: discountType !== 'none' && discountValue ? parseFloat(discountValue) : null,
          items: items.map(item => ({
            productId: item.productId || null,
            productName: item.productName || null,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            vatRate: item.vatRate // Důležité pro správný výpočet DPH
          }))
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Chyba při vytváření objednávky')
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
    setCustomerId('')
    setCustomerName('')
    setCustomerEmail('')
    setCustomerPhone('')
    setCustomerAddress('')
    setNote('')
    setItems([])
    // Reset dueDate na dnešní datum + 14 dní
    const today = new Date()
    today.setDate(today.getDate() + 14)
    setDueDate(today.toISOString().split('T')[0])
    setPaymentType('')
    setVariableSymbol('')
    setConstantSymbol('')
    setSpecificSymbol('')
    setIsManualCustomer(false)
    setIsAnonymousCustomer(false)
    setSaveCustomerToDatabase(false)
    setManualCustomerData({
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
    setDiscountType('none')
    setDiscountValue('')
  }

  async function handleMarkPaid(orderId: string) {
    if (!confirm('Označit objednávku jako zaplacenou?')) return

    try {
      const res = await fetch(`/api/customer-orders/${orderId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      loadData()
      alert('Objednávka označena jako zaplacená')
    } catch (error: any) {
      alert(error.message || 'Nepodařilo se označit jako zaplacenou')
    }
  }


  async function handleCancel(orderId: string) {
    if (!confirm('Zrušit objednávku? Tím se uvolní všechny rezervace.')) return

    try {
      const res = await fetch(`/api/customer-orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      loadData()
      alert('Objednávka zrušena')
    } catch (error: any) {
      alert(error.message || 'Nepodařilo se zrušit objednávku')
    }
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


  function getStatusBadge(status: string) {
    if (status === 'storno') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          STORNO
        </span>
      )
    }

    if (status === 'new') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Nová (neuhrazená)
        </span>
      )
    }

    if (status === 'paid') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Zaplacená
        </span>
      )
    }

    if (status === 'processing') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          Připravuje se
        </span>
      )
    }

    if (status === 'shipped') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Odeslaná
        </span>
      )
    }

    if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Zrušená
        </span>
      )
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        {status || 'Nová'}
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
            Vystavené objednávky
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
              <ShoppingCart className="w-5 h-5" />
              Nová objednávka zákazníka
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Karta: Zákazník */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 border-l-4 border-blue-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Zákazník
                  <span className="text-red-500 text-sm">*</span>
                </h3>
                <CustomerSupplierSelector
                  type="customer"
                  entities={customers}
                  selectedId={customerId}
                  onSelectedIdChange={setCustomerId}
                  manualData={manualCustomerData}
                  onManualDataChange={setManualCustomerData}
                  isManual={isManualCustomer}
                  onIsManualChange={setIsManualCustomer}
                  isAnonymous={isAnonymousCustomer}
                  onIsAnonymousChange={setIsAnonymousCustomer}
                  saveToDatabase={saveCustomerToDatabase}
                  onSaveToDatabaseChange={setSaveCustomerToDatabase}
                  required={true}
                />
              </div>

              {/* Karta: Platební detaily */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border-l-4 border-green-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Platební údaje
                  <span className="text-red-500 text-sm">*</span>
                </h3>
                <PaymentDetailsSelector
                  dueDate={dueDate}
                  onDueDateChange={setDueDate}
                  paymentType={paymentType}
                  onPaymentTypeChange={setPaymentType}
                  variableSymbol={variableSymbol}
                  onVariableSymbolChange={setVariableSymbol}
                  constantSymbol={constantSymbol}
                  onConstantSymbolChange={setConstantSymbol}
                  specificSymbol={specificSymbol}
                  onSpecificSymbolChange={setSpecificSymbol}
                  required={true}
                  autoGenerateNumber={orderNumber}
                />
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
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Volitelná poznámka k objednávce..."
                  className="bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                />
              </div>

              {/* Karta: Položky */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-l-4 border-purple-500 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Položky objednávky
                    <span className="text-red-500 text-sm">*</span>
                  </h3>
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Přidat položku
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className={`grid gap-3 mb-3 items-end bg-white rounded-lg p-3 shadow-sm border border-purple-200 hover:border-purple-400 transition-colors ${
                    isVatPayer ? 'grid-cols-[3fr_1fr_0.8fr_0.6fr_1.2fr_1.2fr_auto]' : 'grid-cols-[3fr_1fr_0.8fr_1.2fr_1.2fr_auto]'
                  }`}>
                    <div className="relative">
                      {/* Windows-style cascading menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenDropdownIndex(openDropdownIndex === index ? null : index)}
                          onBlur={(e) => {
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
                            <div
                              ref={categoryMenuRef}
                              className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-[500px] overflow-y-auto"
                              onMouseLeave={() => {
                                hideSubmenuTimeoutRef.current = setTimeout(() => {
                                  setHoveredCategory(null)
                                  setCategoryRect(null)
                                }, 500)
                              }}
                              onMouseEnter={() => {
                                if (hideSubmenuTimeoutRef.current) {
                                  clearTimeout(hideSubmenuTimeoutRef.current)
                                  hideSubmenuTimeoutRef.current = null
                                }
                              }}
                            >
                              {(() => {
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
                                          if (hideSubmenuTimeoutRef.current) {
                                            clearTimeout(hideSubmenuTimeoutRef.current)
                                            hideSubmenuTimeoutRef.current = null
                                          }
                                          setHoveredCategory(cat)
                                          setCategoryRect(e.currentTarget.getBoundingClientRect())
                                        }}
                                        onMouseLeave={(e) => {
                                          const rect = e.currentTarget.getBoundingClientRect()
                                          if (e.clientX > rect.right) {
                                            if (hideSubmenuTimeoutRef.current) {
                                              clearTimeout(hideSubmenuTimeoutRef.current)
                                              hideSubmenuTimeoutRef.current = null
                                            }
                                            return
                                          }
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

                                    {products.filter(p => !p.category).length > 0 && (
                                      <div
                                        className="relative"
                                        onMouseEnter={(e) => {
                                          if (hideSubmenuTimeoutRef.current) {
                                            clearTimeout(hideSubmenuTimeoutRef.current)
                                            hideSubmenuTimeoutRef.current = null
                                          }
                                          setHoveredCategory('__no_category__')
                                          setCategoryRect(e.currentTarget.getBoundingClientRect())
                                        }}
                                        onMouseLeave={(e) => {
                                          const rect = e.currentTarget.getBoundingClientRect()
                                          if (e.clientX > rect.right) {
                                            if (hideSubmenuTimeoutRef.current) {
                                              clearTimeout(hideSubmenuTimeoutRef.current)
                                              hideSubmenuTimeoutRef.current = null
                                            }
                                            return
                                          }
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

                            {hoveredCategory && categoryRect && categoryMenuRef.current && (() => {
                              const filteredProducts = products.filter(p =>
                                hoveredCategory === '__no_category__'
                                  ? !p.category
                                  : p.category?.name === hoveredCategory
                              )

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
                                    if (hideSubmenuTimeoutRef.current) {
                                      clearTimeout(hideSubmenuTimeoutRef.current)
                                      hideSubmenuTimeoutRef.current = null
                                    }
                                  }}
                                  onMouseLeave={() => {
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
                                        e.preventDefault()
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

                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Množství</label>
                      <Input
                        type="number"
                        step="1"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="0"
                        className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Jedn.</label>
                      <Input
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        placeholder="ks"
                        className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                      />
                    </div>

                    {isVatPayer && (
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">DPH</label>
                        <div className={`px-2 py-2 border rounded text-sm text-center ${
                          isNonVatPayer(item.vatRate)
                            ? 'bg-gray-100 text-gray-600 border-gray-300'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {isNonVatPayer(item.vatRate) ? '-' : (VAT_RATE_LABELS[item.vatRate] || `${item.vatRate}%`)}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Cena/ks</label>
                      <Input
                        type="number"
                        step="1"
                        value={item.price || ''}
                        onChange={(e) => handleItemChange(index, 'price', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder="0"
                        className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Celkem</label>
                      {(() => {
                        // Pro neplátce DPH jen množství × cena, pro plátce s DPH
                        const total = isVatPayer && !isNonVatPayer(item.vatRate)
                          ? calculateLineVat(item.quantity || 0, item.price || 0, item.vatRate).totalWithVat
                          : (item.quantity || 0) * (item.price || 0)
                        return (
                          <div className="px-2 py-2 border rounded text-sm text-right font-medium bg-green-50 text-green-700 border-green-200">
                            {total.toLocaleString('cs-CZ')} Kč
                          </div>
                        )
                      })()}
                    </div>

                    <div>
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

                {/* Sleva a souhrn - přímo pod položkami */}
                <div className="mt-4 bg-white rounded-lg border border-purple-300 overflow-hidden">
                  {/* Sleva input */}
                  <div className="p-4 bg-purple-50 border-b border-purple-200">
                    <div className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center">
                      <label className="text-sm font-medium text-purple-900">Sleva:</label>

                      <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed' | 'none')}
                        className="px-3 py-1.5 border border-purple-300 rounded text-sm focus:border-purple-500 focus:ring-purple-500 bg-white"
                      >
                        <option value="none">Bez slevy</option>
                        <option value="percentage">Procenta (%)</option>
                        <option value="fixed">Částka (Kč)</option>
                      </select>

                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={discountType === 'percentage' ? '100' : undefined}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountType === 'none' ? 'Nejprve zvolte typ' : (discountType === 'percentage' ? 'Např. 10' : 'Např. 100')}
                        disabled={discountType === 'none'}
                        className="bg-white border-purple-300 focus:border-purple-500 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Souhrn */}
                  {items.length > 0 && (() => {
                    // Výpočet DPH pro každou položku
                    const vatLineItems: VatLineItem[] = items.map(item =>
                      calculateLineVat(item.quantity || 0, item.price || 0, item.vatRate)
                    )
                    const summary = calculateVatSummary(vatLineItems)

                    // Sleva (aplikovaná na základ bez DPH, pak přepočet)
                    const discountAmountValue = discountType !== 'none' && discountValue
                      ? (discountType === 'percentage'
                          ? (summary.totalWithoutVat * parseFloat(discountValue)) / 100
                          : parseFloat(discountValue))
                      : 0

                    // Po slevě
                    const totalWithoutVatAfterDiscount = summary.totalWithoutVat - discountAmountValue
                    // Přepočet DPH poměrně
                    const discountRatio = summary.totalWithoutVat > 0
                      ? totalWithoutVatAfterDiscount / summary.totalWithoutVat
                      : 1
                    const totalVatAfterDiscount = summary.totalVat * discountRatio
                    const totalWithVatAfterDiscount = totalWithoutVatAfterDiscount + totalVatAfterDiscount

                    // Pro neplátce DPH - jednodušší souhrn
                    if (!isVatPayer) {
                      const subtotal = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0)
                      const total = subtotal - discountAmountValue

                      return (
                        <div className="p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Mezisoučet:</span>
                            <span className="font-medium text-gray-900">{subtotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                          </div>

                          {discountAmountValue > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-red-600">
                                Sleva {discountType === 'percentage' ? `(${discountValue}%)` : '(pevná částka)'}:
                              </span>
                              <span className="font-medium text-red-600">-{discountAmountValue.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                            </div>
                          )}

                          <div className="flex justify-between pt-2 border-t border-purple-200">
                            <span className="font-bold text-purple-900">Celkem k úhradě:</span>
                            <span className="font-bold text-purple-900 text-lg">{total.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                          </div>
                        </div>
                      )
                    }

                    // Pro plátce DPH - kompletní souhrn s DPH
                    return (
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

                        {/* Celkem s DPH před slevou */}
                        <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                          <span className="text-gray-600">Celkem s DPH:</span>
                          <span className="font-medium text-gray-900">{summary.totalWithVat.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                        </div>

                        {discountAmountValue > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-red-600">
                              Sleva {discountType === 'percentage' ? `(${discountValue}%)` : '(pevná částka)'}:
                            </span>
                            <span className="font-medium text-red-600">-{discountAmountValue.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                          </div>
                        )}

                        <div className="flex justify-between pt-2 border-t border-purple-200">
                          <span className="font-bold text-purple-900">Celkem k úhradě:</span>
                          <span className="font-bold text-purple-900 text-lg">{totalWithVatAfterDiscount.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Tlačítka */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="px-6 py-2 hover:bg-gray-100 transition-colors"
                >
                  Zrušit
                </Button>
                <Button
                  type="submit"
                  className="px-8 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
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
              setFilterCustomer('')
              setFilterPayment('all')
              setFilterStatus('all')
              setFilterMinValue('')
              setFilterMinItems('')
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
            placeholder="OBJ..."
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
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-gray-500 italic text-center"
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
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center"
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

          {/* Počet položek - minimum */}
          <input
            type="number"
            value={filterMinItems}
            onChange={(e) => setFilterMinItems(e.target.value)}
            placeholder="="
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Hodnota - minimum */}
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
              {filterStatus === 'shipped' && <span className="text-purple-600">Odeslaná</span>}
              {filterStatus === 'delivered' && <span className="text-teal-600">Doručená</span>}
              {filterStatus === 'cancelled' && <span className="text-red-600">Zrušená</span>}
            </div>

            {filterStatusDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
                <div onClick={() => { setFilterStatus('all'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center">Vše</div>
                <div onClick={() => { setFilterStatus('new'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-yellow-600">Nová</div>
                <div onClick={() => { setFilterStatus('paid'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-green-600">Zaplacená</div>
                <div onClick={() => { setFilterStatus('processing'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-blue-600">Připravuje se</div>
                <div onClick={() => { setFilterStatus('shipped'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-purple-600">Odeslaná</div>
                <div onClick={() => { setFilterStatus('delivered'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-teal-600">Doručená</div>
                <div onClick={() => { setFilterStatus('cancelled'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-red-600">Zrušená</div>
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
              Zatím nemáte žádné vystavené objednávky
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              Žádné objednávky neodpovídají zvoleným filtrům
            </CardContent>
          </Card>
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

            {/* Objednávky */}
            {filteredOrders
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((order) => (
              <div
                key={order.id}
                id={`item-${order.id}`}
                className={`border rounded-lg ${
                  order.id === highlightId ? 'ring-2 ring-blue-500 bg-blue-50' :
                  expandedOrders.has(order.id) ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                <div className={`p-4 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 transition-colors ${order.status === 'storno' ? 'bg-red-50 opacity-70' : 'hover:bg-gray-50'}`}>
                  {/* Rozbalit/sbalit */}
                  <button
                    onClick={() => toggleExpanded(order.id)}
                    className="flex-shrink-0 w-8"
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
                    <p className={`text-sm font-medium text-gray-700 ${order.status === 'storno' ? 'line-through' : ''}`}>
                      {order.orderNumber}
                    </p>
                  </div>

                  {/* Datum */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(order.id)}
                  >
                    <p className="text-sm text-gray-900 truncate">
                      {formatDate(order.orderDate)}
                    </p>
                  </div>

                  {/* Odběratel */}
                  <div className="text-center">
                    {order.customer && order.customer.id ? (
                      <a
                        href={`/customers?highlight=${order.customer.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {order.customer.name}
                      </a>
                    ) : (
                      <p
                        className="text-sm text-gray-700 truncate cursor-pointer"
                        onClick={() => toggleExpanded(order.id)}
                      >
                        {order.customerName || '-'}
                      </p>
                    )}
                  </div>

                  {/* Typ platby */}
                  <div className="cursor-pointer text-center" onClick={() => toggleExpanded(order.id)}>
                    <p className="text-sm text-gray-700">
                      {order.issuedInvoice?.paymentType === 'cash' && 'Hotovost'}
                      {order.issuedInvoice?.paymentType === 'card' && 'Karta'}
                      {order.issuedInvoice?.paymentType === 'transfer' && 'Převod'}
                      {!order.issuedInvoice?.paymentType && '-'}
                    </p>
                  </div>

                  {/* Položek */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(order.id)}
                  >
                    <p className="text-sm text-gray-700">
                      {order.items.length}
                    </p>
                  </div>

                  {/* Hodnota + tlačítko Zaplaceno */}
                  <div className="cursor-pointer text-center" onClick={() => toggleExpanded(order.id)}>
                    <div className="flex items-center justify-center gap-2">
                      {order.status === 'new' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkPaid(order.id)
                          }}
                        >
                          Zaplaceno
                        </Button>
                      )}
                      <p className="text-sm font-bold text-gray-900">
                        {formatPrice(order.totalAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(order.id)}
                  >
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                {/* Detail */}
                {expandedOrders.has(order.id) && (
                  <div className="border-t p-4 bg-gray-50">
                    {/* Rozcestník - modrý box, vycentrovaný */}
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-sm text-center">
                        <span className="text-gray-600">Faktura: </span>
                        {order.issuedInvoice ? (
                          <Link
                            href={`/invoices/issued?highlight=${order.issuedInvoice.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.issuedInvoice.invoiceNumber}
                            <ExternalLink className="w-3 h-3 inline ml-1" />
                          </Link>
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
                            <div><span className="text-gray-600">Odesláno:</span> <span className="font-medium">{order.deliveryNotes && order.deliveryNotes.length > 0 ? order.deliveryNotes.map(dn => new Date(dn.deliveryDate).toLocaleDateString('cs-CZ')).join(', ') : '-'}</span></div>
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                            <div><span className="text-gray-600">Datum splatnosti:</span> <span className="font-medium">{(order.issuedInvoice as any)?.dueDate ? formatDate((order.issuedInvoice as any).dueDate) : '-'}</span></div>
                            <div className="border-l border-gray-200 mx-4"></div>
                            <div><span className="text-gray-600">Typ platby:</span> <span className="font-medium">
                              {order.issuedInvoice?.paymentType === 'cash' && 'Hotovost'}
                              {order.issuedInvoice?.paymentType === 'card' && 'Karta'}
                              {order.issuedInvoice?.paymentType === 'transfer' && 'Bankovní převod'}
                              {!order.issuedInvoice?.paymentType && '-'}
                            </span></div>
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                            <div><span className="text-gray-600">Zaplaceno:</span> <span className="font-medium">{order.paidAt ? formatDate(order.paidAt) : '-'}</span></div>
                            <div className="border-l border-gray-200 mx-4"></div>
                            <div><span className="text-gray-600">Poznámka:</span> <span className="font-medium">{order.note || '-'}</span></div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Odběratel / Zákazník</h5>
                        <div className="text-sm">
                          {(() => {
                            const customerName = order.customer?.name || order.customerName || 'Anonymní odběratel'
                            const isAnonymous = customerName === 'Anonymní odběratel'

                            if (isAnonymous) {
                              return (
                                <div className="px-4 py-2 bg-white">
                                  <span className="text-gray-600">Název: </span>
                                  <span className="font-bold text-gray-900">Anonymní odběratel</span>
                                </div>
                              )
                            }

                            const entityType = (order as any).customerEntityType || (order.customer as any)?.entityType || 'company'

                            return (
                              <>
                                {/* Název a typ subjektu */}
                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                  <div>
                                    <span className="text-gray-600">Název:</span>
                                    <span className="font-medium"> {customerName}</span>
                                    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                      {entityType === 'company' ? 'Firma' : 'FO'}
                                    </span>
                                  </div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  {entityType === 'company' && (
                                    <div><span className="text-gray-600">Kontaktní osoba:</span> <span className="font-medium">{(order.customer as any)?.contact || '-'}</span></div>
                                  )}
                                  {entityType === 'individual' && (
                                    <div><span className="text-gray-600">Email:</span> <span className="font-medium">{order.customerEmail || (order.customer as any)?.email || '-'}</span></div>
                                  )}
                                </div>

                                {/* Adresa a Telefon */}
                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                  <div><span className="text-gray-600">Adresa:</span> <span className="font-medium">{order.customerAddress || (order.customer as any)?.address || '-'}</span></div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  <div><span className="text-gray-600">Telefon:</span> <span className="font-medium">{order.customerPhone || (order.customer as any)?.phone || '-'}</span></div>
                                </div>

                                {/* Pro FIRMU: IČO a Email */}
                                {entityType === 'company' && (
                                  <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                    <div><span className="text-gray-600">IČO:</span> <span className="font-medium">{(order.customer as any)?.ico || '-'}</span></div>
                                    <div className="border-l border-gray-200 mx-4"></div>
                                    <div><span className="text-gray-600">Email:</span> <span className="font-medium">{order.customerEmail || (order.customer as any)?.email || '-'}</span></div>
                                  </div>
                                )}

                                {/* Pro FIRMU: DIČ a Web */}
                                {entityType === 'company' && (
                                  <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                    <div><span className="text-gray-600">DIČ:</span> <span className="font-medium">{(order.customer as any)?.dic || '-'}</span></div>
                                    <div className="border-l border-gray-200 mx-4"></div>
                                    <div><span className="text-gray-600">Web:</span> <span className="font-medium">{(order.customer as any)?.website || '-'}</span></div>
                                  </div>
                                )}

                                {/* Bankovní účet a Poznámka */}
                                <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                                  <div><span className="text-gray-600">Bankovní účet:</span> <span className="font-medium">{(order.customer as any)?.bankAccount || '-'}</span></div>
                                  <div className="border-l border-gray-200 mx-4"></div>
                                  <div><span className="text-gray-600">Poznámka:</span> <span className="font-medium">{(order.customer as any)?.note || '-'}</span></div>
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
                              <div className="text-center">Vyskl.</div>
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
                              <div className="text-right">Vyskladněno</div>
                              <div className="text-right">Zbývá</div>
                              <div className="text-right">Cena/ks</div>
                              <div className="text-right">Cena celkem</div>
                            </div>
                          )}

                          {/* Řádky položek */}
                          {order.items.map((item, i) => {
                            const shipped = Number(item.shippedQuantity || 0)
                            const ordered = Number(item.quantity)
                            const remaining = ordered - shipped
                            const isFullyShipped = shipped >= ordered
                            const isPartiallyShipped = shipped > 0 && shipped < ordered
                            const unitPrice = Number(item.price)
                            const itemVatRate = Number((item as any).vatRate || (item.product as any)?.vatRate || 21)
                            const isItemNonVatPayer = isNonVatPayer(itemVatRate)

                            // Výpočty DPH pro položku
                            const vatPerUnit = isItemNonVatPayer ? 0 : unitPrice * itemVatRate / 100
                            const priceWithVatPerUnit = unitPrice + vatPerUnit
                            const totalWithoutVat = ordered * unitPrice
                            const totalVat = ordered * vatPerUnit
                            const totalWithVat = totalWithoutVat + totalVat

                            let bgColor = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            if (isFullyShipped) {
                              bgColor = 'bg-green-50'
                            } else if (isPartiallyShipped) {
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
                                <div className="text-center font-medium" style={{ color: shipped > 0 ? '#10b981' : '#6b7280' }}>
                                  {shipped} {item.unit}
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
                                <div className="text-right font-medium" style={{ color: shipped > 0 ? '#10b981' : '#6b7280' }}>
                                  {shipped} {item.unit}
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

                              {/* Sleva */}
                              <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(8,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-yellow-50 text-sm`}>
                                <div className={isVatPayer ? 'col-span-8' : 'col-span-5'} style={{ fontWeight: 500, color: '#111827' }}>
                                  Sleva
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
                                  {formatPrice(order.totalAmount)}
                                </div>
                              </div>
                            </>
                          ) : (
                            /* Celková částka bez slevy */
                            <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(8,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                              <div className={isVatPayer ? 'col-span-8' : 'col-span-5'}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                              <div className="text-center">
                                {formatPrice(order.totalAmount)}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 italic">Žádné položky</div>
                      )}
                    </div>

                    {/* Výdejky */}
                    {order.deliveryNotes && order.deliveryNotes.length > 0 && (
                      <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Výdejky ({order.deliveryNotes.length})</h4>

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
                          {order.deliveryNotes.map((deliveryNote, idx) => {
                            const deliveryTotal = deliveryNote.items?.reduce((sum, item) => {
                              const unitPrice = Number(item.product?.price || 0)
                              const itemVatRate = Number((item.product as any)?.vatRate || 21)
                              const itemIsNonVat = isNonVatPayer(itemVatRate)
                              const vatPerUnit = itemIsNonVat ? 0 : unitPrice * itemVatRate / 100
                              const priceWithVat = isVatPayer ? (unitPrice + vatPerUnit) : unitPrice
                              return sum + (Number(item.quantity) * priceWithVat)
                            }, 0) || 0

                            return (
                              <a
                                key={deliveryNote.id}
                                href={`/delivery-notes?highlight=${deliveryNote.id}`}
                                className={`grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-3 hover:bg-blue-50 transition-colors items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-blue-600 hover:underline">
                                    {deliveryNote.deliveryNumber}
                                  </span>
                                  {deliveryNote.status === 'storno' && (
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                                      STORNO
                                    </span>
                                  )}
                                </div>

                                <div className="text-gray-700">
                                  {new Date(deliveryNote.deliveryDate).toLocaleDateString('cs-CZ')}
                                </div>

                                <div className="text-gray-700 text-center">
                                  {deliveryNote.items?.length || 0}
                                </div>

                                <div className="font-semibold text-gray-900 text-right">
                                  {deliveryTotal.toLocaleString('cs-CZ')} Kč
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

                    {/* Aktivní rezervace */}
                    {order.reservations && order.reservations.filter((r: any) => r.status === 'active').length > 0 && (
                      <p className="text-sm text-gray-500 mb-3">
                        Aktivní rezervace: {order.reservations.filter((r: any) => r.status === 'active').length}
                      </p>
                    )}

                    {/* Tlačítko pro zobrazení faktury PDF */}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          try {
                            const settingsRes = await fetch('/api/settings')
                            const settings = await settingsRes.json()

                            const fakeTransaction = {
                              id: order.id,
                              transactionCode: order.issuedInvoice?.invoiceNumber || order.orderNumber,
                              totalAmount: Number(order.totalAmount),
                              totalAmountWithoutVat: Number(order.totalAmountWithoutVat ?? 0),
                              totalVatAmount: Number(order.totalVatAmount ?? 0),
                              paymentType: order.issuedInvoice?.paymentType || 'transfer',
                              status: order.status,
                              transactionDate: order.orderDate,
                              customer: order.customer || null,
                              customerName: order.customerName || null,
                              customerAddress: order.customerAddress,
                              customerPhone: order.customerPhone,
                              customerEmail: order.customerEmail,
                              items: order.items.map(item => ({
                                id: item.id || '',
                                quantity: Number(item.quantity),
                                unit: item.unit,
                                price: Number(item.price),
                                vatRate: Number(item.vatRate ?? 0),
                                vatAmount: Number(item.vatAmount ?? 0),
                                priceWithVat: Number(item.priceWithVat ?? item.price),
                                product: item.product || { id: '', name: item.productName || '' }
                              }))
                            }

                            await generateInvoicePDF(fakeTransaction as any, settings)
                          } catch (error) {
                            console.error('Chyba při generování PDF:', error)
                            alert('Nepodařilo se vygenerovat PDF')
                          }
                        }}
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
