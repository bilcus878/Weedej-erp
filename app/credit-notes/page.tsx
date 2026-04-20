'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FileText, XCircle } from 'lucide-react'
import { formatPrice, formatQuantity } from '@/lib/utils'
import {
  useEntityPage, EntityPage, FilterInput, FilterSelect, LoadingState, ErrorState,
  DetailSection, DetailRow, LinkedDocumentBanner, PartySection, ItemsTable, ActionToolbar,
} from '@/components/erp'
import type { ErpItem, ColumnDef, SelectOption } from '@/components/erp'

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

  const ep = useEntityPage<CreditNote>({
    fetchData: async () => {
      const [cnRes, sRes] = await Promise.all([fetch('/api/credit-notes'), fetch('/api/settings')])
      const [cn, s]       = await Promise.all([cnRes.json(), sRes.json()])
      setIsVatPayer(s.isVatPayer ?? true)
      return cn
    },
    getRowId: r => r.id,
    filterFn: (r, f) => {
      if (f.number   && !r.creditNoteNumber.toLowerCase().includes(f.number.toLowerCase())) return false
      if (f.date)    { const d = new Date(r.creditNoteDate).toISOString().split('T')[0]; if (d !== f.date) return false }
      if (f.customer){ const n = r.customer?.name || r.customerName || ''; if (!n.toLowerCase().includes(f.customer.toLowerCase())) return false }
      if (f.invoice  && !r.invoiceNumber.toLowerCase().includes(f.invoice.toLowerCase())) return false
      if (f.minItems && (r.items?.length || 0) < parseInt(f.minItems)) return false
      if (f.minValue && Math.abs(r.totalAmount) < parseFloat(f.minValue)) return false
      if (f.status && f.status !== 'all' && r.status !== f.status) return false
      return true
    },
    highlightId,
  })

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

      <EntityPage.Filters onClear={ep.clearFilters} columns="auto 1fr 1fr 1fr 1fr 1fr 1fr 1fr">
        <FilterInput value={ep.filters.number   ?? ''} onChange={v => ep.setFilter('number',   v)} placeholder="Číslo..." />
        <FilterInput value={ep.filters.date     ?? ''} onChange={v => ep.setFilter('date',     v)} type="date" />
        <FilterInput value={ep.filters.customer ?? ''} onChange={v => ep.setFilter('customer', v)} placeholder="Odběratel..." />
        <FilterInput value={ep.filters.invoice  ?? ''} onChange={v => ep.setFilter('invoice',  v)} placeholder="Faktura..." />
        <FilterInput value={ep.filters.minItems ?? ''} onChange={v => ep.setFilter('minItems', v)} type="number" placeholder="≥" />
        <FilterInput value={ep.filters.minValue ?? ''} onChange={v => ep.setFilter('minValue', v)} type="number" placeholder="≥" />
        <FilterSelect value={ep.filters.status  ?? 'all'} onChange={v => ep.setFilter('status', v)} options={statusOptions} />
      </EntityPage.Filters>

      <EntityPage.Table
        columns={columns}
        rows={ep.paginated}
        getRowId={r => r.id}
        expanded={ep.expanded}
        onToggle={ep.toggleExpand}
        rowClassName={r => r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
        renderDetail={cn => (
          <>
            {(() => {
              const links = [
                { label: 'Faktura', value: cn.invoiceNumber, href: `/invoices/issued?highlight=${cn.issuedInvoiceId}` },
                ...(cn.customerOrderId ? [{ label: 'Objednávka', value: cn.customerOrderNumber || 'Zobrazit', href: `/customer-orders?highlight=${cn.customerOrderId}` }] : []),
                ...(!cn.customerOrderId && cn.transactionId ? [{ label: 'Transakce', value: cn.transactionCode || 'Zobrazit', href: `/transactions?highlight=${cn.transactionId}` }] : []),
              ]
              return <LinkedDocumentBanner links={links} color="purple" />
            })()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailSection title="Informace o dobropisu" icon={FileText}>
                <div className="space-y-1.5">
                  <DetailRow label="Datum vystavení" value={new Date(cn.creditNoteDate).toLocaleDateString('cs-CZ')} />
                  <DetailRow label="Původní faktura"  value={cn.invoiceNumber} />
                  <DetailRow label="Důvod"            value={cn.reason || undefined} />
                  <DetailRow label="Poznámka"         value={cn.note   || undefined} />
                  {cn.status === 'storno' && (
                    <>
                      <DetailRow label="Důvod storna" value={<span className="text-red-600">{cn.stornoReason || '—'}</span>} />
                      <DetailRow label="Datum storna" value={cn.stornoAt ? <span className="text-red-600">{new Date(cn.stornoAt).toLocaleDateString('cs-CZ')}</span> : undefined} />
                    </>
                  )}
                </div>
              </DetailSection>

              <PartySection
                title="Odběratel / Zákazník"
                party={{
                  name:        cn.customer?.name        || cn.customerName        || 'Bez odběratele',
                  entityType:  cn.customer?.entityType  || cn.customerEntityType  || 'company',
                  contact:     cn.customer?.contact,
                  address:     cn.customerAddress       || cn.customer?.address,
                  phone:       cn.customerPhone         || cn.customer?.phone,
                  ico:         cn.customerIco           || cn.customer?.ico,
                  dic:         cn.customerDic           || cn.customer?.dic,
                  email:       cn.customerEmail         || cn.customer?.email,
                  website:     cn.customer?.website,
                  bankAccount: cn.customer?.bankAccount,
                  note:        cn.customer?.note,
                }}
              />
            </div>

            {cn.items.length === 0 ? (
              <p className="text-red-600">Dobropis nemá žádné položky!</p>
            ) : (
              <ItemsTable
                items={cn.items.map(i => ({ ...i }) as ErpItem)}
                isVatPayer={isVatPayer}
                showNegative={true}
                totalAmount={cn.totalAmount}
                formatQty={(qty, unit) => formatQuantity(qty, unit || '')}
              />
            )}

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
        )}
      />

      <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
    </EntityPage>
  )
}
