// Stránka Eshop objednávky (/eshop-orders)
// Zobrazení objednávek z e-shopu (source = 'eshop') s možností vystavení faktury, expedice a PDF

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { formatPrice, formatDate, formatDateTime } from '@/lib/utils'
import { formatVariantQty } from '@/lib/formatVariantQty'
import { generateEshopOrderPDF } from '@/lib/generateEshopOrderPDF'
import {
  ChevronDown,
  ChevronRight,
  Globe,
  FileText,
  FileDown,
  Truck,
  CheckCircle,
  Clock,
  Package,
  ExternalLink,
  ShoppingBag,
  CreditCard,
  XCircle,
  RefreshCw,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// ─── Typy ────────────────────────────────────────────────────────────────────

interface EshopOrderItem {
  id: string
  productId?: string | null
  productName?: string | null
  quantity: number
  unit: string
  price: number         // bez DPH
  vatRate: number
  vatAmount: number
  priceWithVat: number  // s DPH
  shippedQuantity?: number
  product?: {
    id: string
    name: string
    price: number
    unit: string
  } | null
}

interface EshopDeliveryNoteItem {
  id: string
  quantity: number
  unit: string
  productName?: string | null
  price?: number | null
  priceWithVat?: number | null
  vatRate?: number | null
  vatAmount?: number | null
  product?: { id: string; name: string; price: number } | null
}

interface EshopDeliveryNote {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status: string
  processedAt?: string | null
  items: EshopDeliveryNoteItem[]
}

interface IssuedInvoiceSummary {
  id: string
  invoiceNumber: string
  paymentType: string
  paymentStatus: string
  status: string
  invoiceDate: string
}

interface EshopUser {
  id: string
  email: string
  name?: string | null
  phone?: string | null
}

interface EshopOrder {
  id: string
  orderNumber: string
  orderDate: string
  status: string
  totalAmount: number
  totalAmountWithoutVat: number
  totalVatAmount: number
  paidAt?: string | null
  shippedAt?: string | null
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  eshopOrderId?: string | null
  eshopUserId?: string | null
  stripeSessionId?: string | null
  stripePaymentIntent?: string | null
  note?: string | null
  items: EshopOrderItem[]
  issuedInvoice?: IssuedInvoiceSummary | null
  EshopUser?: EshopUser | null
  deliveryNotes?: EshopDeliveryNote[]
}

// ─── Pomocné funkce ──────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3" />
          Zaplaceno
        </span>
      )
    case 'shipped':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Truck className="w-3 h-3" />
          Odesláno
        </span>
      )
    case 'delivered':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Doručeno
        </span>
      )
    case 'cancelled':
    case 'storno':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3" />
          Zrušeno
        </span>
      )
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Truck className="w-3 h-3" />
          Částečně odesláno
        </span>
      )
    case 'new':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Package className="w-3 h-3" />
          Nová
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>
      )
  }
}

function getCustomerName(order: EshopOrder): string {
  return order.customerName || order.EshopUser?.name || 'Zákazník'
}

function getCustomerEmail(order: EshopOrder): string {
  return order.customerEmail || order.EshopUser?.email || ''
}

function getCustomerPhone(order: EshopOrder): string {
  return order.customerPhone || order.EshopUser?.phone || ''
}

// ─── Hlavní komponenta ───────────────────────────────────────────────────────

