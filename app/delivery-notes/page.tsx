'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { ChevronDown, ChevronRight, Package, FileDown, XCircle } from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'
import { formatVariantQty } from '@/lib/formatVariantQty'
import { resolveItemQuantities } from '@/lib/variantConversion'
import { generateDeliveryNotePDF, openPDFInNewTab } from '@/lib/pdfGenerator'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import {
  useEntityPage, useFilters, EntityPage, LoadingState, ErrorState,
  ActionToolbar,
} from '@/components/erp'
import type { ColumnDef, SelectOption } from '@/components/erp'
import { ExpectedDocumentsPanel } from '@/components/warehouse/expected/ExpectedDocumentsPanel'
import { QuickPreviewCard } from '@/components/warehouse/expected/QuickPreviewCard'
import { useClickOutside } from '@/components/warehouse/shared/useClickOutside'
import { useToast } from '@/components/warehouse/shared/useToast'
import { Toast } from '@/components/warehouse/shared/Toast'

export const dynamic = 'force-dynamic'

interface DeliveryNoteItem {
  id: string
  productId?: string
  productName?: string
  quantity: number
  orderedQuantity?: number
  unit: string
  inventoryItemId?: string
  variantValue?: number | null
  variantUnit?:  string | null
  isVariant?:    boolean
  orderedBaseQty?:   number
  shippedBaseQty?:   number
  remainingBaseQty?: number
  price?: number | null
  priceWithVat?: number | null
  vatAmount?: number | null
  vatRate?: number | null
  priceSource?: string | null
  product?: { id: string; name: string; price: number; vatRate?: number }
}

interface DeliveryNote {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status: string
  processedAt?: string
  note?: string
  customer?: { id: string; name: string }
  customerName?: string
  customerOrder?: {
    id: string
    orderNumber: string
    issuedInvoice?: { id: string; invoiceNumber: string }
    [key: string]: any
  }
  issuedInvoice?: { id: string; invoiceNumber: string }
  transaction?: {
    id: string
    transactionCode: string
    invoiceType: string
    receiptId?: string | null
  }
  items: DeliveryNoteItem[]
}

interface CustomerOrder {
  id: string
  orderNumber: string
  orderDate: string
  status: string
  totalAmount: number
  customer?: { id: string; name: string }
  customerName?: string
  shippingMethod?:     string | null
  pickupPointId?:      string | null
  pickupPointName?:    string | null
  pickupPointAddress?: string | null
  pickupPointCarrier?: string | null
  items: Array<{
    id: string
    productId: string | null
    productName: string | null
    quantity: number
    shippedQuantity?: number
    shippedBaseQty?:  number
    variantValue?:    number | null
    variantUnit?:     string | null
    unit: string
    price: number
    vatRate?: number
    vatAmount?: number
    priceWithVat?: number
    product?: { id: string; name: string; vatRate?: number }
  }>
}

function getDNItemPackCount(quantity: number, productName: string | null | undefined, unit: string): number {
  if (productName?.includes(' — ') && unit !== 'ks') {
    const variantLabel = productName.split(' — ').slice(-1)[0]
    const match = variantLabel.match(/^([\d.]+)/)
    if (match) {
      const packSize = parseFloat(match[1])
      if (packSize > 0) return Math.round((quantity / packSize) * 1000) / 1000
    }
  }
  return quantity
}

function formatDNItemQty(quantity: number, productName: string | null | undefined, unit: string): string {
  if (productName?.includes(' — ') && unit !== 'ks') {
    const variantLabel = productName.split(' — ').slice(-1)[0]
    const match = variantLabel.match(/^([\d.]+)/)
    if (match) {
      const packSize = parseFloat(match[1])
      if (packSize > 0) {
        const packs = Math.round((quantity / packSize) * 1000) / 1000
        return `${packs}x ${variantLabel}`
      }
    }
  }
  return formatVariantQty(quantity, productName, unit)
}

function getStatusBadge(status: string) {
  if (status === 'storno') {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">STORNO</span>
  }
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Vydáno</span>
}

const statusOptions: SelectOption[] = [
  { value: 'all',       label: 'Vše' },
  { value: 'delivered', label: 'Vydáno',  className: 'text-green-600' },
  { value: 'storno',    label: 'STORNO',  className: 'text-red-600'   },
]

const SHIPPING_LABELS: Record<string, string> = {
  DPD_HOME:           'DPD — Doručení na adresu',
  DPD_PICKUP:         'DPD — Výdejní místo',
  ZASILKOVNA_HOME:    'Zásilkovna — Doručení na adresu',
  ZASILKOVNA_PICKUP:  'Zásilkovna — Výdejní místo / Z-BOX',
  COURIER:            'Kurýr',
  PICKUP_IN_STORE:    'Osobní odběr',
}

