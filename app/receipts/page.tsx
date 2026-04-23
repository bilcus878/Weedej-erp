'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Package, CheckCircle, FileDown, XCircle, ChevronDown, ChevronRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { formatDate, formatPrice } from '@/lib/utils'
import { generateReceiptPDF, openPDFInNewTab } from '@/lib/pdfGenerator'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import {
  useEntityPage, useFilters, EntityPage, LoadingState, ErrorState,
  ActionToolbar, LinkedDocumentBanner, SupplierOrderDetail,
} from '@/components/erp'
import type {
  ColumnDef, SelectOption,
  SupplierOrderDetailData, SupplierOrderDetailItem,
} from '@/components/erp'
import { ExpectedOrdersButton } from '@/components/warehouse/expected/ExpectedOrdersButton'
import { useToast } from '@/components/warehouse/shared/useToast'
import { Toast } from '@/components/warehouse/shared/Toast'

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

function mapReceiptToSupplierOrderDetail(
  receipt: Receipt,
  isVatPayer: boolean,
): SupplierOrderDetailData {
  const supplier = (receipt.purchaseOrder as any)?.supplier || receipt.supplier

  const items: SupplierOrderDetailItem[] = receipt.items.map((item, idx) => {
    const unitPrice    = Number(item.purchasePrice) || 0
    const itemVatRate  = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
    const isItemNonVat = isNonVatPayer(itemVatRate)
    const vatPerUnit   = item.vatAmount != null ? Number(item.vatAmount) : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
    const priceWithVat = item.priceWithVat != null ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
    return {
      id: item.id || String(idx),
      productId: item.productId ?? null,
      productName: item.productName ?? null,
      quantity: Number(item.quantity),
      alreadyReceivedQuantity: Number(item.receivedQuantity ?? item.quantity),
      unit: item.unit,
      price: unitPrice,
      vatRate: itemVatRate,
      vatAmount: vatPerUnit,
      priceWithVat,
      product: item.product
        ? { id: item.product.id, name: item.product.name, price: Number(item.product.purchasePrice || 0), unit: item.product.unit }
        : null,
    }
  })

  const isStorno = receipt.status === 'storno' || receipt.status === 'cancelled'

  const totalAmount = items.reduce((sum, item) => {
    const qty = Number(item.alreadyReceivedQuantity ?? item.quantity)
    return sum + qty * (isVatPayer ? item.priceWithVat : item.price)
  }, 0)

  return {
    id: receipt.id,
    orderNumber: receipt.receiptNumber,
    orderDate: receipt.receiptDate,
    status: isStorno ? 'storno' : 'received',
    totalAmount,
    supplierName: supplier?.name || receipt.supplierName || null,
    supplierEmail: (supplier as any)?.email || null,
    supplierPhone: (supplier as any)?.phone || null,
    supplierAddress: (supplier as any)?.address || null,
    supplierICO: (supplier as any)?.ico || null,
    supplierDIC: (supplier as any)?.dic || null,
    stornoAt: receipt.stornoAt || null,
    stornoBy: null,
    stornoReason: receipt.stornoReason || null,
    note: receipt.note || null,
    items,
    receivedInvoice: receipt.receivedInvoice
      ? {
          id: receipt.receivedInvoice.id,
          invoiceNumber: receipt.receivedInvoice.invoiceNumber,
          paymentStatus: 'unknown',
          status: 'active',
          invoiceDate: receipt.receiptDate,
        }
      : null,
    receipts: [{
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      receiptDate: receipt.receiptDate,
      status: isStorno ? 'storno' : 'active',
      items: receipt.items.map(item => ({
        id: item.id || '',
        quantity: Number(item.quantity),
        receivedQuantity: Number(item.receivedQuantity ?? item.quantity),
        unit: item.unit,
        productName: item.productName || item.product?.name || null,
        purchasePrice: Number(item.purchasePrice),
        productId: item.productId || null,
        inventoryItemId: item.inventoryItemId || null,
        product: item.product ? { name: item.product.name } : null,
      })),
    }],
  }
}

