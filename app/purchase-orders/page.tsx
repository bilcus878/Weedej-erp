'use client'

import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Plus, Package, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'
import { generatePurchaseOrderPDF, openPDFInNewTab } from '@/lib/pdfGenerator'
import CustomerSupplierSelector from '@/components/CustomerSupplierSelector'
import { calculateLineVat, calculateVatSummary, isNonVatPayer, NON_VAT_PAYER_RATE, DEFAULT_VAT_RATE, VAT_RATE_LABELS, type VatLineItem } from '@/lib/vatCalculation'
import {
  useEntityPage, useFilters, EntityPage, LoadingState, ErrorState,
  LinkedDocumentBanner, SupplierOrderDetail,
} from '@/components/erp'
import type { ColumnDef, SelectOption, SupplierOrderDetailData } from '@/components/erp'

export const dynamic = 'force-dynamic'

interface Supplier {
  id: string; name: string; entityType?: string; contact?: string; email?: string; phone?: string
  ico?: string; dic?: string; bankAccount?: string; website?: string; address?: string
}

interface Product {
  id: string; name: string; unit: string; purchasePrice?: number; vatRate?: number
  category?: { id: string; name: string }
}

interface PurchaseOrderItem {
  id?: string; productId?: string; productName?: string; isManual: boolean
  quantity: number; alreadyReceivedQuantity?: number; unit: string
  expectedPrice: number; vatRate: number; vatAmount?: number; priceWithVat?: number; product?: Product
}

interface ReceiptItem {
  id: string; quantity: number; receivedQuantity?: number; purchasePrice: number; unit: string
  product?: { name: string }; productName?: string
}

interface Receipt {
  id: string; receiptNumber: string; receiptDate: string; status: string; stornoReason?: string
  supplier?: { name: string }; items?: ReceiptItem[]
}

interface PurchaseOrder {
  id: string; orderNumber: string; orderDate: string; expectedDate?: string; status: string
  note?: string; stornoReason?: string; stornoAt?: string; stornoBy?: string
  totalAmount?: number; totalAmountWithoutVat?: number; totalVatAmount?: number
  supplier?: Supplier; supplierName?: string; supplierEntityType?: string
  supplierICO?: string; supplierDIC?: string; supplierAddress?: string
  supplierContactPerson?: string; supplierEmail?: string; supplierPhone?: string
  supplierBankAccount?: string; supplierWebsite?: string
  items: PurchaseOrderItem[]; receipts?: Receipt[]; invoice?: { id: string; invoiceNumber: string; paymentType?: string }
  [key: string]: any
}

const statusOptions: SelectOption[] = [
  { value: 'all',               label: 'Vše' },
  { value: 'pending',           label: 'Čeká',      className: 'text-yellow-600' },
  { value: 'confirmed',         label: 'Potvrzena', className: 'text-blue-600'   },
  { value: 'partially_received',label: 'Částečně',  className: 'text-orange-600' },
  { value: 'received',          label: 'Přijata',   className: 'text-green-600'  },
  { value: 'storno',            label: 'Storno',    className: 'text-red-600'    },
]

const paymentTypeOptions: SelectOption[] = [
  { value: 'all',      label: 'Vše'      },
  { value: 'none',     label: '-'        },
  { value: 'cash',     label: 'Hotovost' },
  { value: 'card',     label: 'Karta'    },
  { value: 'transfer', label: 'Převod'   },
]

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    storno:             'bg-red-100 text-red-800',
    cancelled:          'bg-red-100 text-red-800',
    pending:            'bg-yellow-100 text-yellow-800',
    confirmed:          'bg-blue-100 text-blue-800',
    partially_received: 'bg-orange-100 text-orange-800',
    received:           'bg-green-100 text-green-800',
  }
  const labels: Record<string, string> = {
    storno: 'STORNO', cancelled: 'Zrušena', pending: 'Čeká',
    confirmed: 'Potvrzena', partially_received: 'Částečně přijata', received: 'Přijata',
  }
  const cls = map[status] || 'bg-yellow-100 text-yellow-800'
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{labels[status] || 'Čeká'}</span>
}