export default function DeliveryNotesPage() {
  const highlightId = useSearchParams().get('highlight')

  const [isVatPayer, setIsVatPayer] = useState(true)
  const [pendingOrders, setPendingOrders] = useState<CustomerOrder[]>([])

  // ── Expected panel state ──────────────────────────────────────────────────
  const [pendingListOpen, setPendingListOpen] = useState(false)
  const [pendingFormOpen, setPendingFormOpen] = useState(false)
  const [popoverSearch, setPopoverSearch] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)
  useClickOutside(popoverRef, () => setPendingFormOpen(false))

  // ── Pending orders display state ──────────────────────────────────────────
  const [filteredPendingOrders, setFilteredPendingOrders] = useState<CustomerOrder[]>([])
  const [expandedPendingOrders, setExpandedPendingOrders] = useState<Set<string>>(new Set())
  const [pendingCurrentPage,    setPendingCurrentPage]    = useState(1)
  const [pendingItemsPerPage,   setPendingItemsPerPage]   = useState(10)

  const [pendingFilterOrderNumber, setPendingFilterOrderNumber] = useState('')
  const [pendingFilterCustomer,    setPendingFilterCustomer]    = useState('')
  const [pendingFilterDate,        setPendingFilterDate]        = useState('')

  // ── Process modal ─────────────────────────────────────────────────────────
  const [showProcessModal, setShowProcessModal]       = useState(false)
  const [processingNoteId, setProcessingNoteId]       = useState<string | null>(null)
  const [processingNoteItems, setProcessingNoteItems] = useState<DeliveryNoteItem[]>([])
  const [shippedQuantities, setShippedQuantities]     = useState<Record<string, number>>({})
  const [processNote, setProcessNote]                 = useState('')
  const [isProcessing, setIsProcessing]               = useState(false)

  const { toast, showToast } = useToast()
  const resetPage = useRef<() => void>(() => {})

  // ── Main list filters ─────────────────────────────────────────────────────
  const filters = useFilters<DeliveryNote>([
    { key: 'number',   type: 'text',   placeholder: 'Číslo...',    match: (r, v) => r.deliveryNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',     type: 'date',                                 match: (r, v) => new Date(r.deliveryDate).toISOString().split('T')[0] === v },
    { key: 'customer', type: 'text',   placeholder: 'Odběratel...', match: (r, v) => (r.customer?.name || r.customerName || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'minItems', type: 'number', placeholder: '≥',            match: (r, v) => (r.items?.length || 0) >= v },
    { key: 'minValue', type: 'number', placeholder: '≥',            match: (r, v) => {
      const total = r.items.reduce((sum, item) => {
        const hasSaved  = item.price != null && item.priceWithVat != null
        const unitPrice = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
        const itemVatRate = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
        const isNonVat  = isNonVatPayer(itemVatRate)
        const vatPer    = hasSaved ? Number(item.vatAmount ?? 0) : (isNonVat ? 0 : unitPrice * itemVatRate / 100)
        const withVat   = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPer)
        const packs     = getDNItemPackCount(Number(item.quantity), item.productName, item.unit)
        return sum + packs * withVat
      }, 0)
      return total >= v
    }},
    { key: 'status', type: 'select', options: statusOptions, match: (r, v) => { if (v === 'all') return true; if (v === 'delivered') return r.status !== 'storno'; if (v === 'storno') return r.status === 'storno'; return r.status === v } },
  ], () => resetPage.current())

  const ep = useEntityPage<DeliveryNote>({
    fetchData: async () => {
      const [dnRes, sRes] = await Promise.all([
        fetch('/api/delivery-notes', { cache: 'no-store' }),
        fetch('/api/settings',       { cache: 'no-store' }),
      ])
      const [dn, s] = await Promise.all([dnRes.json(), sRes.json()])
      setIsVatPayer(s.isVatPayer ?? true)
      return dn
    },
    getRowId: r => r.id,
    filterFn: filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  async function fetchPendingOrders() {
    try {
      const res  = await fetch('/api/customer-orders/pending-shipment', { cache: 'no-store' })
      const data = await res.json()
      setPendingOrders(Array.isArray(data) ? data : [])
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchPendingOrders()
    const interval = setInterval(() => {
      fetch('/api/customer-orders/pending-shipment', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setPendingOrders(data) })
        .catch(() => {})
    }, 30000)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') { ep.refresh(); fetchPendingOrders() }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', handleVisibility) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-expand panel when pending orders arrive
  useEffect(() => {
    if (pendingOrders.length > 0) setPendingListOpen(true)
    let f = [...pendingOrders]
    if (pendingFilterOrderNumber) f = f.filter(o => o.orderNumber.toLowerCase().includes(pendingFilterOrderNumber.toLowerCase()))
    if (pendingFilterCustomer)    f = f.filter(o => (o.customer?.name || o.customerName || '').toLowerCase().includes(pendingFilterCustomer.toLowerCase()))
    if (pendingFilterDate)        f = f.filter(o => new Date(o.orderDate).toISOString().split('T')[0] === pendingFilterDate)
    setFilteredPendingOrders(f)
    setPendingCurrentPage(1)
  }, [pendingOrders, pendingFilterOrderNumber, pendingFilterCustomer, pendingFilterDate])

  function togglePendingExpanded(orderId: string) {
    setExpandedPendingOrders(prev => {
      const s = new Set(prev)
      s.has(orderId) ? s.delete(orderId) : s.add(orderId)
      return s
    })
  }

  function handlePrepareShipment(orderId: string) {
    const order = pendingOrders.find(o => o.id === orderId)
    if (!order) return
    setProcessingNoteId(orderId)
    const items: DeliveryNoteItem[] = order.items
      .filter(item => item.productId !== null)
      .map(item => {
        const resolved = resolveItemQuantities({
          quantity:        Number(item.quantity),
          unit:            item.unit,
          shippedQuantity: Number(item.shippedQuantity ?? 0),
          shippedBaseQty:  Number(item.shippedBaseQty  ?? 0),
          variantValue:    item.variantValue != null ? Number(item.variantValue) : null,
          variantUnit:     item.variantUnit  ?? null,
        })
        return {
          id: item.id, productId: item.productId || undefined,
          productName: item.productName || undefined,
          quantity: resolved.remainingBaseQty, unit: resolved.baseUnit,
          variantValue: item.variantValue != null ? Number(item.variantValue) : null,
          variantUnit:  item.variantUnit ?? null,
          isVariant: resolved.isVariant,
          orderedBaseQty:   resolved.orderedBaseQty,
          shippedBaseQty:   resolved.shippedBaseQty,
          remainingBaseQty: resolved.remainingBaseQty,
          price:        item.price,
          priceWithVat: item.priceWithVat,
          vatAmount:    item.vatAmount,
          vatRate:      item.vatRate,
          product: item.product
            ? { ...item.product, price: Number((item.product as any).price || item.price || 0) }
            : undefined,
        }
      })
      .filter(item => item.quantity > 0)
    setProcessingNoteItems(items)
    const init: Record<string, number> = {}
    items.forEach(item => { init[item.id!] = item.quantity })
    setShippedQuantities(init)
    setShowProcessModal(true)
  }

  async function handleConfirmProcess() {
    if (!processingNoteId || isProcessing) return
    setIsProcessing(true)
    const isCustomerOrder = pendingOrders.some(o => o.id === processingNoteId)
    const savedOrder = isCustomerOrder ? pendingOrders.find(o => o.id === processingNoteId) ?? null : null
    if (savedOrder) setPendingOrders(prev => prev.filter(o => o.id !== processingNoteId))
    try {
      if (isCustomerOrder) {
        const items = processingNoteItems.map(item => ({
          orderItemId: item.id,
          productId:   item.productId || null,
          productName: item.productName || null,
          quantity:    shippedQuantities[item.id!] || 0,
          unit:        item.unit,
        }))
        const payload: any = { customerOrderId: processingNoteId, items }
        if (processNote.trim()) payload.note = processNote.trim()
        const res = await fetch('/api/delivery-notes/create-from-order', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Chyba při vytváření výdejky') }
      } else {
        const items = processingNoteItems.map(item => ({ id: item.id!, shippedQuantity: shippedQuantities[item.id!] || 0 }))
        const payload: any = { items }
        if (processNote.trim()) payload.note = processNote.trim()
        const res = await fetch(`/api/delivery-notes/${processingNoteId}/process`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Chyba při zpracování') }
      }
      closeProcessModal()
      await Promise.all([ep.refresh(), fetchPendingOrders()])
      showToast('success', '✅ Výdejka byla vyskladněna!')
    } catch (error: any) {
      if (savedOrder) setPendingOrders(prev => [...prev, savedOrder])
      showToast('error', error.message || 'Nepodařilo se zpracovat výdejku')
    } finally {
      setIsProcessing(false)
    }
  }

  function closeProcessModal() {
    setShowProcessModal(false)
    setProcessingNoteId(null)
    setProcessingNoteItems([])
    setShippedQuantities({})
    setProcessNote('')
  }

  async function handleDownloadPDF(noteId: string) {
    const note = ep.rows.find(n => n.id === noteId)
    if (!note) return
    try {
      const pdfData = {
        noteNumber:      note.deliveryNumber,
        noteDate:        note.deliveryDate,
        customerName:    note.customerOrder?.customer?.name || (note.customerOrder as any)?.customerName || note.customerName || 'Neznámý zákazník',
        customerAddress: (note.customerOrder as any)?.customerAddress,
        customerEmail:   (note.customerOrder as any)?.customerEmail,
        customerPhone:   (note.customerOrder as any)?.customerPhone,
        customerICO:     note.customerOrder?.customer?.ico,
        customerDIC:     note.customerOrder?.customer?.dic,
        items: note.items.map(item => {
          const hasSaved = item.price != null && item.priceWithVat != null
          const unitPrice = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
          const itemVatRate = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
          const isItemNonVat = isNonVatPayer(itemVatRate)
          const vatPerUnit = hasSaved ? Number(item.vatAmount ?? 0) : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
          const priceWithVatPerUnit = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
          const packs = getDNItemPackCount(Number(item.quantity), item.productName, item.unit)
          return {
            productName: item.productName || item.product?.name || 'Neznámý produkt',
            quantity:    packs,
            unit:        item.unit !== 'ks' && item.productName?.includes(' — ') ? 'ks' : item.unit,
            price:       isVatPayer ? priceWithVatPerUnit : unitPrice,
          }
        }),
        totalAmount: note.items.reduce((sum, item) => {
          const hasSaved = item.price != null && item.priceWithVat != null
          const unitPrice = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
          const itemVatRate = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
          const isItemNonVat = isNonVatPayer(itemVatRate)
          const vatPerUnit = hasSaved ? Number(item.vatAmount ?? 0) : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
          const priceWithVatPerUnit = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
          const packs = getDNItemPackCount(Number(item.quantity), item.productName, item.unit)
          return sum + packs * (isVatPayer ? priceWithVatPerUnit : unitPrice)
        }, 0),
        note:   note.note,
        status: note.status,
      }
      const settingsRes = await fetch('/api/settings')
      const settings    = await settingsRes.json()
      const pdfBlob     = await generateDeliveryNotePDF(pdfData, settings)
      openPDFInNewTab(pdfBlob)
    } catch (error: any) {
      alert(`Chyba při generování PDF: ${error.message}`)
    }
  }

  async function handleStorno(noteId: string) {
    const note = ep.rows.find(n => n.id === noteId)
    if (!note) return
    if (note.status === 'storno') { alert('Tato výdejka je již stornována'); return }
    const reason = prompt(`Opravdu chceš stornovat výdejku ${note.deliveryNumber}?\n\nZadej důvod storna (povinné):`)
    if (!reason || reason.trim().length === 0) return
    try {
      const res = await fetch(`/api/delivery-notes/${noteId}/storno`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, userId: 'user' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Nepodařilo se stornovat výdejku')
      await ep.refresh()
      showToast('success', 'Výdejka byla stornována a zboží vráceno do skladu.')
    } catch (error: any) {
      showToast('error', `Chyba: ${error.message}`)
    }
  }

  const columns: ColumnDef<DeliveryNote>[] = [
    {
      key: 'number', header: 'Číslo',
      render: r => <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>{r.deliveryNumber}</p>,
    },
    { key: 'date', header: 'Datum', render: r => <p className="text-sm text-gray-700">{formatDate(r.deliveryDate)}</p> },
    {
      key: 'customer', header: 'Odběratel',
      render: r => r.customer?.id
        ? <a href={`/customers?highlight=${r.customer.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{r.customer.name}</a>
        : <p className="text-sm text-gray-700 truncate">{r.customerName || 'Anonymní zákazník'}</p>,
    },
    { key: 'items',  header: 'Položek', render: r => <p className="text-sm text-gray-600">{r.items.length}</p> },
    {
      key: 'value', header: 'Hodnota',
      render: r => (
        <p className="text-sm font-bold text-gray-900">
          {r.items.length > 0 ? formatPrice(r.items.reduce((sum, item) => {
            const hasSaved  = item.price != null && item.priceWithVat != null
            const unitPrice = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
            const itemVatRate = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
            const isItemNonVat = isNonVatPayer(itemVatRate)
            const vatPer    = hasSaved ? Number(item.vatAmount ?? 0) : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
            const withVat   = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPer)
            const packs     = getDNItemPackCount(Number(item.quantity), item.productName, item.unit)
            return sum + packs * (isVatPayer ? withVat : unitPrice)
          }, 0)) : '-'}
        </p>
      ),
    },
    { key: 'status', header: 'Status', render: r => getStatusBadge(r.status) },
  ]

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  // ovFormContent removed — popup is now rendered inline in firstHeader

  // ── Expected panel: list content ──────────────────────────────────────────
  const pendingListContent = (
    <div className="p-4 space-y-3">
      {/* Filters */}
      <div className="grid grid-cols-[auto_1fr_1.5fr_1fr] items-center gap-3 px-3 py-2 bg-white border border-orange-200 rounded-lg">
        <button
          onClick={() => { setPendingFilterOrderNumber(''); setPendingFilterCustomer(''); setPendingFilterDate('') }}
          className="w-7 h-7 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded flex items-center justify-center"
          title="Vymazat filtry"
        >✕</button>
        <input type="text" value={pendingFilterOrderNumber} onChange={e => { setPendingFilterOrderNumber(e.target.value); setPendingCurrentPage(1) }} placeholder="Číslo zak..." className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-400" />
        <input type="text" value={pendingFilterCustomer}    onChange={e => { setPendingFilterCustomer(e.target.value);    setPendingCurrentPage(1) }} placeholder="Odběratel..." className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-400" />
        <input type="date" value={pendingFilterDate}         onChange={e => { setPendingFilterDate(e.target.value);         setPendingCurrentPage(1) }} className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-400" />
      </div>

      {/* Column header */}
      <div className="grid grid-cols-[24px_1fr_1.5fr_1fr_auto] items-center gap-4 px-4 py-2 bg-orange-100 border border-orange-200 rounded-lg text-xs font-semibold text-orange-900">
        <div />
        <div>Číslo zak.</div>
        <div>Odběratel</div>
        <div>Datum objednávky</div>
        <div className="w-28" />
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {filteredPendingOrders
          .slice((pendingCurrentPage - 1) * pendingItemsPerPage, pendingCurrentPage * pendingItemsPerPage)
          .map(order => {
            const isExpanded = expandedPendingOrders.has(order.id)
            return (
              <div key={order.id} className="border-2 border-orange-200 rounded-lg bg-white">
                <div className="grid grid-cols-[24px_1fr_1.5fr_1fr_auto] items-center gap-4 px-4 py-3 hover:bg-orange-50 transition-colors">
                  <button onClick={() => togglePendingExpanded(order.id)} className="flex items-center justify-center">
                    {isExpanded
                      ? <ChevronDown  className="h-4 w-4 text-orange-600" />
                      : <ChevronRight className="h-4 w-4 text-orange-600" />}
                  </button>
                  <div className="cursor-pointer" onClick={() => togglePendingExpanded(order.id)}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded font-medium">Zaplaceno</span>
                    </div>
                  </div>
                  <div>
                    {order.customer?.id
                      ? <Link href={`/customers?highlight=${order.customer.id}`} className="text-sm text-blue-600 hover:underline font-medium" onClick={e => e.stopPropagation()}>{order.customer.name}</Link>
                      : <p className="text-sm text-gray-700">{order.customerName || '-'}</p>}
                  </div>
                  <div><p className="text-sm text-gray-700">{formatDate(order.orderDate)}</p></div>
                  <div className="flex items-center gap-2">
                    <QuickPreviewCard cardContent={
                      <div className="space-y-2.5 text-sm">
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Číslo objednávky</p>
                          <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Odběratel</p>
                          <p className="text-gray-800">{order.customer?.name || order.customerName || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Datum objednávky</p>
                          <p className="text-gray-700">{formatDate(order.orderDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Hodnota</p>
                          <p className="font-semibold text-gray-900">{formatPrice(order.totalAmount)}</p>
                        </div>
                        {order.shippingMethod && (
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Doprava</p>
                            <p className="text-gray-700 text-xs">{SHIPPING_LABELS[order.shippingMethod] ?? order.shippingMethod}</p>
                          </div>
                        )}
                        <button
                          onClick={() => handlePrepareShipment(order.id)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors mt-1"
                        >
                          <Package className="w-3.5 h-3.5" />Vyskladnit
                        </button>
                      </div>
                    } />
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white w-28" onClick={() => handlePrepareShipment(order.id)}>
                      <Package className="w-4 h-4 mr-1" />Vyskladnit
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t-2 border-orange-200 p-4 bg-gray-50">
                    {(order.shippingMethod || order.pickupPointId) && (
                      <div className="mb-3 border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-bold text-sm text-gray-900 px-4 py-2 bg-gray-100 border-b border-gray-200">Doprava</h4>
                        <div className="px-4 py-3 space-y-2 bg-white text-sm">
                          {order.shippingMethod && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">Způsob dopravy:</span>
                              <span className="font-medium">{SHIPPING_LABELS[order.shippingMethod!] ?? order.shippingMethod}</span>
                            </div>
                          )}
                          {order.pickupPointId && (
                            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                                  {order.pickupPointCarrier === 'zasilkovna' ? 'Zásilkovna' : order.pickupPointCarrier === 'dpd' ? 'DPD' : 'Výdejní místo'}
                                </p>
                                <p className="font-semibold text-amber-900">{order.pickupPointName || '-'}</p>
                                {order.pickupPointAddress && <p className="text-amber-700 text-xs">{order.pickupPointAddress}</p>}
                                <p className="text-amber-600 text-xs font-mono">ID: {order.pickupPointId}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="border rounded-lg overflow-hidden">
                      {isVatPayer ? (
                        <div className="grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.5fr_0.8fr_0.5fr_0.8fr_1fr] gap-2 px-3 py-1.5 bg-gray-100 text-[11px] font-semibold text-gray-700 border-b">
                          <div>Položky k expedici</div>
                          <div className="text-center">Objednáno</div><div className="text-center">Vyskladněno</div>
                          <div className="text-center">Zbývá</div><div className="text-center">DPH</div>
                          <div className="text-center">Cena/ks</div><div className="text-center">DPH/ks</div>
                          <div className="text-center">S DPH/ks</div><div className="text-center">Celkem</div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-3 py-1.5 bg-gray-100 text-[11px] font-semibold text-gray-700 border-b">
                          <div>Položky k expedici</div>
                          <div className="text-right">Objednáno</div><div className="text-right">Vyskladněno</div>
                          <div className="text-right">Zbývá</div><div className="text-right">Cena/ks</div><div className="text-right">Celkem</div>
                        </div>
                      )}
                      {order.items.filter(item => item.productId !== null).map((item, i) => {
                        const shipped   = Number(item.shippedQuantity || 0)
                        const ordered   = Number(item.quantity)
                        const remaining = ordered - shipped
                        const unitPrice = Number(item.price || 0)
                        const itemVatRate = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
                        const isItemNonVat = isNonVatPayer(itemVatRate)
                        const vatPerUnit   = isItemNonVat ? 0 : Number(item.vatAmount ?? (unitPrice * itemVatRate / 100))
                        const priceWithVat = isItemNonVat ? unitPrice : Number(item.priceWithVat ?? (unitPrice + vatPerUnit))
                        const total = ordered * (isVatPayer ? priceWithVat : unitPrice)
                        const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        return isVatPayer ? (
                          <div key={item.id} className={`grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.5fr_0.8fr_0.5fr_0.8fr_1fr] gap-2 px-3 py-1.5 ${bg}`}>
                            <div className="text-[13px] text-gray-900">{(item.productName || item.product?.name || 'Neznámý produkt').split(' — ')[0]}</div>
                            <div className="text-[13px] text-gray-700 text-center">{formatVariantQty(ordered, item.productName, item.unit)}</div>
                            <div className="text-[13px] text-gray-700 text-center">{formatVariantQty(shipped, item.productName, item.unit)}</div>
                            <div className="text-[13px] font-semibold text-orange-700 text-center">{formatVariantQty(remaining, item.productName, item.unit)}</div>
                            <div className="text-[13px] text-gray-500 text-center">{isItemNonVat ? '-' : `${itemVatRate}%`}</div>
                            <div className="text-[13px] text-gray-700 text-center">{formatPrice(unitPrice)}</div>
                            <div className="text-[13px] text-gray-500 text-center">{isItemNonVat ? '-' : formatPrice(vatPerUnit)}</div>
                            <div className="text-[13px] text-gray-700 text-center">{formatPrice(priceWithVat)}</div>
                            <div className="text-[13px] font-semibold text-gray-900 text-center">{formatPrice(total)}</div>
                          </div>
                        ) : (
                          <div key={item.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-3 py-1.5 ${bg}`}>
                            <div className="text-[13px] text-gray-900">{(item.productName || item.product?.name || 'Neznámý produkt').split(' — ')[0]}</div>
                            <div className="text-[13px] text-gray-700 text-right">{formatVariantQty(ordered, item.productName, item.unit)}</div>
                            <div className="text-[13px] text-gray-700 text-right">{formatVariantQty(shipped, item.productName, item.unit)}</div>
                            <div className="text-[13px] font-semibold text-orange-700 text-right">{formatVariantQty(remaining, item.productName, item.unit)}</div>
                            <div className="text-[13px] text-gray-700 text-right">{formatPrice(unitPrice)}</div>
                            <div className="text-[13px] font-semibold text-gray-900 text-right">{formatPrice(total)}</div>
                          </div>
                        )
                      })}
                      <div className={`grid ${isVatPayer ? 'grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.5fr_0.8fr_0.5fr_0.8fr_1fr]' : 'grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'} gap-2 px-3 py-1.5 bg-gray-100 border-t-2 font-bold`}>
                        <div className={`${isVatPayer ? 'col-span-8' : 'col-span-5'} text-[13px]`}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka objednávky'}</div>
                        <div className={`text-[13px] ${isVatPayer ? 'text-center' : 'text-right'}`}>
                          {formatPrice(order.items.filter(i => i.productId !== null).reduce((sum, item) => {
                            const up  = Number(item.price || 0)
                            const vr  = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
                            const nv  = isNonVatPayer(vr)
                            const vpu = nv ? 0 : Number(item.vatAmount ?? (up * vr / 100))
                            const pwv = nv ? up : Number(item.priceWithVat ?? (up + vpu))
                            return sum + (Number(item.quantity) * (isVatPayer ? pwv : up))
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

      {/* Pagination inside panel */}
      {filteredPendingOrders.length > pendingItemsPerPage && (() => {
        const totalPages = Math.ceil(filteredPendingOrders.length / pendingItemsPerPage)
        return (
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Zobrazit:</span>
              {[10, 20, 50].map(count => (
                <button key={count} onClick={() => { setPendingItemsPerPage(count); setPendingCurrentPage(1) }}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${pendingItemsPerPage === count ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-900 hover:bg-orange-200'}`}>
                  {count}
                </button>
              ))}
              <span className="text-sm text-gray-500 ml-2">({filteredPendingOrders.length} celkem)</span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button onClick={() => setPendingCurrentPage(p => Math.max(1, p - 1))} disabled={pendingCurrentPage === 1} className="px-3 py-1.5 bg-orange-100 text-orange-900 rounded hover:bg-orange-200 disabled:opacity-50 text-sm">Předchozí</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setPendingCurrentPage(page)} className={`px-3 py-1.5 rounded text-sm font-medium ${pendingCurrentPage === page ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-900 hover:bg-orange-200'}`}>{page}</button>
                ))}
                <button onClick={() => setPendingCurrentPage(p => Math.min(totalPages, p + 1))} disabled={pendingCurrentPage >= totalPages} className="px-3 py-1.5 bg-orange-100 text-orange-900 rounded hover:bg-orange-200 disabled:opacity-50 text-sm">Další</button>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Výdejky"
        icon={Package}
        color="amber"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      {/* ── Compact expected delivery notes panel ── */}
      <ExpectedDocumentsPanel
        label="výdejky"
        count={filteredPendingOrders.length}
        listOpen={pendingListOpen}
        onToggleList={() => setPendingListOpen(v => !v)}
        listContent={pendingListContent}
      />

      {filters.bar('auto 1fr 1fr 1fr 1fr 1fr 1fr')}

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        firstHeader={
          <div ref={popoverRef} className="relative">
            <button
              onClick={() => { setPendingFormOpen(v => !v); setPopoverSearch('') }}
              title={pendingFormOpen ? 'Zavřít přehled' : 'Očekávané výdejky'}
              className={`w-6 h-6 flex items-center justify-center rounded font-bold text-xs transition-colors ${
                pendingFormOpen ? 'bg-orange-600 text-white' : 'bg-orange-200 text-orange-800 hover:bg-orange-400'
              }`}
            >
              +
            </button>

            {pendingFormOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-[480px] max-h-[500px] flex flex-col bg-white border border-orange-200 rounded-xl shadow-2xl overflow-hidden">
                {/* Popup header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50 border-b border-orange-200 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-orange-900">Čeká na expedici</span>
                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${pendingOrders.length > 0 ? 'bg-orange-600 text-white' : 'bg-orange-200 text-orange-700'}`}>
                      {pendingOrders.length}
                    </span>
                  </div>
                  <button onClick={() => setPendingFormOpen(false)} className="text-orange-400 hover:text-orange-700 text-xl leading-none transition-colors">×</button>
                </div>

                {/* Search */}
                <div className="px-3 py-2 border-b border-gray-100 shrink-0">
                  <input
                    type="text"
                    value={popoverSearch}
                    onChange={e => setPopoverSearch(e.target.value)}
                    placeholder="Hledat číslo obj. nebo odběratel..."
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-orange-400 focus:border-orange-400 outline-none"
                    autoFocus
                  />
                </div>

                {/* Orders list */}
                <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                  {(() => {
                    const q = popoverSearch.toLowerCase()
                    const visible = pendingOrders.filter(o =>
                      !q ||
                      o.orderNumber.toLowerCase().includes(q) ||
                      (o.customer?.name || o.customerName || '').toLowerCase().includes(q)
                    )
                    if (visible.length === 0) {
                      return (
                        <div className="px-4 py-10 text-center text-sm text-gray-400 italic">
                          {popoverSearch ? 'Žádné výsledky.' : 'Žádné objednávky čekající na expedici.'}
                        </div>
                      )
                    }
                    return visible.map(order => (
                      <div key={order.id} className="flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[10px] rounded-full font-semibold shrink-0">Zaplaceno</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {order.customer?.name || order.customerName || 'Anonymní zákazník'}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 shrink-0 tabular-nums">{formatDate(order.orderDate)}</p>
                        <button
                          onClick={() => { handlePrepareShipment(order.id); setPendingFormOpen(false) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                        >
                          <Package className="w-3 h-3" />Vyskladnit
                        </button>
                      </div>
                    ))
                  })()}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 shrink-0 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{pendingOrders.length} celkem</span>
                  <button
                    onClick={() => { setPendingListOpen(true); setPendingFormOpen(false) }}
                    className="text-xs text-orange-600 hover:text-orange-800 hover:underline transition-colors"
                  >
                    Rozbalit panel níže →
                  </button>
                </div>
              </div>
            )}
          </div>
        }
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={note => (
          <>
            {/* Linked documents banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-center flex-wrap gap-6">
              {note.transaction ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-900">Transakce:</span>
                  <Link href={`/transactions?highlight=${note.transaction.id}`} className="text-blue-600 hover:underline text-sm font-medium">{note.transaction.transactionCode}</Link>
                </div>
              ) : note.customerOrder ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-900">Objednávka:</span>
                  <Link href={`/${note.customerOrder.orderNumber?.startsWith('ESH') ? 'eshop-orders' : 'customer-orders'}?highlight=${note.customerOrder.id}`} className="text-blue-600 hover:underline text-sm font-medium">{note.customerOrder.orderNumber}</Link>
                </div>
              ) : null}

              {(() => {
                const invoice = note.customerOrder?.issuedInvoice || note.issuedInvoice
                return invoice ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-900">Faktura:</span>
                    <Link href={`/invoices/issued?highlight=${invoice.id}`} className="text-blue-600 hover:underline text-sm font-medium">{invoice.invoiceNumber}</Link>
                  </div>
                ) : null
              })()}

              {note.transaction?.receiptId && (() => {
                const match = note.transaction!.receiptId!.match(/urn:sumup:pos:sale:([^:]+):([a-f0-9-]{36})[:;]/)
                if (!match) return null
                const receiptUrl = `https://sales-receipt.sumup.com/pos/public/v1/${match[1]}/receipt/${match[2]}?format=html`
                return (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-900">Účtenka:</span>
                    <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">Zobrazit</a>
                  </div>
                )
              })()}
            </div>

            {/* Shipping info */}
            {(note.customerOrder?.shippingMethod || note.customerOrder?.pickupPointId) && (
              <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                <h4 className="font-bold text-sm text-gray-900 px-4 py-2 bg-gray-100 border-b border-gray-200">Doprava</h4>
                <div className="px-4 py-3 space-y-2 bg-white text-sm">
                  {note.customerOrder.shippingMethod && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Způsob dopravy:</span>
                      <span className="font-medium">{SHIPPING_LABELS[note.customerOrder.shippingMethod] ?? note.customerOrder.shippingMethod}</span>
                    </div>
                  )}
                  {note.customerOrder.pickupPointId && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                          {note.customerOrder.pickupPointCarrier === 'zasilkovna' ? 'Zásilkovna' : note.customerOrder.pickupPointCarrier === 'dpd' ? 'DPD' : 'Výdejní místo'}
                        </p>
                        <p className="font-semibold text-amber-900">{note.customerOrder.pickupPointName || '-'}</p>
                        {note.customerOrder.pickupPointAddress && <p className="text-amber-700 text-xs">{note.customerOrder.pickupPointAddress}</p>}
                        <p className="text-amber-600 text-xs font-mono">ID: {note.customerOrder.pickupPointId}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Items */}
            {note.items.length === 0 ? (
              <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Položky výdejky (0)</h4>
                <div className="px-4 py-4 text-sm text-gray-500 italic">Žádné položky</div>
              </div>
            ) : (
              <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Položky výdejky ({note.items.length})</h4>
                <div className="text-sm">
                  {isVatPayer ? (
                    <div className="grid grid-cols-[3fr_1fr_1fr_0.5fr_1fr_0.5fr_1fr_1fr] gap-2 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b text-xs">
                      <div>Produkt</div><div className="text-center">Pohyb</div><div className="text-center">Množství</div>
                      <div className="text-center">DPH</div><div className="text-center">Cena/ks</div>
                      <div className="text-center">DPH/ks</div><div className="text-center">S DPH/ks</div><div className="text-center">Celkem</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 bg-gray-50 font-semibold text-gray-700 border-b">
                      <div>Produkt</div><div className="text-center">Skladový pohyb</div>
                      <div className="text-right">Množství</div><div className="text-right">Cena za kus</div><div className="text-right">Celkem</div>
                    </div>
                  )}
                  {note.items.filter(item => item.productId !== null).map((item, i) => {
                    const hasSaved = item.price != null && item.priceWithVat != null
                    const unitPrice = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
                    const itemVatRate = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number(item.product?.vatRate || DEFAULT_VAT_RATE)
                    const isItemNonVat = isNonVatPayer(itemVatRate)
                    const vatPerUnit = hasSaved ? Number(item.vatAmount ?? 0) : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
                    const priceWithVatPerUnit = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
                    const packCount = getDNItemPackCount(Number(item.quantity), item.productName, item.unit)
                    const totalWithoutVat = packCount * unitPrice
                    const totalWithVat    = packCount * priceWithVatPerUnit
                    const sourceLabel = !hasSaved
                      ? <span title="Cena z aktuálního katalogu" className="ml-1 text-amber-500 text-xs">⚠</span>
                      : item.priceSource === 'invoice'
                        ? <span title="Cena ze zaúčtované faktury" className="ml-1 text-green-600 text-xs">✓</span>
                        : null
                    const bg = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    const inventoryLink = item.productId && item.inventoryItemId
                      ? <Link href={`/inventory?selectedProduct=${item.productId}&highlightMovement=${item.inventoryItemId}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-md shadow-sm border border-green-200 transition-colors" onClick={e => e.stopPropagation()}>Zobrazit</Link>
                      : <span className="text-gray-400 text-xs">-</span>
                    return isVatPayer ? (
                      <div key={i} className={`grid grid-cols-[3fr_1fr_1fr_0.5fr_1fr_0.5fr_1fr_1fr] gap-2 px-4 py-2 ${bg} text-xs`}>
                        <div className="font-medium text-gray-900 flex items-center">{(item.productName || item.product?.name || '(Neznámé)').split(' — ')[0]}{sourceLabel}</div>
                        <div className="text-center">{inventoryLink}</div>
                        <div className="text-center text-gray-600">{formatDNItemQty(Number(item.quantity), item.productName, item.unit)}</div>
                        <div className="text-center text-gray-500">{isItemNonVat ? '-' : `${itemVatRate}%`}</div>
                        <div className="text-center text-gray-600">{formatPrice(unitPrice)}</div>
                        <div className="text-center text-gray-500">{isItemNonVat ? '-' : formatPrice(vatPerUnit)}</div>
                        <div className="text-center text-gray-700">{formatPrice(priceWithVatPerUnit)}</div>
                        <div className="text-center font-semibold text-gray-900">{formatPrice(totalWithVat)}</div>
                      </div>
                    ) : (
                      <div key={i} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 ${bg}`}>
                        <div className="font-medium text-gray-900 flex items-center">{(item.productName || item.product?.name || '(Neznámé)').split(' — ')[0]}{sourceLabel}</div>
                        <div className="text-center">{inventoryLink}</div>
                        <div className="text-right text-gray-600">{formatDNItemQty(Number(item.quantity), item.productName, item.unit)}</div>
                        <div className="text-right text-gray-600">{formatPrice(unitPrice)}</div>
                        <div className="text-right font-semibold text-gray-900">{formatPrice(totalWithoutVat)}</div>
                      </div>
                    )
                  })}
                  <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_1fr_1fr_0.5fr_1fr_0.5fr_1fr_1fr]' : 'grid-cols-[2fr_1fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                    <div className={isVatPayer ? 'col-span-7' : 'col-span-4'}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                    <div className={isVatPayer ? 'text-center' : 'text-right'}>
                      {formatPrice(note.items.reduce((sum, item) => {
                        const hasSaved = item.price != null && item.priceWithVat != null
                        const up  = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
                        const vr  = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number(item.product?.vatRate || DEFAULT_VAT_RATE)
                        const nv  = isNonVatPayer(vr)
                        const vpu = hasSaved ? Number(item.vatAmount ?? 0) : (nv ? 0 : up * vr / 100)
                        const pwv = hasSaved ? Number(item.priceWithVat) : (up + vpu)
                        const packs = getDNItemPackCount(Number(item.quantity), item.productName, item.unit)
                        return sum + packs * (isVatPayer ? pwv : up)
                      }, 0))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {note.note && (
              <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Poznámka</h4>
                <div className="px-4 py-3 text-sm text-gray-700 bg-white">{note.note}</div>
              </div>
            )}

            <ActionToolbar
              left={
                <button onClick={() => handleDownloadPDF(note.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg transition-colors">
                  <FileDown className="w-3.5 h-3.5" />Zobrazit PDF
                </button>
              }
              right={
                note.status !== 'storno' ? (
                  <button onClick={() => handleStorno(note.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors">
                    <XCircle className="w-3.5 h-3.5" />Stornovat
                  </button>
                ) : undefined
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
                  <h2 className="text-2xl font-bold">{pendingOrders.some(o => o.id === processingNoteId) ? 'Vyskladnit objednávku' : 'Vyskladnit výdejku'}</h2>
                  <p className="text-orange-100 text-sm mt-1">Nastav množství k vyskladnění a odešli zboží odběrateli</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-l-4 border-purple-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Položky k vyskladnění</h3>
                <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-purple-200">
                  <table className="w-full text-sm table-fixed">
                    <thead className="bg-gradient-to-r from-purple-100 to-purple-50">
                      {isVatPayer ? (
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[28%]">Produkt</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[10%]">Objednáno</th>
                          <th className="text-center px-4 py-3 font-semibold text-orange-700 bg-orange-50 w-[12%]">Vyskladnit</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[8%]">DPH</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[10%]">Cena/ks</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[10%]">DPH/ks</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[10%]">S DPH/ks</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-700 w-[12%]">Celkem</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 w-[40%]">Produkt</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700 w-[15%]">Objednáno</th>
                          <th className="text-right px-4 py-3 font-semibold text-orange-700 bg-orange-50 w-[15%]">Vyskladnit</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700 w-[15%]">Cena/ks</th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700 w-[15%]">Celkem</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {processingNoteItems.map((item, idx) => {
                        const shipped     = shippedQuantities[item.id!] || 0
                        const maxAllowed  = item.quantity
                        const isVariant   = item.isVariant ?? false
                        const isOverLimit = shipped > maxAllowed + 0.001
                        const hasSaved    = item.price != null && item.priceWithVat != null
                        const unitPrice   = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
                        const itemVatRate = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
                        const isItemNonVat = isNonVatPayer(itemVatRate)
                        const vatPerUnit  = hasSaved ? Number(item.vatAmount ?? 0) : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
                        const priceWithVat = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
                        const packEquiv   = isVariant && item.variantValue ? shipped / item.variantValue : shipped
                        const total       = packEquiv * (isVatPayer ? priceWithVat : unitPrice)
                        const orderedDisplay = isVariant && item.orderedBaseQty != null
                          ? `${item.orderedBaseQty} ${item.unit}${item.shippedBaseQty ? ` (zbývá ${item.quantity})` : ''}`
                          : `${item.quantity} ${item.unit}`

                        function handleQtyChange(raw: string) {
                          if (raw === '') { setShippedQuantities({ ...shippedQuantities, [item.id!]: 0 }); return }
                          const v = Math.round(Number(raw) * 1000) / 1000
                          setShippedQuantities({ ...shippedQuantities, [item.id!]: v < 0 ? 0 : v })
                        }

                        const inputEl = (align: 'center' | 'right') => (
                          <div className={`flex items-center justify-${align} gap-1.5`}>
                            <input type="number" value={shipped || ''} onChange={e => handleQtyChange(e.target.value)}
                              min="0" max={maxAllowed} step={isVariant ? '0.001' : '1'}
                              className={`${isVariant ? 'w-20' : 'w-16'} px-2 py-2 border-2 ${isOverLimit ? 'border-red-400 bg-red-50' : 'border-orange-300'} rounded-lg text-center font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all text-sm`}
                            />
                            <span className="text-gray-600 font-medium text-xs">{item.unit}</span>
                            {isVariant && (
                              <button type="button" title="Vyskladnit vše" onClick={() => setShippedQuantities({ ...shippedQuantities, [item.id!]: maxAllowed })}
                                className="text-[10px] text-orange-500 hover:text-orange-700 underline leading-none">vše</button>
                            )}
                          </div>
                        )

                        const trBg = `${idx % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'} hover:bg-purple-100/40 transition-colors`
                        return isVatPayer ? (
                          <tr key={item.id} className={trBg}>
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {item.productName || item.product?.name || 'Neznámý produkt'}
                              {isVariant && <div className="text-[11px] text-orange-600 font-normal mt-0.5">objednáno {item.orderedBaseQty} {item.unit} · zbývá {item.remainingBaseQty} {item.unit}</div>}
                            </td>
                            <td className="text-center px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{orderedDisplay}</td>
                            <td className="text-center px-4 py-3 bg-orange-50">
                              {inputEl('center')}
                              {isOverLimit && <div className="text-[10px] text-red-600 mt-0.5 text-center">max {maxAllowed} {item.unit}</div>}
                            </td>
                            <td className="text-center px-4 py-3 text-gray-500 whitespace-nowrap">{isItemNonVat ? '-' : `${itemVatRate}%`}</td>
                            <td className="text-center px-4 py-3 text-gray-700 whitespace-nowrap">{formatPrice(unitPrice)}</td>
                            <td className="text-center px-4 py-3 text-gray-500 whitespace-nowrap">{isItemNonVat ? '-' : formatPrice(vatPerUnit)}</td>
                            <td className="text-center px-4 py-3 text-gray-700 whitespace-nowrap">{formatPrice(priceWithVat)}</td>
                            <td className="text-center px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatPrice(total)}</td>
                          </tr>
                        ) : (
                          <tr key={item.id} className={trBg}>
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {item.productName || item.product?.name || 'Neznámý produkt'}
                              {isVariant && <div className="text-[11px] text-orange-600 font-normal mt-0.5">objednáno {item.orderedBaseQty} {item.unit} · zbývá {item.remainingBaseQty} {item.unit}</div>}
                            </td>
                            <td className="text-right px-4 py-3 text-gray-600 whitespace-nowrap text-sm">{orderedDisplay}</td>
                            <td className="text-right px-4 py-3 bg-orange-50">
                              {inputEl('right')}
                              {isOverLimit && <div className="text-[10px] text-red-600 mt-0.5 text-right">max {maxAllowed} {item.unit}</div>}
                            </td>
                            <td className="text-right px-4 py-3 text-gray-700 whitespace-nowrap">{formatPrice(unitPrice)}</td>
                            <td className="text-right px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatPrice(total)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50 font-bold border-t-2 border-purple-300">
                      <tr>
                        <td colSpan={isVatPayer ? 7 : 4} className="px-4 py-3 text-left text-gray-800">{isVatPayer ? 'CELKEM S DPH:' : 'CELKEM:'}</td>
                        <td className="text-center px-4 py-3 text-lg text-purple-700 whitespace-nowrap">
                          {formatPrice(processingNoteItems.reduce((sum, item) => {
                            const s = shippedQuantities[item.id!] || 0
                            const hasSaved = item.price != null && item.priceWithVat != null
                            const up  = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
                            const vr  = hasSaved ? Number(item.vatRate ?? DEFAULT_VAT_RATE) : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
                            const nv  = isNonVatPayer(vr)
                            const vpu = hasSaved ? Number(item.vatAmount ?? 0) : (nv ? 0 : up * vr / 100)
                            const pwv = hasSaved ? Number(item.priceWithVat) : (up + vpu)
                            const isV = item.isVariant ?? false
                            const packEquiv = isV && item.variantValue ? s / item.variantValue : s
                            return sum + packEquiv * (isVatPayer ? pwv : up)
                          }, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border-l-4 border-blue-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Poznámka</h3>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Poznámka k vyskladnění <span className="text-gray-500 text-xs">(volitelné)</span></label>
                <textarea value={processNote} onChange={e => setProcessNote(e.target.value)}
                  placeholder="Volitelná poznámka k vyskladnění..." rows={3}
                  className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all bg-white"
                />
              </div>

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 p-4 rounded-lg shadow-sm">
                <p className="font-semibold text-yellow-900 mb-1">Upozornění</p>
                <p className="text-sm text-yellow-800">Po vyskladnění se zboží odečte ze skladu a uvolní se rezervace. Tato akce je nevratná.</p>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t-2 border-gray-200">
                <Button variant="ghost" onClick={closeProcessModal} className="px-6 py-2.5">Zrušit</Button>
                <Button onClick={handleConfirmProcess} disabled={isProcessing}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                  {isProcessing ? '⏳ Zpracovávám...' : 'Vyskladnit'}
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
