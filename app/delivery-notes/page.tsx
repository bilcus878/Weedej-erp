// Stránka pro výdejky (Delivery Notes)
// URL: /delivery-notes

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { ChevronDown, ChevronRight, Trash2, Package, FileDown, XCircle } from 'lucide-react'
import { formatDate, formatPrice, formatQuantity } from '@/lib/utils'
import { generateDeliveryNotePDF, openPDFInNewTab } from '@/lib/pdfGenerator'
import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'

interface DeliveryNoteItem {
  id: string
  productId?: string
  productName?: string
  quantity: number
  orderedQuantity?: number
  unit: string
  inventoryItemId?: string
  product?: {
    id: string
    name: string
    price: number
  }
}

interface DeliveryNote {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status: string
  processedAt?: string
  note?: string
  customer?: {
    id: string
    name: string
  }
  customerName?: string
  customerOrder?: {
    id: string
    orderNumber: string
    issuedInvoice?: {
      id: string
      invoiceNumber: string
    }
  }
  issuedInvoice?: {
    id: string
    invoiceNumber: string
  }
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
  customer?: {
    id: string
    name: string
  }
  customerName?: string
  items: Array<{
    id: string
    productId: string | null
    productName: string | null
    quantity: number
    shippedQuantity?: number // Už vyskladněné množství
    unit: string
    price: number
    vatRate?: number
    vatAmount?: number
    priceWithVat?: number
    product?: {
      id: string
      name: string
      vatRate?: number
    }
  }>
}

interface Customer {
  id: string
  name: string
}

