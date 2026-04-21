'use client'

import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { FileText, XCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import {
  useEntityPage, useFilters, EntityPage, LoadingState, ErrorState,
  LinkedDocumentBanner, ActionToolbar, CustomerOrderDetail,
} from '@/components/erp'
import type { ColumnDef, SelectOption, OrderDetailData } from '@/components/erp'

export const dynamic = 'force-dynamic'

interface CreditNoteItem {
  id: string
  productName: string | null
  quantity: number
  unit: string
  price: number
  vatRate: number
  vatAmount: number
  priceWithVat: number
}

interface CreditNote {
  id: string
  creditNoteNumber: string
  issuedInvoiceId: string
  invoiceNumber: string
  creditNoteDate: string
  totalAmount: number
  totalAmountWithoutVat: number
  totalVatAmount: number
  reason: string | null
  note: string | null
  status: string
  stornoReason: string | null
  stornoAt: string | null
  customer: {
    id: string
    name: string
    entityType?: string
    ico?: string
    dic?: string
    address?: string
    phone?: string
    email?: string
    contact?: string
    website?: string
    bankAccount?: string
    note?: string
  } | null
  customerName: string | null
  customerEntityType: string | null
  customerEmail: string | null
  customerPhone: string | null
  customerAddress: string | null
  customerIco: string | null
  customerDic: string | null
  items: CreditNoteItem[]
  customerOrderId: string | null
  customerOrderNumber: string | null
  transactionId: string | null
  transactionCode: string | null
}

const statusOptions: SelectOption[] = [
  { value: 'all',    label: 'Vše' },
  { value: 'active', label: 'Aktivní', className: 'text-purple-600' },
  { value: 'storno', label: 'STORNO',  className: 'text-red-600'    },
]

export default function CreditNotesPage() {
  const highlightId  = useSearchParams().get('highlight')
  const [isVatPayer, setIsVatPayer] = useState(true)

  const resetPage = useRef<() => void>(() => {})

  const filters = useFilters<CreditNote>([
    { key: 'number',   type: 'text',   placeholder: 'Číslo...',      match: (r, v) => r.creditNoteNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',     type: 'date',                                   match: (r, v) => new Date(r.creditNoteDate).toISOString().split('T')[0] === v },
    { key: 'customer', type: 'text',   placeholder: 'Odběratel...',   match: (r, v) => (r.customer?.name || r.customerName || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'invoice',  type: 'text',   placeholder: 'Faktura...',     match: (r, v) => r.invoiceNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'minItems', type: 'number', placeholder: '≥',              match: (r, v) => (r.items?.length || 0) >= v },
    { key: 'minValue', type: 'number', placeholder: '≥',              match: (r, v) => Math.abs(r.totalAmount) >= v },
    { key: 'status',   type: 'select', options: statusOptions,         match: (r, v) => v === 'all' || r.status === v },
  ], () => resetPage.current())

  const ep = useEntityPage<CreditNote>({
    fetchData: async () => {
      const [cnRes, sRes] = await Promise.all([fetch('/api/credit-notes'), fetch('/api/settings')])
      const [cn, s]       = await Promise.all([cnRes.json(), sRes.json()])
      setIsVatPayer(s.isVatPayer ?? true)
      return cn
    },
    getRowId: r => r.id,
    filterFn: filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  const columns: ColumnDef<CreditNote>[] = [
    {
      key: 'number', header: 'Číslo',
      render: r => (
        <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>
          {r.creditNoteNumber}
        </p>
      ),
    },
    {
      key: 'date', header: 'Datum',
      render: r => <p className="text-sm text-gray-700">{new Date(r.creditNoteDate).toLocaleDateString('cs-CZ')}</p>,
    },
    {
      key: 'customer', header: 'Odběratel',
      render: r => r.customer?.id
        ? <a href={`/customers?highlight=${r.customer.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{r.customer.name}</a>
        : <p className="text-sm text-gray-700 truncate">{r.customerName || <em className="text-gray-400 not-italic">Bez odběratele</em>}</p>,
    },
    {
      key: 'invoice', header: 'Faktura',
      render: r => (
        <a href={`/invoices/issued?highlight=${r.issuedInvoiceId}`} className="text-sm text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
          {r.invoiceNumber}
        </a>
      ),
    },
    { key: 'items',  header: 'Položek', render: r => <p className="text-sm text-gray-600">{r.items.length}</p> },
    { key: 'value',  header: 'Hodnota', render: r => <p className="text-sm font-bold text-red-600">{formatPrice(r.totalAmount)}</p> },
    {
      key: 'status', header: 'Status',
      render: r => r.status === 'storno'
        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">STORNO</span>
        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Aktivní</span>,
    },
  ]

  async function handleStorno(cn: CreditNote) {
    const reason = prompt(`Opravdu chceš stornovat dobropis ${cn.creditNoteNumber}?\n\nZadej důvod storna (volitelně):`)
    if (reason === null) return
    try {
      const res  = await fetch(`/api/credit-notes/${cn.id}/storno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      })
      const data = await res.json()
      if (res.ok) { alert('Dobropis byl stornován!'); await ep.refresh() }
      else alert(`Nepodařilo se stornovat dobropis: ${data.error}`)
    } catch {
      alert('Nepodařilo se stornovat dobropis')
    }
  }

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Dobropisy"
        icon={FileText}
        color="purple"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        onRefresh={ep.refresh}
      />

      {filters.bar('auto 1fr 1fr 1fr 1fr 1fr 1fr 1fr')}

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={cn => {
          const detail: OrderDetailData = {
            id: cn.id,
            orderNumber: cn.creditNoteNumber,
            orderDate: cn.creditNoteDate,
            status: cn.status === 'storno' ? 'cancelled' : 'paid',
            totalAmount: cn.totalAmount,
            customerName: cn.customer?.name || cn.customerName || null,
            customerEmail: cn.customerEmail,
            customerPhone: cn.customerPhone,
            customerAddress: cn.customerAddress,
            billingIco: cn.customerIco || null,
            billingName: cn.customer?.name || cn.customerName || null,
            note: [cn.reason, cn.note].filter(Boolean).join(' · ') || null,
            stornoAt: cn.stornoAt,
            stornoReason: cn.stornoReason,
            items: cn.items.map(i => ({
              id: i.id,
              productId: null,
              productName: i.productName,
              quantity: i.quantity,
              unit: i.unit,
              price: i.price,
              vatRate: i.vatRate,
              vatAmount: i.vatAmount,
              priceWithVat: i.priceWithVat,
            })),
            issuedInvoice: {
              id: cn.issuedInvoiceId,
              invoiceNumber: cn.invoiceNumber,
              paymentStatus: 'paid',
              status: 'active',
              invoiceDate: cn.creditNoteDate,
            },
          }

          return (
            <>
              {(() => {
                const links = [
                  { label: 'Faktura', value: cn.invoiceNumber, href: `/invoices/issued?highlight=${cn.issuedInvoiceId}` },
                  ...(cn.customerOrderId ? [{ label: 'Objednávka', value: cn.customerOrderNumber || 'Zobrazit', href: `/customer-orders?highlight=${cn.customerOrderId}` }] : []),
                  ...(!cn.customerOrderId && cn.transactionId ? [{ label: 'Transakce', value: cn.transactionCode || 'Zobrazit', href: `/transactions?highlight=${cn.transactionId}` }] : []),
                ]
                return <LinkedDocumentBanner links={links} color="purple" />
              })()}

              <CustomerOrderDetail
                order={detail}
                isVatPayer={isVatPayer}
              />

              {cn.status !== 'storno' && (
                <ActionToolbar
                  right={
                    <button
                      onClick={() => handleStorno(cn)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Stornovat
                    </button>
                  }
                />
              )}
            </>
          )
        }}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
