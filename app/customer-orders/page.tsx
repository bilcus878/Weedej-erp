'use client'

import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ShoppingCart, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/generateInvoicePDF'
import { VAT_RATE_LABELS, isNonVatPayer, calculateLineVat, calculateVatSummary, DEFAULT_VAT_RATE, NON_VAT_PAYER_RATE, type VatLineItem } from '@/lib/vatCalculation'
import CustomerSupplierSelector from '@/components/CustomerSupplierSelector'
import PaymentDetailsSelector from '@/components/PaymentDetailsSelector'
import {
  useEntityPage, EntityPage, FilterInput, FilterSelect, LoadingState, ErrorState,
  CustomerOrderDetail,
} from '@/components/erp'
import type { ColumnDef, SelectOption, OrderDetailData } from '@/components/erp'

export const dynamic = 'force-dynamic'

interface Customer { id: string; name: string }

interface Product {
  id: string; name: string; unit: string; price: number; vatRate: number
  category?: { id: string; name: string }
}

interface CustomerOrderItem {
  id?: string; productId?: string; productName?: string
  quantity: number; shippedQuantity?: number; unit: string; price: number; vatRate: number
  vatAmount?: number; priceWithVat?: number; product?: Product
}

interface DeliveryNote {
  id: string; deliveryNumber: string; deliveryDate: string; status?: string; note?: string
  items?: { id: string; quantity: number; product?: { price: number } }[]
}

interface IssuedInvoice { id: string; invoiceNumber: string; paymentType: string; dueDate?: string }

interface CustomerOrder {
  id: string; orderNumber: string; orderDate: string; status: string; totalAmount: number
  totalAmountWithoutVat?: number; totalVatAmount?: number; paidAt?: string; shippedAt?: string; note?: string
  customer?: Customer; customerName?: string; customerEmail?: string; customerPhone?: string; customerAddress?: string
  customerEntityType?: string; items: CustomerOrderItem[]; reservations?: any[]
  deliveryNotes?: DeliveryNote[]; issuedInvoice?: IssuedInvoice
  discountAmount?: number; discountType?: string; discountValue?: number
}

const paymentOptions: SelectOption[] = [
  { value: 'all', label: 'Vše' }, { value: 'none', label: '-' },
  { value: 'cash', label: 'Hotovost' }, { value: 'card', label: 'Karta' }, { value: 'transfer', label: 'Převod' },
]

const statusOptions: SelectOption[] = [
  { value: 'all', label: 'Vše' },
  { value: 'new',        label: 'Nová',         className: 'text-yellow-600' },
  { value: 'paid',       label: 'Zaplacená',    className: 'text-green-600' },
  { value: 'processing', label: 'Připravuje se',className: 'text-blue-600' },
  { value: 'shipped',    label: 'Odeslaná',     className: 'text-purple-600' },
  { value: 'delivered',  label: 'Doručená',     className: 'text-teal-600' },
  { value: 'cancelled',  label: 'Zrušená',      className: 'text-red-600' },
]

function getStatusBadge(status: string) {
  if (status === 'storno')     return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">STORNO</span>
  if (status === 'new')        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Nová (neuhrazená)</span>
  if (status === 'paid')       return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Zaplacená</span>
  if (status === 'processing') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Připravuje se</span>
  if (status === 'shipped')    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Odeslaná</span>
  if (status === 'cancelled')  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Zrušená</span>
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status || 'Nová'}</span>
}

const emptyManualCustomer = { name: '', entityType: 'company', contactPerson: '', email: '', phone: '', ico: '', dic: '', bankAccount: '', website: '', address: '', note: '' }