export default function DeliveryNotesPage() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([])
  const [pendingOrders, setPendingOrders] = useState<CustomerOrder[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [isVatPayer, setIsVatPayer] = useState<boolean>(true)
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const highlightRef = useRef<HTMLDivElement>(null)
  const [filteredDeliveryNotes, setFilteredDeliveryNotes] = useState<DeliveryNote[]>([])
  const [filterNumber, setFilterNumber] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterMinItems, setFilterMinItems] = useState('')
  const [filterMinValue, setFilterMinValue] = useState('')
  const [filterCustomerDropdownOpen, setFilterCustomerDropdownOpen] = useState(false)
  const [filterStatusDropdownOpen, setFilterStatusDropdownOpen] = useState(false)
  const filterCustomerRef = useRef<HTMLDivElement>(null)
  const filterStatusRef = useRef<HTMLDivElement>(null)

  // Stránkování pro výdejky
  const [deliveryNotesCurrentPage, setDeliveryNotesCurrentPage] = useState(1)
  const [deliveryNotesItemsPerPage, setDeliveryNotesItemsPerPage] = useState(20)
  const deliveryNotesSectionRef = useRef<HTMLDivElement>(null)

  // Filtry pro očekávané výdejky
  const [pendingFilterOrderNumber, setPendingFilterOrderNumber] = useState('')
  const [pendingFilterCustomer, setPendingFilterCustomer] = useState('')
  const [pendingFilterDate, setPendingFilterDate] = useState('')
  const [pendingFilterCustomerDropdownOpen, setPendingFilterCustomerDropdownOpen] = useState(false)
  const pendingFilterCustomerRef = useRef<HTMLDivElement>(null)
  const [filteredPendingOrders, setFilteredPendingOrders] = useState<CustomerOrder[]>([])
  const [expandedPendingOrders, setExpandedPendingOrders] = useState<Set<string>>(new Set())

  // Rozkliknutí sekce očekávaných výdejek
  const [isPendingSectionExpanded, setIsPendingSectionExpanded] = useState(false)

  // Stránkování pro očekávané výdejky
  const [pendingCurrentPage, setPendingCurrentPage] = useState(1)
  const [pendingItemsPerPage, setPendingItemsPerPage] = useState(10)
  const pendingSectionRef = useRef<HTMLDivElement>(null)

  // Modal pro zpracování (vyskladnění)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [processingNoteId, setProcessingNoteId] = useState<string | null>(null)
  const [processingNoteItems, setProcessingNoteItems] = useState<DeliveryNoteItem[]>([])
  const [shippedQuantities, setShippedQuantities] = useState<Record<string, number>>({})
  const [processNote, setProcessNote] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (highlightId && filteredDeliveryNotes.length > 0) {
      // Najdi index highlightnuté výdejky ve filtrovaných datech
      const index = filteredDeliveryNotes.findIndex(note => note.id === highlightId)

      if (index !== -1) {
        // Vypočítej na které stránce se nachází
        const pageNumber = Math.floor(index / deliveryNotesItemsPerPage) + 1
        setDeliveryNotesCurrentPage(pageNumber)

        // Rozbal výdejku
        setExpandedNotes(new Set([highlightId]))

        // Scrolluj k výdejce po malé pauze (aby se stránka načetla)
        setTimeout(() => {
          if (highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
    }
  }, [highlightId, filteredDeliveryNotes, deliveryNotesItemsPerPage])

  // Zavřít dropdown filtry při kliknutí mimo
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterCustomerRef.current && !filterCustomerRef.current.contains(event.target as Node)) {
        setFilterCustomerDropdownOpen(false)
      }
      if (filterStatusRef.current && !filterStatusRef.current.contains(event.target as Node)) {
        setFilterStatusDropdownOpen(false)
      }
      if (pendingFilterCustomerRef.current && !pendingFilterCustomerRef.current.contains(event.target as Node)) {
        setPendingFilterCustomerDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    let filtered = [...deliveryNotes]

    if (filterNumber) {
      filtered = filtered.filter(dn =>
        dn.deliveryNumber.toLowerCase().includes(filterNumber.toLowerCase())
      )
    }

    if (filterDate) {
      filtered = filtered.filter(dn => {
        const dnDate = new Date(dn.deliveryDate).toISOString().split('T')[0]
        return dnDate === filterDate
      })
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'delivered') {
        // "Vydáno" zahrnuje active, delivered a ostatní (kromě storno)
        filtered = filtered.filter(dn => dn.status !== 'storno')
      } else if (filterStatus === 'storno') {
        filtered = filtered.filter(dn => dn.status === 'storno')
      }
    }

    if (filterCustomer) {
      filtered = filtered.filter(dn => {
        const customerName = dn.customer?.name || dn.customerName || ''
        return customerName.toLowerCase().includes(filterCustomer.toLowerCase())
      })
    }

    // Filtr podle minimálního počtu položek
    if (filterMinItems) {
      const minItems = parseInt(filterMinItems)
      filtered = filtered.filter(dn => (dn.items?.length || 0) >= minItems)
    }

    // Filtr podle minimální hodnoty
    if (filterMinValue) {
      const minVal = parseFloat(filterMinValue)
      filtered = filtered.filter(dn => {
        const total = dn.items.reduce((sum, item) =>
          sum + (item.quantity * (item.product?.price || 0)), 0
        )
        return total >= minVal
      })
    }

    setFilteredDeliveryNotes(filtered)
    setDeliveryNotesCurrentPage(1) // Reset stránky při změně filtrů
  }, [deliveryNotes, filterNumber, filterDate, filterStatus, filterCustomer, filterMinItems, filterMinValue])

  // Filtrování očekávaných výdejek
  useEffect(() => {
    let filtered = [...pendingOrders]

    if (pendingFilterOrderNumber) {
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(pendingFilterOrderNumber.toLowerCase())
      )
    }

    if (pendingFilterCustomer) {
      filtered = filtered.filter(order => {
        const customerName = order.customer?.name || order.customerName || ''
        return customerName.toLowerCase().includes(pendingFilterCustomer.toLowerCase())
      })
    }

    if (pendingFilterDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.orderDate).toISOString().split('T')[0]
        return orderDate === pendingFilterDate
      })
    }

    setFilteredPendingOrders(filtered)
    setPendingCurrentPage(1) // Reset stránky při změně filtrů
  }, [pendingOrders, pendingFilterOrderNumber, pendingFilterCustomer, pendingFilterDate])

  async function loadData() {
    try {
      const [deliveryNotesRes, pendingOrdersRes, customersRes, settingsRes] = await Promise.all([
        fetch('/api/delivery-notes'),
        fetch('/api/customer-orders/pending-shipment'),
        fetch('/api/customers'),
        fetch('/api/settings')
      ])

      const [deliveryNotesData, pendingOrdersData, customersData, settingsData] = await Promise.all([
        deliveryNotesRes.json(),
        pendingOrdersRes.json(),
        customersRes.json(),
        settingsRes.json()
      ])

      setDeliveryNotes(Array.isArray(deliveryNotesData) ? deliveryNotesData : [])
      setPendingOrders(Array.isArray(pendingOrdersData) ? pendingOrdersData : [])
      setCustomers(Array.isArray(customersData) ? customersData : [])
      setIsVatPayer(settingsData.isVatPayer ?? true)
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
      alert('Nepodařilo se načíst data')
      setDeliveryNotes([])
      setPendingOrders([])
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  function toggleExpanded(noteId: string) {
    const newExpanded = new Set(expandedNotes)
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId)
    } else {
      newExpanded.add(noteId)
    }
    setExpandedNotes(newExpanded)
  }

  function togglePendingExpanded(orderId: string) {
    const newExpanded = new Set(expandedPendingOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedPendingOrders(newExpanded)
  }


  function handlePrepareShipment(orderId: string) {
    // Najdi objednávku
    const order = pendingOrders.find(o => o.id === orderId)
    if (!order) return

    setProcessingNoteId(orderId)

    // Převeď položky objednávky na formát DeliveryNoteItem a nastav zbývající množství jako default
    const orderItemsAsDeliveryItems: DeliveryNoteItem[] = order.items.map(item => {
      const remaining = Number(item.quantity) - Number(item.shippedQuantity || 0)

      return {
        id: item.id,
        productId: item.productId || undefined,
        productName: item.productName || undefined,
        quantity: remaining, // Zbývající množství jako default
        unit: item.unit,
        product: item.product ? { ...item.product, price: Number((item.product as any).price || (item as any).price || 0) } : undefined
      }
    }).filter(item => item.quantity > 0) // Jen položky s nějakým zbytkem

    setProcessingNoteItems(orderItemsAsDeliveryItems)

    // Inicializuj shippedQuantities se zbývajícím množstvím
    const initialQuantities: Record<string, number> = {}
    orderItemsAsDeliveryItems.forEach(item => {
      initialQuantities[item.id] = item.quantity
    })
    setShippedQuantities(initialQuantities)

    setShowProcessModal(true)
  }

  function handleProcessDeliveryNote(noteId: string) {
    // Najdi výdejku
    const note = deliveryNotes.find(n => n.id === noteId)
    if (!note) return

    setProcessingNoteId(noteId)
    setProcessingNoteItems(note.items || [])

    // Inicializuj shippedQuantities s plným množstvím
    const initialQuantities: Record<string, number> = {}
    note.items.forEach(item => {
      if (item.id) {
        initialQuantities[item.id] = Number(item.quantity)
      }
    })
    setShippedQuantities(initialQuantities)

    setShowProcessModal(true)
  }

  async function handleConfirmProcess() {
    if (!processingNoteId) return

    try {
      // Zjisti, jestli je to objednávka (z pendingOrders) nebo existující výdejka (z deliveryNotes)
      const isCustomerOrder = pendingOrders.some(o => o.id === processingNoteId)

      if (isCustomerOrder) {
        // VYTVÁŘÍME NOVOU VÝDEJKU z objednávky
        const items = processingNoteItems.map(item => ({
          productId: item.productId || null,
          productName: item.productName || null,
          quantity: shippedQuantities[item.id!] || 0,
          unit: item.unit
        }))

        const payload: any = {
          customerOrderId: processingNoteId,
          items
        }

        // Přidej poznámku jen pokud není prázdná
        if (processNote.trim()) {
          payload.note = processNote.trim()
        }

        const res = await fetch('/api/delivery-notes/create-from-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Chyba při vytváření výdejky')
        }

        alert('✅ Výdejka byla vytvořena a vyskladněna!')
      } else {
        // ZPRACOVÁVÁME EXISTUJÍCÍ VÝDEJKU (draft → active)
        const items = processingNoteItems.map(item => ({
          id: item.id!,
          shippedQuantity: shippedQuantities[item.id!] || 0
        }))

        const payload: any = { items }

        // Přidej poznámku jen pokud není prázdná
        if (processNote.trim()) {
          payload.note = processNote.trim()
        }

        const res = await fetch(`/api/delivery-notes/${processingNoteId}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Chyba při zpracování')
        }

        alert('✅ Výdejka byla zpracována a vyskladněna!')
      }

      setShowProcessModal(false)
      setProcessingNoteId(null)
      setProcessingNoteItems([])
      setShippedQuantities({})
      setProcessNote('')
      loadData()
    } catch (error: any) {
      console.error('Chyba:', error)
      alert(error.message || 'Nepodařilo se zpracovat výdejku')
    }
  }


  function handleDownloadPDF(noteId: string) {
    const note = deliveryNotes.find(n => n.id === noteId)
    if (!note) return

    try {
      const pdfData = {
        noteNumber: note.deliveryNumber,
        noteDate: note.deliveryDate,
        customerName: (note.customerOrder as any)?.customer?.name || (note.customerOrder as any)?.customerName || note.customerName || 'Neznámý zákazník',
        customerAddress: (note.customerOrder as any)?.customerAddress,
        customerEmail: (note.customerOrder as any)?.customerEmail,
        customerPhone: (note.customerOrder as any)?.customerPhone,
        items: note.items.map(item => ({
          productName: item.product?.name || item.productName || 'Neznámý produkt',
          quantity: Number(item.quantity),
          unit: item.unit,
          price: Number(item.product?.price || 0)
        })),
        totalAmount: note.items.reduce((sum, item) =>
          sum + (Number(item.quantity) * Number(item.product?.price || 0)), 0
        ),
        note: note.note,
        status: note.status
      }

      const pdfBlob = generateDeliveryNotePDF(pdfData)
      openPDFInNewTab(pdfBlob)
    } catch (error: any) {
      console.error('Chyba při generování PDF:', error)
      alert(`Chyba při generování PDF: ${error.message}`)
    }
  }

  async function handleStorno(noteId: string) {
    const note = deliveryNotes.find(n => n.id === noteId)
    if (!note) return

    if (note.status === 'storno') {
      alert('Tato výdejka je již stornována')
      return
    }

    const reason = prompt(`Opravdu chceš stornovat výdejku ${note.deliveryNumber}?\n\nZadej důvod storna (povinné):`)

    if (!reason || reason.trim().length === 0) {
      // Uživatel zrušil nebo nezadal důvod
      return
    }

    try {
      const res = await fetch(`/api/delivery-notes/${noteId}/storno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, userId: 'user' })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Nepodařilo se stornovat výdejku')
      }

      alert('Výdejka byla stornována a zboží vráceno do skladu!')
      loadData()
    } catch (error: any) {
      console.error('Chyba při stornování:', error)
      alert(`Chyba: ${error.message}`)
    }
  }

  function getStatusBadge(status: string) {
    // Zjednodušené statusy: jen "Vydáno" (zelený) nebo "STORNO" (červený)
    if (status === 'storno') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          STORNO
        </span>
      )
    }

    // Všechny ostatní statusy (active, delivered, apod.) zobraz jako "Vydáno"
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Vydáno
      </span>
    )
  }

  if (loading) {
    return <div className="p-6">Načítání...</div>
  }

  return (
    <div className="space-y-6">
      {/* Hlavička */}
      <div className="bg-gradient-to-r from-slate-50 to-orange-50 border-l-4 border-orange-500 rounded-lg shadow-sm py-4 px-6 mb-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-orange-600">
            Výdejky
            <span className="text-sm font-normal text-gray-600 ml-3">
              (Zobrazeno <span className="font-semibold text-orange-600">{filteredDeliveryNotes.length}</span> z <span className="font-semibold text-gray-700">{deliveryNotes.length}</span>)
            </span>
          </h1>
        </div>
      </div>

      {/* Očekávané výdejky (TAHOVÁ LOGIKA) */}
      {pendingOrders.length > 0 && (
        <div ref={pendingSectionRef}>
        <Card className="mb-6 border-2 border-orange-300 bg-orange-50">
          <CardHeader
            className="cursor-pointer hover:bg-orange-100 transition-colors"
            onClick={() => setIsPendingSectionExpanded(!isPendingSectionExpanded)}
          >
            <div className="flex items-center gap-2">
              {isPendingSectionExpanded ? (
                <ChevronDown className="h-6 w-6 text-orange-600" />
              ) : (
                <ChevronRight className="h-6 w-6 text-orange-600" />
              )}
              <CardTitle className="text-orange-900">
                📦 Očekávané výdejky (čeká na expedici) - {filteredPendingOrders.length} objednávek
              </CardTitle>
            </div>
          </CardHeader>
          {isPendingSectionExpanded && (
          <CardContent>
            {/* Filtry pro očekávané výdejky */}
            <div className="mb-4">
              <div className="grid grid-cols-[auto_auto_1fr_1.5fr_1fr_auto] items-center gap-4 px-4 py-3 bg-white border border-orange-300 rounded-lg">
                {/* Vymazat filtry */}
                <button
                  onClick={() => {
                    setPendingFilterOrderNumber('')
                    setPendingFilterCustomer('')
                    setPendingFilterDate('')
                  }}
                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center"
                  title="Vymazat filtry"
                >
                  ✕
                </button>

                {/* Šipka - prázdný prostor */}
                <div className="w-8"></div>

                {/* Číslo zak. */}
                <input
                  type="text"
                  value={pendingFilterOrderNumber}
                  onChange={(e) => setPendingFilterOrderNumber(e.target.value)}
                  placeholder="Číslo zak..."
                  className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />

                {/* Odběratel */}
                <div ref={pendingFilterCustomerRef} className="relative">
                  <input
                    type="text"
                    value={pendingFilterCustomer}
                    onChange={(e) => setPendingFilterCustomer(e.target.value)}
                    onFocus={() => setPendingFilterCustomerDropdownOpen(true)}
                    placeholder="Odběratel..."
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  />

                  {pendingFilterCustomerDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                      {customers
                        .filter(c => c.name.toLowerCase().includes(pendingFilterCustomer.toLowerCase()))
                        .map(customer => (
                          <div
                            key={customer.id}
                            onClick={() => {
                              setPendingFilterCustomer(customer.name)
                              setPendingFilterCustomerDropdownOpen(false)
                            }}
                            className="px-3 py-2 hover:bg-orange-50 cursor-pointer text-xs truncate"
                          >
                            {customer.name}
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Datum objednávky */}
                <input
                  type="date"
                  value={pendingFilterDate}
                  onChange={(e) => setPendingFilterDate(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />

                {/* Tlačítko - prázdný prostor */}
                <div className="w-32"></div>
              </div>
            </div>

            {/* Hlavička seznamu */}
            <div className="grid grid-cols-[auto_auto_1fr_1.5fr_1fr_auto] items-center gap-4 px-4 py-3 bg-orange-100 border border-orange-300 rounded-lg text-xs font-semibold text-orange-900 mb-2">
              <div className="w-8"></div>
              <div className="w-8"></div>
              <div>Číslo zak.</div>
              <div>Odběratel</div>
              <div>Datum objednávky</div>
              <div className="w-32"></div>
            </div>

            {/* Seznam objednávek */}
            <div className="space-y-2">
              {filteredPendingOrders
                .slice((pendingCurrentPage - 1) * pendingItemsPerPage, pendingCurrentPage * pendingItemsPerPage)
                .map((order) => {
                const isExpanded = expandedPendingOrders.has(order.id)
                return (
                  <div key={order.id} className="border-2 border-orange-300 rounded-lg bg-white">
                    <div className="p-4 grid grid-cols-[auto_auto_1fr_1.5fr_1fr_auto] items-center gap-4 hover:bg-orange-50 transition-colors">
                      {/* Prázdný prostor pro zarovnání */}
                      <div className="w-8"></div>

                      {/* Rozbalit/sbalit */}
                      <button
                        onClick={() => togglePendingExpanded(order.id)}
                        className="w-8"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-orange-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-orange-600" />
                        )}
                      </button>

                      {/* Číslo zak. */}
                      <div
                        className="cursor-pointer"
                        onClick={() => togglePendingExpanded(order.id)}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded font-medium">
                            Zaplaceno
                          </span>
                        </div>
                      </div>

                      {/* Odběratel */}
                      <div
                        className="cursor-pointer"
                        onClick={() => togglePendingExpanded(order.id)}
                      >
                        {order.customer?.id ? (
                          <Link
                            href={`/customers?highlight=${order.customer.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {order.customer.name}
                          </Link>
                        ) : (
                          <p className="text-sm text-gray-700">
                            {order.customerName || '-'}
                          </p>
                        )}
                      </div>

                      {/* Datum objednávky */}
                      <div
                        className="cursor-pointer"
                        onClick={() => togglePendingExpanded(order.id)}
                      >
                        <p className="text-sm text-gray-700">
                          {formatDate(order.orderDate)}
                        </p>
                      </div>

                      {/* Tlačítko Vyskladnit */}
                      <Button
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 w-32"
                        onClick={() => handlePrepareShipment(order.id)}
                        title="Vyskladnit objednávku (celou nebo částečně)"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Vyskladnit
                      </Button>
                    </div>

                    {/* Detail položek */}
                    {isExpanded && (
                      <div className="border-t-2 border-orange-300 p-4 bg-gray-50">
                        <div className="border rounded-lg overflow-hidden">
                          {/* Hlavička - různá pro plátce a neplátce DPH */}
                          {isVatPayer ? (
                            <div className="grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.5fr_0.8fr_0.5fr_0.8fr_1fr] gap-2 px-3 py-1.5 bg-gray-100 text-[11px] font-semibold text-gray-700 border-b">
                              <div>Položky k expedici</div>
                              <div className="text-center">Objednáno</div>
                              <div className="text-center">Vyskladněno</div>
                              <div className="text-center">Zbývá</div>
                              <div className="text-center">DPH</div>
                              <div className="text-center">Cena/ks</div>
                              <div className="text-center">DPH/ks</div>
                              <div className="text-center">S DPH/ks</div>
                              <div className="text-center">Celkem</div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-3 py-1.5 bg-gray-100 text-[11px] font-semibold text-gray-700 border-b">
                              <div>Položky k expedici</div>
                              <div className="text-right">Objednáno</div>
                              <div className="text-right">Vyskladněno</div>
                              <div className="text-right">Zbývá</div>
                              <div className="text-right">Cena/ks</div>
                              <div className="text-right">Celkem</div>
                            </div>
                          )}

                          {/* Řádky položek - střídání bílá/šedá */}
                          {order.items.map((item, i) => {
                            const shipped = Number(item.shippedQuantity || 0)
                            const ordered = Number(item.quantity)
                            const remaining = ordered - shipped
                            const unitPrice = Number(item.price || 0)
                            const itemVatRate = Number(item.vatRate || item.product?.vatRate || DEFAULT_VAT_RATE)
                            const isItemNonVat = isNonVatPayer(itemVatRate)
                            const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                            const priceWithVat = unitPrice + vatPerUnit
                            const total = ordered * (isVatPayer ? priceWithVat : unitPrice)

                            return isVatPayer ? (
                              <div
                                key={item.id}
                                className={`grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.5fr_0.8fr_0.5fr_0.8fr_1fr] gap-2 px-3 py-1.5 ${
                                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }`}
                              >
                                <div className="text-[13px] text-gray-900">
                                  {item.product?.name || item.productName || 'Neznámý produkt'}
                                </div>
                                <div className="text-[13px] text-gray-700 text-center">
                                  {ordered.toLocaleString('cs-CZ')} {item.unit}
                                </div>
                                <div className="text-[13px] text-gray-700 text-center">
                                  {shipped.toLocaleString('cs-CZ')} {item.unit}
                                </div>
                                <div className="text-[13px] font-semibold text-orange-700 text-center">
                                  {remaining.toLocaleString('cs-CZ')} {item.unit}
                                </div>
                                <div className="text-[13px] text-gray-500 text-center">
                                  {isItemNonVat ? '-' : `${itemVatRate}%`}
                                </div>
                                <div className="text-[13px] text-gray-700 text-center">
                                  {formatPrice(unitPrice)}
                                </div>
                                <div className="text-[13px] text-gray-500 text-center">
                                  {isItemNonVat ? '-' : formatPrice(vatPerUnit)}
                                </div>
                                <div className="text-[13px] text-gray-700 text-center">
                                  {formatPrice(priceWithVat)}
                                </div>
                                <div className="text-[13px] font-semibold text-gray-900 text-center">
                                  {formatPrice(total)}
                                </div>
                              </div>
                            ) : (
                              <div
                                key={item.id}
                                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-3 py-1.5 ${
                                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }`}
                              >
                                <div className="text-[13px] text-gray-900">
                                  {item.product?.name || item.productName || 'Neznámý produkt'}
                                </div>
                                <div className="text-[13px] text-gray-700 text-right">
                                  {ordered.toLocaleString('cs-CZ')} {item.unit}
                                </div>
                                <div className="text-[13px] text-gray-700 text-right">
                                  {shipped.toLocaleString('cs-CZ')} {item.unit}
                                </div>
                                <div className="text-[13px] font-semibold text-orange-700 text-right">
                                  {remaining.toLocaleString('cs-CZ')} {item.unit}
                                </div>
                                <div className="text-[13px] text-gray-700 text-right">
                                  {formatPrice(unitPrice)}
                                </div>
                                <div className="text-[13px] font-semibold text-gray-900 text-right">
                                  {formatPrice(total)}
                                </div>
                              </div>
                            )
                          })}

                          {/* Celková částka - tučný řádek */}
                          <div className={`grid ${isVatPayer ? 'grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.5fr_0.8fr_0.5fr_0.8fr_1fr]' : 'grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]'} gap-2 px-3 py-1.5 bg-gray-100 border-t-2 font-bold`}>
                            <div className={`${isVatPayer ? 'col-span-8' : 'col-span-5'} text-[13px]`}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka objednávky'}</div>
                            <div className="text-[13px] text-center">
                              {formatPrice(order.items.reduce((sum, item) => {
                                const unitPrice = Number(item.price || 0)
                                const itemVatRate = Number(item.vatRate || item.product?.vatRate || DEFAULT_VAT_RATE)
                                const isItemNonVat = isNonVatPayer(itemVatRate)
                                const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                                const priceWithVat = unitPrice + vatPerUnit
                                return sum + (Number(item.quantity) * (isVatPayer ? priceWithVat : unitPrice))
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

            {/* Stránkování a výběr počtu záznamů */}
            {filteredPendingOrders.length > 0 && (() => {
              const totalPages = Math.ceil(filteredPendingOrders.length / pendingItemsPerPage)
              const pages = []

              // Logika pro zobrazení stránek (max 7 tlačítek)
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i)
                }
              } else {
                pages.push(1)
                if (pendingCurrentPage <= 3) {
                  pages.push(2, 3, 4)
                  pages.push('...')
                  pages.push(totalPages)
                } else if (pendingCurrentPage >= totalPages - 2) {
                  pages.push('...')
                  pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
                } else {
                  pages.push('...')
                  pages.push(pendingCurrentPage - 1, pendingCurrentPage, pendingCurrentPage + 1)
                  pages.push('...')
                  pages.push(totalPages)
                }
              }

              const handlePageChange = (newPage: number) => {
                setPendingCurrentPage(newPage)
                setTimeout(() => {
                  if (pendingSectionRef.current) {
                    pendingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }, 50)
              }

              return (
                <div className="mt-4 flex items-center justify-between">
                  {/* Výběr počtu záznamů na stránku */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Zobrazit:</span>
                    {[10, 20, 50, 100].map(count => (
                      <button
                        key={count}
                        onClick={() => {
                          setPendingItemsPerPage(count)
                          setPendingCurrentPage(1)
                        }}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          pendingItemsPerPage === count
                            ? 'bg-orange-600 text-white'
                            : 'bg-orange-100 text-orange-900 hover:bg-orange-200'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                    <span className="text-sm text-gray-500 ml-2">
                      ({filteredPendingOrders.length} celkem)
                    </span>
                  </div>

                  {/* Navigace mezi stránkami */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(Math.max(1, pendingCurrentPage - 1))}
                        disabled={pendingCurrentPage === 1}
                        className="px-3 py-1.5 bg-orange-100 text-orange-900 rounded hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Předchozí
                      </button>

                      {pages.map((page, index) => {
                        if (page === '...') {
                          return (
                            <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                              ...
                            </span>
                          )
                        }

                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page as number)}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                              pendingCurrentPage === page
                                ? 'bg-orange-600 text-white'
                                : 'bg-orange-100 text-orange-900 hover:bg-orange-200'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}

                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, pendingCurrentPage + 1))}
                        disabled={pendingCurrentPage >= totalPages}
                        className="px-3 py-1.5 bg-orange-100 text-orange-900 rounded hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Další
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}
          </CardContent>
          )}
        </Card>
        </div>
      )}

      {/* Filtry - přesně odpovídající sloupcům tabulky */}
      <div ref={deliveryNotesSectionRef} className="mb-4">
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">

          {/* Vymazat filtry - úplně vlevo nad šipkou */}
          <button
            onClick={() => {
              setFilterNumber('')
              setFilterDate('')
              setFilterStatus('all')
              setFilterCustomer('')
              setFilterMinItems('')
              setFilterMinValue('')
            }}
            className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded transition-colors flex items-center justify-center"
            title="Vymazat filtry"
          >
            ✕
          </button>

          {/* Textový input - Číslo */}
          <input
            type="text"
            value={filterNumber}
            onChange={(e) => setFilterNumber(e.target.value)}
            placeholder="Číslo..."
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Datový input - Datum */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Textový input s autocomplete - Odběratel */}
          <div ref={filterCustomerRef} className="relative">
            <input
              type="text"
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              onFocus={() => setFilterCustomerDropdownOpen(true)}
              placeholder="Odběratel..."
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />

            {filterCustomerDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                {customers
                  .filter(c => c.name.toLowerCase().includes(filterCustomer.toLowerCase()))
                  .map(customer => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        setFilterCustomer(customer.name)
                        setFilterCustomerDropdownOpen(false)
                      }}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center truncate"
                    >
                      {customer.name}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Číselný input - Položek (≥ N) */}
          <input
            type="number"
            value={filterMinItems}
            onChange={(e) => setFilterMinItems(e.target.value)}
            placeholder="≥"
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Číselný input - Hodnota (≥ částka) */}
          <input
            type="number"
            value={filterMinValue}
            onChange={(e) => setFilterMinValue(e.target.value)}
            placeholder="≥"
            className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Dropdown - Status (BAREVNÝ) */}
          <div ref={filterStatusRef} className="relative">
            <div
              onClick={() => setFilterStatusDropdownOpen(!filterStatusDropdownOpen)}
              className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-blue-500 flex items-center justify-center"
            >
              {filterStatus === 'all' && <span>Vše</span>}
              {filterStatus === 'delivered' && <span className="text-green-600">Vydáno</span>}
              {filterStatus === 'storno' && <span className="text-red-600">STORNO</span>}
            </div>

            {filterStatusDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
                <div onClick={() => { setFilterStatus('all'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center">Vše</div>
                <div onClick={() => { setFilterStatus('delivered'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-green-600">Vydáno</div>
                <div onClick={() => { setFilterStatus('storno'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs text-center text-red-600">STORNO</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {deliveryNotes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              Zatím nemáte žádné výdejky
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Hlavička tabulky */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 border rounded-lg text-xs font-semibold text-gray-700">
              <div className="w-8"></div>
              <div className="text-center">Číslo</div>
              <div className="text-center">Datum</div>
              <div className="text-center">Odběratel</div>
              <div className="text-center">Položek</div>
              <div className="text-center">Hodnota</div>
              <div className="text-center">Status</div>
            </div>

            {/* Výdejky */}
            {filteredDeliveryNotes
              .slice((deliveryNotesCurrentPage - 1) * deliveryNotesItemsPerPage, deliveryNotesCurrentPage * deliveryNotesItemsPerPage)
              .map((note) => (
              <div
                key={note.id}
                ref={note.id === highlightId ? highlightRef : null}
                className={`border rounded-lg ${
                  note.id === highlightId ? 'ring-2 ring-blue-500 bg-blue-50' :
                  expandedNotes.has(note.id) ? 'ring-2 ring-blue-400' : ''
                }`}
              >
                <div className={`p-4 grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 transition-colors ${note.status === 'storno' ? 'bg-red-50 opacity-70' : 'hover:bg-gray-50'}`}>
                  {/* Rozbalit/sbalit */}
                  <button
                    onClick={() => toggleExpanded(note.id)}
                    className="w-8"
                  >
                    {expandedNotes.has(note.id) ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </button>

                  {/* Číslo */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(note.id)}
                  >
                    <p className={`text-sm font-semibold text-gray-900 truncate ${note.status === 'storno' ? 'line-through' : ''}`}>
                      {note.deliveryNumber}
                    </p>
                  </div>

                  {/* Datum */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(note.id)}
                  >
                    <p className="text-sm text-gray-700">
                      {formatDate(note.deliveryDate)}
                    </p>
                  </div>

                  {/* Odběratel */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(note.id)}
                  >
                    {note.customer?.id ? (
                      <Link
                        href={`/customers?highlight=${note.customer.id}`}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium truncate inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {note.customer.name}
                      </Link>
                    ) : (
                      <p className="text-sm text-gray-700 truncate">
                        {note.customerName || 'Anonymní zákazník'}
                      </p>
                    )}
                  </div>

                  {/* Položek */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(note.id)}
                  >
                    <p className="text-sm text-gray-600">
                      {note.items.length}
                    </p>
                  </div>

                  {/* Hodnota */}
                  <div
                    className="cursor-pointer text-center"
                    onClick={() => toggleExpanded(note.id)}
                  >
                    <p className="text-sm font-bold text-gray-900">
                      {note.items.length > 0 && note.items[0].product ? (
                        formatPrice(note.items.reduce((sum, item) => {
                          const unitPrice = Number(item.product?.price || 0)
                          const itemVatRate = Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
                          const isItemNonVat = isNonVatPayer(itemVatRate)
                          const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                          const priceWithVat = isVatPayer ? (unitPrice + vatPerUnit) : unitPrice
                          return sum + (Number(item.quantity) * priceWithVat)
                        }, 0))
                      ) : '-'}
                    </p>
                  </div>

                  {/* Status */}
                  <div
                    className="cursor-pointer text-center flex justify-center"
                    onClick={() => toggleExpanded(note.id)}
                  >
                    {getStatusBadge(note.status)}
                  </div>
                </div>

                {/* Detail položek */}
                {expandedNotes.has(note.id) && (
                  <div className="border-t p-4 bg-gray-50">
                    {/* Odkazy na související dokumenty - modrý řádek */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-center gap-6">
                      {/* Transakce nebo Objednávka */}
                      {note.transaction ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-blue-900">Transakce:</span>
                          <Link
                            href={`/transactions?highlight=${note.transaction.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                          >
                            {note.transaction.transactionCode}
                          </Link>
                        </div>
                      ) : note.customerOrder ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-blue-900">Objednávka:</span>
                          <Link
                            href={`/customer-orders?highlight=${note.customerOrder.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                          >
                            {note.customerOrder.orderNumber}
                          </Link>
                        </div>
                      ) : null}

                      {/* Faktura */}
                      {(() => {
                        const invoice = (note.customerOrder as any)?.issuedInvoice || note.issuedInvoice
                        return invoice ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-900">Faktura:</span>
                            <Link
                              href={`/invoices/issued?highlight=${invoice.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                            >
                              {invoice.invoiceNumber}
                            </Link>
                          </div>
                        ) : null
                      })()}

                      {/* SumUp účtenka */}
                      {note.transaction?.receiptId && (() => {
                        const match = note.transaction.receiptId.match(/urn:sumup:pos:sale:([^:]+):([a-f0-9-]{36})[:;]/)
                        if (!match) return null

                        const merchantCode = match[1]
                        const saleId = match[2]
                        const receiptUrl = `https://sales-receipt.sumup.com/pos/public/v1/${merchantCode}/receipt/${saleId}?format=html`

                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-900">Účtenka:</span>
                            <a
                              href={receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                            >
                              Zobrazit
                            </a>
                          </div>
                        )
                      })()}
                    </div>

                    {/* Hlavní Sekce: Položky výdejky */}
                    {note.items.length === 0 ? (
                      <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">
                          Položky výdejky (0)
                        </h4>
                        <div className="px-4 py-4 text-sm text-gray-500 italic">Žádné položky</div>
                      </div>
                    ) : (
                      <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">
                          Položky výdejky ({note.items.length})
                        </h4>

                        <div className="text-sm">
                          {/* Hlavička tabulky - různá pro plátce a neplátce DPH */}
                          {isVatPayer ? (
                            <div className="grid grid-cols-[3fr_1fr_1fr_0.5fr_1fr_0.5fr_1fr_1fr] gap-2 px-4 py-2 bg-gray-50 font-semibold text-gray-700 border-b text-xs">
                              <div>Produkt</div>
                              <div className="text-center">Pohyb</div>
                              <div className="text-center">Množství</div>
                              <div className="text-center">DPH</div>
                              <div className="text-center">Cena/ks</div>
                              <div className="text-center">DPH/ks</div>
                              <div className="text-center">S DPH/ks</div>
                              <div className="text-center">Celkem</div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 bg-gray-50 font-semibold text-gray-700 border-b">
                              <div>Produkt</div>
                              <div className="text-center">Skladový pohyb</div>
                              <div className="text-right">Množství</div>
                              <div className="text-right">Cena za kus</div>
                              <div className="text-right">Celkem</div>
                            </div>
                          )}

                          {/* Řádky položek */}
                          {note.items.map((item, i: number) => {
                            const unitPrice = Number(item.product?.price || 0)
                            const itemVatRate = Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
                            const isItemNonVat = isNonVatPayer(itemVatRate)
                            const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                            const priceWithVatPerUnit = unitPrice + vatPerUnit
                            const totalWithoutVat = Number(item.quantity) * unitPrice
                            const totalWithVat = Number(item.quantity) * priceWithVatPerUnit

                            return isVatPayer ? (
                              <div key={i} className={`grid grid-cols-[3fr_1fr_1fr_0.5fr_1fr_0.5fr_1fr_1fr] gap-2 px-4 py-2 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} text-xs`}>
                                <div className="font-medium text-gray-900">
                                  {item.product?.name || item.productName || '(Neznámé)'}
                                </div>
                                <div className="text-center">
                                  {item.productId && item.inventoryItemId ? (
                                    <Link
                                      href={`/inventory?selectedProduct=${item.productId}&highlightMovement=${item.inventoryItemId}`}
                                      className="inline-flex items-center px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Zobrazit
                                    </Link>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </div>
                                <div className="text-center text-gray-600">
                                  {formatQuantity(item.quantity, item.unit)}
                                </div>
                                <div className="text-center text-gray-500">
                                  {isItemNonVat ? '-' : `${itemVatRate}%`}
                                </div>
                                <div className="text-center text-gray-600">
                                  {formatPrice(unitPrice)}
                                </div>
                                <div className="text-center text-gray-500">
                                  {isItemNonVat ? '-' : formatPrice(vatPerUnit)}
                                </div>
                                <div className="text-center text-gray-700">
                                  {formatPrice(priceWithVatPerUnit)}
                                </div>
                                <div className="text-center font-semibold text-gray-900">
                                  {formatPrice(totalWithVat)}
                                </div>
                              </div>
                            ) : (
                              <div key={i} className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                <div className="font-medium text-gray-900">
                                  {item.product?.name || item.productName || '(Neznámé)'}
                                </div>
                                <div className="text-center">
                                  {item.productId && item.inventoryItemId ? (
                                    <Link
                                      href={`/inventory?selectedProduct=${item.productId}&highlightMovement=${item.inventoryItemId}`}
                                      className="inline-flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Zobrazit
                                    </Link>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </div>
                                <div className="text-right text-gray-600">
                                  {formatQuantity(item.quantity, item.unit)}
                                </div>
                                <div className="text-right text-gray-600">
                                  {formatPrice(unitPrice)}
                                </div>
                                <div className="text-right font-semibold text-gray-900">
                                  {formatPrice(totalWithoutVat)}
                                </div>
                              </div>
                            )
                          })}

                          {/* Celková částka */}
                          <div className={`grid ${isVatPayer ? 'grid-cols-[3fr_1fr_1fr_0.5fr_1fr_0.5fr_1fr_1fr]' : 'grid-cols-[2fr_1fr_1fr_1fr_1fr]'} gap-2 px-4 py-2 bg-gray-100 font-bold border-t text-sm`}>
                            <div className={isVatPayer ? 'col-span-7' : 'col-span-4'}>{isVatPayer ? 'Celková částka s DPH' : 'Celková částka'}</div>
                            <div className="text-center">
                              {formatPrice(note.items.reduce((sum, item) => {
                                const unitPrice = Number(item.product?.price || 0)
                                const itemVatRate = Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
                                const isItemNonVat = isNonVatPayer(itemVatRate)
                                const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                                const priceWithVat = isVatPayer ? (unitPrice + vatPerUnit) : unitPrice
                                return sum + (Number(item.quantity) * priceWithVat)
                              }, 0))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Poznámka (pokud existuje) */}
                    {note.note && (
                      <div className="mt-6 mb-6 border border-gray-200 rounded-lg overflow-hidden">
                        <h4 className="font-bold text-base text-gray-900 px-4 py-3 bg-gray-100 border-b border-gray-200">
                          Poznámka
                        </h4>
                        <div className="px-4 py-3 text-sm text-gray-700 bg-white">
                          {note.note}
                        </div>
                      </div>
                    )}

                    {/* Tlačítka akcí */}
                    <div className="mt-6 flex justify-between items-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadPDF(note.id)}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Zobrazit PDF
                      </Button>

                      {/* Tlačítko STORNO - jen pokud není stornováno */}
                      {note.status !== 'storno' && (
                        <button
                          onClick={() => handleStorno(note.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded flex items-center gap-2 font-medium"
                        >
                          <XCircle className="w-4 h-4" />
                          Stornovat
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Stránkování a výběr počtu záznamů */}
            {filteredDeliveryNotes.length > 0 && (() => {
              const totalPages = Math.ceil(filteredDeliveryNotes.length / deliveryNotesItemsPerPage)
              const pages = []

              // Logika pro zobrazení stránek (max 7 tlačítek)
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i)
                }
              } else {
                pages.push(1)
                if (deliveryNotesCurrentPage <= 3) {
                  pages.push(2, 3, 4)
                  pages.push('...')
                  pages.push(totalPages)
                } else if (deliveryNotesCurrentPage >= totalPages - 2) {
                  pages.push('...')
                  pages.push(totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
                } else {
                  pages.push('...')
                  pages.push(deliveryNotesCurrentPage - 1, deliveryNotesCurrentPage, deliveryNotesCurrentPage + 1)
                  pages.push('...')
                  pages.push(totalPages)
                }
              }

              const handlePageChange = (newPage: number) => {
                setDeliveryNotesCurrentPage(newPage)
                setTimeout(() => {
                  if (deliveryNotesSectionRef.current) {
                    deliveryNotesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                }, 50)
              }

              return (
                <div className="mt-4 flex items-center justify-between">
                  {/* Výběr počtu záznamů na stránku */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Zobrazit:</span>
                    {[10, 20, 50, 100].map(count => (
                      <button
                        key={count}
                        onClick={() => {
                          setDeliveryNotesItemsPerPage(count)
                          setDeliveryNotesCurrentPage(1)
                        }}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          deliveryNotesItemsPerPage === count
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                    <span className="text-sm text-gray-500 ml-2">
                      ({filteredDeliveryNotes.length} celkem)
                    </span>
                  </div>

                  {/* Navigace mezi stránkami */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(Math.max(1, deliveryNotesCurrentPage - 1))}
                        disabled={deliveryNotesCurrentPage === 1}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Předchozí
                      </button>

                      {pages.map((page, index) => {
                        if (page === '...') {
                          return (
                            <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                              ...
                            </span>
                          )
                        }

                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page as number)}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                              deliveryNotesCurrentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}

                      <button
                        onClick={() => handlePageChange(Math.min(totalPages, deliveryNotesCurrentPage + 1))}
                        disabled={deliveryNotesCurrentPage >= totalPages}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        Další
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </div>

      {/* Modal pro zpracování (vyskladnění) */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full my-8 max-h-[90vh] overflow-y-auto">
            {/* Header s gradientem */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-5 rounded-t-xl">
              <div className="flex items-center gap-3">
                <Package className="w-7 h-7" />
                <div>
                  <h2 className="text-2xl font-bold">
                    {pendingOrders.some(o => o.id === processingNoteId) ? 'Vyskladnit objednávku' : 'Vyskladnit výdejku'}
                  </h2>
                  <p className="text-orange-100 text-sm mt-1">
                    Nastav množství k vyskladnění a odešli zboží odběrateli
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Karta: Položky k vyskladnění */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-l-4 border-purple-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Položky k vyskladnění
                </h3>

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
                        const shipped = shippedQuantities[item.id!] || 0
                        const unitPrice = Number(item.product?.price || 0)
                        const itemVatRate = Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
                        const isItemNonVat = isNonVatPayer(itemVatRate)
                        const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                        const priceWithVat = unitPrice + vatPerUnit
                        const total = shipped * (isVatPayer ? priceWithVat : unitPrice)

                        return isVatPayer ? (
                          <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'} hover:bg-purple-100/40 transition-colors`}>
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {item.product?.name || item.productName || 'Neznámý produkt'}
                            </td>
                            <td className="text-center px-4 py-3 text-gray-600 whitespace-nowrap">
                              {Number(item.quantity)} {item.unit}
                            </td>
                            <td className="text-center px-4 py-3 bg-orange-50">
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  type="number"
                                  value={shipped || ''}
                                  onChange={(e) => {
                                    const inputValue = e.target.value
                                    if (inputValue === '') {
                                      setShippedQuantities({
                                        ...shippedQuantities,
                                        [item.id!]: 0
                                      })
                                      return
                                    }

                                    const numValue = Number(inputValue)
                                    const maxAllowed = Number(item.quantity)

                                    if (numValue > maxAllowed || numValue < 0) {
                                      setShippedQuantities({
                                        ...shippedQuantities,
                                        [item.id!]: 0
                                      })
                                      return
                                    }

                                    setShippedQuantities({
                                      ...shippedQuantities,
                                      [item.id!]: numValue
                                    })
                                  }}
                                  min="0"
                                  max={Number(item.quantity)}
                                  step="1"
                                  className="w-16 px-2 py-2 border-2 border-orange-300 rounded-lg text-center font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                                />
                                <span className="text-gray-600 font-medium text-xs">{item.unit}</span>
                              </div>
                            </td>
                            <td className="text-center px-4 py-3 text-gray-500 whitespace-nowrap">
                              {isItemNonVat ? '-' : `${itemVatRate}%`}
                            </td>
                            <td className="text-center px-4 py-3 text-gray-700 whitespace-nowrap">
                              {formatPrice(unitPrice)}
                            </td>
                            <td className="text-center px-4 py-3 text-gray-500 whitespace-nowrap">
                              {isItemNonVat ? '-' : formatPrice(vatPerUnit)}
                            </td>
                            <td className="text-center px-4 py-3 text-gray-700 whitespace-nowrap">
                              {formatPrice(priceWithVat)}
                            </td>
                            <td className="text-center px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                              {formatPrice(total)}
                            </td>
                          </tr>
                        ) : (
                          <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'} hover:bg-purple-100/40 transition-colors`}>
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {item.product?.name || item.productName || 'Neznámý produkt'}
                            </td>
                            <td className="text-right px-4 py-3 text-gray-600 whitespace-nowrap">
                              {Number(item.quantity)} {item.unit}
                            </td>
                            <td className="text-right px-4 py-3 bg-orange-50">
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  value={shipped || ''}
                                  onChange={(e) => {
                                    const inputValue = e.target.value
                                    if (inputValue === '') {
                                      setShippedQuantities({
                                        ...shippedQuantities,
                                        [item.id!]: 0
                                      })
                                      return
                                    }

                                    const numValue = Number(inputValue)
                                    const maxAllowed = Number(item.quantity)

                                    if (numValue > maxAllowed || numValue < 0) {
                                      setShippedQuantities({
                                        ...shippedQuantities,
                                        [item.id!]: 0
                                      })
                                      return
                                    }

                                    setShippedQuantities({
                                      ...shippedQuantities,
                                      [item.id!]: numValue
                                    })
                                  }}
                                  min="0"
                                  max={Number(item.quantity)}
                                  step="1"
                                  className="w-20 min-w-[5rem] px-3 py-2 border-2 border-orange-300 rounded-lg text-right font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                                />
                                <span className="text-gray-600 font-medium w-8 text-left">{item.unit}</span>
                              </div>
                            </td>
                            <td className="text-right px-4 py-3 text-gray-700 whitespace-nowrap">
                              {formatPrice(unitPrice)}
                            </td>
                            <td className="text-right px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                              {formatPrice(total)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50 font-bold border-t-2 border-purple-300">
                      <tr>
                        <td colSpan={isVatPayer ? 7 : 4} className="px-4 py-3 text-left text-gray-800">
                          {isVatPayer ? 'CELKEM S DPH:' : 'CELKEM:'}
                        </td>
                        <td className="text-center px-4 py-3 text-lg text-purple-700 whitespace-nowrap">
                          {formatPrice(
                            processingNoteItems.reduce((sum, item) => {
                              const shipped = shippedQuantities[item.id!] || 0
                              const unitPrice = Number(item.product?.price || 0)
                              const itemVatRate = Number((item.product as any)?.vatRate || DEFAULT_VAT_RATE)
                              const isItemNonVat = isNonVatPayer(itemVatRate)
                              const vatPerUnit = isItemNonVat ? 0 : unitPrice * itemVatRate / 100
                              const priceWithVat = unitPrice + vatPerUnit
                              return sum + (shipped * (isVatPayer ? priceWithVat : unitPrice))
                            }, 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Karta: Poznámka */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border-l-4 border-blue-500 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Poznámka
                </h3>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Poznámka k vyskladnění <span className="text-gray-500 text-xs">(volitelné)</span>
                  </label>
                  <textarea
                    value={processNote}
                    onChange={(e) => setProcessNote(e.target.value)}
                    placeholder="Volitelná poznámka k vyskladnění..."
                    rows={3}
                    className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 transition-all bg-white"
                  />
                </div>
              </div>

              {/* Upozornění */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 p-4 rounded-lg shadow-sm">
                <div className="flex gap-3">
                  <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-yellow-900 mb-1">Upozornění</p>
                    <p className="text-sm text-yellow-800">
                      Po vyskladnění se zboží odečte ze skladu a uvolní se rezervace. Tato akce je nevratná.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tlačítka */}
              <div className="flex gap-3 justify-end pt-4 border-t-2 border-gray-200">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowProcessModal(false)
                    setProcessingNoteId(null)
                    setProcessingNoteItems([])
                    setShippedQuantities({})
                    setProcessNote('')
                  }}
                  className="px-6 py-2.5"
                >
                  Zrušit
                </Button>
                <Button
                  onClick={handleConfirmProcess}
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  Vyskladnit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