export default function ReceiptsPage() {
  const highlightId = useSearchParams().get('highlight')
  const [isVatPayer, setIsVatPayer] = useState(true)

  // ── Pending orders data ───────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [pendingOrders, setPendingOrders]           = useState<PurchaseOrder[]>([])
  const [pendingOrdersError, setPendingOrdersError] = useState<string | null>(null)
  // ── Process modal state ───────────────────────────────────────────────────
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
  const [processReceiptDate, setProcessReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [hasExistingInvoice, setHasExistingInvoice] = useState(false)
  const [isInvoiceSectionExpanded, setIsInvoiceSectionExpanded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const { toast, showToast } = useToast()
  const resetPage = useRef<() => void>(() => {})

  // ── Main list filters ─────────────────────────────────────────────────────
  const filters = useFilters<Receipt>([
    { key: 'number',   type: 'text',   placeholder: 'Číslo...',    match: (r, v) => r.receiptNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',     type: 'date',                                 match: (r, v) => new Date(r.receiptDate).toISOString().split('T')[0] === v },
    { key: 'supplier', type: 'text',   placeholder: 'Dodavatel...', match: (r, v) => (r.purchaseOrder?.supplier?.name || r.supplier?.name || r.supplierName || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'minItems', type: 'number', placeholder: '≥',            match: (r, v) => (r.items?.length || 0) >= v },
    { key: 'minValue', type: 'number', placeholder: '≥',            match: (r, v) => r.items.reduce((s, i) => s + Number(i.receivedQuantity || i.quantity) * Number(i.purchasePrice || 0), 0) >= v },
    { key: 'status',   type: 'select', options: statusOptions,       match: (r, v) => { if (v === 'all') return true; if (v === 'received') return r.status !== 'storno' && r.status !== 'cancelled'; if (v === 'storno') return r.status === 'storno' || r.status === 'cancelled'; return r.status === v } },
  ], () => resetPage.current())

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
    filterFn: filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  // ── Fetch pending purchase orders ─────────────────────────────────────────
  async function fetchPendingOrders() {
    try {
      const [pendingRes, suppliersRes] = await Promise.all([
        fetch('/api/purchase-orders/pending', { cache: 'no-store' }),
        fetch('/api/suppliers',               { cache: 'no-store' }),
      ])
      const [pendingData, suppliersData] = await Promise.all([
        pendingRes.json(), suppliersRes.json(),
      ])
      if (!pendingRes.ok || !Array.isArray(pendingData)) {
        setPendingOrdersError(pendingData?.error || `Chyba serveru (HTTP ${pendingRes.status})`)
        setPendingOrders([])
      } else {
        setPendingOrders(pendingData)
        setPendingOrdersError(null)
      }
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
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

  // ── Open process modal from pending order ─────────────────────────────────
  function handleCreateFromOrder(orderId: string) {
    const order: any = pendingOrders.find(o => o.id === orderId)
    if (!order) return
    setProcessingOrderId(orderId)
    setProcessingReceiptId(null)
    const itemsWithRemaining = order.items
      .filter((item: any) => item.remainingQuantity > 0)
      .map((item: any) => ({
        id: item.id, productId: item.productId, productName: item.productName,
        product: item.product, quantity: item.quantity,
        receivedQuantity: item.remainingQuantity, unit: item.unit,
        purchasePrice: item.expectedPrice || 0, isManual: false,
        remainingQuantity: item.remainingQuantity,
        alreadyReceived: Number(item.alreadyReceivedQuantity),
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
    receipt.items.forEach(item => { if (item.id) initialQuantities[item.id] = item.receivedQuantity ?? Number(item.quantity) })
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
          productId: item.productId!, receivedQuantity: receivedQuantities[item.id!] || 0,
        }))
        url = `/api/purchase-orders/${processingOrderId}/receive`
        body = { items, invoiceData, receiptDate: processReceiptDate }
      } else {
        const items = processingReceiptItems.map(item => ({
          id: item.id!, receivedQuantity: receivedQuantities[item.id!] || 0,
        }))
        url = `/api/receipts/${processingReceiptId}/process`
        body = { items, createInvoice, invoiceData: createInvoice ? invoiceData : undefined, receiptDate: processReceiptDate }
      }
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Chyba při zpracování') }
      closeProcessModal()
      await Promise.all([ep.refresh(), fetchPendingOrders()])
      showToast('success', isDirectReceive ? '✅ Příjem zpracován a naskladněn!' : '✅ Příjemka zpracována a naskladněna!')
    } catch (error: any) {
      showToast('error', error.message || 'Nepodařilo se zpracovat příjem')
    } finally {
      setIsProcessing(false)
    }
  }

  function closeProcessModal() {
    setShowProcessModal(false)
    setProcessingReceiptId(null)
    setProcessingOrderId(null)
    setProcessingReceiptItems([])
    setReceivedQuantities({})
    setProcessReceiptDate(new Date().toISOString().split('T')[0])
  }

  async function handleStorno(receipt: Receipt) {
    if (receipt.status === 'storno') { alert('Tato příjemka je již stornována'); return }
    if (receipt.status === 'draft')  { alert('Koncept lze přímo smazat, ne stornovat'); return }
    const reason = prompt('Zadejte důvod storna (povinné):')
    if (!reason || reason.trim().length === 0) return
    if (!confirm(`Opravdu stornovat příjemku ${receipt.receiptNumber}?\n\nDůvod: ${reason}\n\nTato akce je nevratná.`)) return
    try {
      const res = await fetch(`/api/receipts/${receipt.id}/storno`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, userId: 'user' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Nepodařilo se stornovat příjemku')
      await ep.refresh()
      showToast('success', 'Příjemka byla úspěšně stornována.')
    } catch (error: any) {
      showToast('error', `Chyba: ${error.message}`)
    }
  }

  async function handleDownloadPDF(receipt: Receipt) {
    try {
      const supplier = receipt.supplier as any
      const pdfData = {
        receiptNumber: receipt.receiptNumber, receiptDate: receipt.receiptDate,
        supplierName:  supplier?.name || receipt.supplierName || 'Neznámý dodavatel',
        supplierAddress: supplier?.address, supplierICO: supplier?.ico, supplierDIC: supplier?.dic,
        items: receipt.items.map(item => ({
          productName: item.product?.name || item.productName || 'Neznámý produkt',
          quantity:    Number(item.receivedQuantity || item.quantity),
          unit:        item.unit, price: Number(item.purchasePrice),
        })),
        totalAmount: receipt.items.reduce((sum, item) => sum + Number(item.receivedQuantity || item.quantity) * Number(item.purchasePrice), 0),
        note: receipt.note, status: receipt.status,
        stornoReason: receipt.stornoReason, stornoAt: receipt.stornoAt,
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
    { key: 'date', header: 'Datum', render: r => <p className="text-sm text-gray-700">{formatDate(r.receiptDate)}</p> },
    {
      key: 'supplier', header: 'Dodavatel',
      render: r => {
        const supplierId   = r.purchaseOrder?.supplier?.id || r.supplier?.id
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
          const qty        = Number(item.receivedQuantity || item.quantity)
          const unitPrice  = Number(item.purchasePrice || 0)
          const itemVatRate = Number((item as any).vatRate || item.product?.vatRate || 21)
          const vatPerUnit = isVatPayer && !isNonVatPayer(itemVatRate) ? unitPrice * itemVatRate / 100 : 0
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

      {filters.bar('auto 1fr 1fr 1fr 1fr 1fr 1fr')}

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        firstHeader={
          <ExpectedOrdersButton
            orders={pendingOrders.map((o: any) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              partyName: o.supplier?.name || o.supplierName || '—',
              orderDate: o.orderDate,
            }))}
            headerLabel="Čeká na naskladnění"
            actionLabel="Naskladnit"
            searchPlaceholder="Hledat číslo obj. nebo dodavatel..."
            autoOpen={pendingOrders.length > 0}
            onAction={handleCreateFromOrder}
          />
        }
        rowClassName={r => r.status === 'storno' || r.status === 'cancelled' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={receipt => (
          <>
            {receipt.purchaseOrder && (
              <LinkedDocumentBanner
                links={[{ label: 'Objednávka', value: receipt.purchaseOrder.orderNumber, href: `/purchase-orders?highlight=${receipt.purchaseOrder.id}` }]}
                color="blue"
              />
            )}
            <SupplierOrderDetail
              order={mapReceiptToSupplierOrderDetail(receipt, isVatPayer)}
              isVatPayer={isVatPayer}
              orderHref={receipt.purchaseOrder ? `/purchase-orders?highlight=${receipt.purchaseOrder.id}` : undefined}
              showReceiptsSection={false}
            />
            <ActionToolbar
              right={
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleDownloadPDF(receipt)}>
                    <FileDown className="w-4 h-4 mr-1" />Zobrazit PDF
                  </Button>
                  {receipt.status === 'active' && (
                    <Button size="sm" variant="danger" onClick={() => handleStorno(receipt)}>
                      <XCircle className="w-4 h-4 mr-1" />Stornovat
                    </Button>
                  )}
                  {receipt.status !== 'storno' && receipt.status !== 'cancelled' && (
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => handleProcessReceipt(receipt)}>
                      <Package className="w-4 h-4 mr-1" />Zpracovat
                    </Button>
                  )}
                </div>
              }
            />
          </>
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />

      {/* ── Process modal ── */}
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
              {/* Items to receive */}
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
                                  : <div><div className="font-medium text-blue-700">{formatPrice(priceWithVat)}</div><div className="text-xs text-gray-400">+{itemVatRate}% ({formatPrice(vatPerUnit)})</div></div>}
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

              {/* Receipt date */}
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
                    if (diff > 30)   return <p className="text-xs text-orange-600 mt-2 font-medium">⚠️ Datum je starší než 30 dní</p>
                    return null
                  })()}
                </div>
              </div>

              {/* Invoice section */}
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

              <div className="flex gap-3 justify-end pt-4 border-t-2 border-gray-200">
                <Button variant="ghost" onClick={closeProcessModal} className="px-6 py-2 hover:bg-gray-100 transition-colors">
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

      {toast && <Toast toast={toast} />}
    </EntityPage>
  )
}