function orderToDetailData(order: CustomerOrder): OrderDetailData {
  const isPaid = ['paid', 'shipped', 'delivered'].includes(order.status)
  return {
    id:            order.id,
    orderNumber:   order.orderNumber,
    orderDate:     order.orderDate,
    status:        order.status,
    totalAmount:   order.totalAmount,
    totalVatAmount: order.totalVatAmount ?? null,
    paidAt:        order.paidAt ?? null,
    shippedAt:     order.shippedAt ?? null,
    customerName:  order.customer?.name || order.customerName || 'Anonymní odběratel',
    customerEmail: order.customerEmail || (order.customer as any)?.email || null,
    customerPhone: order.customerPhone || (order.customer as any)?.phone || null,
    customerAddress: order.customerAddress || null,
    billingIco:    (order.customer as any)?.ico || null,
    note:          order.note ?? null,
    discountAmount: order.discountAmount ?? null,
    issuedInvoice: order.issuedInvoice ? {
      id:            order.issuedInvoice.id,
      invoiceNumber: order.issuedInvoice.invoiceNumber,
      paymentStatus: isPaid ? 'paid' : 'unpaid',
      status:        order.status,
      invoiceDate:   order.orderDate,
    } : null,
    deliveryNotes: (order.deliveryNotes || []).map(dn => ({
      id:             dn.id,
      deliveryNumber: dn.deliveryNumber,
      deliveryDate:   dn.deliveryDate,
      status:         dn.status || 'active',
      items: (dn.items || []).map(item => ({
        id: item.id, quantity: Number(item.quantity), unit: 'ks',
        productName: null, price: item.product ? Number(item.product.price) : null,
        priceWithVat: null, vatRate: null, vatAmount: null,
        product: item.product ? { id: '', name: '', price: Number(item.product.price || 0) } : null,
      })),
    })),
    items: order.items.map(item => ({
      id:           item.id || '',
      productId:    item.productId || null,
      productName:  item.productName || null,
      quantity:     Number(item.quantity),
      unit:         item.unit,
      price:        Number(item.price),
      vatRate:      Number(item.vatRate ?? 0),
      vatAmount:    Number(item.vatAmount ?? 0),
      priceWithVat: Number(item.priceWithVat ?? item.price),
      product:      item.product ? { id: item.product.id, name: item.product.name, price: Number(item.price), unit: item.unit } : null,
    })),
  }
}