const emptyManualSupplier = { name: '', entityType: 'company', contactPerson: '', email: '', phone: '', ico: '', dic: '', bankAccount: '', website: '', address: '', note: '' }

export default function PurchaseOrdersPage() {
  const highlightId = useSearchParams().get('highlight')

  const [isVatPayer, setIsVatPayer]   = useState(true)
  const [suppliers, setSuppliers]     = useState<Supplier[]>([])
  const [products, setProducts]       = useState<Product[]>([])

  // Form state
  const [showForm, setShowForm]       = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [supplierId, setSupplierId]   = useState('')
  const [orderDate, setOrderDate]     = useState(new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState('')
  const [note, setNote]               = useState('')
  const [items, setItems]             = useState<PurchaseOrderItem[]>([])
  const [dueDate, setDueDate]         = useState('')
  const [paymentType, setPaymentType] = useState('')
  const [variableSymbol, setVariableSymbol]   = useState('')
  const [constantSymbol, setConstantSymbol]   = useState('')
  const [specificSymbol, setSpecificSymbol]   = useState('')
  const [isManualSupplier, setIsManualSupplier]     = useState(false)
  const [isAnonymousSupplier, setIsAnonymousSupplier] = useState(false)
  const [saveSupplierToDatabase, setSaveSupplierToDatabase] = useState(false)
  const [manualSupplierData, setManualSupplierData] = useState(emptyManualSupplier)
  const [openDropdownIndex, setOpenDropdownIndex]   = useState<number | null>(null)
  const [hoveredCategory, setHoveredCategory]       = useState<string | null>(null)
  const [categoryRect, setCategoryRect]             = useState<DOMRect | null>(null)
  const categoryMenuRef   = useRef<HTMLDivElement>(null)
  const hideSubmenuTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const resetPage = useRef<() => void>(() => {})

  const filters = useFilters<PurchaseOrder>([
    { key: 'number',   type: 'text',   placeholder: 'Číslo...',    match: (r, v) => r.orderNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',     type: 'date',                                 match: (r, v) => new Date(r.orderDate).toISOString().split('T')[0] === v },
    { key: 'supplier', type: 'text',   placeholder: 'Dodavatel...',  match: (r, v) => (r.supplier?.name || r.supplierName || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'payment',  type: 'select', options: paymentTypeOptions,  match: (r, v) => { if (v === 'all') return true; const pt = r.invoice?.paymentType; return v === 'none' ? !pt : pt === v } },
    { key: 'minItems', type: 'number', placeholder: '≥',            match: (r, v) => r.items.length >= v },
    { key: 'minValue', type: 'number', placeholder: '≥ Kč',         match: (r, v) => r.items.reduce((s, i) => s + Number(i.quantity) * Number(i.expectedPrice || 0), 0) >= v },
    { key: 'status',   type: 'select', options: statusOptions,       match: (r, v) => v === 'all' || r.status === v },
  ], () => resetPage.current())

  const ep = useEntityPage<PurchaseOrder>({
    fetchData: async () => {
      const [oRes, sRes, pRes, stRes] = await Promise.all([
        fetch('/api/purchase-orders'),
        fetch('/api/suppliers'),
        fetch('/api/products'),
        fetch('/api/settings'),
      ])
      const [o, s, p, st] = await Promise.all([oRes.json(), sRes.json(), pRes.json(), stRes.json()])
      setSuppliers(Array.isArray(s) ? s : [])
      setProducts(Array.isArray(p) ? p : [])
      setIsVatPayer(st.isVatPayer ?? true)
      return o
    },
    getRowId: r => r.id,
    filterFn: filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  async function handleOpenForm() {
    const res = await fetch(`/api/purchase-orders/next-number?date=${orderDate}`)
    const data = await res.json()
    setOrderNumber(data.nextNumber)
    const defaultVatRate = isVatPayer ? DEFAULT_VAT_RATE : NON_VAT_PAYER_RATE
    setItems([{ productId: '', productName: '', isManual: false, quantity: 1, unit: 'ks', expectedPrice: 0, vatRate: defaultVatRate }])
    setShowForm(true)
  }

  async function handleOrderDateChange(newDate: string) {
    setOrderDate(newDate)
    const res = await fetch(`/api/purchase-orders/next-number?date=${newDate}`)
    const data = await res.json()
    setOrderNumber(data.nextNumber)
  }

  function handleAddItem() {
    const defaultVatRate = isVatPayer ? DEFAULT_VAT_RATE : NON_VAT_PAYER_RATE
    setItems([...items, { productId: '', productName: '', isManual: false, quantity: 1, unit: 'ks', expectedPrice: 0, vatRate: defaultVatRate }])
  }

  function handleRemoveItem(index: number) { setItems(items.filter((_, i) => i !== index)) }

  function handleItemChange(index: number, field: string, value: any) {
    const newItems = [...items]
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      if (product) {
        const effectiveVatRate = isVatPayer ? Number(product.vatRate || DEFAULT_VAT_RATE) : NON_VAT_PAYER_RATE
        newItems[index] = { ...newItems[index], productId: value, productName: '', isManual: false, unit: product.unit, expectedPrice: product.purchasePrice || 0, vatRate: effectiveVatRate }
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    setItems(newItems)
  }

  function resetForm() {
    setOrderNumber(''); setSupplierId(''); setOrderDate(new Date().toISOString().split('T')[0])
    setExpectedDate(''); setNote(''); setItems([])
    setDueDate(''); setPaymentType(''); setVariableSymbol(''); setConstantSymbol(''); setSpecificSymbol('')
    setIsManualSupplier(false); setIsAnonymousSupplier(false); setSaveSupplierToDatabase(false)
    setManualSupplierData(emptyManualSupplier)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId && !isManualSupplier && !isAnonymousSupplier) { alert('Vyberte dodavatele, zadejte ho ručně nebo zvolte anonymního dodavatele'); return }
    if (isManualSupplier && !manualSupplierData.name.trim()) { alert('Vyplňte alespoň název dodavatele'); return }
    if (items.length === 0) { alert('Přidejte alespoň jednu položku'); return }
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber, supplierId: isManualSupplier || isAnonymousSupplier ? null : supplierId,
          orderDate, expectedDate: expectedDate || null, dueDate: dueDate || null,
          paymentType: paymentType || null, variableSymbol: variableSymbol || null,
          constantSymbol: constantSymbol || null, specificSymbol: specificSymbol || null, note,
          isManualSupplier, isAnonymousSupplier, saveSupplierToDatabase,
          manualSupplierData: isManualSupplier ? manualSupplierData : null,
          items: items.map(item => ({
            productId: item.isManual ? null : item.productId,
            productName: item.isManual ? item.productName : null,
            isManual: item.isManual, quantity: item.quantity, unit: item.unit, expectedPrice: item.expectedPrice,
          })),
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Chyba při vytváření objednávky') }
      setShowForm(false); resetForm()
      await ep.refresh()
      alert('Objednávka vytvořena!')
    } catch (error: any) {
      alert(error.message || 'Nepodařilo se vytvořit objednávku')
    }
  }

  async function handleDownloadPDF(orderId: string) {
    const order = ep.rows.find(o => o.id === orderId)
    if (!order) return
    try {
      const pdfData = {
        orderNumber: order.orderNumber, orderDate: order.orderDate, expectedDate: order.expectedDate,
        supplierName: order.supplier?.name || order.supplierName || 'Neznámý dodavatel',
        supplierAddress: order.supplier?.address, supplierICO: order.supplier?.ico, supplierDIC: order.supplier?.dic,
        items: order.items.map(item => ({
          productName: item.product?.name || item.productName || 'Neznámý produkt',
          quantity: Number(item.quantity), unit: item.unit, price: Number(item.expectedPrice || 0),
        })),
        totalAmount: order.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.expectedPrice || 0), 0),
        note: order.note, status: order.status, stornoReason: order.stornoReason, stornoAt: order.stornoAt,
      }
      const settingsRes = await fetch('/api/settings')
      const settings = await settingsRes.json()
      const pdfBlob = await generatePurchaseOrderPDF(pdfData, settings)
      openPDFInNewTab(pdfBlob)
    } catch (error: any) {
      alert(`Chyba při generování PDF: ${error.message}`)
    }
  }

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      key: 'number', header: 'Číslo',
      render: r => <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>{r.orderNumber}</p>,
    },
    { key: 'date',   header: 'Datum',    render: r => <p className="text-sm text-gray-700">{formatDate(r.orderDate)}</p> },
    {
      key: 'supplier', header: 'Dodavatel',
      render: r => {
        let s = r.supplier
        if (!s && r.supplierName) s = suppliers.find(x => x.name === r.supplierName)
        return s?.id
          ? <a href={`/suppliers?highlight=${s.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{s.name}</a>
          : <p className="text-sm text-gray-700 truncate">{r.supplierName || '-'}</p>
      },
    },
    {
      key: 'payment', header: 'Typ platby',
      render: r => <p className="text-sm text-gray-700">{({ cash: 'Hotovost', card: 'Karta', transfer: 'Převod' } as Record<string, string>)[r.invoice?.paymentType ?? ''] || '-'}</p>,
    },
    { key: 'items',  header: 'Položek', render: r => <p className="text-sm text-gray-600">{r.items.length}</p> },
    {
      key: 'value', header: 'Hodnota',
      render: r => <p className="text-sm font-bold text-gray-900">{formatPrice(r.items.reduce((sum, item) => {
        const up = Number(item.expectedPrice || 0)
        const vr = Number(item.vatRate || 21)
        const nonVat = isNonVatPayer(vr)
        return sum + Number(item.quantity) * (isVatPayer ? up + (nonVat ? 0 : up * vr / 100) : up)
      }, 0))}</p>,
    },
    { key: 'status', header: 'Status', render: r => getStatusBadge(r.status) },
  ]

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header title="Objednávky vydané" icon={Package} color="blue" total={ep.rows.length} filtered={ep.filtered.length} onRefresh={ep.refresh} />

      {/* New order form card */}
      <Card className="border-2 border-blue-300 bg-blue-50 shadow-lg">
        <CardHeader className="cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => showForm ? setShowForm(false) : handleOpenForm()}>
          <div className="flex items-center gap-2">
            {showForm ? <ChevronDown className="h-6 w-6 text-blue-600" /> : <ChevronRight className="h-6 w-6 text-blue-600" />}
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Nová objednávka dodavateli
              {showForm && orderNumber && <span className="text-sm font-mono bg-blue-800 text-white px-3 py-1 rounded ml-2">#{orderNumber}</span>}
            </CardTitle>
          </div>
        </CardHeader>

        {showForm && (
          <CardContent className="p-6 bg-white">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3 items-stretch">
                {/* Dodavatel */}
                <div className="border border-gray-200 rounded-lg flex flex-col">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dodavatel</h3>
                  </div>
                  <div className="flex-1 flex items-center p-3">
                    <div className="w-full">
                      <CustomerSupplierSelector
                        compact type="supplier" entities={suppliers} selectedId={supplierId}
                        onSelectedIdChange={setSupplierId} manualData={manualSupplierData}
                        onManualDataChange={setManualSupplierData} isManual={isManualSupplier}
                        onIsManualChange={setIsManualSupplier} isAnonymous={isAnonymousSupplier}
                        onIsAnonymousChange={setIsAnonymousSupplier} saveToDatabase={saveSupplierToDatabase}
                        onSaveToDatabaseChange={setSaveSupplierToDatabase} required={false}
                      />
                    </div>
                  </div>
                </div>

                {/* Termíny */}
                <div className="border border-gray-200 rounded-lg flex flex-col">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Termíny</h3>
                  </div>
                  <div className="flex-1 flex items-center p-3">
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Datum objednávky</label>
                        <Input type="date" value={orderDate} onChange={e => handleOrderDateChange(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Očekávané dodání</label>
                        <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platební údaje */}
                <div className="border border-gray-200 rounded-lg flex flex-col">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Platební údaje</h3>
                  </div>
                  <div className="flex-1 flex items-center p-3">
                    <div className="w-full space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Datum splatnosti</label>
                          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Forma úhrady</label>
                          <div className="relative">
                            <select value={paymentType} onChange={e => setPaymentType(e.target.value)}
                              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 pr-9 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                              <option value="">Vyberte...</option>
                              <option value="cash">Hotově</option>
                              <option value="card">Kartou</option>
                              <option value="transfer">Převodem</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                      {paymentType === 'transfer' && (
                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                          <div><label className="text-xs text-gray-500 mb-1 block">Variabilní symbol</label><Input value={variableSymbol} onChange={e => setVariableSymbol(e.target.value)} placeholder="VS" /></div>
                          <div><label className="text-xs text-gray-500 mb-1 block">Konstantní symbol</label><Input value={constantSymbol} onChange={e => setConstantSymbol(e.target.value)} placeholder="KS" /></div>
                          <div><label className="text-xs text-gray-500 mb-1 block">Specifický symbol</label><Input value={specificSymbol} onChange={e => setSpecificSymbol(e.target.value)} placeholder="SS" /></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Poznámka */}
                <div className="border border-gray-200 rounded-lg flex flex-col">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-lg">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Poznámka</h3>
                  </div>
                  <div className="flex-1 p-3">
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Volitelná poznámka..."
                      className="w-full h-full min-h-[80px] text-sm rounded-md border border-gray-300 bg-white px-3 py-2 resize-none placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Manual supplier form */}
              {isManualSupplier && !isAnonymousSupplier && (
                <div className="border border-blue-200 rounded-lg bg-blue-50/30">
                  <div className="bg-blue-50 px-3 py-2 border-b border-blue-200 rounded-t-lg flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Údaje o dodavateli — ruční zadání</h3>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={saveSupplierToDatabase} onChange={e => setSaveSupplierToDatabase(e.target.checked)} className="w-3.5 h-3.5" />
                      <span className="text-xs text-blue-700">Uložit do databáze</span>
                    </label>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-4 gap-2">
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
                        <Input value={manualSupplierData.name} onChange={e => setManualSupplierData({...manualSupplierData, name: e.target.value})} placeholder={manualSupplierData.entityType === 'individual' ? 'Jan Novák' : 'Název firmy'} required />
                      </div>
                      {manualSupplierData.entityType === 'company' && (
                        <div><label className="text-xs text-gray-500 mb-1 block">Kontaktní osoba</label><Input value={manualSupplierData.contactPerson} onChange={e => setManualSupplierData({...manualSupplierData, contactPerson: e.target.value})} /></div>
                      )}
                      <div><label className="text-xs text-gray-500 mb-1 block">Email</label><Input type="email" value={manualSupplierData.email} onChange={e => setManualSupplierData({...manualSupplierData, email: e.target.value})} /></div>
                      <div><label className="text-xs text-gray-500 mb-1 block">Telefon</label><Input value={manualSupplierData.phone} onChange={e => setManualSupplierData({...manualSupplierData, phone: e.target.value})} /></div>
                      {manualSupplierData.entityType === 'company' && (<>
                        <div><label className="text-xs text-gray-500 mb-1 block">IČO</label><Input value={manualSupplierData.ico} onChange={e => setManualSupplierData({...manualSupplierData, ico: e.target.value})} /></div>
                        <div><label className="text-xs text-gray-500 mb-1 block">DIČ</label><Input value={manualSupplierData.dic} onChange={e => setManualSupplierData({...manualSupplierData, dic: e.target.value})} /></div>
                      </>)}
                      <div><label className="text-xs text-gray-500 mb-1 block">Číslo účtu</label><Input value={manualSupplierData.bankAccount} onChange={e => setManualSupplierData({...manualSupplierData, bankAccount: e.target.value})} /></div>
                      {manualSupplierData.entityType === 'company' && (
                        <div><label className="text-xs text-gray-500 mb-1 block">Web</label><Input value={manualSupplierData.website} onChange={e => setManualSupplierData({...manualSupplierData, website: e.target.value})} /></div>
                      )}
                      <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Adresa *</label><Input value={manualSupplierData.address} onChange={e => setManualSupplierData({...manualSupplierData, address: e.target.value})} required /></div>
                      <div className="col-span-2"><label className="text-xs text-gray-500 mb-1 block">Poznámka</label><Input value={manualSupplierData.note} onChange={e => setManualSupplierData({...manualSupplierData, note: e.target.value})} /></div>
                    </div>
                  </div>
                </div>
              )}

              {isAnonymousSupplier && (
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
                  Dodavatel bude uložen jako „Anonymní dodavatel" bez dalších údajů.
                </div>
              )}

              {/* Items */}
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-lg flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">Položky objednávky <span className="text-red-400">*</span></h3>
                  <Button type="button" onClick={handleAddItem} size="sm" className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-3 h-3 mr-1" />Přidat
                  </Button>
                </div>
                <div className="p-3">
                  {items.map((item, index) => (
                    <div key={index} className={`grid ${isVatPayer ? 'grid-cols-[4fr_2fr_1fr_1fr_2fr_2fr_auto]' : 'grid-cols-12'} gap-2 mb-1.5 items-end bg-white rounded border border-gray-200 hover:border-blue-300 transition-colors px-2 py-1.5`}>
                      <div className={isVatPayer ? '' : 'col-span-4'} style={{ position: 'relative' }}>
                        <div className="relative">
                          <button type="button" onClick={() => setOpenDropdownIndex(openDropdownIndex === index ? null : index)}
                            onBlur={e => { const t = e.currentTarget; setTimeout(() => { if (t && !t.contains(document.activeElement)) { setOpenDropdownIndex(null); setHoveredCategory(null) } }, 200) }}
                            className="w-full border rounded px-2 py-2 text-sm text-left bg-white hover:bg-gray-50 flex items-center justify-between">
                            <span className={item.productId ? 'text-gray-900' : 'text-gray-500'}>
                              {item.productId ? products.find(p => p.id === item.productId)?.name : 'Vyberte produkt...'}
                            </span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </button>

                          {openDropdownIndex === index && (
                            <>
                              <div ref={categoryMenuRef}
                                className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-[500px] overflow-y-auto"
                                onMouseLeave={() => { hideSubmenuTimeoutRef.current = setTimeout(() => { setHoveredCategory(null); setCategoryRect(null) }, 500) }}
                                onMouseEnter={() => { if (hideSubmenuTimeoutRef.current) { clearTimeout(hideSubmenuTimeoutRef.current); hideSubmenuTimeoutRef.current = null } }}>
                                {(() => {
                                  const cats = Array.from(new Set(products.filter(p => p.category).map(p => p.category!.name))).sort()
                                  return (
                                    <>
                                      {cats.map(cat => (
                                        <div key={cat} className="relative"
                                          onMouseEnter={e => { if (hideSubmenuTimeoutRef.current) { clearTimeout(hideSubmenuTimeoutRef.current); hideSubmenuTimeoutRef.current = null } setHoveredCategory(cat); setCategoryRect(e.currentTarget.getBoundingClientRect()) }}
                                          onMouseLeave={e => { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX > r.right) { if (hideSubmenuTimeoutRef.current) { clearTimeout(hideSubmenuTimeoutRef.current); hideSubmenuTimeoutRef.current = null } return } hideSubmenuTimeoutRef.current = setTimeout(() => { setHoveredCategory(null); setCategoryRect(null) }, 500) }}>
                                          <div className="px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center gap-2 select-none">
                                            <span>{cat}</span><ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                                          </div>
                                        </div>
                                      ))}
                                      {products.filter(p => !p.category).length > 0 && (
                                        <div className="relative"
                                          onMouseEnter={e => { if (hideSubmenuTimeoutRef.current) { clearTimeout(hideSubmenuTimeoutRef.current); hideSubmenuTimeoutRef.current = null } setHoveredCategory('__no_category__'); setCategoryRect(e.currentTarget.getBoundingClientRect()) }}
                                          onMouseLeave={e => { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX > r.right) { if (hideSubmenuTimeoutRef.current) { clearTimeout(hideSubmenuTimeoutRef.current); hideSubmenuTimeoutRef.current = null } return } hideSubmenuTimeoutRef.current = setTimeout(() => { setHoveredCategory(null); setCategoryRect(null) }, 500) }}>
                                          <div className="px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center gap-2 select-none">
                                            <span className="italic text-gray-600">Bez kategorie</span><ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )
                                })()}
                              </div>
                              {hoveredCategory && categoryRect && categoryMenuRef.current && (() => {
                                const fp = products.filter(p => hoveredCategory === '__no_category__' ? !p.category : p.category?.name === hoveredCategory)
                                const maxLen = Math.max(...fp.map(p => p.name.length + (p.unit?.length || 0) + 3))
                                const w = Math.min(Math.max(maxLen * 7 + 60, 250), 600)
                                return (
                                  <div className="fixed bg-white border border-gray-300 rounded shadow-xl max-h-[500px] overflow-y-auto z-[60]"
                                    style={{ width: `${w}px`, left: `${categoryRect.right}px`, top: `${categoryRect.top}px` }}
                                    onMouseEnter={() => { if (hideSubmenuTimeoutRef.current) { clearTimeout(hideSubmenuTimeoutRef.current); hideSubmenuTimeoutRef.current = null } }}
                                    onMouseLeave={() => { hideSubmenuTimeoutRef.current = setTimeout(() => { setHoveredCategory(null); setCategoryRect(null) }, 200) }}>
                                    {fp.map(p => (
                                      <div key={p.id} onMouseDown={e => { e.preventDefault(); handleItemChange(index, 'productId', p.id); setOpenDropdownIndex(null); setHoveredCategory(null); setCategoryRect(null) }}
                                        className="px-4 py-2.5 hover:bg-blue-100 cursor-pointer text-sm flex items-center gap-2">
                                        <span>{p.name}</span><span className="text-xs text-gray-500">({p.unit})</span>
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
                        <Input type="number" step="1" value={item.quantity || ''} onChange={e => handleItemChange(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))} className="bg-white" />
                      </div>
                      <div className={isVatPayer ? '' : 'col-span-2'}>
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
                      <div className={isVatPayer ? '' : 'col-span-3'}>
                        <label className="text-xs text-gray-600 mb-1 block">Cena/ks</label>
                        <Input type="number" step="1" value={item.expectedPrice || ''} onChange={e => handleItemChange(index, 'expectedPrice', e.target.value === '' ? '' : parseFloat(e.target.value))} className="bg-white" />
                      </div>
                      {isVatPayer && (
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Celkem</label>
                          {(() => {
                            const total = !isNonVatPayer(item.vatRate)
                              ? calculateLineVat(item.quantity || 0, item.expectedPrice || 0, item.vatRate).totalWithVat
                              : (item.quantity || 0) * (item.expectedPrice || 0)
                            return <div className="px-2 py-2 border rounded text-sm text-right font-medium bg-gray-50 text-gray-800 border-gray-200">{total.toLocaleString('cs-CZ')} Kč</div>
                          })()}
                        </div>
                      )}
                      <div className={isVatPayer ? '' : 'col-span-1'}>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(index)} className="hover:bg-red-100 hover:text-red-700 w-full">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {isVatPayer && items.length > 0 && (() => {
                    const vatItems: VatLineItem[] = items.map(item => calculateLineVat(item.quantity || 0, item.expectedPrice || 0, item.vatRate))
                    const summary = calculateVatSummary(vatItems)
                    return (
                      <div className="mt-2 bg-gray-50 rounded border border-gray-200 overflow-hidden">
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
                          <div className="flex justify-between pt-2 border-t border-gray-200">
                            <span className="font-semibold text-gray-800">Celkem s DPH:</span>
                            <span className="font-bold text-gray-900 text-base">{summary.totalWithVat.toLocaleString('cs-CZ', { minimumFractionDigits: 2 })} Kč</span>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                <Button type="button" variant="ghost" onClick={() => { setShowForm(false); resetForm() }} className="px-5 hover:bg-gray-100">Zrušit</Button>
                <Button type="submit" className="px-6 bg-blue-600 hover:bg-blue-700 text-white">
                  <Package className="w-4 h-4 mr-2" />Vytvořit objednávku
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {filters.bar('auto 1fr 1fr 1fr 1fr 1fr 1fr 1fr')}

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={order => {
          const sup = order.supplier as any
          const vr  = Number
          const detailData: SupplierOrderDetailData = {
            id:          order.id,
            orderNumber: order.orderNumber,
            orderDate:   order.orderDate,
            status:      order.status,
            totalAmount: order.totalAmount || 0,
            expectedDate: order.expectedDate,
            supplierName:          order.supplierName          || sup?.name,
            supplierEmail:         order.supplierEmail         || sup?.email,
            supplierPhone:         order.supplierPhone         || sup?.phone,
            supplierAddress:       order.supplierAddress       || sup?.address,
            supplierContactPerson: order.supplierContactPerson || sup?.contact,
            supplierEntityType:    order.supplierEntityType    || sup?.entityType,
            supplierICO:           order.supplierICO           || sup?.ico,
            supplierDIC:           order.supplierDIC           || sup?.dic,
            supplierBankAccount:   order.supplierBankAccount   || sup?.bankAccount,
            supplierWebsite:       order.supplierWebsite       || sup?.website,
            paymentType:    (order.invoice as any)?.paymentType  || null,
            dueDate:        (order.invoice as any)?.dueDate       || null,
            variableSymbol: (order.invoice as any)?.variableSymbol || null,
            stornoAt:     order.stornoAt,
            stornoBy:     order.stornoBy,
            stornoReason: order.stornoReason,
            discountAmount: (order as any).discountAmount || null,
            note: order.note,
            items: order.items.map((item, i) => {
              const price   = vr(item.expectedPrice || 0)
              const vatRate = vr(item.vatRate || 21)
              const vatAmount    = price * vatRate / 100
              const priceWithVat = price + vatAmount
              return {
                id:          item.id || String(i),
                productId:   item.isManual ? null : (item.productId || null),
                productName: item.productName || item.product?.name || null,
                quantity:    vr(item.quantity),
                alreadyReceivedQuantity: vr(item.alreadyReceivedQuantity || 0),
                unit: item.unit,
                price,
                vatRate,
                vatAmount,
                priceWithVat,
                product: item.product
                  ? { id: item.product.id, name: item.product.name, price: item.product.purchasePrice || 0, unit: item.product.unit }
                  : null,
              }
            }),
            receivedInvoice: order.invoice
              ? { id: order.invoice.id, invoiceNumber: order.invoice.invoiceNumber, status: 'active', invoiceDate: '' }
              : null,
            receipts: order.receipts?.map(r => ({
              id: r.id, receiptNumber: r.receiptNumber, receiptDate: r.receiptDate, status: r.status,
              items: r.items?.map(ri => ({
                id: ri.id, quantity: vr(ri.quantity),
                receivedQuantity: ri.receivedQuantity != null ? vr(ri.receivedQuantity) : undefined,
                unit: ri.unit, productName: ri.productName || ri.product?.name || null,
                purchasePrice: vr(ri.purchasePrice), product: null,
              })) || [],
            })) || [],
          }
          return (
            <>
              {order.invoice && (
                <LinkedDocumentBanner links={[{ label: 'Faktura', value: order.invoice.invoiceNumber, href: `/invoices/received?highlight=${order.invoice.id}` }]} />
              )}
              <div className="mt-3">
                <SupplierOrderDetail
                  order={detailData}
                  isVatPayer={isVatPayer}
                  onPrintPdf={() => handleDownloadPDF(order.id)}
                  onRefresh={ep.refresh}
                />
              </div>
            </>
          )
        }}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
