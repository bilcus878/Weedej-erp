'use client'

import { useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { FileText, FileEdit, XCircle, ExternalLink } from 'lucide-react'
import InvoiceDetailsModal from '@/components/InvoiceDetailsModal'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import { formatPrice } from '@/lib/utils'
import {
  useEntityPage, useFilters, EntityPage, LoadingState, ErrorState,
  DetailSection, DetailRow, LinkedDocumentBanner, PartySection, ActionToolbar,
} from '@/components/erp'
import type { ColumnDef, SelectOption } from '@/components/erp'

export const dynamic = 'force-dynamic'

type Supplier = { id: string; name: string }
type Product  = { id: string; name: string }

type ReceiptItem = {
  id: string
  quantity: number
  receivedQuantity?: number
  unit: string
  purchasePrice: number
  product?: Product
  productName?: string
}

type Receipt = {
  id: string
  receiptNumber: string
  receiptDate: string
  status: string
  supplierId?: string
  supplier?: Supplier
  items: ReceiptItem[]
}

type OrderItem = {
  id: string
  quantity: number
  unit: string
  expectedPrice: number
  vatRate?: number
  product?: Product
  productName?: string
}

type PurchaseOrder = {
  id: string
  orderNumber: string
  expectedDate?: string | null
  supplierId?: string
  supplierName?: string
  supplierEntityType?: string
  supplierICO?: string
  supplierDIC?: string
  supplierAddress?: string
  supplierContactPerson?: string
  supplierEmail?: string
  supplierPhone?: string
  supplierBankAccount?: string
  supplierWebsite?: string
  supplier?: Supplier
  items?: OrderItem[]
  note?: string
}

type ReceivedInvoice = {
  id: string
  invoiceNumber: string
  isTemporary: boolean
  invoiceDate: string
  dueDate?: string | null
  totalAmount: number
  paymentType: string
  attachmentUrl?: string | null
  note?: string | null
  variableSymbol?: string
  constantSymbol?: string
  specificSymbol?: string
  supplierName?: string
  supplierEntityType?: string
  supplierContactPerson?: string
  supplierEmail?: string
  supplierPhone?: string
  supplierIco?: string
  supplierDic?: string
  supplierBankAccount?: string
  supplierWebsite?: string
  supplierAddress?: string
  supplierNote?: string
  discountAmount?: number
  discountType?: string
  discountValue?: number
  status?: string
  stornoReason?: string
  stornoAt?: string
  stornoBy?: string
  receipts?: Receipt[]
  purchaseOrder?: PurchaseOrder | null
  createdAt: string
}

const paymentOptions: SelectOption[] = [
  { value: 'all',      label: 'Vše' },
  { value: 'none',     label: '-' },
  { value: 'cash',     label: 'Hotovost' },
  { value: 'card',     label: 'Karta' },
  { value: 'transfer', label: 'Převod' },
]

const statusOptions: SelectOption[] = [
  { value: 'all',               label: 'Vše' },
  { value: 'pending',           label: 'Čeká',      className: 'text-yellow-600' },
  { value: 'partially_received',label: 'Částečně',  className: 'text-orange-600' },
  { value: 'received',          label: 'Přijato',   className: 'text-green-600' },
  { value: 'storno',            label: 'STORNO',    className: 'text-red-600' },
]

function getStatusBadge(status: string) {
  if (status === 'storno')
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">STORNO</span>
  if (status === 'pending')
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Čeká</span>
  if (status === 'confirmed')
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Potvrzena</span>
  if (status === 'partially_received')
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Částečně přijata</span>
  if (status === 'received')
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Přijata</span>
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Aktivní</span>
}

export default function ReceivedInvoicesPage() {
  const highlightId = useSearchParams().get('highlight')

  const [isVatPayer,               setIsVatPayer]               = useState(true)
  const [suppliers,                setSuppliers]                = useState<Supplier[]>([])
  const [showDetailsModal,         setShowDetailsModal]         = useState(false)
  const [selectedInvoiceForDetails,setSelectedInvoiceForDetails]= useState<ReceivedInvoice | null>(null)
  const [discountTemp, setDiscountTemp] = useState<Record<string, { type: string; value: string }>>({})

  const resetPage = useRef<() => void>(() => {})

  const filters = useFilters<ReceivedInvoice>([
    { key: 'number',   type: 'text',   placeholder: 'Číslo...',    match: (r, v) => r.invoiceNumber.toLowerCase().includes(v.toLowerCase()) },
    { key: 'date',     type: 'date',                                 match: (r, v) => new Date(r.invoiceDate).toISOString().split('T')[0] === v },
    { key: 'supplier', type: 'text',   placeholder: 'Dodavatel...', match: (r, v) => { const sup = r.receipts?.[0]?.supplier || r.purchaseOrder?.supplier; return (sup?.name || r.supplierName || r.purchaseOrder?.supplierName || '').toLowerCase().includes(v.toLowerCase()) } },
    { key: 'payment',  type: 'select', options: paymentOptions,      match: (r, v) => v === 'all' ? true : v === 'none' ? !r.paymentType : r.paymentType === v },
    { key: 'minItems', type: 'number', placeholder: '≥',            match: (r, v) => (r.purchaseOrder?.items?.length || r.receipts?.reduce((s, rc) => s + (rc.items?.length || 0), 0) || 0) >= v },
    { key: 'minValue', type: 'number', placeholder: '≥',            match: (r, v) => r.totalAmount >= v },
    { key: 'status',   type: 'select', options: statusOptions,       match: (r, v) => v === 'all' || r.status === v },
  ], () => resetPage.current())

  const ep = useEntityPage<ReceivedInvoice>({
    fetchData: async () => {
      const [invRes, supRes, setRes] = await Promise.all([
        fetch('/api/invoices/received'),
        fetch('/api/suppliers'),
        fetch('/api/settings'),
      ])
      const [inv, sup, set] = await Promise.all([invRes.json(), supRes.json(), setRes.json()])
      setSuppliers(sup)
      setIsVatPayer(set.isVatPayer ?? true)
      return inv
    },
    getRowId: r => r.id,
    filterFn: filters.fn,
    highlightId,
  })
  resetPage.current = () => ep.setPage(1)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, invoiceId: string) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/', 'application/pdf']
    if (!allowedTypes.some(t => file.type.startsWith(t))) { alert('Prosím nahrajte obrázek nebo PDF'); return }
    if (file.size > 10 * 1024 * 1024) { alert('Soubor je příliš velký. Maximum je 10MB.'); return }
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) { const err = await uploadRes.json(); throw new Error(err.error || 'Nepodařilo se nahrát soubor') }
      const { url } = await uploadRes.json()
      const updateRes = await fetch(`/api/received-invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentUrl: url }),
      })
      if (!updateRes.ok) throw new Error('Nepodařilo se uložit přílohu')
      await ep.refresh()
      alert('Soubor byl úspěšně nahrán!')
    } catch (error) {
      console.error('Chyba při nahrávání souboru:', error)
      alert('Nepodařilo se nahrát soubor')
    }
  }

  async function handleStorno(invoiceId: string) {
    const invoice = ep.rows.find(inv => inv.id === invoiceId)
    if (!invoice) return
    if (invoice.status === 'storno') { alert('Tato faktura je již stornována'); return }
    const reason = prompt(`Opravdu chceš stornovat fakturu ${invoice.invoiceNumber}?\n\nZadej důvod storna (volitelně):`)
    if (reason === null) return
    try {
      const res  = await fetch(`/api/invoices/received/${invoiceId}/storno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Nepodařilo se stornovat fakturu')
      alert(`Faktura byla stornována!\n\n⚠️ ${data.warning}`)
      await ep.refresh()
    } catch (error: any) {
      console.error('Chyba při stornování:', error)
      alert(`Chyba: ${error.message}`)
    }
  }

  function handleOpenDetailsModal(invoice: ReceivedInvoice) {
    setSelectedInvoiceForDetails(invoice)
    setShowDetailsModal(true)
  }

  async function handleSaveInvoiceDetails(details: any) {
    if (!selectedInvoiceForDetails) return
    try {
      const res = await fetch(`/api/invoices/received/${selectedInvoiceForDetails.id}/details`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Nepodařilo se uložit údaje') }
      alert('Údaje faktury byly uloženy')
      await ep.refresh()
      setShowDetailsModal(false)
      setSelectedInvoiceForDetails(null)
    } catch (error: any) {
      console.error('Chyba při ukládání:', error)
      throw error
    }
  }

  async function handleApplyDiscount(invoiceId: string, discountType: string, discountValue: string) {
    if (!discountValue) { alert('Zadejte hodnotu slevy'); return }
    if (!confirm('Opravdu chcete uplatnit slevu dodavatele? Tato akce upraví ceny položek v objednávce a faktuře.')) return
    try {
      const res = await fetch(`/api/received-invoices/${invoiceId}/apply-discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountType, discountValue: parseFloat(discountValue) }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Chyba při uplatňování slevy') }
      alert('Sleva dodavatele byla úspěšně uplatněna!')
      setDiscountTemp(prev => { const next = { ...prev }; delete next[invoiceId]; return next })
      await ep.refresh()
    } catch (error: any) {
      console.error('Chyba při uplatňování slevy:', error)
      alert(error.message || 'Nepodařilo se uplatnit slevu')
    }
  }

  async function handleSaveAsSupplier(details: any) {
    if (!selectedInvoiceForDetails) return
    if (!details.supplierName) throw new Error('Vyplňte alespoň název dodavatele')
    try {
      const supplierData = {
        name: details.supplierName, entityType: details.supplierEntityType || 'company',
        contact: details.supplierContactPerson, email: details.supplierEmail, phone: details.supplierPhone,
        ico: details.supplierIco, dic: details.supplierDic, bankAccount: details.supplierBankAccount,
        website: details.supplierWebsite, address: details.supplierAddress, note: details.supplierNote,
      }
      const res = await fetch('/api/suppliers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierData),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Nepodařilo se uložit dodavatele') }
      await handleSaveInvoiceDetails(details)
      await ep.refresh()
    } catch (error: any) {
      console.error('Chyba při ukládání dodavatele:', error)
      throw error
    }
  }

  const columns: ColumnDef<ReceivedInvoice>[] = [
    {
      key: 'number', header: 'Číslo',
      render: r => (
        <div>
          <p className={`text-sm font-semibold text-gray-900 truncate ${r.status === 'storno' ? 'line-through' : ''}`}>
            {r.invoiceNumber}
          </p>
          {r.isTemporary && r.status !== 'storno' && (
            <p className="text-xs text-orange-600 mt-0.5">Doplň údaje o faktuře</p>
          )}
        </div>
      ),
    },
    {
      key: 'date', header: 'Datum',
      render: r => <p className="text-sm text-gray-700">{new Date(r.invoiceDate).toLocaleDateString('cs-CZ')}</p>,
    },
    {
      key: 'supplier', header: 'Dodavatel',
      render: r => {
        let supplier = r.receipts?.[0]?.supplier || r.purchaseOrder?.supplier
        if (!supplier && r.supplierName) supplier = suppliers.find(s => s.name === r.supplierName)
        if (supplier?.id) {
          return (
            <a href={`/suppliers?highlight=${supplier.id}`} className="text-sm text-blue-600 hover:underline truncate block" onClick={e => e.stopPropagation()}>
              {supplier.name}
            </a>
          )
        }
        return <p className="text-sm text-gray-700 truncate">{r.supplierName || r.purchaseOrder?.supplierName || '-'}</p>
      },
    },
    {
      key: 'payment', header: 'Typ platby',
      render: r => (
        <p className="text-sm text-gray-700">
          {r.paymentType === 'cash' ? 'Hotovost' : r.paymentType === 'card' ? 'Karta' : r.paymentType === 'transfer' ? 'Převod' : '-'}
        </p>
      ),
    },
    {
      key: 'items', header: 'Položek',
      render: r => {
        const count = r.purchaseOrder?.items?.length || r.receipts?.reduce((s, rc) => s + (rc.items?.length || 0), 0) || 0
        return <p className="text-sm text-gray-600">{count}</p>
      },
    },
    {
      key: 'value', header: 'Hodnota',
      render: r => <p className="text-sm font-bold text-gray-900">{Number(r.totalAmount).toLocaleString('cs-CZ')} Kč</p>,
    },
    {
      key: 'status', header: 'Status',
      render: r => getStatusBadge(r.status || 'pending'),
    },
  ]

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />

  return (
    <>
      <EntityPage highlightId={ep.highlightId}>
        <EntityPage.Header
          title="Přijaté faktury"
          icon={FileText}
          color="amber"
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
          rowClassName={r => r.isTemporary && r.status !== 'storno' ? 'border-orange-400 bg-orange-50' : r.status === 'storno' ? 'bg-red-50 opacity-70' : ''}
          renderDetail={inv => {
            const po = inv.purchaseOrder as any
            const entityType   = inv.supplierEntityType || po?.supplierEntityType || po?.supplier?.entityType || 'company'
            const supplierName = inv.supplierName || po?.supplierName || po?.supplier?.name || inv.receipts?.[0]?.supplier?.name || 'Anonymní dodavatel'
            const temp = discountTemp[inv.id] || { type: 'percentage', value: '' }

            return (
              <>
                {inv.purchaseOrder && (
                  <LinkedDocumentBanner
                    links={[{ label: 'Objednávka', value: inv.purchaseOrder.orderNumber, href: `/purchase-orders?highlight=${inv.purchaseOrder.id}` }]}
                    color="blue"
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailSection title="Informace o faktuře" icon={FileText}>
                    <div className="space-y-1.5">
                      <DetailRow label="Datum faktury"      value={inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('cs-CZ') : undefined} />
                      <DetailRow label="Datum splatnosti"   value={inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('cs-CZ') : undefined} />
                      <DetailRow label="Datum dodání"       value={inv.receipts && inv.receipts.length > 0 ? inv.receipts.map(r => new Date(r.receiptDate).toLocaleDateString('cs-CZ')).join(', ') : undefined} />
                      <DetailRow label="Očekávané dodání"   value={inv.purchaseOrder?.expectedDate ? new Date(inv.purchaseOrder.expectedDate).toLocaleDateString('cs-CZ') : undefined} />
                      <DetailRow label="Typ platby"         value={inv.paymentType === 'cash' ? 'Hotovost' : inv.paymentType === 'card' ? 'Karta' : inv.paymentType === 'transfer' ? 'Bankovní převod' : inv.paymentType || undefined} />
                      <DetailRow label="Poznámka"           value={inv.note || undefined} />
                    </div>
                  </DetailSection>

                  <PartySection
                    title="Dodavatel"
                    party={{
                      name:        supplierName,
                      entityType,
                      contact:     inv.supplierContactPerson || po?.supplierContactPerson || po?.supplier?.contact,
                      address:     inv.supplierAddress       || po?.supplierAddress       || po?.supplier?.address,
                      phone:       inv.supplierPhone         || po?.supplierPhone         || po?.supplier?.phone,
                      ico:         inv.supplierIco           || po?.supplierICO           || po?.supplier?.ico,
                      dic:         inv.supplierDic           || po?.supplierDIC           || po?.supplier?.dic,
                      email:       inv.supplierEmail         || po?.supplierEmail         || po?.supplier?.email,
                      website:     inv.supplierWebsite       || po?.supplierWebsite       || po?.supplier?.website,
                      bankAccount: inv.supplierBankAccount   || po?.supplierBankAccount   || po?.supplier?.bankAccount,
                      note:        inv.supplierNote          || undefined,
                    }}
                  />
                </div>

                {inv.purchaseOrder?.items && inv.purchaseOrder.items.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">
                      Položky ({inv.purchaseOrder.items.length})
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

                      {inv.purchaseOrder.items.map((item: any, i: number) => {
                        const unitPrice        = Number(item.expectedPrice || 0)
                        const itemVatRate      = Number(item.vatRate || DEFAULT_VAT_RATE)
                        const isItemNonVat     = isNonVatPayer(itemVatRate)
                        const vatPerUnit       = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                        const priceWithVat     = unitPrice + vatPerUnit
                        const totalWithoutVat  = Number(item.quantity) * unitPrice
                        const totalWithVat     = Number(item.quantity) * priceWithVat
                        const even             = i % 2 === 0

                        return isVatPayer ? (
                          <div key={i} className={`grid grid-cols-[3fr_repeat(6,1fr)] gap-2 px-4 py-2 ${even ? 'bg-white' : 'bg-gray-50'} text-xs`}>
                            <div className="text-gray-900">{item.product?.name || item.productName}</div>
                            <div className="text-center text-gray-700">{item.quantity} {item.unit}</div>
                            <div className="text-center text-gray-500">{isItemNonVat ? '-' : `${itemVatRate}%`}</div>
                            <div className="text-center text-gray-700">{formatPrice(unitPrice)}</div>
                            <div className="text-center text-gray-500">{isItemNonVat ? '-' : formatPrice(vatPerUnit)}</div>
                            <div className="text-center text-gray-700">{formatPrice(priceWithVat)}</div>
                            <div className="text-center font-semibold text-gray-900">{formatPrice(totalWithVat)}</div>
                          </div>
                        ) : (
                          <div key={i} className={`grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 px-4 py-2 ${even ? 'bg-white' : 'bg-gray-50'}`}>
                            <div className="text-gray-900">{item.product?.name || item.productName}</div>
                            <div className="text-right text-gray-700">{item.quantity} {item.unit}</div>
                            <div className="text-right text-gray-700">{formatPrice(unitPrice)}</div>
                            <div className="text-right font-semibold text-gray-900">{formatPrice(totalWithoutVat)}</div>
                          </div>
                        )
                      })}

                      {inv.discountAmount && inv.discountAmount > 0 ? (
                        <>
                          <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-50 border-t text-sm`}>
                            <div className={isVatPayer ? 'col-span-6' : 'col-span-3'} style={{ fontWeight: 500, color: '#374151' }}>Mezisoučet</div>
                            <div className={`${isVatPayer ? 'text-center' : 'text-right'} font-medium text-gray-700`}>
                              {formatPrice(inv.totalAmount + inv.discountAmount)}
                            </div>
                          </div>
                          <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-yellow-50 text-sm`}>
                            <div className={isVatPayer ? 'col-span-6' : 'col-span-3'} style={{ fontWeight: 500, color: '#111827' }}>
                              Sleva dodavatele
                              {inv.discountType === 'percentage' && inv.discountValue && (
                                <span className="text-sm text-gray-600 ml-2">({inv.discountValue}%)</span>
                              )}
                              {inv.discountType === 'fixed' && (
                                <span className="text-sm text-gray-600 ml-2">(pevná částka)</span>
                              )}
                            </div>
                            <div className={`${isVatPayer ? 'text-center' : 'text-right'} font-medium text-red-600`}>
                              -{formatPrice(inv.discountAmount)}
                            </div>
                          </div>
                          <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                            <div className={isVatPayer ? 'col-span-6' : 'col-span-3'}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                            <div className={isVatPayer ? 'text-center' : 'text-right'}>{formatPrice(inv.totalAmount)}</div>
                          </div>
                        </>
                      ) : (
                        <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_repeat(6,1fr)]' : 'grid-cols-[2fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                          <div className={isVatPayer ? 'col-span-6' : 'col-span-3'}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                          <div className={isVatPayer ? 'text-center' : 'text-right'}>{formatPrice(inv.totalAmount)}</div>
                        </div>
                      )}

                      {inv.status !== 'storno' && !inv.discountAmount && (
                        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-t-2 border-orange-300">
                          <div className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 text-orange-900 font-semibold flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm">Uplatnit slevu dodavatele</span>
                              </div>

                              <select
                                value={temp.type}
                                onChange={e => setDiscountTemp(prev => ({ ...prev, [inv.id]: { type: e.target.value, value: '' } }))}
                                className="px-2 py-1 border border-orange-300 rounded text-xs focus:border-orange-500 focus:ring-orange-500 bg-white"
                              >
                                <option value="percentage">%</option>
                                <option value="fixed">Kč</option>
                              </select>

                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max={temp.type === 'percentage' ? '100' : undefined}
                                value={temp.value}
                                onChange={e => setDiscountTemp(prev => ({ ...prev, [inv.id]: { ...prev[inv.id] ?? { type: 'percentage' }, value: e.target.value } }))}
                                placeholder={temp.type === 'fixed' ? '100' : '10'}
                                className="w-24 px-2 py-1 border border-orange-300 rounded text-xs focus:border-orange-500 focus:ring-orange-500 bg-white"
                              />

                              {temp.value && (() => {
                                const subtotal     = (inv.purchaseOrder?.items ?? []).reduce((s: number, item: any) => s + (item.quantity * (item.expectedPrice || 0)), 0)
                                const discountAmt  = temp.type === 'percentage' ? (subtotal * parseFloat(temp.value)) / 100 : parseFloat(temp.value)
                                const newTotal     = subtotal - discountAmt
                                return (
                                  <>
                                    <div className="flex items-center gap-2 text-xs text-orange-700">
                                      <span className="text-gray-500">→</span>
                                      <span>Sleva:</span>
                                      <span className="font-bold">-{discountAmt.toLocaleString('cs-CZ')} Kč</span>
                                      <span className="text-gray-500">|</span>
                                      <span>Nová cena:</span>
                                      <span className="font-bold text-orange-900">{newTotal.toLocaleString('cs-CZ')} Kč</span>
                                    </div>
                                    <button
                                      onClick={() => handleApplyDiscount(inv.id, temp.type, temp.value)}
                                      className="ml-auto px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded font-medium transition-colors"
                                    >
                                      Uplatnit
                                    </button>
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {inv.receipts && inv.receipts.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">
                      Příjemky ({inv.receipts.length})
                    </h4>
                    <div className="text-sm">
                      <div className="grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b">
                        <div>Číslo příjemky</div>
                        <div>Datum</div>
                        <div className="text-center">Položek</div>
                        <div className="text-right">Částka</div>
                        <div className="w-4"></div>
                      </div>
                      {inv.receipts.map((receipt, idx) => {
                        const receiptTotal = receipt.items?.reduce((s, item) => s + ((item.receivedQuantity || item.quantity) * Number(item.purchasePrice)), 0) || 0
                        return (
                          <a
                            key={receipt.id}
                            href={`/receipts?highlight=${receipt.id}`}
                            className={`grid grid-cols-[1.5fr_1fr_0.8fr_1fr_auto] gap-3 px-4 py-2 hover:bg-blue-50 transition-colors items-center ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-blue-600 hover:underline text-sm">{receipt.receiptNumber}</span>
                              {receipt.status === 'storno' && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">STORNO</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-700">{new Date(receipt.receiptDate).toLocaleDateString('cs-CZ')}</div>
                            <div className="text-sm text-gray-700 text-center">{receipt.items?.length || 0}</div>
                            <div className="text-sm font-semibold text-gray-900 text-right">{receiptTotal.toLocaleString('cs-CZ')} Kč</div>
                            <div className="flex justify-end"><ExternalLink className="w-4 h-4 text-blue-600" /></div>
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}

                {inv.status === 'storno' && inv.stornoReason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm font-medium text-red-900">Stornováno</p>
                    <p className="text-sm text-red-700 mt-1">Důvod: {inv.stornoReason}</p>
                    {inv.stornoAt && (
                      <p className="text-xs text-red-600 mt-1">Datum storna: {new Date(inv.stornoAt).toLocaleDateString('cs-CZ')}</p>
                    )}
                  </div>
                )}

                {inv.status !== 'storno' && (
                  <ActionToolbar
                    left={
                      <>
                        <button
                          onClick={() => handleOpenDetailsModal(inv)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          Doplnit fakturu
                        </button>
                        {inv.attachmentUrl ? (
                          <a
                            href={inv.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Zobrazit fakturu
                          </a>
                        ) : (
                          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer">
                            <FileText className="w-3.5 h-3.5" />
                            Nahrát soubor
                            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleFileUpload(e, inv.id)} />
                          </label>
                        )}
                      </>
                    }
                    right={
                      <button
                        onClick={() => handleStorno(inv.id)}
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

      <InvoiceDetailsModal
        isOpen={showDetailsModal}
        onClose={() => { setShowDetailsModal(false); setSelectedInvoiceForDetails(null) }}
        onSave={handleSaveInvoiceDetails}
        onSaveAsSupplier={handleSaveAsSupplier}
        initialData={selectedInvoiceForDetails ? {
          invoiceDate:          selectedInvoiceForDetails.invoiceDate ? new Date(selectedInvoiceForDetails.invoiceDate).toISOString().split('T')[0] : '',
          dueDate:              selectedInvoiceForDetails.dueDate ? new Date(selectedInvoiceForDetails.dueDate).toISOString().split('T')[0] : '',
          expectedDeliveryDate: selectedInvoiceForDetails.purchaseOrder?.expectedDate ? new Date(selectedInvoiceForDetails.purchaseOrder.expectedDate).toISOString().split('T')[0] : '',
          paymentType:          selectedInvoiceForDetails.paymentType || '',
          variableSymbol:       selectedInvoiceForDetails.variableSymbol || '',
          constantSymbol:       selectedInvoiceForDetails.constantSymbol || '',
          specificSymbol:       selectedInvoiceForDetails.specificSymbol || '',
          supplierName:         (selectedInvoiceForDetails as any).supplierName ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplierName ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.name ||
                                (selectedInvoiceForDetails as any).receipts?.[0]?.supplier?.name || '',
          supplierContactPerson:(selectedInvoiceForDetails as any).supplierContactPerson ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplierContactPerson ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.contact || '',
          supplierEmail:        (selectedInvoiceForDetails as any).supplierEmail ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplierEmail ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.email || '',
          supplierPhone:        (selectedInvoiceForDetails as any).supplierPhone ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplierPhone ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.phone || '',
          supplierIco:          (selectedInvoiceForDetails as any).supplierIco ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplierICO ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.ico || '',
          supplierDic:          (selectedInvoiceForDetails as any).supplierDic ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplierDIC ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.dic || '',
          supplierBankAccount:  (selectedInvoiceForDetails as any).supplierBankAccount ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplierBankAccount ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.bankAccount || '',
          supplierWebsite:      (selectedInvoiceForDetails as any).supplierWebsite ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplierWebsite ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.website || '',
          supplierAddress:      (selectedInvoiceForDetails as any).supplierAddress ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplierAddress ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.address || '',
          supplierEntityType:   (selectedInvoiceForDetails as any).supplierEntityType ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplierEntityType ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.supplier?.entityType || 'company',
          supplierNote:         (selectedInvoiceForDetails as any).supplierNote || '',
          note:                 selectedInvoiceForDetails.note ||
                                (selectedInvoiceForDetails.purchaseOrder as any)?.note || '',
        } : undefined}
        type="received"
      />
    </>
  )
}
