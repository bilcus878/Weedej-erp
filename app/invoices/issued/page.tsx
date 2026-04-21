'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { FileText, ExternalLink, FileOutput, XCircle, Plus, X } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/generateInvoicePDF'
import { DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import {
  useEntityPage, useFilters, EntityPage, LoadingState, ErrorState,
  ActionToolbar, CustomerOrderDetail,
} from '@/components/erp'
import type { OrderDetailData, ColumnDef, SelectOption } from '@/components/erp'

export const dynamic = 'force-dynamic'

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface DeliveryNote {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status?: string
  items?: {
    id: string; quantity: number; unit: string
    productName?: string | null; price?: number | null; priceWithVat?: number | null
    vatAmount?: number | null; vatRate?: number | null
    product?: { price: number; vatRate?: number }
  }[]
  totalAmount?: number
}

interface Transaction {
  id: string
  transactionCode: string
  totalAmount: number
  paymentType: string
  status: string
  transactionDate: string
  items: TransactionItem[]
  customer?: { id: string; name: string; email?: string; phone?: string; ico?: string; dic?: string; address?: string } | null
  customerOrderId?: string
  customerOrderNumber?: string
  customerOrderSource?: string
  transactionId?: string
  receiptId?: string
  deliveryNotes?: DeliveryNote[]
  _original?: { customerOrder?: { paidAt?: string; shippedAt?: string } }
}

interface CreditNoteData {
  id: string
  creditNoteNumber: string
  creditNoteDate: string
  totalAmount: number
  reason: string | null
  status: string
  items: { id: string; productName: string | null; quantity: number; unit: string; price: number; vatRate: number }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ tx }: { tx: Transaction }) {
  const map: Record<string, { cls: string; label: string }> = {
    storno:     { cls: 'bg-red-100 text-red-800',     label: 'STORNO' },
    new:        { cls: 'bg-yellow-100 text-yellow-800', label: 'Nová (neuhrazená)' },
    paid:       { cls: 'bg-blue-100 text-blue-800',   label: 'Zaplacená' },
    processing: { cls: 'bg-orange-100 text-orange-800', label: 'Připravuje se' },
    shipped:    { cls: 'bg-green-100 text-green-800', label: 'Odesláno' },
    delivered:  { cls: 'bg-green-100 text-green-800', label: 'Předáno' },
    cancelled:  { cls: 'bg-red-100 text-red-800',     label: 'Zrušená' },
  }
  const cfg = map[tx.status]
  if (cfg) return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{tx.status || 'Aktivní'}</span>
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
  { value: 'new',       label: 'Nová',         className: 'text-yellow-600' },
  { value: 'paid',      label: 'Zaplacená',    className: 'text-green-600'  },
  { value: 'processing',label: 'Připravuje se',className: 'text-blue-600'   },
  { value: 'shipped',   label: 'Odesláno',     className: 'text-purple-600' },
  { value: 'delivered', label: 'Předáno',      className: 'text-teal-600'   },
  { value: 'cancelled', label: 'Zrušená',      className: 'text-red-600'    },
  { value: 'storno',    label: 'STORNO',       className: 'text-red-600'    },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function IssuedInvoicesPage() {
  const highlightId = useSearchParams().get('highlight')

  const [isVatPayer,        setIsVatPayer]        = useState(true)
  const [creditNotesMap,    setCreditNotesMap]    = useState<Record<string, CreditNoteData[]>>({})
  const [showCreditNoteModal,  setShowCreditNoteModal]  = useState(false)
  const [creditNoteInvoice, setCreditNoteInvoice] = useState<Transaction | null>(null)
  const [creditNoteItems,   setCreditNoteItems]   = useState<Array<{ productName: string; quantity: string; unit: string; price: string; vatRate: string }>>([])
  const [creditNoteReason,  setCreditNoteReason]  = useState('')
  const [creditNoteNote,    setCreditNoteNote]    = useState('')

  const resetPage = useRef<() => void>(() => {})

  const filters = useFilters<Transaction>([
    { key: 'number',   type: 'text',   placeholder: 'Číslo...',     match: (r, v) => r.transactionCode.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',     type: 'date',                                  match: (r, v) => new Date(r.transactionDate).toISOString().split('T')[0] === v },
    { key: 'customer', type: 'text',   placeholder: 'Odběratel...',  match: (r, v) => ((r.customer?.name || (r as any).customerName || '')).toLowerCase().includes(v.toLowerCase()) },
    { key: 'payment',  type: 'select', options: paymentOptions,       match: (r, v) => v === 'all' ? true : v === 'none' ? !r.paymentType : r.paymentType === v },
    { key: 'minItems', type: 'number', placeholder: '≥',             match: (r, v) => (r.items?.length || 0) >= v },
    { key: 'minValue', type: 'number', placeholder: '≥',             match: (r, v) => r.totalAmount >= v },
    { key: 'status',   type: 'select', options: statusOptions,        match: (r, v) => v === 'all' || r.status === v },
  ], () => resetPage.current())

  const ep = useEntityPage<Transaction>({
    fetchData: async () => {
      const [txRes, sRes] = await Promise.all([fetch('/api/issued-invoices'), fetch('/api/settings')])
      const [txData, sData] = await Promise.all([txRes.json(), sRes.json()])
      setIsVatPayer(sData.isVatPayer ?? true)
      return txData
    },
    getRowId: r => r.id,
    filterFn: filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  // Load credit notes when a row is auto-highlighted (expanded by hook)
  useEffect(() => {
    if (ep.highlightId && ep.expanded.has(ep.highlightId) && !creditNotesMap[ep.highlightId]) {
      fetchCreditNotes(ep.highlightId)
    }
  }, [ep.highlightId, ep.expanded.size]) // eslint-disable-line react-hooks/exhaustive-deps

  const columns: ColumnDef<Transaction>[] = [
    {
      key: 'number', header: 'Číslo',
      render: r => <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>{r.transactionCode}</p>,
    },
    {
      key: 'date', header: 'Datum',
      render: r => <p className="text-sm text-gray-700">{new Date(r.transactionDate).toLocaleDateString('cs-CZ')}</p>,
    },
    {
      key: 'customer', header: 'Odběratel',
      render: r => {
        const t = r as any
        if (r.customer?.id) return <a href={`/customers?highlight=${r.customer.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>{r.customer.name}</a>
        if (t.customerName && t.customerName !== 'Anonymní zákazník' && t.customerName !== 'Anonymní odběratel') return <p className="text-sm text-gray-700 truncate">{t.customerName} <span className="text-xs text-gray-500">(ruční)</span></p>
        return <p className="text-sm text-gray-400 italic">Bez odběratele</p>
      },
    },
    {
      key: 'payment', header: 'Typ platby',
      render: r => <p className="text-sm">{r.paymentType === 'cash' ? 'Hotovost' : r.paymentType === 'card' ? 'Karta' : r.paymentType === 'transfer' ? 'Převod' : '-'}</p>,
    },
    { key: 'items',  header: 'Položek', render: r => <p className="text-sm text-gray-600">{r.items.filter((i: any) => i.productId !== null).length}</p> },
    { key: 'value',  header: 'Hodnota', render: r => <p className="text-sm font-bold text-gray-900">{formatPrice(r.totalAmount)}</p> },
    { key: 'status', header: 'Status',  render: r => <StatusBadge tx={r} /> },
  ]

  async function fetchCreditNotes(invoiceId: string) {
    try {
      const res  = await fetch(`/api/issued-invoices/${invoiceId}/credit-notes`)
      const data = await res.json()
      setCreditNotesMap(prev => ({ ...prev, [invoiceId]: data }))
    } catch {}
  }

  function handleToggle(id: string) {
    const expanding = !ep.expanded.has(id)
    ep.toggleExpand(id)
    if (expanding && !creditNotesMap[id]) fetchCreditNotes(id)
  }

  function transactionToOrderDetail(tx: Transaction): OrderDetailData {
    const t       = tx as any
    const isPaid  = ['paid', 'shipped', 'delivered'].includes(tx.status)
    const custName = t.customerName || tx.customer?.name || 'Anonymní zákazník'
    const paidAt  = t._original?.customerOrder?.paidAt || (isPaid ? tx.transactionDate : null)

    return {
      id:              tx.customerOrderId  || tx.id,
      orderNumber:     tx.customerOrderNumber || tx.transactionCode,
      orderDate:       tx.transactionDate,
      status:          tx.status,
      totalAmount:     tx.totalAmount,
      paidAt:          paidAt || null,
      shippedAt:       t.shippedAt || null,
      customerName:    custName,
      customerEmail:   t.customerEmail || tx.customer?.email || null,
      customerPhone:   t.customerPhone || tx.customer?.phone || null,
      customerAddress: t.customerAddress || null,
      paymentReference: t.paymentReference || t.variableSymbol || null,
      trackingNumber:  t.trackingNumber || null,
      carrier:         t.carrier || null,
      note:            t.note || null,
      shippingMethod:  t.shippingMethod || null,
      pickupPointId:   t.pickupPointId || null,
      pickupPointName: t.pickupPointName || null,
      pickupPointAddress: t.pickupPointAddress || null,
      pickupPointCarrier: t.pickupPointCarrier || null,
      billingName:     t.billingName || null,
      billingCompany:  t.billingCompany || null,
      billingIco:      t.billingIco || t.customerIco || tx.customer?.ico || null,
      billingStreet:   t.billingStreet || null,
      billingCity:     t.billingCity || null,
      billingZip:      t.billingZip || null,
      billingCountry:  t.billingCountry || null,
      items: tx.items.map(item => ({
        id:           item.id,
        productId:    item.productId || item.product?.id || null,
        productName:  item.productName || item.product?.name || null,
        quantity:     Number(item.quantity),
        unit:         item.unit,
        price:        Number(item.price ?? 0),
        vatRate:      Number(item.vatRate ?? DEFAULT_VAT_RATE),
        vatAmount:    Number(item.vatAmount ?? 0),
        priceWithVat: Number(item.priceWithVat ?? item.price ?? 0),
        product:      item.product ? { id: item.product.id, name: item.product.name, price: Number((item.product as any).price ?? 0), unit: item.unit } : null,
      })),
      issuedInvoice: {
        id:             tx.id,
        invoiceNumber:  tx.transactionCode,
        paymentType:    tx.paymentType,
        paymentStatus:  isPaid ? 'paid' : 'unpaid',
        status:         tx.status,
        invoiceDate:    tx.transactionDate,
        dueDate:        (t.dueDate as string | null) ?? null,
        variableSymbol: (t.variableSymbol as string | null) ?? null,
        constantSymbol: (t.constantSymbol as string | null) ?? null,
        specificSymbol: (t.specificSymbol as string | null) ?? null,
      },
      deliveryNotes: (tx.deliveryNotes || []).map(dn => ({
        id:             dn.id,
        deliveryNumber: dn.deliveryNumber,
        deliveryDate:   dn.deliveryDate,
        status:         dn.status || 'active',
        items: (dn.items || []).map(item => ({
          id:           item.id,
          quantity:     Number(item.quantity),
          unit:         item.unit,
          productName:  item.productName || null,
          price:        item.price != null ? Number(item.price) : null,
          priceWithVat: item.priceWithVat != null ? Number(item.priceWithVat) : null,
          vatRate:      item.vatRate != null ? Number(item.vatRate) : null,
          vatAmount:    item.vatAmount != null ? Number(item.vatAmount) : null,
          product:      item.product ? { id: '', name: '', price: Number(item.product.price || 0) } : null,
        })),
      })),
    }
  }

  async function handlePrintInvoice(tx: Transaction) {
    try {
      const sRes = await fetch('/api/settings')
      await generateInvoicePDF(tx, await sRes.json())
    } catch (e) {
      alert(e instanceof Error ? `Nepodařilo se vygenerovat PDF: ${e.message}` : 'Nepodařilo se vygenerovat PDF')
    }
  }

  async function handleStorno(tx: Transaction) {
    const reason = prompt(`Opravdu chceš stornovat fakturu ${tx.transactionCode}?\n\nZadej důvod storna (volitelně):`)
    if (reason === null) return
    try {
      const res  = await fetch(`/api/invoices/issued/${tx.id}/storno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      })
      const data = await res.json()
      if (res.ok) { alert(`Faktura byla stornována!\n\n⚠️ ${data.warning}`); await ep.refresh() }
      else alert(`Nepodařilo se stornovat fakturu: ${data.error}`)
    } catch { alert('Nepodařilo se stornovat fakturu') }
  }

  function handleOpenCreditNoteModal(tx: Transaction) {
    setCreditNoteInvoice(tx)
    setCreditNoteReason('')
    setCreditNoteNote('')
    const prefill = tx.items.map((item: any) => ({
      productName: item.product?.name || item.productName || '',
      quantity:    String(item.quantity),
      unit:        item.unit || 'ks',
      price:       String(item.price || 0),
      vatRate:     String(item.vatRate || 21),
    }))
    setCreditNoteItems(prefill.length > 0 ? prefill : [{ productName: '', quantity: '', unit: 'ks', price: '', vatRate: '21' }])
    setShowCreditNoteModal(true)
  }

  async function handleSubmitCreditNote(e: React.FormEvent) {
    e.preventDefault()
    if (!creditNoteInvoice) return
    const valid = creditNoteItems.filter(i => i.productName && parseFloat(i.quantity) > 0 && parseFloat(i.price) > 0)
    if (valid.length === 0) { alert('Vyplň alespoň jednu platnou položku (název, množství, cena)'); return }
    try {
      const res = await fetch('/api/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issuedInvoiceId: creditNoteInvoice.id,
          reason: creditNoteReason || null,
          note:   creditNoteNote   || null,
          items:  valid.map(i => ({ productName: i.productName, quantity: parseFloat(i.quantity), unit: i.unit, price: parseFloat(i.price), vatRate: parseFloat(i.vatRate) })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        alert(`Dobropis ${data.creditNoteNumber} byl úspěšně vytvořen!`)
        setShowCreditNoteModal(false)
        setCreditNoteInvoice(null)
        fetchCreditNotes(creditNoteInvoice.id)
      } else {
        const err = await res.json()
        alert(`Chyba při vytváření dobropisu: ${err.error}`)
      }
    } catch { alert('Nepodařilo se vytvořit dobropis') }
  }

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <>
      <EntityPage highlightId={ep.highlightId}>
        <EntityPage.Header
          title="Vystavené faktury"
          icon={FileText}
          color="blue"
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
          onToggle={handleToggle}
          rowClassName={r => {
            if (r.items.length === 0) return 'bg-red-50 border-red-300'
            if (r.status === 'storno') return 'bg-red-50 opacity-70'
            return ''
          }}
          emptyMessage={ep.rows.length === 0 ? 'Žádné vystavené faktury' : 'Žádné faktury odpovídají filtrům'}
          renderDetail={tx => {
            const creditNotes = creditNotesMap[tx.id] || []
            return (
              <>
                <CustomerOrderDetail
                  order={transactionToOrderDetail(tx)}
                  isVatPayer={isVatPayer}
                  onRefresh={ep.refresh}
                />

                {/* Dobropisy */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">Dobropisy ({creditNotes.length})</h4>
                  {creditNotes.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">K této faktuře nejsou vystaveny žádné dobropisy.</div>
                  ) : (
                    <div className="text-sm">
                      <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
                        <div>Číslo dobropisu</div><div>Datum</div><div className="text-center">Položek</div><div className="text-right">Částka</div><div className="w-4" />
                      </div>
                      {creditNotes.map((cn: any, idx: number) => (
                        <a
                          key={cn.id}
                          href={`/credit-notes?highlight=${cn.id}`}
                          className={`grid grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 hover:bg-purple-50 transition-colors items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-purple-600 hover:underline text-sm">{cn.creditNoteNumber}</span>
                            {cn.status === 'storno' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">STORNO</span>}
                          </div>
                          <div className="text-sm text-gray-700">{new Date(cn.creditNoteDate).toLocaleDateString('cs-CZ')}</div>
                          <div className="text-sm text-gray-700 text-center">{cn.items?.length || 0}</div>
                          <div className="text-sm font-semibold text-red-600 text-right">{formatPrice(cn.totalAmount)}</div>
                          <div className="flex justify-end"><ExternalLink className="w-4 h-4 text-purple-600" /></div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <ActionToolbar
                  left={
                    <>
                      <button onClick={() => handlePrintInvoice(tx)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors">
                        <FileText className="w-3.5 h-3.5" />Zobrazit fakturu
                      </button>
                      {tx.status !== 'storno' && (
                        <button onClick={() => handleOpenCreditNoteModal(tx)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors">
                          <FileOutput className="w-3.5 h-3.5" />Vystavit dobropis
                        </button>
                      )}
                    </>
                  }
                  right={tx.status !== 'storno' ? (
                    <button onClick={() => handleStorno(tx)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors">
                      <XCircle className="w-3.5 h-3.5" />Stornovat
                    </button>
                  ) : undefined}
                />
              </>
            )
          }}
        />

        <EntityPage.Pagination page={ep.page} total={ep.totalPages} onChange={ep.setPage} />
      </EntityPage>

      {/* Credit note modal */}
      {showCreditNoteModal && creditNoteInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileOutput className="w-6 h-6" />
                <div>
                  <h3 className="text-lg font-bold">Vystavit dobropis</h3>
                  <p className="text-sm text-purple-200">K faktuře {creditNoteInvoice.transactionCode}</p>
                </div>
              </div>
              <button onClick={() => setShowCreditNoteModal(false)} className="text-white/80 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreditNote} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Důvod dobropisu</label>
                  <input type="text" value={creditNoteReason} onChange={e => setCreditNoteReason(e.target.value)} placeholder="Např. Reklamace, chybná fakturace..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
                  <input type="text" value={creditNoteNote} onChange={e => setCreditNoteNote(e.target.value)} placeholder="Volitelná poznámka..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                Položky dobropisu jsou předvyplněny z faktury. Uprav množství, ceny nebo odeber položky, které nechceš dobropisovat.
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Položky dobropisu</h4>
                  <button type="button" onClick={() => setCreditNoteItems(prev => [...prev, { productName: '', quantity: '', unit: 'ks', price: '', vatRate: '21' }])}
                    className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded hover:bg-purple-200 flex items-center gap-1">
                    <Plus className="w-3 h-3" />Přidat položku
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-[3fr_1fr_0.7fr_1fr_0.8fr_auto] gap-2 px-2 text-xs font-semibold text-gray-600">
                    <div>Název produktu</div><div className="text-center">Množství</div><div className="text-center">Jedn.</div>
                    <div className="text-center">Cena bez DPH</div><div className="text-center">DPH %</div><div className="w-8" />
                  </div>
                  {creditNoteItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[3fr_1fr_0.7fr_1fr_0.8fr_auto] gap-2 items-center">
                      <input type="text" value={item.productName} onChange={e => setCreditNoteItems(p => p.map((i, n) => n === idx ? { ...i, productName: e.target.value } : i))}
                        placeholder="Název..." className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-purple-500" />
                      <input type="number" step="0.001" value={item.quantity} onChange={e => setCreditNoteItems(p => p.map((i, n) => n === idx ? { ...i, quantity: e.target.value } : i))}
                        placeholder="0" className="px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-purple-500" />
                      <select value={item.unit} onChange={e => setCreditNoteItems(p => p.map((i, n) => n === idx ? { ...i, unit: e.target.value } : i))}
                        className="px-1 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-purple-500">
                        {['ks','g','ml','kg','l','m'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                      <input type="number" step="0.01" value={item.price} onChange={e => setCreditNoteItems(p => p.map((i, n) => n === idx ? { ...i, price: e.target.value } : i))}
                        placeholder="0.00" className="px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-purple-500" />
                      <select value={item.vatRate} onChange={e => setCreditNoteItems(p => p.map((i, n) => n === idx ? { ...i, vatRate: e.target.value } : i))}
                        className="px-1 py-1.5 border border-gray-300 rounded text-sm text-center focus:ring-1 focus:ring-purple-500">
                        {['21','12','0'].map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                      <button type="button" onClick={() => setCreditNoteItems(p => p.filter((_, n) => n !== idx))}
                        className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {creditNoteItems.length > 0 && (() => {
                  let noVat = 0, vat = 0, withVat = 0
                  creditNoteItems.forEach(i => { const q = parseFloat(i.quantity) || 0, p = parseFloat(i.price) || 0, r = parseFloat(i.vatRate) || 0, l = q * p, lv = l * r / 100; noVat += l; vat += lv; withVat += l + lv })
                  return (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div><span className="text-gray-600">Bez DPH:</span> <span className="font-semibold ml-2 text-red-600">-{formatPrice(Math.round(noVat * 100) / 100)}</span></div>
                        <div><span className="text-gray-600">DPH:</span> <span className="font-semibold ml-2 text-red-600">-{formatPrice(Math.round(vat * 100) / 100)}</span></div>
                        <div><span className="text-gray-600">Celkem s DPH:</span> <span className="font-bold ml-2 text-red-600">-{formatPrice(Math.round(withVat * 100) / 100)}</span></div>
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowCreditNoteModal(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg">Zrušit</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2">
                  <FileOutput className="w-4 h-4" />Vystavit dobropis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
