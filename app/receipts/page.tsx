'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Package, CheckCircle, FileDown, XCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { formatDate, formatPrice } from '@/lib/utils'
import { formatVariantQty } from '@/lib/formatVariantQty'
import { generateReceiptPDF, openPDFInNewTab } from '@/lib/pdfGenerator'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import {
  useEntityPage, EntityPage, FilterInput, FilterSelect, LoadingState, ErrorState,
  DetailSection, DetailRow, ActionToolbar, LinkedDocumentBanner,
} from '@/components/erp'
import type { ColumnDef, SelectOption } from '@/components/erp'

export const dynamic = 'force-dynamic'

interface Supplier { id: string; name: string }
interface Product  { id: string; name: string; unit: string; purchasePrice?: number; vatRate?: number }

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
  receivedQuantity?: number
  unit: string
  purchasePrice: number
  vatRate?: number
  vatAmount?: number
  priceWithVat?: number
  product?: Product
  inventoryItemId?: string
}

interface ReceivedInvoice { id: string; invoiceNumber: string }

interface Receipt {
  id: string
  receiptNumber: string
  receiptDate: string
  status: string
  stornoReason?: string
  stornoAt?: string
  note?: string
  supplier?: Supplier
  supplierName?: string
  purchaseOrder?: PurchaseOrder
  receivedInvoice?: ReceivedInvoice
  items: ReceiptItem[]
}

function getStatusBadge(status: string) {
  if (status === 'storno' || status === 'cancelled') {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">STORNO</span>
  }
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Přijato</span>
}

const statusOptions: SelectOption[] = [
  { value: 'all',      label: 'Vše' },
  { value: 'received', label: 'Přijato', className: 'text-green-600' },
  { value: 'storno',   label: 'Storno',  className: 'text-red-600'   },
]