export default function EshopOrdersPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')

  const [orders, setOrders] = useState<EshopOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<EshopOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [isVatPayer, setIsVatPayer] = useState(true)

  // Stavy zpracování
  const [processingInvoice, setProcessingInvoice] = useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string | null>(null)

  // Filtry
  const [filterNumber, setFilterNumber] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterMinValue, setFilterMinValue] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterStatusDropdownOpen, setFilterStatusDropdownOpen] = useState(false)
  const filterStatusRef = useRef<HTMLDivElement>(null)

  // Paginace
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const sectionRef = useRef<HTMLDivElement>(null)

  // ─── Načtení dat ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchData()
  }, [])

  // Zavřít dropdown filtru při kliknutí mimo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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

    if (filterNumber) {
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(filterNumber.toLowerCase())
      )
    }

    if (filterDate) {
      filtered = filtered.filter(o => {
        const d = new Date(o.orderDate).toISOString().split('T')[0]
        return d === filterDate
      })
    }

    if (filterCustomer) {
      const q = filterCustomer.toLowerCase()
      filtered = filtered.filter(o =>
        getCustomerName(o).toLowerCase().includes(q) ||
        getCustomerEmail(o).toLowerCase().includes(q)
      )
    }

    if (filterMinValue) {
      const min = parseFloat(filterMinValue)
      if (!isNaN(min)) {
        filtered = filtered.filter(o => Number(o.totalAmount) >= min)
      }
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(o => o.status === filterStatus)
    }

    setFilteredOrders(filtered)
    setCurrentPage(1)
  }, [orders, filterNumber, filterDate, filterCustomer, filterMinValue, filterStatus])

  // Scroll k highlightnuté objednávce
  useEffect(() => {
    if (highlightId && filteredOrders.length > 0) {
      const index = filteredOrders.findIndex(o => o.id === highlightId)
      if (index !== -1) {
        const page = Math.floor(index / itemsPerPage) + 1
        setCurrentPage(page)
        setExpandedOrders(new Set([highlightId]))
        setTimeout(() => {
          document.getElementById(`order-${highlightId}`)?.scrollIntoView({
            behavior: 'smooth', block: 'center'
          })
        }, 100)
      }
    }
  }, [highlightId, filteredOrders, itemsPerPage])

  async function fetchData() {
    try {
      setLoading(true)
      const [ordersRes, settingsRes] = await Promise.all([
        fetch('/api/eshop-orders'),
        fetch('/api/settings'),
      ])
      const ordersData = await ordersRes.json()
      const settingsData = await settingsRes.json()
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setIsVatPayer(settingsData.isVatPayer ?? true)
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
    } finally {
      setLoading(false)
    }
  }

  // ─── Akce ────────────────────────────────────────────────────────────────────

  function toggleExpand(orderId: string) {
    const next = new Set(expandedOrders)
    if (next.has(orderId)) {
      next.delete(orderId)
    } else {
      next.add(orderId)
    }
    setExpandedOrders(next)
  }

  function clearFilters() {
    setFilterNumber('')
    setFilterDate('')
    setFilterCustomer('')
    setFilterMinValue('')
    setFilterStatus('all')
  }

  async function handleCreateInvoice(orderId: string) {
    setProcessingInvoice(orderId)
    try {
      const res = await fetch(`/api/eshop-orders/${orderId}/invoice`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Nepodařilo se vytvořit fakturu')
        return
      }
      await fetchData()
    } catch {
      alert('Chyba při vytváření faktury')
    } finally {
      setProcessingInvoice(null)
    }
  }

  async function handleUpdateStatus(orderId: string, newStatus: string) {
    setProcessingStatus(orderId)
    try {
      const res = await fetch(`/api/eshop-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Nepodařilo se aktualizovat status')
        return
      }
      await fetchData()
    } catch {
      alert('Chyba při aktualizaci statusu')
    } finally {
      setProcessingStatus(null)
    }
  }

  async function handlePrintInvoice(order: EshopOrder) {
    try {
      const settingsRes = await fetch('/api/settings')
      const settings = await settingsRes.json()
      await generateEshopOrderPDF(order, settings)
    } catch (error) {
      console.error('Chyba při generování PDF:', error)
      alert('Nepodařilo se vygenerovat PDF')
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
          <p className="text-gray-500">Načítání eshop objednávek...</p>
        </div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const paginated = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)

  return (
    <div className="space-y-6">

      {/* ── Hlavička ── */}
      <div className="bg-gradient-to-r from-slate-50 to-emerald-50 border-l-4 border-emerald-500 rounded-lg shadow-sm py-4 px-6">
        <div className="relative">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-emerald-600 flex items-center justify-center gap-2">
              <Globe className="w-6 h-6" />
              Eshop objednávky
              <span className="text-sm font-normal text-gray-600 ml-1">
                (Zobrazeno{' '}
                <span className="font-semibold text-emerald-600">{filteredOrders.length}</span>
                {' '}z{' '}
                <span className="font-semibold text-gray-700">{orders.length}</span>)
              </span>
            </h1>
          </div>

          {/* Tlačítko Obnovit */}
          <div className="absolute top-0 right-0">
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-medium rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Obnovit
            </button>
          </div>
        </div>
      </div>

      {/* ── Filtry ── */}
      <div className="mb-4">
        <div className="grid grid-cols-[auto_1fr_1fr_2fr_1fr_1fr_1fr] items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">

          {/* Vymazat filtry */}
          <button
            onClick={clearFilters}
            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center flex-shrink-0"
            title="Vymazat filtry"
          >
            ✕
          </button>

          {/* Číslo objednávky */}
          <input
            type="text"
            value={filterNumber}
            onChange={e => setFilterNumber(e.target.value)}
            placeholder="ESH..."
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Datum */}
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Zákazník */}
          <input
            type="text"
            value={filterCustomer}
            onChange={e => setFilterCustomer(e.target.value)}
            placeholder="Zákazník / email..."
            className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Položky – žádný filtr */}
          <div />

          {/* Min. částka */}
          <input
            type="number"
            value={filterMinValue}
            onChange={e => setFilterMinValue(e.target.value)}
            placeholder="≥ Kč"
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Status dropdown */}
          <div ref={filterStatusRef} className="relative">
            <div
              onClick={() => setFilterStatusDropdownOpen(v => !v)}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-blue-500 flex items-center justify-center select-none"
            >
              {filterStatus === 'all' && <span>Vše</span>}
              {filterStatus === 'paid' && <span className="text-yellow-700">Zaplaceno</span>}
              {filterStatus === 'processing' && <span className="text-blue-700">Část. odesláno</span>}
              {filterStatus === 'shipped' && <span className="text-purple-700">Odesláno</span>}
              {filterStatus === 'delivered' && <span className="text-green-700">Doručeno</span>}
              {filterStatus === 'cancelled' && <span className="text-red-700">Zrušeno</span>}
            </div>

            {filterStatusDropdownOpen && (
              <div className="absolute z-50 mt-1 right-0 w-36 bg-white border border-gray-300 rounded shadow-lg">
                {[
                  { value: 'all', label: 'Vše', color: '' },
                  { value: 'paid', label: 'Zaplaceno', color: 'text-yellow-700' },
                  { value: 'processing', label: 'Část. odesláno', color: 'text-blue-700' },
                  { value: 'shipped', label: 'Odesláno', color: 'text-purple-700' },
                  { value: 'delivered', label: 'Doručeno', color: 'text-green-700' },
                  { value: 'cancelled', label: 'Zrušeno', color: 'text-red-700' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => { setFilterStatus(opt.value); setFilterStatusDropdownOpen(false) }}
                    className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center ${opt.color}`}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabulka ── */}
      <div ref={sectionRef} className="space-y-2">

        {filteredOrders.length === 0 ? (
          <div className="border rounded-lg">
            <div className="p-12 text-center">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">
                {orders.length === 0
                  ? 'Žádné eshop objednávky. Objednávky se zobrazí automaticky po platbě přes e-shop.'
                  : 'Žádné objednávky neodpovídají zvoleným filtrům.'}
              </p>
              {orders.length > 0 && (
                <Button onClick={clearFilters} variant="secondary" size="sm">
                  Vymazat filtry
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Hlavička tabulky */}
            <div className="grid grid-cols-[auto_1fr_1fr_2fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 border rounded-lg text-xs text-gray-700">
              <div className="w-8" />
              <div className="text-center font-bold">Číslo</div>
              <div className="text-center font-semibold">Datum</div>
              <div className="text-center font-semibold">Zákazník</div>
              <div className="text-center font-semibold">Položek</div>
              <div className="text-center font-semibold">Částka</div>
              <div className="text-center font-semibold">Status</div>
            </div>

            {/* Řádky objednávek */}
            {paginated.map(order => {
              const isExpanded = expandedOrders.has(order.id)
              const isCancelled = ['cancelled', 'storno'].includes(order.status)
              const isProcessingThis = processingInvoice === order.id || processingStatus === order.id

              return (
                <div
                  key={order.id}
                  id={`order-${order.id}`}
                  className={`border rounded-lg transition-all ${
                    highlightId === order.id ? 'border-blue-500 bg-blue-50' :
                    isExpanded ? 'ring-2 ring-blue-400' : ''
                  } ${isCancelled ? 'opacity-60' : ''}`}
                >
                  {/* Hlavní řádek */}
                  <div
                    className={`p-4 grid grid-cols-[auto_1fr_1fr_2fr_1fr_1fr_1fr] items-center gap-4 cursor-pointer transition-colors ${
                      isCancelled ? 'bg-red-50' : isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleExpand(order.id)}
                  >
                    {/* Chevron */}
                    <div className="w-8 flex-shrink-0">
                      {isExpanded
                        ? <ChevronDown className="h-5 w-5 text-gray-400" />
                        : <ChevronRight className="h-5 w-5 text-gray-400" />
                      }
                    </div>

                    {/* Číslo objednávky */}
                    <div className="text-center">
                      <p className={`text-sm font-bold text-gray-700 ${isCancelled ? 'line-through' : ''}`}>
                        {order.orderNumber}
                      </p>
                    </div>

                    {/* Datum */}
                    <div className="text-center">
                      <p className="text-sm text-gray-900">
                        {formatDate(order.orderDate)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.orderDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Zákazník */}
                    <div className="text-center min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {getCustomerName(order)}
                      </p>
                      {getCustomerEmail(order) && (
                        <p className="text-xs text-gray-400 truncate">
                          {getCustomerEmail(order)}
                        </p>
                      )}
                    </div>

                    {/* Počet položek */}
                    <div className="text-center">
                      <p className="text-sm text-gray-700">
                        {order.items.length}
                      </p>
                    </div>

                    {/* Částka */}
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-900">
                        {formatPrice(Number(order.totalAmount))}
                      </p>
                      {isVatPayer && Number(order.totalVatAmount) > 0 && (
                        <p className="text-xs text-gray-400">
                          DPH: {formatPrice(Number(order.totalVatAmount))}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <div className="text-center">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* ── Rozbalený detail ── */}
                  {isExpanded && (
                    <div className="border-t p-4 bg-gray-50">

                      {/* Rozcestník — odkaz na propojenou fakturu */}
                      {order.issuedInvoice && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="text-sm text-center">
                            <div className="flex items-center justify-center gap-4 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Faktura:</span>
                                <Link
                                  href={`/invoices/issued?highlight=${order.issuedInvoice.id}`}
                                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {order.issuedInvoice.invoiceNumber}
                                  <ExternalLink className="w-3 h-3 inline ml-1" />
                                </Link>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  order.issuedInvoice.paymentStatus === 'paid'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {order.issuedInvoice.paymentStatus === 'paid' ? 'Zaplaceno' : 'Nezaplaceno'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-5">

                      {/* Informace o objednávce */}
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Informace o objednávce</h4>

                        <div className="border-b">
                          <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Obecné</h5>
                          <div className="text-sm">
                            <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                              <div><span className="text-gray-600">Datum objednávky:</span> <span className="font-medium">{new Date(order.orderDate).toLocaleDateString('cs-CZ')}</span></div>
                              <div className="border-l border-gray-200 mx-4"></div>
                              <div><span className="text-gray-600">Odesláno / Vydáno:</span> <span className="font-medium">{order.shippedAt ? new Date(order.shippedAt).toLocaleDateString('cs-CZ') : (order.deliveryNotes?.filter(dn => dn.status === 'active').map(dn => new Date(dn.deliveryDate).toLocaleDateString('cs-CZ')).join(', ') || '-')}</span></div>
                            </div>
                            <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                              <div><span className="text-gray-600">Zaplaceno:</span> <span className="font-medium">{order.paidAt ? new Date(order.paidAt).toLocaleDateString('cs-CZ') : '-'}</span></div>
                              <div className="border-l border-gray-200 mx-4"></div>
                              <div><span className="text-gray-600">Typ platby:</span> <span className="font-medium">Stripe (karta)</span></div>
                            </div>
                            <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                              <div><span className="text-gray-600">Poznámka:</span> <span className="font-medium">{order.note || '-'}</span></div>
                              <div className="border-l border-gray-200 mx-4"></div>
                              <div><span className="text-gray-600">Eshop ID:</span> <span className="font-medium font-mono text-xs text-gray-500">{order.eshopOrderId || '-'}</span></div>
                            </div>
                            {order.stripeSessionId && (
                              <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                                <div><span className="text-gray-600">Stripe Session:</span> <span className="font-medium font-mono text-xs text-gray-500 break-all">{order.stripeSessionId}</span></div>
                                <div className="border-l border-gray-200 mx-4"></div>
                                <div></div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Zákazník / Doručení</h5>
                          <div className="text-sm">
                            <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                              <div><span className="text-gray-600">Jméno:</span> <span className="font-medium">{getCustomerName(order)}</span></div>
                              <div className="border-l border-gray-200 mx-4"></div>
                              <div>
                                <span className="text-gray-600">Email:</span>{' '}
                                {getCustomerEmail(order)
                                  ? <a href={`mailto:${getCustomerEmail(order)}`} className="font-medium text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{getCustomerEmail(order)}</a>
                                  : <span className="font-medium">-</span>
                                }
                              </div>
                            </div>
                            <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                              <div><span className="text-gray-600">Telefon:</span> <span className="font-medium">{getCustomerPhone(order) || '-'}</span></div>
                              <div className="border-l border-gray-200 mx-4"></div>
                              <div><span className="text-gray-600">Adresa:</span> <span className="font-medium whitespace-pre-line">{order.customerAddress || '-'}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Položky objednávky ── */}
                      {order.items.length === 0 ? (
                        <p className="text-red-600">Objednávka nemá žádné položky!</p>
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">
                            Položky ({order.items.filter(item => item.productId !== null).length})
                          </h4>
                          <div className="text-sm">
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

                            {order.items
                              .filter(item => item.productId !== null)
                              .map((item, i) => {
                                const qty          = Number(item.quantity)
                                const qtyDisplay   = formatVariantQty(qty, item.productName, item.unit)
                                const unitPrice    = Number(item.price)
                                const vatRate      = Number(item.vatRate)
                                const vatPerUnit   = Number(item.vatAmount)
                                const priceWithVat = Number(item.priceWithVat)
                                const rawRowTotal  = priceWithVat * qty
                                const rowTotal     = rawRowTotal > Number(order.totalAmount) * 1.05 ? priceWithVat : rawRowTotal

                                return isVatPayer ? (
                                  <div key={item.id} className={`grid grid-cols-[3fr_repeat(6,1fr)] gap-2 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-xs`}>
                                    <div className="font-medium text-gray-900">{item.productName || item.product?.name}</div>
                                    <div className="text-center text-gray-600">{qtyDisplay}</div>
                                    <div className="text-center text-gray-500">{vatRate}%</div>
                                    <div className="text-center text-gray-600">{formatPrice(unitPrice)}</div>
                                    <div className="text-center text-gray-500">{formatPrice(vatPerUnit)}</div>
                                    <div className="text-center text-gray-700">{formatPrice(priceWithVat)}</div>
                                    <div className="text-center font-semibold text-gray-900">{formatPrice(rowTotal)}</div>
                                  </div>
                                ) : (
                                  <div key={item.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                    <div className="font-medium text-gray-900">{item.productName || item.product?.name}</div>
                                    <div className="text-right text-gray-600">{qtyDisplay}</div>
                                    <div className="text-right text-gray-600">{formatPrice(priceWithVat)}</div>
                                    <div className="text-right font-semibold text-gray-900">{formatPrice(rowTotal)}</div>
                                  </div>
                                )
                              })}

                            {/* Doprava / sleva jako mezisoučtové řádky */}
                            {(() => {
                              const colGrid   = isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'
                              const labelSpan = isVatPayer ? 'col-span-6' : 'col-span-3'
                              const nullItems    = order.items.filter(item => item.productId === null)
                              const shippingItem = nullItems.find(item => /(doprav|shipping)/i.test(item.productName || ''))
                              const discountItem = nullItems.find(item => !/(doprav|shipping)/i.test(item.productName || ''))
                              const catalogSubtotal = order.items
                                .filter(item => item.productId !== null)
                                .reduce((sum, item) => {
                                  const pwv = Number(item.priceWithVat)
                                  const raw = pwv * Number(item.quantity)
                                  return sum + (raw > Number(order.totalAmount) * 1.05 ? pwv : raw)
                                }, 0)
                              const shippingTotal = shippingItem
                                ? Number(shippingItem.priceWithVat ?? shippingItem.price ?? 0) * Number(shippingItem.quantity ?? 1)
                                : 0
                              const discountTotal = discountItem
                                ? Number(discountItem.priceWithVat ?? discountItem.price ?? 0) * Number(discountItem.quantity ?? 1)
                                : 0
                              if (shippingTotal === 0 && discountTotal === 0) return null
                              return (
                                <>
                                  <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-gray-50 border-t text-sm`}>
                                    <div className={`${labelSpan} text-gray-600`}>Mezisoučet</div>
                                    <div className="text-center font-medium text-gray-800">{formatPrice(catalogSubtotal)}</div>
                                  </div>
                                  {shippingTotal !== 0 && (
                                    <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-blue-50 border-t text-sm`}>
                                      <div className={`${labelSpan} font-medium text-gray-900`}>{shippingItem?.productName || 'Doprava'}</div>
                                      <div className="text-center text-blue-700 font-medium">{formatPrice(shippingTotal)}</div>
                                    </div>
                                  )}
                                  {discountTotal !== 0 && (
                                    <div className={`grid ${colGrid} gap-2 px-4 py-2 bg-yellow-50 border-t text-sm`}>
                                      <div className={`${labelSpan} font-medium text-gray-900`}>{discountItem?.productName || 'Sleva'}</div>
                                      <div className="text-center text-red-600 font-medium">{formatPrice(discountTotal)}</div>
                                    </div>
                                  )}
                                </>
                              )
                            })()}

                            {/* Řádek celkové částky */}
                            <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                              <div className={isVatPayer ? 'col-span-6' : 'col-span-3'}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                              <div className="text-center">{formatPrice(Number(order.totalAmount))}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Výdejky (vyskladněno) ── */}
                      {(() => {
                        const active = order.deliveryNotes?.filter(dn => dn.status === 'active') ?? []
                        if (active.length === 0) return null
                        return (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <h4 className="font-bold text-sm text-gray-900 px-4 py-2.5 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              Výdejky — vyskladněno ({active.length})
                            </h4>
                            <div className="text-sm">
                              <div className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b text-xs">
                                <div>Číslo</div>
                                <div>Datum</div>
                                <div className="text-center">Položek</div>
                                <div className="text-right">Hodnota</div>
                                <div className="w-4" />
                              </div>
                              {active.map(dn => {
                                // Same calculation as delivery-notes: convert base-unit qty to pack count for variants
                                const dnTotal = dn.items.reduce((sum, item) => {
                                  const hasSaved = item.price != null && item.priceWithVat != null
                                  const unitPrice = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
                                  const itemVatRate = hasSaved ? Number(item.vatRate ?? 21) : 21
                                  const vatPerUnit = hasSaved ? Number(item.vatAmount ?? 0) : (itemVatRate === 0 ? 0 : unitPrice * itemVatRate / 100)
                                  const priceWithVatPerUnit = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
                                  let packs = Number(item.quantity)
                                  if (item.productName?.includes(' — ') && item.unit !== 'ks') {
                                    const variantLabel = item.productName.split(' — ').slice(-1)[0]
                                    const match = variantLabel.match(/^([\d.]+)/)
                                    if (match) {
                                      const packSize = parseFloat(match[1])
                                      if (packSize > 0) packs = Math.round((packs / packSize) * 1000) / 1000
                                    }
                                  }
                                  return sum + packs * (isVatPayer ? priceWithVatPerUnit : unitPrice)
                                }, 0)
                                return (
                                  <Link
                                    key={dn.id}
                                    href={`/delivery-notes?highlight=${dn.id}`}
                                    className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-3 bg-white hover:bg-green-50 transition-colors items-center"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <div className="font-medium text-green-700 hover:underline">
                                      {dn.deliveryNumber}
                                    </div>
                                    <div className="text-gray-700">
                                      {new Date(dn.deliveryDate).toLocaleDateString('cs-CZ')}
                                    </div>
                                    <div className="text-gray-700 text-center">{dn.items.length}</div>
                                    <div className="font-semibold text-gray-900 text-right">
                                      {dnTotal.toLocaleString('cs-CZ')} Kč
                                    </div>
                                    <div className="flex justify-end">
                                      <ExternalLink className="w-4 h-4 text-green-600" />
                                    </div>
                                  </Link>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}

                      </div>

                      {/* ── Footer: PDF vlevo, akce vpravo ── */}
                      <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-200">
                        {/* PDF tlačítko */}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={e => { e.stopPropagation(); handlePrintInvoice(order) }}
                        >
                          <FileDown className="w-4 h-4 mr-1" />
                          Zobrazit PDF
                        </Button>

                        {/* Akční tlačítka */}
                        <div className="flex flex-wrap gap-2 justify-end">

                          {/* Vytvořit fakturu */}
                          {!order.issuedInvoice && !isCancelled && (
                            <button
                              onClick={e => { e.stopPropagation(); handleCreateInvoice(order.id) }}
                              disabled={processingInvoice === order.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              {processingInvoice === order.id ? 'Vytváří se...' : 'Vystavit fakturu'}
                            </button>
                          )}

                          {/* Expedovat */}
                          {(order.status === 'paid' || order.status === 'processing') && !order.deliveryNotes?.some(dn => dn.status === 'active') && (
                            <Link
                              href="/delivery-notes"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <Package className="w-3.5 h-3.5" />
                              Vyskladnit
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}

                          {/* Označit jako doručeno */}
                          {order.status === 'shipped' && (
                            <button
                              onClick={e => { e.stopPropagation(); handleUpdateStatus(order.id, 'delivered') }}
                              disabled={processingStatus === order.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              {processingStatus === order.id ? 'Zpracovává se...' : 'Doručeno'}
                            </button>
                          )}

                          {/* Zrušit objednávku */}
                          {['paid', 'shipped'].includes(order.status) && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                if (confirm(`Opravdu zrušit objednávku ${order.orderNumber}?`)) {
                                  handleUpdateStatus(order.id, 'cancelled')
                                }
                              }}
                              disabled={processingStatus === order.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 text-xs font-medium rounded-lg transition-colors border border-red-200 disabled:opacity-50"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Zrušit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* ── Paginace ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500">
            Stránka {currentPage} z {totalPages} ({filteredOrders.length} objednávek)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCurrentPage(p => Math.max(1, p - 1))
                sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Předchozí
            </button>

            {/* Čísla stránek */}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let page: number
              if (totalPages <= 7) {
                page = i + 1
              } else if (currentPage <= 4) {
                page = i + 1
              } else if (currentPage >= totalPages - 3) {
                page = totalPages - 6 + i
              } else {
                page = currentPage - 3 + i
              }
              return (
                <button
                  key={page}
                  onClick={() => {
                    setCurrentPage(page)
                    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                    currentPage === page
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              )
            })}

            <button
              onClick={() => {
                setCurrentPage(p => Math.min(totalPages, p + 1))
                sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Další →
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
