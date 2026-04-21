'use client'

import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { formatPrice, formatQuantity, formatDateTime } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/generateInvoicePDF'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import {
  useEntityPage, useFilters, EntityPage, LoadingState, ErrorState,
  CustomerOrderDetail,
} from '@/components/erp'
import type { ColumnDef, SelectOption, OrderDetailData } from '@/components/erp'
import Button from '@/components/ui/Button'

export const dynamic = 'force-dynamic'

interface TransactionItem {
  id: string
  quantity: number
  unit: string
  price: number | null
  vatRate?: number
  vatAmount?: number
  priceWithVat?: number
  productId?: string
  productName?: string
  product: { id: string; name: string }
}

interface Transaction {
  id: string
  transactionCode: string
  sumupTransactionCode?: string | null
  totalAmount: number
  paymentType: string
  status: string
  transactionDate: string
  receiptId?: string | null
  items: TransactionItem[]
  customer?: { id: string; name: string } | null
  customerName?: string | null
  deliveryNote?: {
    id: string
    deliveryNumber: string
    deliveryDate: string
    items?: { id: string; quantity: number; product?: { price: number } }[]
    customerOrder?: {
      id: string
      orderNumber: string
      orderDate: string
      note?: string | null
      customer?: { id: string; name: string } | null
    } | null
  } | null
  issuedInvoice?: { id: string; invoiceNumber: string } | null
}

interface Product {
  id: string
  name: string
  price: number
  unit: string
  vatRate?: number
}

const paymentOptions: SelectOption[] = [
  { value: 'all',      label: 'Vše' },
  { value: 'none',     label: '-' },
  { value: 'cash',     label: 'Hotovost' },
  { value: 'card',     label: 'Karta' },
  { value: 'transfer', label: 'Převod' },
]

const statusOptions: SelectOption[] = [
  { value: 'all',       label: 'Vše' },
  { value: 'completed', label: 'Dokončeno', className: 'text-green-600' },
  { value: 'pending',   label: 'Čeká',      className: 'text-yellow-600' },
  { value: 'storno',    label: 'Storno',    className: 'text-red-600' },
]

function StatusBadge({ status }: { status: string }) {
  if (status === 'storno')    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">STORNO</span>
  if (status === 'completed') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Dokončeno</span>
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>
}