export default function ReceiptsPage() {
  const highlightId = useSearchParams().get('highlight')
  const [isVatPayer, setIsVatPayer] = useState(true)

  // Pending orders state (separate from main receipts hook)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts]   = useState<Product[]>([])
  const [pendingOrders, setPendingOrders]           = useState<PurchaseOrder[]>([])
  const [pendingOrdersError, setPendingOrdersError] = useState<string | null>(null)
  const [isPendingSectionExpanded, setIsPendingSectionExpanded] = useState(true)
  const [expandedPendingOrders, setExpandedPendingOrders] = useState<Set<string>>(new Set())

  // Pending orders filters
  const [pendingFilterOrderNumber, setPendingFilterOrderNumber] = useState('')
  const [pendingFilterSupplier,    setPendingFilterSupplier]    = useState('')
  const [pendingFilterDate,        setPendingFilterDate]        = useState('')
  const [pendingCurrentPage,       setPendingCurrentPage]       = useState(1)
  const pendingItemsPerPage = 10

  // Process modal state
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [processingReceiptId, setProcessingReceiptId]   = useState<string | null>(null)
  const [processingOrderId,   setProcessingOrderId]     = useState<string | null>(null)
  const [processingReceiptItems, setProcessingReceiptItems] = useState<ReceiptItem[]>([])
  const [receivedQuantities, setReceivedQuantities]     = useState<Record<string, number>>({})
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    invoiceDate:   new Date().toISOString().split('T')[0],
    dueDate:       '',
    note:          ''
  })
  const [processReceiptDate, setProcessReceiptDate]     = useState(new Date().toISOString().split('T')[0])
  const [hasExistingInvoice, setHasExistingInvoice]     = useState(false)
  const [isInvoiceSectionExpanded, setIsInvoiceSectionExpanded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const ep = useEntityPage<Receipt>({
    fetchData: async () => {
      const [rRes, sRes] = await Promise.all([
        fetch('/api/receipts',  { cache: 'no-store' }),
        fetch('/api/settings',  { cache: 'no-store' }),
      ])
      const [r, s] = await Promise.all([rRes.json(), sRes.json()])
      setIsVatPayer(s.isVatPayer !== false)
      return Array.isArray(r) ? r : []
    },
    getRowId: r => r.id,
    filterFn: (r, f) => {
      if (f.number   && !r.receiptNumber.toLowerCase().includes(f.number.toLowerCase())) return false
      if (f.date)    { const d = new Date(r.receiptDate).toISOString().split('T')[0]; if (d !== f.date) return false }
      if (f.supplier){ const n = r.purchaseOrder?.supplier?.name || r.supplier?.name || r.supplierName || ''; if (!n.toLowerCase().includes(f.supplier.toLowerCase())) return false }
      if (f.minItems && (r.items?.length || 0) < parseInt(f.minItems)) return false
      if (f.minValue) {
        const total = r.items.reduce((sum, item) => {
          const qty = Number(item.receivedQuantity || item.quantity)
          return sum + qty * Number(item.purchasePrice || 0)
        }, 0)
        if (total < parseFloat(f.minValue)) return false
      }
      if (f.status && f.status !== 'all') {
        if (f.status === 'received' && (r.status === 'storno' || r.status === 'cancelled')) return false
        if (f.status === 'storno'   && r.status !== 'storno' && r.status !== 'cancelled')   return false
      }
      return true
    },
    highlightId,
  })

  async function fetchPendingOrders() {
    try {
      const [pendingRes, suppliersRes, productsRes] = await Promise.all([
        fetch('/api/purchase-orders/pending', { cache: 'no-store' }),
        fetch('/api/suppliers',  { cache: 'no-store' }),
        fetch('/api/products',   { cache: 'no-store' }),
      ])
      const [pendingData, suppliersData, productsData] = await Promise.all([
        pendingRes.json(), suppliersRes.json(), productsRes.json(),
      ])
      if (!pendingRes.ok || !Array.isArray(pendingData)) {
        setPendingOrdersError(pendingData?.error || `Chyba serveru (HTTP ${pendingRes.status})`)
        setPendingOrders([])
      } else {
        setPendingOrders(pendingData)
        setPendingOrdersError(null)
      }
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
      setProducts(Array.isArray(productsData)  ? productsData  : [])
    } catch {
      setPendingOrdersError('Nepodařilo se načíst očekávané příjemky')
    }
  }

  useEffect(() => {
    fetchPendingOrders()
    const interval = setInterval(() => {
      fetch('/api/purchase-orders/pending', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) { setPendingOrders(data); setPendingOrdersError(null) }
          else setPendingOrdersError(data?.error || 'Chyba serveru')
        })
        .catch(() => {})
    }, 30000)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') { ep.refresh(); fetchPendingOrders() }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', handleVisibility) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredPendingOrders = useMemo(() => {
    let filtered = [...pendingOrders] as any[]
    if (pendingFilterOrderNumber) filtered = filtered.filter(o => o.orderNumber.toLowerCase().includes(pendingFilterOrderNumber.toLowerCase()))
    if (pendingFilterSupplier)    filtered = filtered.filter(o => (o.supplier?.name || '').toLowerCase().includes(pendingFilterSupplier.toLowerCase()))
    if (pendingFilterDate)        filtered = filtered.filter(o => new Date(o.orderDate).toISOString().split('T')[0] === pendingFilterDate)
    return filtered
  }, [pendingOrders, pendingFilterOrderNumber, pendingFilterSupplier, pendingFilterDate])

  function togglePendingExpanded(orderId: string) {
    setExpandedPendingOrders(prev => {
      const next = new Set(prev)
      next.has(orderId) ? next.delete(orderId) : next.add(orderId)
      return next
    })
  }

  function handleCreateFromOrder(orderId: string) {
    const order: any = pendingOrders.find(o => o.id === orderId)
    if (!order) return

    setProcessingOrderId(orderId)
    setProcessingReceiptId(null)

    const itemsWithRemaining = order.items
      .filter((item: any) => item.remainingQuantity > 0)
      .map((item: any) => ({
        id:               item.id,
        productId:        item.productId,
        productName:      item.productName,
        product:          item.product,
        quantity:         item.quantity,
        receivedQuantity: item.remainingQuantity,
        unit:             item.unit,
        purchasePrice:    item.expectedPrice || 0,
        isManual:         false,
        remainingQuantity: item.remainingQuantity,
        alreadyReceived:  Number(item.alreadyReceivedQuantity),
      }))

    setProcessingReceiptItems(itemsWithRemaining)

    const initialQuantities: Record<string, number> = {}
    itemsWithRemaining.forEach((item: any) => { initialQuantities[item.id] = item.remainingQuantity })
    setReceivedQuantities(initialQuantities)

    const invoice = order.invoice
    const hasInvoice = !!(invoice && invoice.isTemporary === false)
    setHasExistingInvoice(hasInvoice)

    if (hasInvoice) {
      setInvoiceData({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate:   invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate:       invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        note:          invoice.note || '',
      })
    } else {
      setInvoiceData({ invoiceNumber: '', invoiceDate: new Date().toISOString().split('T')[0], dueDate: '', note: '' })
    }
    setShowProcessModal(true)
  }

  function handleProcessReceipt(receipt: Receipt) {
    setProcessingReceiptId(receipt.id)
    setProcessingOrderId(null)
    setProcessingReceiptItems(receipt.items || [])

    const initialQuantities: Record<string, number> = {}
    receipt.items.forEach(item => {
      if (item.id) initialQuantities[item.id] = item.receivedQuantity ?? Number(item.quantity)
    })
    setReceivedQuantities(initialQuantities)

    const invoice = (receipt as any).receivedInvoice
    const hasInvoice = !!(invoice && invoice.isTemporary === false)
    setHasExistingInvoice(hasInvoice)

    if (hasInvoice) {
      setInvoiceData({
        invoiceNumber: invoice?.invoiceNumber || '',
        invoiceDate:   invoice?.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate:       invoice?.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        note:          invoice?.note || '',
      })
    } else {
      setInvoiceData({ invoiceNumber: '', invoiceDate: new Date().toISOString().split('T')[0], dueDate: '', note: '' })
    }
    setShowProcessModal(true)
  }

  async function handleConfirmProcess(createInvoice: boolean = true) {
    const isDirectReceive = processingOrderId !== null
    if ((!processingOrderId && !processingReceiptId) || isProcessing) return
    setIsProcessing(true)
    try {
      let url: string, body: object
      if (isDirectReceive) {
        const items = processingReceiptItems.map((item: any) => ({
          productId:        item.productId!,
          receivedQuantity: receivedQuantities[item.id!] || 0,
        }))
        url  = `/api/purchase-orders/${processingOrderId}/receive`
        body = { items, invoiceData, receiptDate: processReceiptDate }
      } else {
        const items = processingReceiptItems.map(item => ({
          id:               item.id!,
          receivedQuantity: receivedQuantities[item.id!] || 0,
        }))
        url  = `/api/receipts/${processingReceiptId}/process`
        body = { items, createInvoice, invoiceData: createInvoice ? invoiceData : undefined, receiptDate: processReceiptDate }
      }

      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Chyba při zpracování') }

      setShowProcessModal(false)
      setProcessingReceiptId(null)
      setProcessingOrderId(null)
      setProcessingReceiptItems([])
      setReceivedQuantities({})
      setProcessReceiptDate(new Date().toISOString().split('T')[0])

      await Promise.all([ep.refresh(), fetchPendingOrders()])

      const msg = isDirectReceive ? '✅ Příjem zpracován a naskladněn!' : '✅ Příjemka zpracována a naskladněna!'
      setToast({ type: 'success', message: msg })
      setTimeout(() => setToast(null), 4000)
    } catch (error: any) {
      setToast({ type: 'error', message: error.message || 'Nepodařilo se zpracovat příjem' })
      setTimeout(() => setToast(null), 6000)
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleStorno(receipt: Receipt) {
    if (receipt.status === 'storno') { alert('Tato příjemka je již stornována'); return }
    if (receipt.status === 'draft')  { alert('Koncept lze přímo smazat, ne stornovat'); return }

    const reason = prompt('Zadejte důvod storna (povinné):')
    if (!reason || reason.trim().length === 0) return

    if (!confirm(`Opravdu stornovat příjemku ${receipt.receiptNumber}?\n\nDůvod: ${reason}\n\nTato akce je nevratná.`)) return

    try {
      const res = await fetch(`/api/receipts/${receipt.id}/storno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, userId: 'user' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Nepodařilo se stornovat příjemku')
      await ep.refresh()
      setToast({ type: 'success', message: 'Příjemka byla úspěšně stornována.' })
      setTimeout(() => setToast(null), 4000)
    } catch (error: any) {
      setToast({ type: 'error', message: `Chyba: ${error.message}` })
      setTimeout(() => setToast(null), 6000)
    }
  }

  async function handleDownloadPDF(receipt: Receipt) {
    try {
      const supplier = receipt.supplier as any
      const pdfData = {
        receiptNumber: receipt.receiptNumber,
        receiptDate:   receipt.receiptDate,
        supplierName:  supplier?.name || receipt.supplierName || 'Neznámý dodavatel',
        supplierAddress: supplier?.address,
        supplierICO:   supplier?.ico,
        supplierDIC:   supplier?.dic,
        items: receipt.items.map(item => ({
          productName: item.product?.name || item.productName || 'Neznámý produkt',
          quantity:    Number(item.receivedQuantity || item.quantity),
          unit:        item.unit,
          price:       Number(item.purchasePrice),
        })),
        totalAmount: receipt.items.reduce((sum, item) => sum + Number(item.receivedQuantity || item.quantity) * Number(item.purchasePrice), 0),
        note:         receipt.note,
        status:       receipt.status,
        stornoReason: receipt.stornoReason,
        stornoAt:     receipt.stornoAt,
      }
      const settingsRes = await fetch('/api/settings')
      const settings    = await settingsRes.json()
      const pdfBlob     = await generateReceiptPDF(pdfData, settings)
      openPDFInNewTab(pdfBlob)
    } catch (error: any) {
      alert(`Chyba při generování PDF: ${error.message}`)
    }
  }

  const columns: ColumnDef<Receipt>[] = [
    {
      key: 'number', header: 'Číslo',
      render: r => <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' || r.status === 'cancelled' ? 'line-through' : ''}`}>{r.receiptNumber}</p>,
    },
    {
      key: 'date', header: 'Datum',
      render: r => <p className="text-sm text-gray-700">{formatDate(r.receiptDate)}</p>,
    },
    {
      key: 'supplier', header: 'Dodavatel',
      render: r => {
        const supplierId = r.purchaseOrder?.supplier?.id || r.supplier?.id
        const supplierName = r.purchaseOrder?.supplier?.name || r.supplier?.name || r.supplierName || '-'
        return supplierId
          ? <a href={`/suppliers?highlight=${supplierId}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{supplierName}</a>
          : <p className="text-sm text-gray-700 truncate">{supplierName}</p>
      },
    },
    { key: 'items', header: 'Položek', render: r => <p className="text-sm text-gray-600">{r.items.length}</p> },
    {
      key: 'value', header: 'Hodnota',
      render: r => {
        const total = r.items.reduce((sum, item) => {
          const qty = Number(item.receivedQuantity || item.quantity)
          const unitPrice = Number(item.purchasePrice || 0)
          const itemVatRate = Number((item as any).vatRate || item.product?.vatRate || 21)
          const itemIsNonVat = isNonVatPayer(itemVatRate)
          const vatPerUnit = isVatPayer && !itemIsNonVat ? unitPrice * itemVatRate / 100 : 0
          return sum + qty * (unitPrice + vatPerUnit)
        }, 0)
        return <p className="text-sm font-bold text-gray-900">{formatPrice(total)}</p>
      },
    },
    { key: 'status', header: 'Status', render: r => getStatusBadge(r.status) },
  ]

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Příjemky"
        icon={Package}
        color="amber"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      {/* Očekávané příjemky */}
      {(pendingOrders.length > 0 || pendingOrdersError) && (
        <Card className={`border-2 ${pendingOrdersError ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'}`}>
          <CardHeader
            className={`cursor-pointer transition-colors ${pendingOrdersError ? 'hover:bg-red-100' : 'hover:bg-orange-100'}`}
            onClick={() => setIsPendingSectionExpanded(!isPendingSectionExpanded)}
          >
            <div className="flex items-center gap-2">
              {isPendingSectionExpanded
                ? <ChevronDown className={`h-6 w-6 ${pendingOrdersError ? 'text-red-600' : 'text-orange-600'}`} />
                : <ChevronRight className={`h-6 w-6 ${pendingOrdersError ? 'text-red-600' : 'text-orange-600'}`} />
              }
              <CardTitle className={pendingOrdersError ? 'text-red-900' : 'text-orange-900'}>
                {pendingOrdersError
                  ? `⚠️ Chyba načítání očekávaných příjemek`
                  : `📦 Očekávané příjemky (čeká na příjem) — ${filteredPendingOrders.length} objednávek`
                }
              </CardTitle>
            </div>
            {pendingOrdersError && <p className="text-red-700 text-sm mt-1 ml-8">{pendingOrdersError}</p>}
          </CardHeader>

          {isPendingSectionExpanded && (
            <CardContent>
              {/* Filtry pro očekávané příjemky */}
              <div className="mb-4">
                <div className="grid grid-cols-[auto_auto_1fr_1fr_1fr_auto] items-center gap-4 px-4 py-3 bg-white border border-orange-300 rounded-lg">
                  <button onClick={() => { setPendingFilterOrderNumber(''); setPendingFilterSupplier(''); setPendingFilterDate('') }} className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded flex items-center justify-center" title="Vymazat filtry">✕</button>
                  <div className="w-8"></div>
                  <input type="text" value={pendingFilterOrderNumber} onChange={e => setPendingFilterOrderNumber(e.target.value)} placeholder="Číslo obj..." className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-orange-500" />
                  <input type="text" value={pendingFilterSupplier}    onChange={e => setPendingFilterSupplier(e.target.value)}    placeholder="Dodavatel..."  className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-orange-500" />
                  <input type="date" value={pendingFilterDate}         onChange={e => setPendingFilterDate(e.target.value)}         className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-orange-500" />
                  <div className="w-32"></div>
                </div>
              </div>

              {/* Hlavička */}
              <div className="grid grid-cols-[auto_auto_1fr_1fr_1fr_auto] items-center gap-4 px-4 py-3 bg-orange-100 border border-orange-300 rounded-lg text-xs font-semibold text-orange-900 mb-2">
                <div className="w-8"></div>
                <div className="w-8"></div>
                <div className="text-center">Číslo obj.</div>
                <div className="text-center">Dodavatel</div>
                <div className="text-center">Datum objednávky</div>
                <div className="w-32"></div>
              </div>

              <div className="space-y-2">
                {filteredPendingOrders.slice((pendingCurrentPage - 1) * pendingItemsPerPage, pendingCurrentPage * pendingItemsPerPage).map((order: any) => {
                  const isExpanded = expandedPendingOrders.has(order.id)
                  return (
                    <div key={order.id} className="border-2 border-orange-300 rounded-lg bg-white">
                      <div className="p-4 grid grid-cols-[auto_auto_1fr_1fr_1fr_auto] items-center gap-4 hover:bg-orange-50 transition-colors">
                        <div className="w-8"></div>
                        <button onClick={() => togglePendingExpanded(order.id)} className="w-8">
                          {isExpanded ? <ChevronDown className="h-5 w-5 text-orange-600" /> : <ChevronRight className="h-5 w-5 text-orange-600" />}
                        </button>
                        <div className="cursor-pointer text-center" onClick={() => togglePendingExpanded(order.id)}>
                          <p className="text-sm font-semibold text-gray-900 truncate">{order.orderNumber}</p>
                        </div>
                        <div className="cursor-pointer text-center" onClick={() => togglePendingExpanded(order.id)}>
                          {order.supplier?.id
                            ? <Link href={`/suppliers?highlight=${order.supplier.id}`} className="text-sm text-blue-600 hover:underline truncate block mx-auto" onClick={e => e.stopPropagation()}>{order.supplier.name}</Link>
                            : <p className="text-sm text-gray-700 truncate">{order.supplierName || '-'}</p>
                          }
                        </div>
                        <div className="cursor-pointer text-center" onClick={() => togglePendingExpanded(order.id)}>
                          <p className="text-sm text-gray-700">{formatDate(order.orderDate)}</p>
                        </div>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => handleCreateFromOrder(order.id)}>
                          <Package className="w-4 h-4 mr-1" />
                          Naskladnit
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="border-t-2 border-orange-300 p-4 bg-gray-50">
                          <div className="border rounded-lg overflow-hidden">
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

                            {order.items.map((item: any, i: number) => {
                              const received  = Number(item.alreadyReceivedQuantity || 0)
                              const ordered   = Number(item.quantity)
                              const remaining = Number(item.remainingQuantity || 0)
                              const unitPrice = Number(item.expectedPrice || 0)
                              const itemVatRate = Number(item.vatRate || item.product?.vatRate || DEFAULT_VAT_RATE)
                              const isItemNonVat = isNonVatPayer(itemVatRate)
                              const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                              const priceWithVat = unitPrice + vatPerUnit
                              const total = ordered * (isVatPayer ? priceWithVat : unitPrice)

                              const receivedColor  = received === 0 ? 'text-gray-400' : received >= ordered ? 'text-green-600' : 'text-orange-500'
                              const remainingColor = remaining === 0 ? 'text-green-600' : remaining === ordered ? 'text-red-600' : 'text-orange-600'

                              return isVatPayer ? (
                                <div key={item.id} className={`grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.5fr_0.8fr_0.5fr_0.8fr_1fr] gap-2 px-3 py-1.5 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                  <div className="text-[13px] text-gray-900">{item.product?.name || item.productName || 'Neznámý produkt'}</div>
                                  <div className="text-[13px] text-gray-700 text-center">{ordered.toLocaleString('cs-CZ')} {item.unit}</div>
                                  <div className={`text-[13px] font-semibold text-center ${receivedColor}`}>{received.toLocaleString('cs-CZ')} {item.unit}</div>
                                  <div className={`text-[13px] font-semibold text-center ${remainingColor}`}>{remaining.toLocaleString('cs-CZ')} {item.unit}</div>
                                  <div className="text-[13px] text-gray-500 text-center">{isItemNonVat ? '-' : `${itemVatRate}%`}</div>
                                  <div className="text-[13px] text-gray-700 text-center">{formatPrice(unitPrice)}</div>
                                  <div className="text-[13px] text-gray-500 text-center">{isItemNonVat ? '-' : formatPrice(vatPerUnit)}</div>
                                  <div className="text-[13px] text-gray-700 text-center">{formatPrice(priceWithVat)}</div>
                                  <div className="text-[13px] font-semibold text-gray-900 text-center">{formatPrice(total)}</div>
                                </div>
                              ) : (
                                <div key={item.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-3 py-1.5 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                  <div className="text-[13px] text-gray-900">{item.product?.name || item.productName || 'Neznámý produkt'}</div>
                                  <div className="text-[13px] text-gray-700 text-right">{ordered.toLocaleString('cs-CZ')} {item.unit}</div>
                                  <div className={`text-[13px] font-semibold text-right ${receivedColor}`}>{received.toLocaleString('cs-CZ')} {item.unit}</div>
                                  <div className={`text-[13px] font-semibold text-right ${remainingColor}`}>{remaining.toLocaleString('cs-CZ')} {item.unit}</div>
                                  <div className="text-[13px] text-gray-700 text-right">{formatPrice(unitPrice)}</div>
                                  <div className="text-[13px] font-semibold text-gray-900 text-right">{formatPrice(total)}</div>
                                </div>
                              )
                            })}

                            <div className={`grid ${isVatPayer ? 'grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.5fr_0.8fr_0.5fr_0.8fr_1fr]' : 'grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'} gap-2 px-3 py-1.5 bg-gray-100 border-t-2 font-bold`}>
                              <div className={`${isVatPayer ? 'col-span-8' : 'col-span-5'} text-[13px]`}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka objednávky'}</div>
                              <div className={`text-[13px] ${isVatPayer ? 'text-center' : 'text-right'}`}>
                                {formatPrice(order.items.reduce((sum: number, item: any) => {
                                  const unitPrice = Number(item.expectedPrice || 0)
                                  const itemVatRate = Number(item.vatRate || item.product?.vatRate || DEFAULT_VAT_RATE)
                                  const isItemNonVat = isNonVatPayer(itemVatRate)
                                  const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                                  const priceWithVat = unitPrice + vatPerUnit
                                  return sum + Number(item.quantity) * (isVatPayer ? priceWithVat : unitPrice)
                                }, 0))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pending pagination */}
              {filteredPendingOrders.length > pendingItemsPerPage && (() => {
                const totalPages = Math.ceil(filteredPendingOrders.length / pendingItemsPerPage)
                return (
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button onClick={() => setPendingCurrentPage(p => Math.max(1, p - 1))} disabled={pendingCurrentPage === 1} className="px-3 py-1.5 bg-orange-100 text-orange-900 rounded hover:bg-orange-200 disabled:opacity-50 text-sm font-medium">Předchozí</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setPendingCurrentPage(p)} className={`px-3 py-1.5 rounded text-sm font-medium ${pendingCurrentPage === p ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-900 hover:bg-orange-200'}`}>{p}</button>
                    ))}
                    <button onClick={() => setPendingCurrentPage(p => Math.min(totalPages, p + 1))} disabled={pendingCurrentPage >= totalPages} className="px-3 py-1.5 bg-orange-100 text-orange-900 rounded hover:bg-orange-200 disabled:opacity-50 text-sm font-medium">Další</button>
                  </div>
                )
              })()}
            </CardContent>
          )}
        </Card>
      )}

      <EntityPage.Filters onClear={ep.clearFilters} columns="auto 1fr 1fr 1fr 1fr 1fr 1fr">
        <FilterInput  value={ep.filters.number   ?? ''} onChange={v => ep.setFilter('number',   v)} placeholder="Číslo..." />
        <FilterInput  value={ep.filters.date     ?? ''} onChange={v => ep.setFilter('date',     v)} type="date" />
        <FilterInput  value={ep.filters.supplier ?? ''} onChange={v => ep.setFilter('supplier', v)} placeholder="Dodavatel..." />
        <FilterInput  value={ep.filters.minItems ?? ''} onChange={v => ep.setFilter('minItems', v)} type="number" placeholder="≥" />
        <FilterInput  value={ep.filters.minValue ?? ''} onChange={v => ep.setFilter('minValue', v)} type="number" placeholder="≥" />
        <FilterSelect value={ep.filters.status   ?? 'all'} onChange={v => ep.setFilter('status', v)} options={statusOptions} />
      </EntityPage.Filters>

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        rowClassName={r => r.status === 'storno' || r.status === 'cancelled' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={receipt => (
          <>
            <LinkedDocumentBanner
              links={[
                ...(receipt.purchaseOrder ? [{ label: 'Objednávka', value: receipt.purchaseOrder.orderNumber, href: `/purchase-orders?highlight=${receipt.purchaseOrder.id}` }] : []),
                ...(receipt.receivedInvoice ? [{ label: 'Faktura', value: receipt.receivedInvoice.invoiceNumber, href: `/invoices/received?highlight=${receipt.receivedInvoice.id}` }] : []),
              ]}
              color="blue"
            />

            {/* Položky příjemky */}
            {receipt.items.length === 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b">Položky příjemky (0)</h4>
                <div className="px-4 py-4 text-sm text-gray-500 italic">Žádné položky</div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b">Položky příjemky ({receipt.items.length})</h4>
                {isVatPayer ? (
                  <div className="text-sm">
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
                    {receipt.items.map((item: any, i: number) => {
                      const actualQty = item.receivedQuantity || item.quantity
                      const unitPrice = Number(item.purchasePrice) || 0
                      const itemVatRate = Number(item.vatRate || item.product?.vatRate || 21)
                      const isItemNonVat = isNonVatPayer(itemVatRate)
                      const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                      const priceWithVat = unitPrice + vatPerUnit
                      const lineTotal = actualQty * priceWithVat
                      return (
                        <div key={i} className={`grid grid-cols-[3fr_1fr_1fr_0.5fr_1fr_0.5fr_1fr_1fr] gap-2 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-xs`}>
                          <div className="font-medium text-gray-900">{item.product?.name || item.productName || '(Neznámé)'}</div>
                          <div className="text-center">
                            {item.productId && item.inventoryItemId
                              ? <Link href={`/inventory?selectedProduct=${item.productId}&highlightMovement=${item.inventoryItemId}`} className="inline-flex items-center px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium" onClick={e => e.stopPropagation()}>Zobrazit</Link>
                              : <span className="text-gray-400">-</span>
                            }
                          </div>
                          <div className="text-center text-gray-600">
                            {formatVariantQty(Number(actualQty), item.product?.name || item.productName, item.unit)}
                            {item.receivedQuantity && item.receivedQuantity !== item.quantity && (
                              <span className="text-orange-600 text-xs block mt-1">(z {formatVariantQty(Number(item.quantity), item.product?.name || item.productName, item.unit)})</span>
                            )}
                          </div>
                          <div className="text-center text-gray-500">{isItemNonVat ? '-' : `${itemVatRate}%`}</div>
                          <div className="text-center text-gray-600">{formatPrice(unitPrice)}</div>
                          <div className="text-center text-gray-500">{isItemNonVat ? '-' : formatPrice(vatPerUnit)}</div>
                          <div className="text-center text-gray-700">{formatPrice(priceWithVat)}</div>
                          <div className="text-center font-semibold text-gray-900">{formatPrice(lineTotal)}</div>
                        </div>
                      )
                    })}
                    <div className="grid grid-cols-[3fr_1fr_1fr_0.5fr_1fr_0.5fr_1fr_1fr] gap-2 px-4 py-2 bg-gray-100 border-t font-bold text-sm">
                      <div className="col-span-7">Celková částka s DPH</div>
                      <div className="text-center">{formatPrice(receipt.items.reduce((sum, item) => {
                        const qty = item.receivedQuantity || item.quantity
                        const up = Number(item.purchasePrice) || 0
                        const vr = Number((item as any).vatRate || item.product?.vatRate || 21)
                        const inv = isNonVatPayer(vr)
                        return sum + qty * (up + (inv ? 0 : up * vr / 100))
                      }, 0))}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 bg-gray-50 font-semibold text-gray-700 border-b">
                      <div>Produkt</div>
                      <div className="text-center">Skladový pohyb</div>
                      <div className="text-right">Množství</div>
                      <div className="text-right">Nákupní cena</div>
                      <div className="text-right">Celkem</div>
                    </div>
                    {receipt.items.map((item: any, i: number) => {
                      const actualQty = item.receivedQuantity || item.quantity
                      const lineTotal = actualQty * item.purchasePrice
                      return (
                        <div key={i} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="font-medium text-gray-900">{item.product?.name || item.productName || '(Neznámé)'}</div>
                          <div className="text-center">
                            {item.productId && item.inventoryItemId
                              ? <Link href={`/inventory?selectedProduct=${item.productId}&highlightMovement=${item.inventoryItemId}`} className="inline-flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium" onClick={e => e.stopPropagation()}>Zobrazit</Link>
                              : <span className="text-gray-400 text-xs">-</span>
                            }
                          </div>
                          <div className="text-right text-gray-600">
                            {formatVariantQty(Number(actualQty), item.product?.name || item.productName, item.unit)}
                            {item.receivedQuantity && item.receivedQuantity !== item.quantity && (
                              <span className="text-orange-600 text-xs block mt-1">(z {formatVariantQty(Number(item.quantity), item.product?.name || item.productName, item.unit)} obj.)</span>
                            )}
                          </div>
                          <div className="text-right text-gray-600">{Number(item.purchasePrice).toLocaleString('cs-CZ')} Kč</div>
                          <div className="text-right font-semibold text-gray-900">{Number(lineTotal).toLocaleString('cs-CZ')} Kč</div>
                        </div>
                      )
                    })}
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 bg-gray-100 border-t-2 font-bold">
                      <div className="col-span-4">Celková částka</div>
                      <div className="text-right">{receipt.items.reduce((sum, item) => sum + (item.receivedQuantity || item.quantity) * item.purchasePrice, 0).toLocaleString('cs-CZ')} Kč</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {receipt.note && (
              <p className="text-sm text-gray-700"><span className="font-semibold text-gray-900">Poznámka:</span> {receipt.note}</p>
            )}

            {(receipt.status === 'storno' || receipt.status === 'cancelled') && receipt.stornoReason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm font-medium text-red-900">Stornováno</p>
                <p className="text-sm text-red-700 mt-1">Důvod: {receipt.stornoReason}</p>
                {receipt.stornoAt && <p className="text-xs text-red-600 mt-1">Datum storna: {formatDate(receipt.stornoAt)}</p>}
              </div>
            )}

            <ActionToolbar
              right={
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleDownloadPDF(receipt)}>
                    <FileDown className="w-4 h-4 mr-1" />
                    Zobrazit PDF
                  </Button>
                  {receipt.status === 'active' && (
                    <Button size="sm" variant="danger" onClick={() => handleStorno(receipt)}>
                      <XCircle className="w-4 h-4 mr-1" />
                      Stornovat
                    </Button>
                  )}
                  {receipt.status !== 'storno' && receipt.status !== 'cancelled' && (
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => handleProcessReceipt(receipt)}>
                      <Package className="w-4 h-4 mr-1" />
                      Zpracovat
                    </Button>
                  )}
                </div>
              }
            />
          </>
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />

      {/* Process modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-5 rounded-t-xl">
              <div className="flex items-center gap-3">
                <Package className="w-7 h-7" />
                <div>
                  <h2 className="text-2xl font-bold">{processingOrderId ? 'Přímé naskladnění z objednávky' : 'Zpracovat příjemku'}</h2>
                  <p className="text-orange-100 text-sm mt-1">Nastav množství k naskladnění a vyplň údaje o faktuře</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Položky k naskladnění */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-l-4 border-purple-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  Položky k naskladnění
                </h3>
                <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-purple-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-purple-100 to-purple-50">
                      <tr>
                        <th className="text-left px-3 py-3 font-semibold text-gray-700">Produkt</th>
                        <th className="text-right px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">Objednáno</th>
                        {processingOrderId && <th className="text-right px-3 py-3 font-semibold text-gray-600 whitespace-nowrap">Přijato</th>}
                        <th className="text-right px-3 py-3 font-semibold text-green-700 bg-green-50 whitespace-nowrap">Nyní přijmout</th>
                        <th className="text-right px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">{isVatPayer ? 'Bez DPH/ks' : 'Cena/ks'}</th>
                        {isVatPayer && <th className="text-right px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">S DPH/ks</th>}
                        <th className="text-right px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">Celkem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processingReceiptItems.map((item: any, idx: number) => {
                        const received     = receivedQuantities[item.id!] || 0
                        const unitPrice    = Number(item.purchasePrice || 0)
                        const itemVatRate  = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
                        const itemIsNonVat = isNonVatPayer(itemVatRate)
                        const vatPerUnit   = (isVatPayer && !itemIsNonVat) ? unitPrice * itemVatRate / 100 : 0
                        const priceWithVat = unitPrice + vatPerUnit
                        const total        = received * (isVatPayer ? priceWithVat : unitPrice)
                        const maxAllowed   = item.remainingQuantity || Number(item.quantity)
                        const alreadyReceived = item.alreadyReceived || 0
                        return (
                          <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'} hover:bg-purple-100/40 transition-colors`}>
                            <td className="px-3 py-3 font-medium text-gray-800">{item.product?.name || item.productName || 'Neznámý produkt'}</td>
                            <td className="text-right px-3 py-3 text-gray-600 whitespace-nowrap">{Number(item.quantity)} {item.unit}</td>
                            {processingOrderId && <td className="text-right px-3 py-3 text-gray-500 whitespace-nowrap">{alreadyReceived} {item.unit}</td>}
                            <td className="text-right px-3 py-3 bg-green-50">
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  value={received || ''}
                                  onChange={e => {
                                    const v = e.target.value
                                    if (v === '') { setReceivedQuantities({ ...receivedQuantities, [item.id!]: '' as any }); return }
                                    const n = Number(v)
                                    if (n > maxAllowed || n < 0) { setReceivedQuantities({ ...receivedQuantities, [item.id!]: '' as any }); return }
                                    setReceivedQuantities({ ...receivedQuantities, [item.id!]: n })
                                  }}
                                  min="0" max={maxAllowed} step="1"
                                  className="w-16 px-2 py-2 border-2 border-green-300 rounded-lg text-right font-medium focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                                />
                                <span className="text-gray-600 font-medium w-6 text-left text-xs">{item.unit}</span>
                              </div>
                              {processingOrderId && maxAllowed < Number(item.quantity) && (
                                <p className="text-xs text-orange-600 mt-1 font-medium text-right">Max: {maxAllowed}</p>
                              )}
                            </td>
                            <td className="text-right px-3 py-3 text-gray-700 whitespace-nowrap">{formatPrice(unitPrice)}</td>
                            {isVatPayer && (
                              <td className="text-right px-3 py-3 whitespace-nowrap">
                                {itemIsNonVat
                                  ? <span className="text-gray-500">—</span>
                                  : <div><div className="font-medium text-blue-700">{formatPrice(priceWithVat)}</div><div className="text-xs text-gray-400">+{itemVatRate}% ({formatPrice(vatPerUnit)})</div></div>
                                }
                              </td>
                            )}
                            <td className="text-right px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatPrice(total)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50 font-bold border-t-2 border-purple-300">
                      <tr>
                        <td colSpan={processingOrderId ? (isVatPayer ? 5 : 4) : (isVatPayer ? 4 : 3)} className="px-3 py-3 text-left text-gray-800">CELKEM:</td>
                        <td colSpan={2} className="text-right px-3 py-3 text-lg text-purple-700 whitespace-nowrap">
                          {formatPrice(processingReceiptItems.reduce((sum, item: any) => {
                            const r = receivedQuantities[item.id!] || 0
                            const up = Number(item.purchasePrice || 0)
                            const vr = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
                            const inv = isNonVatPayer(vr)
                            const vpu = (isVatPayer && !inv) ? up * vr / 100 : 0
                            return sum + r * (isVatPayer ? up + vpu : up)
                          }, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Datum příjmu */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border-l-4 border-blue-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Datum příjmu
                </h3>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Kdy zboží fyzicky dorazilo? <span className="text-red-500">*</span></label>
                  <Input type="date" value={processReceiptDate} onChange={e => setProcessReceiptDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400" />
                  {(() => {
                    const sel = new Date(processReceiptDate)
                    const today = new Date()
                    const diff = Math.floor((today.getTime() - sel.getTime()) / (1000 * 60 * 60 * 24))
                    if (sel > today) return <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Datum nesmí být v budoucnosti</p>
                    if (diff > 30) return <p className="text-xs text-orange-600 mt-2 font-medium">⚠️ Datum je starší než 30 dní</p>
                    return null
                  })()}
                </div>
              </div>

              {/* Faktura */}
              {!hasExistingInvoice && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-l-4 border-green-500 shadow-sm">
                  <div className="px-5 py-4 cursor-pointer hover:bg-green-100/50 transition-colors rounded-t-lg" onClick={() => setIsInvoiceSectionExpanded(!isInvoiceSectionExpanded)}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Faktura od dodavatele
                        <span className="text-sm font-normal text-gray-600 ml-2">(volitelné - klikni pro rozbalení)</span>
                      </h3>
                      {isInvoiceSectionExpanded ? <ChevronDown className="h-6 w-6 text-green-600" /> : <ChevronRight className="h-6 w-6 text-green-600" />}
                    </div>
                  </div>
                  {isInvoiceSectionExpanded && (
                    <div className="px-5 pb-5 space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Číslo faktury <span className="text-orange-600 text-xs">(můžeš nechat prázdné - doplníš později)</span></label>
                        <Input value={invoiceData.invoiceNumber} onChange={e => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })} placeholder="např. FA-2025-001" className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400" />
                        <p className="text-xs text-gray-600 mt-2">💡 Pokud nemáš číslo faktury, nech prázdné. Vytvoří se dočasná faktura.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Datum faktury</label>
                          <Input type="date" value={invoiceData.invoiceDate} onChange={e => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })} className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Splatnost <span className="text-gray-500 text-xs">(volitelné)</span></label>
                          <Input type="date" value={invoiceData.dueDate} onChange={e => setInvoiceData({ ...invoiceData, dueDate: e.target.value })} className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400" />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Poznámka <span className="text-gray-500 text-xs">(volitelné)</span></label>
                        <textarea value={invoiceData.note} onChange={e => setInvoiceData({ ...invoiceData, note: e.target.value })} className="w-full border-2 border-green-200 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all bg-white" rows={3} placeholder="Volitelná poznámka k faktuře..." />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tlačítka */}
              <div className="flex gap-3 justify-end pt-4 border-t-2 border-gray-200">
                <Button
                  variant="ghost"
                  onClick={() => { setShowProcessModal(false); setProcessingReceiptId(null); setProcessingOrderId(null); setProcessingReceiptItems([]); setReceivedQuantities({}); setProcessReceiptDate(new Date().toISOString().split('T')[0]) }}
                  className="px-6 py-2 hover:bg-gray-100 transition-colors"
                >
                  Zrušit
                </Button>
                <Button
                  onClick={() => handleConfirmProcess(true)}
                  disabled={isProcessing}
                  className="px-8 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {isProcessing ? '⏳ Zpracovávám...' : 'Zpracovat a naskladnit'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium max-w-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}
    </EntityPage>
  )
}
