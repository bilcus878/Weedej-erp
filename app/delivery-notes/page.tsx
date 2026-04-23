'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Package, FileDown, XCircle } from 'lucide-react'
import { formatDate, formatPrice } from '@/lib/utils'
import { formatVariantQty } from '@/lib/formatVariantQty'
import { calcPackCount } from '@/lib/packQuantity'
import { resolveItemQuantities } from '@/lib/variantConversion'
import { generateDeliveryNotePDF, openPDFInNewTab } from '@/lib/pdfGenerator'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import {
  useEntityPage, useFilters, EntityPage, LoadingState, ErrorState,
  ActionToolbar, CustomerOrderDetail,
} from '@/components/erp'
import type { ColumnDef, SelectOption, OrderDetailData, OrderDetailItem } from '@/components/erp'
import { ExpectedOrdersButton } from '@/components/warehouse/expected/ExpectedOrdersButton'
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

function mapDeliveryNoteToOrderDetail(note: DeliveryNote, isVatPayer: boolean): OrderDetailData {
  const productItems = note.items.filter(item => item.productId != null)
  // customerOrder carries all CustomerOrder model fields at runtime via [key: string]: any
  const co = note.customerOrder as any

  const mappedItems: OrderDetailItem[] = productItems.map(item => {
    const hasSaved        = item.price != null && item.priceWithVat != null
    const unitPrice       = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
    const itemVatRate     = hasSaved
      ? Number(item.vatRate ?? DEFAULT_VAT_RATE)
      : Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
    const isItemNonVat    = isNonVatPayer(itemVatRate)
    const vatPerUnit      = hasSaved
      ? Number(item.vatAmount ?? 0)
      : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
    const priceWithVat    = hasSaved ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
    const packCount       = calcPackCount(Number(item.quantity), item.productName, item.unit)
    const displayUnit     = item.unit !== 'ks' && item.productName?.includes(' — ') ? 'ks' : item.unit
    return {
      id:           item.id,
      productId:    item.productId,
      productName:  item.productName,
      quantity:     packCount,
      unit:         displayUnit,
      price:        unitPrice,
      vatRate:      itemVatRate,
      vatAmount:    vatPerUnit,
      priceWithVat: priceWithVat,
      product:      item.product
        ? { id: item.product.id, name: item.product.name, price: Number(item.product.price), unit: displayUnit }
        : undefined,
    }
  })

  // Total from product items only — shipping is never included here
  const totalAmount = mappedItems.reduce(
    (sum, item) => sum + item.quantity * (isVatPayer ? item.priceWithVat : item.price),
    0,
  )

  const invoice = co?.issuedInvoice || note.issuedInvoice

  return {
    id:          note.id,
    // Show related order number so the link in the summary panel points to the source order.
    // Falls back to the delivery note number if there is no linked order.
    orderNumber: co?.orderNumber || note.deliveryNumber,
    orderDate:   co?.orderDate   || note.deliveryDate,
    // Translate DN status to a value CustomerOrderDetail's getStatusBadge knows.
    // 'active' / 'delivered' / 'draft' all mean "issued" in DN context → 'delivered'.
    status:      note.status === 'storno' ? 'storno' : 'delivered',
    totalAmount,

    // ── Order-level dates and payment info from the linked customer order ──
    paidAt:           co?.paidAt    ? new Date(co.paidAt).toISOString()    : null,
    shippedAt:        co?.shippedAt ? new Date(co.shippedAt).toISOString() : null,
    paymentReference: co?.paymentReference || null,

    // ── Customer contact — sourced from the linked customer order ──────────
    customerName:    note.customer?.name || co?.customerName || note.customerName || null,
    customerEmail:   co?.customerEmail   || null,
    customerPhone:   co?.customerPhone   || null,
    customerAddress: co?.customerAddress || null,

    // ── Billing address snapshot from the linked customer order ───────────
    billingName:    co?.billingName    || null,
    billingCompany: co?.billingCompany || null,
    billingIco:     co?.billingIco     || (note.customer as any)?.ico || null,
    billingStreet:  co?.billingStreet  || null,
    billingCity:    co?.billingCity    || null,
    billingZip:     co?.billingZip     || null,
    billingCountry: co?.billingCountry || null,

    // ── Shipping / delivery info — displayed as informational, not billed ─
    // These fields are shown in the Doručení panel but are NOT part of items
    // and therefore never affect subtotal or total calculations.
    shippingMethod:     co?.shippingMethod     || null,
    pickupPointId:      co?.pickupPointId      || null,
    pickupPointName:    co?.pickupPointName    || null,
    pickupPointAddress: co?.pickupPointAddress || null,
    pickupPointCarrier: co?.pickupPointCarrier || null,
    trackingNumber:     co?.trackingNumber     || null,
    carrier:            co?.carrier            || null,

    items: mappedItems,

    issuedInvoice: invoice ? {
      id:             invoice.id,
      invoiceNumber:  invoice.invoiceNumber,
      paymentStatus:  (invoice as any).paymentStatus  || 'unknown',
      paymentType:    (invoice as any).paymentType    || null,
      status:         (invoice as any).status         || 'active',
      invoiceDate:    (invoice as any).invoiceDate    || note.deliveryDate,
      dueDate:        (invoice as any).dueDate        || null,
      variableSymbol: (invoice as any).variableSymbol || null,
      constantSymbol: (invoice as any).constantSymbol || null,
      specificSymbol: (invoice as any).specificSymbol || null,
    } : null,

    // Pass the delivery note itself so CustomerOrderDetail can build
    // the inventoryItemId lookup for inventory movement links in the items table.
    deliveryNotes: [{
      id:             note.id,
      deliveryNumber: note.deliveryNumber,
      deliveryDate:   note.deliveryDate,
      status:         note.status === 'storno' ? 'storno' : 'active',
      items:          note.items.map(item => ({
        id:              item.id,
        quantity:        Number(item.quantity),
        unit:            item.unit,
        productId:       item.productId,
        inventoryItemId: item.inventoryItemId || null,
        productName:     item.productName,
        price:           item.price,
        priceWithVat:    item.priceWithVat,
        vatRate:         item.vatRate,
        vatAmount:       item.vatAmount,
        product:         item.product,
      })),
    }],
  }
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

export default function DeliveryNotesPage() {
  const highlightId = useSearchParams().get('highlight')

  const [isVatPayer, setIsVatPayer] = useState(true)
  const [pendingOrders, setPendingOrders] = useState<CustomerOrder[]>([])


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
        const packs     = calcPackCount(Number(item.quantity), item.productName, item.unit)
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
          const packs = calcPackCount(Number(item.quantity), item.productName, item.unit)
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
          const packs = calcPackCount(Number(item.quantity), item.productName, item.unit)
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
            const packs     = calcPackCount(Number(item.quantity), item.productName, item.unit)
            return sum + packs * (isVatPayer ? withVat : unitPrice)
          }, 0)) : '-'}
        </p>
      ),
    },
    { key: 'status', header: 'Status', render: r => getStatusBadge(r.status) },
  ]

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

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

      {filters.bar('auto 1fr 1fr 1fr 1fr 1fr 1fr')}

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        firstHeader={
          <ExpectedOrdersButton
            orders={pendingOrders.map(o => ({
              id: o.id,
              orderNumber: o.orderNumber,
              partyName: o.customer?.name || o.customerName || 'Anonymní zákazník',
              orderDate: o.orderDate,
              badge: 'Zaplaceno',
            }))}
            headerLabel="Čeká na expedici"
            actionLabel="Vyskladnit"
            searchPlaceholder="Hledat číslo obj. nebo odběratel..."
            autoOpen={pendingOrders.length > 0}
            onAction={handlePrepareShipment}
          />
        }
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={note => {
          const orderHref = note.customerOrder
            ? `/${note.customerOrder.orderNumber?.startsWith('ESH') ? 'eshop-orders' : 'customer-orders'}?highlight=${note.customerOrder.id}`
            : undefined

          return (
            <>
              {/* Shipping is visible for warehouse context (delivery address / carrier).
                  Shipping cost is never part of items, so it never affects calculations. */}
              <CustomerOrderDetail
                order={mapDeliveryNoteToOrderDetail(note, isVatPayer)}
                isVatPayer={isVatPayer}
                orderHref={orderHref}
                showDeliveryNotes={false}
                disableTrackingEdit={true}
              />

              {note.note && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
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
          )
        }}
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
