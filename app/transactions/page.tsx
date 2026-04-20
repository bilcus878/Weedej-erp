'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { formatPrice, formatQuantity, formatDateTime } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/generateInvoicePDF'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import {
  useEntityPage, EntityPage, FilterInput, FilterSelect, LoadingState, ErrorState,
} from '@/components/erp'
import type { ColumnDef, SelectOption } from '@/components/erp'
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
    filterFn: (r, f) => {
      if (f.code      && !r.transactionCode.toLowerCase().includes(f.code.toLowerCase())) return false
      if (f.sumupCode && !r.sumupTransactionCode?.toLowerCase().includes(f.sumupCode.toLowerCase())) return false
      if (f.date) { const d = new Date(r.transactionDate).toISOString().split('T')[0]; if (d !== f.date) return false }
      if (f.minValue  && r.totalAmount < parseFloat(f.minValue)) return false
      if (f.payment && f.payment !== 'all') {
        if (f.payment === 'none' ? r.paymentType : r.paymentType !== f.payment) return false
      }
      if (f.itemsCount) { const c = parseInt(f.itemsCount); if (!isNaN(c) && r.items.length !== c) return false }
      if (f.status && f.status !== 'all' && r.status !== f.status) return false
      return true
    },
    highlightId,
  })

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

      <EntityPage.Filters onClear={ep.clearFilters} columns="auto 1fr 1fr 1fr 1fr 1fr 1fr 1fr">
        <FilterInput value={ep.filters.code      ?? ''} onChange={v => ep.setFilter('code',      v)} placeholder="SUP..." />
        <FilterInput value={ep.filters.date      ?? ''} onChange={v => ep.setFilter('date',      v)} type="date" />
        <FilterInput value={ep.filters.sumupCode ?? ''} onChange={v => ep.setFilter('sumupCode', v)} placeholder="MS9W..." />
        <FilterSelect value={ep.filters.payment  ?? 'all'} onChange={v => ep.setFilter('payment', v)} options={paymentOptions} />
        <FilterInput value={ep.filters.itemsCount ?? ''} onChange={v => ep.setFilter('itemsCount', v)} type="number" placeholder="=" />
        <FilterInput value={ep.filters.minValue  ?? ''} onChange={v => ep.setFilter('minValue',  v)} type="number" placeholder="≥" />
        <FilterSelect value={ep.filters.status   ?? 'all'} onChange={v => ep.setFilter('status',  v)} options={statusOptions} />
      </EntityPage.Filters>

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
        renderDetail={tx => (
          <>
            {/* SumUp receipt + invoice banner */}
            {tx.receiptId && (() => {
              const match = tx.receiptId.match(/urn:sumup:pos:sale:([^:]+):([a-f0-9-]{36})[:;]/)
              if (!match) return null
              const receiptUrl = `https://sales-receipt.sumup.com/pos/public/v1/${match[1]}/receipt/${match[2]}?format=html`
              return (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-sm text-center flex items-center justify-center gap-4">
                    {tx.issuedInvoice && (
                      <>
                        <span className="text-gray-600">Faktura: </span>
                        <Link href={`/invoices/issued?highlight=${tx.issuedInvoice.id}`} className="text-blue-600 hover:underline font-medium">
                          {tx.issuedInvoice.invoiceNumber}
                          <ExternalLink className="w-3 h-3 inline ml-1" />
                        </Link>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">SumUp účtenka: </span>
                      <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                        Zobrazit<ExternalLink className="w-3 h-3 inline ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* PDF invoice */}
            {tx.transactionCode.match(/^\d{7}$/) && (
              <div className="mb-3">
                <span className="text-sm font-medium text-gray-700">PDF faktura: </span>
                <button onClick={() => handlePrintInvoice(tx)} className="text-blue-600 hover:underline text-sm font-medium">
                  Generovat
                </button>
              </div>
            )}

            {/* Transaction info */}
            <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
              <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Informace o transakci</h4>
              <div className="border-b">
                <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Obecné</h5>
                <div className="text-sm">
                  <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-white">
                    <div><span className="text-gray-600">Datum vytvoření:</span> <span className="font-medium">{new Date(tx.transactionDate).toLocaleDateString('cs-CZ')}</span></div>
                    <div className="border-l border-gray-200 mx-4" />
                    <div><span className="text-gray-600">Vydáno:</span> <span className="font-medium">{tx.deliveryNote ? new Date(tx.deliveryNote.deliveryDate).toLocaleDateString('cs-CZ') : new Date(tx.transactionDate).toLocaleDateString('cs-CZ')}</span></div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-2 bg-gray-50">
                    <div><span className="text-gray-600">Zaplaceno:</span> <span className="font-medium">{new Date(tx.transactionDate).toLocaleDateString('cs-CZ')}</span></div>
                    <div className="border-l border-gray-200 mx-4" />
                    <div><span className="text-gray-600">Typ platby:</span> <span className="font-medium">
                      {tx.paymentType === 'cash' ? 'Hotovost' : tx.paymentType === 'card' ? 'Karta' : tx.paymentType === 'transfer' ? 'Bankovní převod' : '-'}
                    </span></div>
                  </div>
                </div>
              </div>
              <div>
                <h5 className="text-sm font-semibold text-gray-800 px-4 py-3 bg-gray-50">Odběratel / Zákazník</h5>
                <div className="px-4 py-2 bg-white text-sm">
                  <span className="text-gray-600">Název:</span>
                  <span className="font-medium ml-2">
                    {tx.deliveryNote?.customerOrder?.customer?.name || tx.customer?.name || tx.customerName || 'Anonymní zákazník'}
                  </span>
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
              <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">
                Položky ({tx.items.filter((i: any) => i.productId !== null).length})
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

                {tx.items.filter((i: any) => i.productId !== null).map((item: any, idx: number) => {
                  const catalog       = products.find(p => p.id === item.product.id)
                  const vatRate       = Number(item.vatRate || (catalog as any)?.vatRate || DEFAULT_VAT_RATE)
                  const isItemNonVat  = isNonVatPayer(vatRate)
                  const unitPrice     = Number(item.price || 0)
                  const vatPerUnit    = Number(item.vatAmount || 0)
                  const priceWithVat  = Number(item.priceWithVat || 0)
                  const totalWithVat  = priceWithVat * Number(item.quantity)
                  const totalNoVat    = unitPrice * Number(item.quantity)

                  return isVatPayer ? (
                    <div key={item.id} className={`grid grid-cols-[3fr_repeat(6,1fr)] gap-2 px-4 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-xs`}>
                      <div className="text-gray-900">{item.product.name}</div>
                      <div className="text-center text-gray-700">{formatQuantity(item.quantity, item.unit)}</div>
                      <div className="text-center text-gray-500">{isItemNonVat ? '-' : `${vatRate}%`}</div>
                      <div className="text-center text-gray-700">{formatPrice(unitPrice)}</div>
                      <div className="text-center text-gray-500">{isItemNonVat ? '-' : formatPrice(vatPerUnit)}</div>
                      <div className="text-center text-gray-700">{formatPrice(priceWithVat)}</div>
                      <div className="text-center font-semibold text-gray-900">{formatPrice(totalWithVat)}</div>
                    </div>
                  ) : (
                    <div key={item.id} className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <div className="text-gray-900">{item.product.name}</div>
                      <div className="text-right text-gray-700">{formatQuantity(item.quantity, item.unit)}</div>
                      <div className="text-right text-gray-700">{formatPrice(unitPrice)}</div>
                      <div className="text-right font-semibold text-gray-900">{formatPrice(totalNoVat)}</div>
                    </div>
                  )
                })}

                {/* Discount / subtotal */}
                {(() => {
                  const catalogTotal   = tx.items.filter((i: any) => i.productId !== null).reduce((sum: number, i: any) => sum + (Number(i.priceWithVat || i.price || 0) * Number(i.quantity || 1)), 0)
                  const discountItem   = tx.items.find((i: any) => i.productId === null)
                  const discountAmount = discountItem ? (Number(discountItem.priceWithVat) || Number(discountItem.price) || 0) * Number(discountItem.quantity || 1) : 0
                  if (discountAmount === 0) return null
                  const spanClass = isVatPayer ? 'col-span-6' : 'col-span-3'
                  return (
                    <>
                      <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-50 border-t text-sm`}>
                        <div className={spanClass}>Mezisoučet</div>
                        <div className="text-center">{formatPrice(catalogTotal)}</div>
                      </div>
                      <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-yellow-50 border-t text-sm`}>
                        <div className={spanClass} style={{ fontWeight: 500, color: '#111827' }}>Sleva</div>
                        <div className="text-center text-red-600 font-medium">{formatPrice(discountAmount)}</div>
                      </div>
                    </>
                  )
                })()}

                <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                  <div className={isVatPayer ? 'col-span-6' : 'col-span-3'}>{isVatPayer ? 'Celkem zaplaceno s DPH' : 'Celkem zaplaceno'}</div>
                  <div className={isVatPayer ? 'text-center' : 'text-right'}>{formatPrice(tx.totalAmount)}</div>
                </div>
              </div>
            </div>

            {/* Delivery note */}
            {tx.deliveryNote && (
              <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Výdejky (1)</h4>
                <div className="text-sm">
                  <div className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
                    <div>Číslo výdejky</div>
                    <div>Datum</div>
                    <div className="text-center">Položek</div>
                    <div className="text-right">Částka</div>
                    <div className="w-4" />
                  </div>
                  <Link
                    href={`/delivery-notes?highlight=${tx.deliveryNote.id}`}
                    className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-3 bg-white hover:bg-blue-50 transition-colors items-center"
                  >
                    <span className="font-medium text-blue-600 hover:underline">{tx.deliveryNote.deliveryNumber}</span>
                    <span className="text-gray-700">{new Date(tx.deliveryNote.deliveryDate).toLocaleDateString('cs-CZ')}</span>
                    <span className="text-gray-700 text-center">{tx.deliveryNote.items?.length || 0}</span>
                    <span className="font-semibold text-gray-900 text-right">
                      {(tx.deliveryNote.items?.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.product?.price || 0), 0) || 0).toLocaleString('cs-CZ')} Kč
                    </span>
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