export default function CustomerOrdersPage() {
  const highlightId = useSearchParams().get('highlight')

  const [isVatPayer,   setIsVatPayer]   = useState(true)
  const [customers,    setCustomers]    = useState<Customer[]>([])
  const [products,     setProducts]     = useState<Product[]>([])
  const [showForm,     setShowForm]     = useState(false)

  // Form state
  const [orderNumber,            setOrderNumber]            = useState('')
  const [orderDate,              setOrderDate]              = useState(() => new Date().toISOString().split('T')[0])
  const [customerId,             setCustomerId]             = useState('')
  const [customerName,           setCustomerName]           = useState('')
  const [customerEmail,          setCustomerEmail]          = useState('')
  const [customerPhone,          setCustomerPhone]          = useState('')
  const [customerAddress,        setCustomerAddress]        = useState('')
  const [note,                   setNote]                   = useState('')
  const [items,                  setItems]                  = useState<CustomerOrderItem[]>([])
  const [dueDate,                setDueDate]                = useState(() => { const d = new Date(); d.setDate(d.getDate() + 14); return d.toISOString().split('T')[0] })
  const [paymentType,            setPaymentType]            = useState('')
  const [variableSymbol,         setVariableSymbol]         = useState('')
  const [constantSymbol,         setConstantSymbol]         = useState('')
  const [specificSymbol,         setSpecificSymbol]         = useState('')
  const [isManualCustomer,       setIsManualCustomer]       = useState(false)
  const [isAnonymousCustomer,    setIsAnonymousCustomer]    = useState(false)
  const [saveCustomerToDatabase, setSaveCustomerToDatabase] = useState(false)
  const [manualCustomerData,     setManualCustomerData]     = useState({ ...emptyManualCustomer })
  const [discountType,           setDiscountType]           = useState<'percentage' | 'fixed' | 'none'>('none')
  const [discountValue,          setDiscountValue]          = useState('')

  // Cascading product dropdown state
  const [openDropdownIndex,  setOpenDropdownIndex]  = useState<number | null>(null)
  const [hoveredCategory,    setHoveredCategory]    = useState<string | null>(null)
  const [categoryRect,       setCategoryRect]       = useState<DOMRect | null>(null)
  const categoryMenuRef      = useRef<HTMLDivElement>(null)
  const hideSubmenuTimeoutRef= useRef<NodeJS.Timeout | null>(null)

  const ep = useEntityPage<CustomerOrder>({
    fetchData: async () => {
      const [oRes, cRes, pRes, sRes] = await Promise.all([
        fetch('/api/customer-orders'), fetch('/api/customers'), fetch('/api/products'), fetch('/api/settings'),
      ])
      const [orders, cust, prods, settings] = await Promise.all([oRes.json(), cRes.json(), pRes.json(), sRes.json()])
      setCustomers(cust)
      setProducts(prods)
      setIsVatPayer(settings.isVatPayer ?? true)
      return orders
    },
    getRowId: r => r.id,
    filterFn: (r, f) => {
      if (f.number && !r.orderNumber.toLowerCase().includes(f.number.toLowerCase())) return false
      if (f.date) { const d = new Date(r.orderDate).toISOString().split('T')[0]; if (d !== f.date) return false }
      if (f.status && f.status !== 'all' && r.status !== f.status) return false
      if (f.payment && f.payment !== 'all') {
        if (f.payment === 'none') { if (r.issuedInvoice?.paymentType) return false }
        else if (r.issuedInvoice?.paymentType !== f.payment) return false
      }
      if (f.customer) {
        const name = r.customer?.name || r.customerName || ''
        if (!name.toLowerCase().includes(f.customer.toLowerCase())) return false
      }
      if (f.minValue && r.totalAmount < parseFloat(f.minValue)) return false
      if (f.minItems && r.items.length < parseInt(f.minItems)) return false
      return true
    },
    highlightId,
  })

  async function handleOpenForm() {
    const res  = await fetch('/api/customer-orders/next-number')
    const data = await res.json()
    setOrderNumber(data.nextNumber)
    const defaultVatRate = isVatPayer ? DEFAULT_VAT_RATE : NON_VAT_PAYER_RATE
    setItems([{ productId: '', productName: '', quantity: 1, unit: 'ks', price: 0, vatRate: defaultVatRate }])
    setShowForm(true)
  }

  function handleAddItem() {
    const defaultVatRate = isVatPayer ? DEFAULT_VAT_RATE : NON_VAT_PAYER_RATE
    setItems([...items, { productId: '', productName: '', quantity: 1, unit: 'ks', price: 0, vatRate: defaultVatRate }])
  }

  function handleRemoveItem(index: number) { setItems(items.filter((_, i) => i !== index)) }

  function handleItemChange(index: number, field: string, value: any) {
    const newItems = [...items]
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) {
        const effectiveVatRate = isVatPayer ? Number(product.vatRate) : NON_VAT_PAYER_RATE
        newItems[index] = { ...newItems[index], productId: value, productName: '', unit: product.unit, price: Number(product.price), vatRate: effectiveVatRate }
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    setItems(newItems)
  }

  function resetForm() {
    setOrderDate(new Date().toISOString().split('T')[0])
    setOrderNumber('')
    setCustomerId(''); setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setCustomerAddress('')
    setNote(''); setItems([])
    const d = new Date(); d.setDate(d.getDate() + 14); setDueDate(d.toISOString().split('T')[0])
    setPaymentType(''); setVariableSymbol(''); setConstantSymbol(''); setSpecificSymbol('')
    setIsManualCustomer(false); setIsAnonymousCustomer(false); setSaveCustomerToDatabase(false)
    setManualCustomerData({ ...emptyManualCustomer })
    setDiscountType('none'); setDiscountValue('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customerId && !isManualCustomer && !isAnonymousCustomer) { alert('Vyberte zákazníka, zadejte ho ručně nebo zvolte anonymního zákazníka'); return }
    if (isManualCustomer && !isAnonymousCustomer) {
      if (!manualCustomerData.name.trim()) { alert('Vyplňte název zákazníka'); return }
      if (!manualCustomerData.address.trim()) { alert('Vyplňte adresu zákazníka'); return }
    }
    if (!dueDate) { alert('Zadejte datum splatnosti'); return }
    if (!paymentType) { alert('Vyberte formu úhrady'); return }
    if (items.length === 0) { alert('Přidejte alespoň jednu položku'); return }
    try {
      const res = await fetch('/api/customer-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderDate, customerId: isManualCustomer || isAnonymousCustomer ? null : customerId,
          customerName, customerEmail, customerPhone, customerAddress, note,
          dueDate, paymentType, variableSymbol: variableSymbol || null, constantSymbol: constantSymbol || null, specificSymbol: specificSymbol || null,
          isManualCustomer, isAnonymousCustomer, saveCustomerToDatabase,
          manualCustomerData: isManualCustomer ? manualCustomerData : null,
          discountType: discountType !== 'none' ? discountType : null,
          discountValue: discountType !== 'none' && discountValue ? parseFloat(discountValue) : null,
          items: items.map(item => ({ productId: item.productId || null, productName: item.productName || null, quantity: item.quantity, unit: item.unit, price: item.price, vatRate: item.vatRate }))
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Chyba při vytváření objednávky') }
      setShowForm(false)
      resetForm()
      await ep.refresh()
      alert('Objednávka vytvořena!')
    } catch (error: any) {
      console.error('Chyba:', error)
      alert(error.message || 'Nepodařilo se vytvořit objednávku')
    }
  }

  async function handleMarkPaid(orderId: string) {
    if (!confirm('Označit objednávku jako zaplacenou?')) return
    try {
      const res = await fetch(`/api/customer-orders/${orderId}/mark-paid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      await ep.refresh()
      alert('Objednávka označena jako zaplacená')
    } catch (error: any) { alert(error.message || 'Nepodařilo se označit jako zaplacenou') }
  }

  async function handleCancelOrder(orderId: string) {
    if (!confirm('Zrušit objednávku? Tím se uvolní všechny rezervace.')) return
    try {
      const res = await fetch(`/api/customer-orders/${orderId}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      await ep.refresh()
      alert('Objednávka zrušena')
    } catch (error: any) { alert(error.message || 'Nepodařilo se zrušit objednávku') }
  }

  async function handleUpdateStatus(orderId: string, status: string) {
    if (status === 'cancelled') return handleCancelOrder(orderId)
    const labels: Record<string, string> = { delivered: 'Doručená' }
    if (!confirm(`Změnit status objednávky na: ${labels[status] ?? status}?`)) return
    try {
      const res = await fetch(`/api/customer-orders/${orderId}/status`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      await ep.refresh()
    } catch (error: any) { alert(error.message || 'Nepodařilo se změnit status') }
  }


  const columns: ColumnDef<CustomerOrder>[] = [
    {
      key: 'number', header: 'Číslo',
      render: r => <p className={`text-sm font-medium text-gray-700 ${r.status === 'storno' ? 'line-through' : ''}`}>{r.orderNumber}</p>,
    },
    {
      key: 'date', header: 'Datum',
      render: r => <p className="text-sm text-gray-900 truncate">{formatDate(r.orderDate)}</p>,
    },
    {
      key: 'customer', header: 'Odběratel',
      render: r => r.customer?.id
        ? <a href={`/customers?highlight=${r.customer.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{r.customer.name}</a>
        : <p className="text-sm text-gray-700 truncate">{r.customerName || '-'}</p>,
    },
    {
      key: 'payment', header: 'Typ platby',
      render: r => <p className="text-sm text-gray-700">
        {r.issuedInvoice?.paymentType === 'cash' ? 'Hotovost' : r.issuedInvoice?.paymentType === 'card' ? 'Karta' : r.issuedInvoice?.paymentType === 'transfer' ? 'Převod' : '-'}
      </p>,
    },
    { key: 'items',  header: 'Položek', render: r => <p className="text-sm text-gray-700">{r.items.length}</p> },
    {
      key: 'value', header: 'Hodnota',
      render: r => (
        <div className="flex items-center justify-center gap-2">
          {r.status === 'new' && (
            <Button size="sm" onClick={e => { e.stopPropagation(); handleMarkPaid(r.id) }}>Zaplaceno</Button>
          )}
          <p className="text-sm font-bold text-gray-900">{formatPrice(r.totalAmount)}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: r => getStatusBadge(r.status) },
  ]

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Vystavené objednávky"
        icon={ShoppingCart}
        color="blue"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      {/* New order form card */}
      <Card className="border-2 border-blue-300 bg-blue-50 shadow-lg">
        <CardHeader
          className="cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => { if (!showForm) handleOpenForm(); else setShowForm(false) }}
        >
          <div className="flex items-center gap-2">
            {showForm ? <ChevronDown className="h-6 w-6 text-blue-600" /> : <ChevronRight className="h-6 w-6 text-blue-600" />}
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Nová objednávka zákazníka
              {showForm && orderNumber && (
                <span className="text-sm font-mono bg-blue-800 text-white px-3 py-1 rounded ml-2">#{orderNumber}</span>
              )}
            </CardTitle>
          </div>
        </CardHeader>

        {showForm && (
          <CardContent className="p-6 bg-white">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 items-stretch">
                <div className="border border-gray-200 rounded-lg flex flex-col">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Zákazník <span className="text-red-400">*</span></h3>
                  </div>
                  <div className="flex-1 flex items-center p-3">
                    <div className="w-full">
                      <CustomerSupplierSelector
                        type="customer" entities={customers} selectedId={customerId} onSelectedIdChange={setCustomerId}
                        manualData={manualCustomerData} onManualDataChange={setManualCustomerData}
                        isManual={isManualCustomer} onIsManualChange={setIsManualCustomer}
                        isAnonymous={isAnonymousCustomer} onIsAnonymousChange={setIsAnonymousCustomer}
                        saveToDatabase={saveCustomerToDatabase} onSaveToDatabaseChange={setSaveCustomerToDatabase}
                        required={true}
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg flex flex-col">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Termíny</h3>
                  </div>
                  <div className="flex-1 flex items-center p-3">
                    <div className="w-full">
                      <label className="text-xs text-gray-500 mb-1 block">Datum objednávky</label>
                      <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg flex flex-col">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Platební údaje</h3>
                  </div>
                  <div className="flex-1 flex items-center p-3">
                    <div className="w-full">
                      <PaymentDetailsSelector
                        dueDate={dueDate} onDueDateChange={setDueDate}
                        paymentType={paymentType} onPaymentTypeChange={setPaymentType}
                        variableSymbol={variableSymbol} onVariableSymbolChange={setVariableSymbol}
                        constantSymbol={constantSymbol} onConstantSymbolChange={setConstantSymbol}
                        specificSymbol={specificSymbol} onSpecificSymbolChange={setSpecificSymbol}
                        required={true} autoGenerateNumber={orderNumber}
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg flex flex-col">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Poznámka</h3>
                  </div>
                  <div className="flex-1 p-3">
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Volitelná poznámka..." className="w-full h-full min-h-[80px] text-sm rounded-md border border-gray-300 bg-white px-3 py-2 resize-none placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-lg flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    Položky objednávky <span className="text-red-400 ml-0.5">*</span>
                  </h3>
                  <Button type="button" onClick={handleAddItem} size="sm" className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-3 h-3 mr-1" />Přidat
                  </Button>
                </div>
                <div className="p-3">
                  {items.map((item, index) => (
                    <div key={index} className={`grid ${isVatPayer ? 'grid-cols-[4fr_2fr_1fr_1fr_2fr_2fr_auto]' : 'grid-cols-[3fr_1fr_0.8fr_1.2fr_1.2fr_auto]'} gap-2 mb-1.5 items-end bg-white rounded border border-gray-200 hover:border-blue-300 transition-colors px-2 py-1.5`}>
                      <div className="relative">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenDropdownIndex(openDropdownIndex === index ? null : index)}
                            onBlur={e => { const t = e.currentTarget; setTimeout(() => { if (t && !t.contains(document.activeElement)) { setOpenDropdownIndex(null); setHoveredCategory(null) } }, 200) }}
                            className="w-full border rounded px-2 py-2 text-sm text-left bg-white hover:bg-gray-50 flex items-center justify-between"
                          >
                            <span className={item.productId ? 'text-gray-900' : 'text-gray-500'}>
                              {item.productId ? products.find(p => p.id === item.productId)?.name : 'Vyberte produkt...'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </button>

                          {openDropdownIndex === index && (() => {
                            const categories = new Set<string>()
                            products.forEach(p => { if (p.category) categories.add(p.category.name) })
                            const categoryArray = Array.from(categories).sort()

                            return (
                              <>
                                <div
                                  ref={categoryMenuRef}
                                  className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-[500px] overflow-y-auto"
                                  onMouseLeave={() => { hideSubmenuTimeoutRef.current = setTimeout(() => { setHoveredCategory(null); setCategoryRect(null) }, 500) }}
                                  onMouseEnter={() => { if (hideSubmenuTimeoutRef.current) { clearTimeout(hideSubmenuTimeoutRef.current); hideSubmenuTimeoutRef.current = null } }}
                                >
                                  {categoryArray.map(cat => (
                                    <div key={cat} className="relative"
                                      onMouseEnter={e => { if (hideSubmenuTimeoutRef.current) { clearTimeout(hideSubmenuTimeoutRef.current); hideSubmenuTimeoutRef.current = null } setHoveredCategory(cat); setCategoryRect(e.currentTarget.getBoundingClientRect()) }}
                                      onMouseLeave={e => { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX > r.right) { if (hideSubmenuTimeoutRef.current) { clearTimeout(hideSubmenuTimeoutRef.current); hideSubmenuTimeoutRef.current = null } return } hideSubmenuTimeoutRef.current = setTimeout(() => { setHoveredCategory(null); setCategoryRect(null) }, 500) }}
                                    >
                                      <div className="px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center gap-2 select-none">
                                        <span>{cat}</span><ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                                      </div>
                                    </div>
                                  ))}
                                  {products.filter(p => !p.category).length > 0 && (
                                    <div className="relative"
                                      onMouseEnter={e => { if (hideSubmenuTimeoutRef.current) { clearTimeout(hideSubmenuTimeoutRef.current); hideSubmenuTimeoutRef.current = null } setHoveredCategory('__no_category__'); setCategoryRect(e.currentTarget.getBoundingClientRect()) }}
                                      onMouseLeave={e => { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX > r.right) { if (hideSubmenuTimeoutRef.current) { clearTimeout(hideSubmenuTimeoutRef.current); hideSubmenuTimeoutRef.current = null } return } hideSubmenuTimeoutRef.current = setTimeout(() => { setHoveredCategory(null); setCategoryRect(null) }, 500) }}
                                    >
                                      <div className="px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center gap-2 select-none">
                                        <span className="italic text-gray-600">Bez kategorie</span><ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {hoveredCategory && categoryRect && categoryMenuRef.current && (() => {
                                  const filteredProducts = products.filter(p => hoveredCategory === '__no_category__' ? !p.category : p.category?.name === hoveredCategory)
                                  const maxLength = Math.max(...filteredProducts.map(p => p.name.length + (p.unit?.length || 0) + 3))
                                  const estimatedWidth = Math.min(Math.max(maxLength * 7 + 60, 250), 600)
                                  return (
                                    <div
                                      className="fixed bg-white border border-gray-300 rounded shadow-xl max-h-[500px] overflow-y-auto z-[60]"
                                      style={{ width: `${estimatedWidth}px`, left: `${categoryRect.right}px`, top: `${categoryRect.top}px` }}
                                      onMouseEnter={() => { if (hideSubmenuTimeoutRef.current) { clearTimeout(hideSubmenuTimeoutRef.current); hideSubmenuTimeoutRef.current = null } }}
                                      onMouseLeave={() => { hideSubmenuTimeoutRef.current = setTimeout(() => { setHoveredCategory(null); setCategoryRect(null) }, 200) }}
                                    >
                                      {filteredProducts.map(p => (
                                        <div key={p.id} onMouseDown={e => { e.preventDefault(); handleItemChange(index, 'productId', p.id); setOpenDropdownIndex(null); setHoveredCategory(null); setCategoryRect(null) }}
                                          className="px-4 py-2.5 hover:bg-blue-100 cursor-pointer text-sm flex items-center gap-2">
                                          <span>{p.name}</span><span className="text-xs text-gray-500">({p.unit})</span>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                })()}
                              </>
                            )
                          })()}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Množství</label>
                        <Input type="number" step="1" value={item.quantity || ''} onChange={e => handleItemChange(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="0" className="bg-white" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Jedn.</label>
                        <Input value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} placeholder="ks" className="bg-white" />
                      </div>
                      {isVatPayer && (
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">DPH</label>
                          <div className={`px-2 py-2 border rounded text-sm text-center ${isNonVatPayer(item.vatRate) ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {isNonVatPayer(item.vatRate) ? '-' : (VAT_RATE_LABELS[item.vatRate] || `${item.vatRate}%`)}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Cena/ks</label>
                        <Input type="number" step="1" value={item.price || ''} onChange={e => handleItemChange(index, 'price', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder="0" className="bg-white" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">Celkem</label>
                        {(() => {
                          const total = isVatPayer && !isNonVatPayer(item.vatRate)
                            ? calculateLineVat(item.quantity || 0, item.price || 0, item.vatRate).totalWithVat
                            : (item.quantity || 0) * (item.price || 0)
                          return <div className="px-2 py-2 border rounded text-sm text-right font-medium bg-gray-50 text-gray-800 border-gray-200">{total.toLocaleString('cs-CZ')} Kč</div>
                        })()}
                      </div>
                      <div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(index)} className="hover:bg-red-100 hover:text-red-700 transition-colors w-full">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="mt-2 bg-gray-50 rounded border border-gray-200 overflow-hidden">
                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                      <div className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center">
                        <label className="text-sm font-medium text-gray-700">Sleva:</label>
                        <select value={discountType} onChange={e => setDiscountType(e.target.value as any)} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          <option value="none">Bez slevy</option>
                          <option value="percentage">Procenta (%)</option>
                          <option value="fixed">Částka (Kč)</option>
                        </select>
                        <Input type="number" step="0.01" min="0" max={discountType === 'percentage' ? '100' : undefined} value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === 'none' ? 'Nejprve zvolte typ' : (discountType === 'percentage' ? 'Např. 10' : 'Např. 100')} disabled={discountType === 'none'} className="bg-white disabled:bg-gray-100 disabled:cursor-not-allowed" />
                      </div>
                    </div>

                    {items.length > 0 && (() => {
                      const vatLineItems: VatLineItem[] = items.map(item => calculateLineVat(item.quantity || 0, item.price || 0, item.vatRate))
                      const summary = calculateVatSummary(vatLineItems)
                      const discountAmountValue = discountType !== 'none' && discountValue ? (discountType === 'percentage' ? (summary.totalWithoutVat * parseFloat(discountValue)) / 100 : parseFloat(discountValue)) : 0
                      const totalWithoutVatAfterDiscount = summary.totalWithoutVat - discountAmountValue
                      const discountRatio = summary.totalWithoutVat > 0 ? totalWithoutVatAfterDiscount / summary.totalWithoutVat : 1
                      const totalWithVatAfterDiscount = totalWithoutVatAfterDiscount + summary.totalVat * discountRatio

                      if (!isVatPayer) {
                        const subtotal = items.reduce((s, i) => s + ((i.quantity || 0) * (i.price || 0)), 0)
                        const total = subtotal - discountAmountValue
                        return (
                          <div className="p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Mezisoučet:</span>
                              <span className="font-medium text-gray-900">{subtotal.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                            </div>
                            {discountAmountValue > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-red-600">Sleva {discountType === 'percentage' ? `(${discountValue}%)` : '(pevná částka)'}:</span>
                                <span className="font-medium text-red-600">-{discountAmountValue.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                              </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                              <span className="font-semibold text-gray-800">Celkem k úhradě:</span>
                              <span className="font-bold text-gray-900 text-base">{total.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div className="p-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Základ bez DPH:</span>
                            <span className="font-medium text-gray-900">{summary.totalWithoutVat.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                          </div>
                          {Object.entries(summary.byRate).filter(([rate]) => !isNonVatPayer(Number(rate))).map(([rate, breakdown]) => (
                            <div key={rate} className="flex justify-between text-sm pl-4">
                              <span className="text-gray-500">DPH {VAT_RATE_LABELS[Number(rate)] || `${rate}%`}:</span>
                              <span className="text-gray-700">{breakdown.vat.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                            <span className="text-gray-600">Celkem s DPH:</span>
                            <span className="font-medium text-gray-900">{summary.totalWithVat.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                          </div>
                          {discountAmountValue > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-red-600">Sleva {discountType === 'percentage' ? `(${discountValue}%)` : '(pevná částka)'}:</span>
                              <span className="font-medium text-red-600">-{discountAmountValue.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-gray-200">
                            <span className="font-semibold text-gray-800">Celkem k úhradě:</span>
                            <span className="font-bold text-gray-900 text-base">{totalWithVatAfterDiscount.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); resetForm() }} className="px-5 hover:bg-gray-100">Zrušit</Button>
                <Button type="submit" className="px-6 bg-blue-600 hover:bg-blue-700 text-white">
                  <ShoppingCart className="w-4 h-4 mr-2" />Vytvořit objednávku
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      <EntityPage.Filters onClear={ep.clearFilters} columns="auto 1fr 1fr 1fr 1fr 1fr 1fr 1fr">
        <FilterInput  value={ep.filters.number   ?? ''} onChange={v => ep.setFilter('number',   v)} placeholder="OBJ..." />
        <FilterInput  value={ep.filters.date      ?? ''} onChange={v => ep.setFilter('date',     v)} type="date" />
        <FilterInput  value={ep.filters.customer  ?? ''} onChange={v => ep.setFilter('customer', v)} placeholder="Odběratel..." />
        <FilterSelect value={ep.filters.payment   ?? 'all'} onChange={v => ep.setFilter('payment',  v)} options={paymentOptions} />
        <FilterInput  value={ep.filters.minItems  ?? ''} onChange={v => ep.setFilter('minItems', v)} type="number" placeholder="≥" />
        <FilterInput  value={ep.filters.minValue  ?? ''} onChange={v => ep.setFilter('minValue', v)} type="number" placeholder="≥" />
        <FilterSelect value={ep.filters.status    ?? 'all'} onChange={v => ep.setFilter('status',   v)} options={statusOptions} />
      </EntityPage.Filters>

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={order => (
          <CustomerOrderDetail
            order={orderToDetailData(order)}
            isVatPayer={isVatPayer}
            orderHref={`/customer-orders?highlight=${order.id}`}
            onPrintPdf={async () => {
              try {
                const settings = await fetch('/api/settings').then(r => r.json())
                const fakeTransaction = {
                  id: order.id, transactionCode: order.issuedInvoice?.invoiceNumber || order.orderNumber,
                  totalAmount: Number(order.totalAmount), totalAmountWithoutVat: Number(order.totalAmountWithoutVat ?? 0), totalVatAmount: Number(order.totalVatAmount ?? 0),
                  paymentType: order.issuedInvoice?.paymentType || 'transfer', status: order.status, transactionDate: order.orderDate,
                  customer: order.customer || null, customerName: order.customerName || null,
                  customerAddress: order.customerAddress, customerPhone: order.customerPhone, customerEmail: order.customerEmail,
                  items: order.items.map(item => ({ id: item.id || '', quantity: Number(item.quantity), unit: item.unit, price: Number(item.price), vatRate: Number(item.vatRate ?? 0), vatAmount: Number(item.vatAmount ?? 0), priceWithVat: Number(item.priceWithVat ?? item.price), product: item.product || { id: '', name: item.productName || '' } }))
                }
                await generateInvoicePDF(fakeTransaction as any, settings)
              } catch { alert('Nepodařilo se vygenerovat PDF') }
            }}
onUpdateStatus={status => handleUpdateStatus(order.id, status)}
            onRefresh={ep.refresh}
          />
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
