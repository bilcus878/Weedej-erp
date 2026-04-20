'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import { formatPrice, formatDate } from '@/lib/utils'
import { generateEshopOrderPDF } from '@/lib/generateEshopOrderPDF'
import { Globe } from 'lucide-react'
import {
  useEntityPage, EntityPage, FilterInput, FilterSelect, LoadingState, ErrorState,
  CustomerOrderDetail, EmptyState,
} from '@/components/erp'
import type { ColumnDef, SelectOption, OrderDetailData } from '@/components/erp'

export const dynamic = 'force-dynamic'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EshopOrderItem {
  id: string
  productId?: string | null
  productName?: string | null
  quantity: number
  unit: string
  price: number
  vatRate: number
  vatAmount: number
  priceWithVat: number
  product?: { id: string; name: string; price: number; unit: string } | null
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
  paymentReference?: string | null
  trackingNumber?: string | null
  carrier?: string | null
  stornoAt?: string | null
  stornoBy?: string | null
  stornoReason?: string | null
  note?: string | null
  shippingMethod?:     string | null
  pickupPointId?:      string | null
  pickupPointName?:    string | null
  pickupPointAddress?: string | null
  pickupPointCarrier?: string | null
  billingName?:        string | null
  billingCompany?:     string | null
  billingIco?:         string | null
  billingStreet?:      string | null
  billingCity?:        string | null
  billingZip?:         string | null
  billingCountry?:     string | null
  items: EshopOrderItem[]
  issuedInvoice?: IssuedInvoiceSummary | null
  EshopUser?: EshopUser | null
  deliveryNotes?: EshopDeliveryNote[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCustomerName(o: EshopOrder)  { return o.customerName  || o.EshopUser?.name  || 'Zákazník' }
function getCustomerEmail(o: EshopOrder) { return o.customerEmail || o.EshopUser?.email || '' }
function getCustomerPhone(o: EshopOrder) { return o.customerPhone || o.EshopUser?.phone || '' }

function orderToDetailData(order: EshopOrder): OrderDetailData {
  return {
    id:            order.id,
    orderNumber:   order.orderNumber,
    orderDate:     order.orderDate,
    status:        order.status,
    totalAmount:   order.totalAmount,
    totalVatAmount: order.totalVatAmount,
    paidAt:        order.paidAt,
    shippedAt:     order.shippedAt,
    customerName:  getCustomerName(order),
    customerEmail: getCustomerEmail(order) || null,
    customerPhone: getCustomerPhone(order) || null,
    customerAddress:    order.customerAddress,
    paymentReference:   order.paymentReference,
    trackingNumber:     order.trackingNumber,
    carrier:            order.carrier,
    stornoAt:           order.stornoAt,
    stornoBy:           order.stornoBy,
    stornoReason:       order.stornoReason,
    note:               order.note,
    shippingMethod:     order.shippingMethod,
    pickupPointId:      order.pickupPointId,
    pickupPointName:    order.pickupPointName,
    pickupPointAddress: order.pickupPointAddress,
    pickupPointCarrier: order.pickupPointCarrier,
    billingName:        order.billingName,
    billingCompany:     order.billingCompany,
    billingIco:         order.billingIco,
    billingStreet:      order.billingStreet,
    billingCity:        order.billingCity,
    billingZip:         order.billingZip,
    billingCountry:     order.billingCountry,
    items: order.items.map(item => ({
      id:           item.id,
      productId:    item.productId ?? null,
      productName:  item.productName ?? null,
      quantity:     Number(item.quantity),
      unit:         item.unit,
      price:        Number(item.price),
      vatRate:      Number(item.vatRate),
      vatAmount:    Number(item.vatAmount),
      priceWithVat: Number(item.priceWithVat),
      product:      item.product ?? null,
    })),
    issuedInvoice: order.issuedInvoice ? {
      id:            order.issuedInvoice.id,
      invoiceNumber: order.issuedInvoice.invoiceNumber,
      paymentStatus: order.issuedInvoice.paymentStatus,
      status:        order.issuedInvoice.status,
      invoiceDate:   order.issuedInvoice.invoiceDate,
    } : null,
    deliveryNotes: (order.deliveryNotes ?? []).map(dn => ({
      id:             dn.id,
      deliveryNumber: dn.deliveryNumber,
      deliveryDate:   dn.deliveryDate,
      status:         dn.status,
      items: dn.items.map(item => ({
        id:           item.id,
        quantity:     Number(item.quantity),
        unit:         item.unit,
        productName:  item.productName ?? null,
        price:        item.price != null ? Number(item.price) : null,
        priceWithVat: item.priceWithVat != null ? Number(item.priceWithVat) : null,
        vatRate:      item.vatRate != null ? Number(item.vatRate) : null,
        vatAmount:    item.vatAmount != null ? Number(item.vatAmount) : null,
        product:      item.product ?? null,
      })),
    })),
  }
}

// ─── Options ─────────────────────────────────────────────────────────────────

const statusOptions: SelectOption[] = [
  { value: 'all',        label: 'Vše' },
  { value: 'paid',       label: 'Zaplaceno',       className: 'text-yellow-700' },
  { value: 'processing', label: 'Část. odesláno',  className: 'text-blue-700'   },
  { value: 'shipped',    label: 'Odesláno',         className: 'text-purple-700' },
  { value: 'delivered',  label: 'Doručeno',         className: 'text-green-700'  },
  { value: 'cancelled',  label: 'Zrušeno',          className: 'text-red-700'    },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EshopOrdersPage() {
  const highlightId = useSearchParams().get('highlight')

  const [isVatPayer,       setIsVatPayer]       = useState(true)
  const [processingStatus, setProcessingStatus] = useState<string | null>(null)

  const ep = useEntityPage<EshopOrder>({
    fetchData: async () => {
      const [oRes, sRes] = await Promise.all([fetch('/api/eshop-orders'), fetch('/api/settings')])
      const [oData, sData] = await Promise.all([oRes.json(), sRes.json()])
      setIsVatPayer(sData.isVatPayer ?? true)
      return Array.isArray(oData) ? oData : []
    },
    getRowId: r => r.id,
    filterFn: (r, f) => {
      if (f.number   && !r.orderNumber.toLowerCase().includes(f.number.toLowerCase())) return false
      if (f.date)    { const d = new Date(r.orderDate).toISOString().split('T')[0]; if (d !== f.date) return false }
      if (f.customer){ const q = f.customer.toLowerCase(); if (!getCustomerName(r).toLowerCase().includes(q) && !getCustomerEmail(r).toLowerCase().includes(q)) return false }
      if (f.minValue && Number(r.totalAmount) < parseFloat(f.minValue)) return false
      if (f.status && f.status !== 'all' && r.status !== f.status) return false
      return true
    },
    highlightId,
  })

  const columns: ColumnDef<EshopOrder>[] = [
    {
      key: 'number', header: 'Číslo',
      render: r => <p className={`text-sm font-bold text-gray-700 ${['cancelled','storno'].includes(r.status) ? 'line-through' : ''}`}>{r.orderNumber}</p>,
    },
    {
      key: 'date', header: 'Datum',
      render: r => (
        <>
          <p className="text-sm text-gray-900">{formatDate(r.orderDate)}</p>
          <p className="text-xs text-gray-400">{new Date(r.orderDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</p>
        </>
      ),
    },
    {
      key: 'customer', header: 'Zákazník', width: '2fr',
      render: r => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{getCustomerName(r)}</p>
          {getCustomerEmail(r) && <p className="text-xs text-gray-400 truncate">{getCustomerEmail(r)}</p>}
        </div>
      ),
    },
    { key: 'items',  header: 'Položek', render: r => <p className="text-sm text-gray-700">{r.items.length}</p> },
    {
      key: 'amount', header: 'Hodnota',
      render: r => (
        <>
          <p className="text-sm font-bold text-gray-900">{formatPrice(Number(r.totalAmount))}</p>
          {isVatPayer && Number(r.totalVatAmount) > 0 && <p className="text-xs text-gray-400">DPH: {formatPrice(Number(r.totalVatAmount))}</p>}
        </>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: r => {
        const map: Record<string, { bg: string; text: string; label: string }> = {
          paid:       { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Zaplaceno'         },
          shipped:    { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Odesláno'           },
          delivered:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Doručeno'           },
          cancelled:  { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Zrušeno'            },
          storno:     { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Zrušeno'            },
          processing: { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Část. odesláno'     },
          new:        { bg: 'bg-gray-100',   text: 'text-gray-800',   label: 'Nová'               },
        }
        const s = map[r.status] ?? { bg: 'bg-gray-100', text: 'text-gray-800', label: r.status }
        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>
      },
    },
  ]

  async function handleUpdateStatus(orderId: string, newStatus: string) {
    setProcessingStatus(orderId)
    try {
      const res = await fetch(`/api/eshop-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Nepodařilo se aktualizovat status'); return }
      await ep.refresh()
    } catch { alert('Chyba při aktualizaci statusu') }
    finally { setProcessingStatus(null) }
  }

  async function handlePrintInvoice(order: EshopOrder) {
    try {
      const sRes = await fetch('/api/settings')
      await generateEshopOrderPDF(order, await sRes.json())
    } catch { alert('Nepodařilo se vygenerovat PDF') }
  }

  if (ep.loading) return <LoadingState message="Načítání eshop objednávek..." />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Eshop objednávky"
        icon={Globe}
        color="blue"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      <EntityPage.Filters onClear={ep.clearFilters} columns="auto 1fr 1fr 2fr 1fr 1fr 1fr">
        <FilterInput value={ep.filters.number   ?? ''} onChange={v => ep.setFilter('number',   v)} placeholder="ESH..." />
        <FilterInput value={ep.filters.date     ?? ''} onChange={v => ep.setFilter('date',     v)} type="date" />
        <FilterInput value={ep.filters.customer ?? ''} onChange={v => ep.setFilter('customer', v)} placeholder="Zákazník / email..." className="text-left" />
        <div />
        <FilterInput value={ep.filters.minValue ?? ''} onChange={v => ep.setFilter('minValue', v)} type="number" placeholder="≥ Kč" />
        <FilterSelect value={ep.filters.status  ?? 'all'} onChange={v => ep.setFilter('status', v)} options={statusOptions} />
      </EntityPage.Filters>

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        rowClassName={r => ['cancelled','storno'].includes(r.status) ? 'opacity-60' : ''}
        empty={
          <EmptyState
            icon={Globe}
            message={ep.rows.length === 0
              ? 'Žádné eshop objednávky. Objednávky se zobrazí automaticky po platbě přes e-shop.'
              : 'Žádné objednávky neodpovídají zvoleným filtrům.'}
            action={ep.rows.length > 0
              ? <Button onClick={ep.clearFilters} variant="secondary" size="sm">Vymazat filtry</Button>
              : undefined}
          />
        }
        renderDetail={order => (
          <CustomerOrderDetail
            order={orderToDetailData(order)}
            isVatPayer={isVatPayer}
            onPrintPdf={() => handlePrintInvoice(order)}
            onUpdateStatus={status => handleUpdateStatus(order.id, status)}
            onRefresh={ep.refresh}
            processingStatus={processingStatus === order.id}
          />
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