export default function TransactionsPage() {
  const highlightId = useSearchParams().get('highlight')

  const [isVatPayer,       setIsVatPayer]       = useState(true)
  const [products,         setProducts]         = useState<Product[]>([])
  const [syncing,          setSyncing]          = useState(false)
  const [showSyncDropdown, setShowSyncDropdown] = useState(false)
  const [syncFromDate,     setSyncFromDate]     = useState(() => new Date().toISOString().split('T')[0])

  const resetPage = useRef<() => void>(() => {})

  const filters = useFilters<Transaction>([
    { key: 'code',       type: 'text',   placeholder: 'SUP...',   match: (r, v) => r.transactionCode.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',       type: 'date',                             match: (r, v) => new Date(r.transactionDate).toISOString().split('T')[0] === v },
    { key: 'sumupCode',  type: 'text',   placeholder: 'MS9W...',  match: (r, v) => (r.sumupTransactionCode || '').toLowerCase().includes(v.toLowerCase()) },
    { key: 'payment',    type: 'select', options: paymentOptions,  match: (r, v) => v === 'all' ? true : v === 'none' ? !r.paymentType : r.paymentType === v },
    { key: 'itemsCount', type: 'number', placeholder: '=',        match: (r, v) => r.items.length === v },
    { key: 'minValue',   type: 'number', placeholder: '≥',        match: (r, v) => r.totalAmount >= v },
    { key: 'status',     type: 'select', options: statusOptions,   match: (r, v) => v === 'all' || r.status === v },
  ], () => resetPage.current())

  const ep = useEntityPage<Transaction>({
    fetchData: async () => {
      const [txRes, pRes, sRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/products'),
        fetch('/api/settings'),
      ])
      const [txData, pData, sData] = await Promise.all([txRes.json(), pRes.json(), sRes.json()])
      setProducts(pData)
      setIsVatPayer(sData.isVatPayer ?? true)
      return txData.transactions || txData
    },
    getRowId: r => r.id,
    filterFn: filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  const columns: ColumnDef<Transaction>[] = [
    { key: 'code',    header: 'Číslo',      render: r => <p className="text-sm font-bold text-gray-700">{r.transactionCode}</p> },
    { key: 'date',    header: 'Datum',      render: r => <p className="text-sm text-gray-900 truncate">{formatDateTime(r.transactionDate)}</p> },
    {
      key: 'sumup',   header: 'Kód SumUp',
      render: r => <p className={`text-sm font-bold text-gray-700 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>{r.sumupTransactionCode || '-'}</p>,
    },
    {
      key: 'payment', header: 'Typ platby',
      render: r => <p className="text-sm text-gray-700">{r.paymentType === 'card' ? 'Karta' : 'Hotovost'}</p>,
    },
    { key: 'items',  header: 'Položek',    render: r => <p className="text-sm text-gray-700">{r.items.filter((i: any) => i.productId !== null).length}</p> },
    { key: 'amount', header: 'Částka',     render: r => <p className="text-sm font-bold text-gray-900">{formatPrice(r.totalAmount)}</p> },
    { key: 'status', header: 'Status',     render: r => <StatusBadge status={r.status} /> },
  ]

  async function handleSync() {
    setSyncing(true)
    try {
      const [year, month, day] = syncFromDate.split('-').map(Number)
      const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      const res  = await fetch('/api/transactions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: startDate.toISOString(), endDate: new Date().toISOString() }),
      })
      const data = await res.json()
      alert(`Synchronizováno ${data.transactions?.length || 0} nových transakcí`)
      await ep.refresh()
      setShowSyncDropdown(false)
    } catch {
      alert('Nepodařilo se synchronizovat transakce')
    } finally {
      setSyncing(false)
    }
  }

  async function handlePrintInvoice(tx: Transaction) {
    try {
      const sRes     = await fetch('/api/settings')
      const settings = await sRes.json()
      await generateInvoicePDF(tx as any, settings)
    } catch {
      alert('Nepodařilo se vygenerovat PDF faktury')
    }
  }

  const syncActions = (
    <div className="relative">
      <button
        onClick={() => setShowSyncDropdown(v => !v)}
        disabled={syncing}
        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-lg shadow hover:from-emerald-600 hover:to-emerald-700 flex items-center gap-2 text-sm disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Synchronizuji...' : 'Synchronizovat ze SumUp'}
      </button>

      {showSyncDropdown && !syncing && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Synchronizovat od data:</label>
              <input
                type="date"
                value={syncFromDate}
                onChange={e => setSyncFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Synchronizují se transakce od tohoto data do dnes</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setShowSyncDropdown(false); handleSync() }} className="flex-1" size="sm">
                Synchronizovat
              </Button>
              <Button onClick={() => setShowSyncDropdown(false)} variant="secondary" size="sm">
                Zrušit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <EntityPage highlightId={ep.highlightId}>
      <EntityPage.Header
        title="Sumup objednávky"
        icon={RefreshCw}
        color="emerald"
        total={ep.rows.length}
        filtered={ep.filtered.length}
        actions={syncActions}
      />

      {filters.bar('auto 1fr 1fr 1fr 1fr 1fr 1fr 1fr')}

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        rowClassName={r => {
          if (r.items.length === 0) return 'bg-red-100 border-red-500'
          if (r.status === 'storno') return 'bg-red-50 opacity-70'
          return ''
        }}
        emptyMessage={ep.rows.length === 0 ? 'Žádné faktury. Synchronizuj transakce ze SumUp API.' : 'Žádné faktury odpovídají zvoleným filtrům.'}
        renderDetail={tx => {
          const detail: OrderDetailData = {
            id: tx.id,
            orderNumber: tx.transactionCode,
            orderDate: tx.transactionDate,
            status: tx.status === 'completed' ? 'paid' : tx.status === 'storno' ? 'cancelled' : 'new',
            totalAmount: tx.totalAmount,
            paidAt: tx.transactionDate,
            customerName: tx.deliveryNote?.customerOrder?.customer?.name || tx.customer?.name || tx.customerName || 'Anonymní zákazník',
            paymentReference: tx.sumupTransactionCode || null,
            items: tx.items
              .filter((i: any) => i.productId !== null)
              .map((i: any) => ({
                id: i.id,
                productId: i.productId,
                productName: i.productName || i.product?.name,
                quantity: Number(i.quantity),
                unit: i.unit,
                price: Number(i.price || 0),
                vatRate: Number(i.vatRate || 0),
                vatAmount: Number(i.vatAmount || 0),
                priceWithVat: Number(i.priceWithVat || 0),
                product: i.product ? { id: i.product.id, name: i.product.name, price: Number(i.price || 0), unit: i.unit } : null,
              })),
            issuedInvoice: tx.issuedInvoice ? {
              id: tx.issuedInvoice.id,
              invoiceNumber: tx.issuedInvoice.invoiceNumber,
              paymentStatus: 'paid',
              status: 'completed',
              invoiceDate: tx.transactionDate,
            } : null,
            deliveryNotes: tx.deliveryNote ? [{
              id: tx.deliveryNote.id,
              deliveryNumber: tx.deliveryNote.deliveryNumber,
              deliveryDate: tx.deliveryNote.deliveryDate,
              status: 'active',
              items: (tx.deliveryNote.items || []).map((i: any) => ({
                id: i.id,
                quantity: Number(i.quantity),
                unit: 'ks',
              })),
            }] : [],
          }

          return (
            <>
              {tx.receiptId && (() => {
                const match = tx.receiptId!.match(/urn:sumup:pos:sale:([^:]+):([a-f0-9-]{36})[:;]/)
                if (!match) return null
                const receiptUrl = `https://sales-receipt.sumup.com/pos/public/v1/${match[1]}/receipt/${match[2]}?format=html`
                return (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-center flex items-center justify-center gap-4">
                    <span className="text-gray-600">SumUp účtenka:</span>
                    <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium flex items-center gap-1">
                      Zobrazit <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )
              })()}
              <CustomerOrderDetail
                order={detail}
                isVatPayer={isVatPayer}
                onPrintPdf={tx.transactionCode.match(/^\d{7}$/) ? () => handlePrintInvoice(tx) : undefined}
              />
            </>
          )
        }}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
