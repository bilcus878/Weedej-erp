'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { formatPrice, formatQuantity, formatDate } from '@/lib/utils'
import { isNonVatPayer } from '@/lib/vatCalculation'
import { ChevronDown, ChevronUp, ChevronRight, Edit2, RefreshCw, Warehouse } from 'lucide-react'
import {
  useEntityPage, EntityPage, LoadingState, ErrorState,
} from '@/components/erp'
import { useNavbarMeta } from '@/components/NavbarMetaContext'

export const dynamic = 'force-dynamic'

interface InventorySummary {
  productId: string
  productName: string
  unit: string
  price: number
  vatRate: number
  category?: { id: string; name: string } | null
  physicalStock: number
  reservedStock: number
  availableStock: number
  expectedQuantity: number
  totalExpectedStock: number
  avgPurchasePrice: number
  totalPurchaseValue: number
  totalSalesValue: number
  stockStatus: 'empty' | 'low' | 'ok'
}

interface StockMovement {
  id: string
  type: 'stock_in' | 'stock_out'
  date: string
  createdAt?: string
  quantity: number
  unit: string
  purchasePrice?: number
  supplier?: { id: string; name: string } | null
  note?: string | null
  transaction?: { id: string; transactionCode: string; invoiceType?: string; receiptId?: string | null }
  receipt?: { id: string; receiptNumber: string }
  deliveryNote?: { id: string; deliveryNumber: string }
  customerOrder?: { id: string; orderNumber: string }
  purchaseOrder?: { id: string; orderNumber: string }
  receivedInvoice?: { id: string; invoiceNumber: string }
  issuedInvoice?: { id: string; invoiceNumber: string }
}

interface Product { id: string; name: string; price: number; purchasePrice?: number | null; unit: string }

type SortField = 'productName' | 'category' | 'physicalStock' | 'reservedStock' | 'availableStock' | 'expectedQuantity'
type SortDirection = 'asc' | 'desc'

export default function InventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const sectionRef  = useRef<HTMLDivElement>(null)
  const { setMeta } = useNavbarMeta()

  const [categories, setCategories] = useState<any[]>([])
  const [products,   setProducts]   = useState<Product[]>([])
  const [isVatPayer, setIsVatPayer] = useState(true)

  const [selectedProductId,  setSelectedProductId]  = useState<string | null>(null)
  const [stockMovements,     setStockMovements]      = useState<StockMovement[]>([])
  const [expandedMovements,  setExpandedMovements]   = useState<Set<string>>(new Set())
  const [loadingMovements,   setLoadingMovements]    = useState(false)
  const highlightMovementId = searchParams.get('highlightMovement')
  const movementsSectionRef = useRef<HTMLDivElement>(null)

  const [sortField,     setSortField]     = useState<SortField>('productName')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [filterName,       setFilterName]       = useState('')
  const [filterCategory,   setFilterCategory]   = useState('')
  const [filterCategoryDropdownOpen, setFilterCategoryDropdownOpen] = useState(false)
  const [filterMinStock,   setFilterMinStock]   = useState('')
  const [filterMinReserved, setFilterMinReserved] = useState('')
  const [filterMinAvailable, setFilterMinAvailable] = useState('')
  const [filterMinExpected, setFilterMinExpected] = useState('')
  const [filterStatus,     setFilterStatus]     = useState('all')
  const [filterStatusDropdownOpen, setFilterStatusDropdownOpen] = useState(false)

  const [filterDate,        setFilterDate]        = useState('')
  const [filterType,        setFilterType]        = useState('all')
  const [filterTypeDropdownOpen, setFilterTypeDropdownOpen] = useState(false)
  const [filterMinQuantity, setFilterMinQuantity] = useState('')
  const [filterNote,        setFilterNote]        = useState('')

  const [currentPage,  setCurrentPage]  = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [movementsPage,    setMovementsPage]    = useState(1)
  const [movementsPerPage, setMovementsPerPage] = useState(20)

  const filterCategoryRef = useRef<HTMLDivElement>(null)
  const filterStatusRef   = useRef<HTMLDivElement>(null)
  const filterTypeRef     = useRef<HTMLDivElement>(null)

  const [showManualAdjustmentForm, setShowManualAdjustmentForm] = useState(false)
  const [adjustmentType,     setAdjustmentType]     = useState<'increase' | 'decrease'>('increase')
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('')
  const [adjustmentDate,     setAdjustmentDate]     = useState(new Date().toISOString().split('T')[0])
  const [adjustmentNote,     setAdjustmentNote]     = useState('')

  const ep = useEntityPage<InventorySummary>({
    fetchData: async () => {
      const [summaryRes, productsRes, categoriesRes, settingsRes] = await Promise.all([
        fetch('/api/inventory/summary', { cache: 'no-store' }),
        fetch('/api/products',  { cache: 'no-store' }),
        fetch('/api/categories'),
        fetch('/api/settings'),
      ])
      const [summaryData, productsData, categoriesData, settingsData] = await Promise.all([
        summaryRes.json(), productsRes.json(), categoriesRes.json(), settingsRes.json(),
      ])
      setProducts(Array.isArray(productsData)   ? productsData   : [])
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      setIsVatPayer(settingsData.isVatPayer !== false)
      return Array.isArray(summaryData) ? summaryData : []
    },
    getRowId:    r => r.productId,
    filterFn:    () => true,
    highlightId,
  })

  useEffect(() => {
    if (highlightId && filteredAndSortedSummary.length > 0) {
      const index = filteredAndSortedSummary.findIndex(item => item.productId === highlightId)
      if (index !== -1) {
        setCurrentPage(Math.floor(index / itemsPerPage) + 1)
        setTimeout(() => {
          document.getElementById(`product-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, ep.rows, itemsPerPage])

  useEffect(() => {
    const productId = searchParams.get('selectedProduct')
    if (productId && ep.rows.length > 0) setSelectedProductId(productId)
  }, [searchParams, ep.rows])

  useEffect(() => {
    if (selectedProductId) fetchProductMovements(selectedProductId)
  }, [selectedProductId])

  const hasScrolledToMovement = useRef(false)

  useEffect(() => {
    if (!highlightMovementId || filteredMovements.length === 0) return
    const index = filteredMovements.findIndex(m => m.id === highlightMovementId)
    if (index === -1) return
    hasScrolledToMovement.current = false
    setMovementsPage(Math.floor(index / movementsPerPage) + 1)
    setExpandedMovements(new Set([highlightMovementId]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightMovementId, stockMovements, movementsPerPage])

  useEffect(() => {
    if (!highlightMovementId || hasScrolledToMovement.current) return
    const el = document.getElementById(`movement-${highlightMovementId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      hasScrolledToMovement.current = true
    }
  }, [highlightMovementId, movementsPage, stockMovements])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterCategoryRef.current && !filterCategoryRef.current.contains(event.target as Node)) setFilterCategoryDropdownOpen(false)
      if (filterStatusRef.current   && !filterStatusRef.current.contains(event.target as Node))   setFilterStatusDropdownOpen(false)
      if (filterTypeRef.current     && !filterTypeRef.current.contains(event.target as Node))     setFilterTypeDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleBackToInventory = useCallback(() => {
    setSelectedProductId(null)
    setStockMovements([])
  }, [])

  useEffect(() => {
    if (!selectedProductId) return
    const productSummary = ep.rows.find(s => s.productId === selectedProductId)
    if (!productSummary) return
    setMeta({
      count: `(zobrazeno ${filteredMovements.length} z ${stockMovements.length} pohybů)`,
      subTitle: productSummary.productName,
      pageTitleOnClick: handleBackToInventory,
    })
    return () => setMeta({ count: '', subTitle: undefined, pageTitleOnClick: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId, filteredMovements.length, stockMovements.length, handleBackToInventory])

  async function fetchProductMovements(productId: string) {
    setLoadingMovements(true)
    try {
      const response = await fetch(`/api/products/${productId}`)
      const data = await response.json()
      const movements: StockMovement[] = []
      if (data.inventoryItems) {
        data.inventoryItems.forEach((item: any) => {
          const isNegative = item.quantity < 0
          const deliveryNoteItems = item.deliveryNoteItems || []
          const deliveryNote = deliveryNoteItems[0]?.deliveryNote
          movements.push({
            id:           item.id,
            type:         isNegative ? 'stock_out' : 'stock_in',
            date:         item.date,
            quantity:     item.quantity,
            unit:         item.unit,
            purchasePrice: item.purchasePrice,
            supplier:     item.supplier,
            note:         item.note,
            createdAt:    item.createdAt || item.date,
            transaction:  item.transaction ? { id: item.transaction.id, transactionCode: item.transaction.transactionCode, receiptId: item.transaction.receiptId, invoiceType: item.transaction.invoiceType } : undefined,
            receipt:      item.receipt ? { id: item.receipt.id, receiptNumber: item.receipt.receiptNumber } : undefined,
            receivedInvoice: item.receipt?.receivedInvoice ? { id: item.receipt.receivedInvoice.id, invoiceNumber: item.receipt.receivedInvoice.invoiceNumber } : undefined,
            purchaseOrder:   item.receipt?.purchaseOrder ? { id: item.receipt.purchaseOrder.id, orderNumber: item.receipt.purchaseOrder.orderNumber } : undefined,
            deliveryNote: deliveryNote ? { id: deliveryNote.id, deliveryNumber: deliveryNote.deliveryNumber } : undefined,
            customerOrder: deliveryNote?.customerOrder ? { id: deliveryNote.customerOrder.id, orderNumber: deliveryNote.customerOrder.orderNumber } : undefined,
            issuedInvoice: deliveryNote?.customerOrder?.issuedInvoice || item.transaction?.issuedInvoice ? {
              id:            deliveryNote?.customerOrder?.issuedInvoice?.id || item.transaction?.issuedInvoice?.id,
              invoiceNumber: deliveryNote?.customerOrder?.issuedInvoice?.invoiceNumber || item.transaction?.issuedInvoice?.invoiceNumber,
            } : undefined,
          })
        })
      }
      movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setStockMovements(movements)
    } catch (error) {
      console.error('Chyba při načítání pohybů:', error)
    } finally {
      setLoadingMovements(false)
    }
  }

  function toggleMovement(movementId: string) {
    setExpandedMovements(prev => {
      const next = new Set(prev)
      next.has(movementId) ? next.delete(movementId) : next.add(movementId)
      return next
    })
  }

  function handleSort(field: SortField) {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  async function handleManualAdjustment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProductId || !adjustmentQuantity) { alert('Vyplňte všechna pole'); return }
    const selectedProduct = products.find(p => p.id === selectedProductId)
    if (!selectedProduct) return
    try {
      const quantity = parseFloat(adjustmentQuantity)
      const productData = await fetch(`/api/products/${selectedProductId}`).then(r => r.json())
      const avgPrice = productData.inventoryItems?.length > 0
        ? productData.inventoryItems.reduce((sum: number, item: any) => sum + Number(item.purchasePrice), 0) / productData.inventoryItems.length
        : selectedProduct.purchasePrice || 0

      if (adjustmentType === 'increase') {
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: selectedProductId, quantity, unit: selectedProduct.unit, purchasePrice: avgPrice, date: adjustmentDate, note: adjustmentNote || 'Manuální úprava - přebytek' }),
        })
        if (!res.ok) throw new Error('Chyba při ukládání')
      } else {
        const res = await fetch('/api/inventory/decrease', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: selectedProductId, quantity, note: adjustmentNote || 'Manuální úprava - manko', date: adjustmentDate }),
        })
        if (!res.ok) throw new Error('Chyba při odečítání')
      }

      setShowManualAdjustmentForm(false)
      setAdjustmentQuantity('')
      setAdjustmentNote('')
      setAdjustmentDate(new Date().toISOString().split('T')[0])
      await ep.refresh()
      if (selectedProductId) await fetchProductMovements(selectedProductId)
    } catch (error) {
      alert('Nepodařilo se uložit úpravu')
    }
  }

  const filteredAndSortedSummary = useMemo(() => {
    let filtered = ep.rows
    if (filterName)        filtered = filtered.filter(item => item.productName.toLowerCase().includes(filterName.toLowerCase()))
    if (filterCategory)    filtered = filtered.filter(item => item.category?.id === filterCategory)
    if (filterMinStock)    filtered = filtered.filter(item => item.physicalStock  >= parseFloat(filterMinStock))
    if (filterMinReserved) filtered = filtered.filter(item => item.reservedStock  >= parseFloat(filterMinReserved))
    if (filterMinAvailable) filtered = filtered.filter(item => item.availableStock >= parseFloat(filterMinAvailable))
    if (filterMinExpected) filtered = filtered.filter(item => item.expectedQuantity >= parseFloat(filterMinExpected))
    if (filterStatus !== 'all') filtered = filtered.filter(item => item.stockStatus === filterStatus)
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortField as keyof InventorySummary]
      let bVal: any = b[sortField as keyof InventorySummary]
      if (sortField === 'category') { aVal = a.category?.name || ''; bVal = b.category?.name || '' }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1  : -1
      return 0
    })
  }, [ep.rows, sortField, sortDirection, filterName, filterCategory, filterMinStock, filterMinReserved, filterMinAvailable, filterMinExpected, filterStatus])

  const filteredMovements = useMemo(() => {
    let filtered = [...stockMovements]
    if (filterDate)        filtered = filtered.filter(item => new Date(item.date).toISOString().split('T')[0] === filterDate)
    if (filterType !== 'all') {
      if (filterType === 'in')  filtered = filtered.filter(item => item.quantity > 0)
      if (filterType === 'out') filtered = filtered.filter(item => item.quantity < 0)
    }
    if (filterMinQuantity) filtered = filtered.filter(item => Math.abs(item.quantity) >= parseFloat(filterMinQuantity))
    if (filterNote)        filtered = filtered.filter(item => item.note?.toLowerCase().includes(filterNote.toLowerCase()))
    return filtered
  }, [stockMovements, filterDate, filterType, filterMinQuantity, filterNote])

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 inline ml-1" /> : <ChevronDown className="h-4 w-4 inline ml-1" />
  }

  if (ep.loading) return <LoadingState />
  if (ep.error)   return <ErrorState message={ep.error} onRetry={ep.refresh} />
  if (selectedProductId && loadingMovements) return <LoadingState />

  // ──────────────────── Product detail view ────────────────────
  if (selectedProductId) {
    const productSummary = ep.rows.find(s => s.productId === selectedProductId)
    const movementsTotalPages = Math.ceil(filteredMovements.length / movementsPerPage)

    const movementsPages: (number | string)[] = []
    if (movementsTotalPages <= 7) {
      for (let i = 1; i <= movementsTotalPages; i++) movementsPages.push(i)
    } else {
      movementsPages.push(1)
      if (movementsPage <= 3) {
        movementsPages.push(2, 3, 4, '...', movementsTotalPages)
      } else if (movementsPage >= movementsTotalPages - 2) {
        movementsPages.push('...', movementsTotalPages - 3, movementsTotalPages - 2, movementsTotalPages - 1, movementsTotalPages)
      } else {
        movementsPages.push('...', movementsPage - 1, movementsPage, movementsPage + 1, '...', movementsTotalPages)
      }
    }

    const handleMovementsPageChange = (newPage: number) => {
      setMovementsPage(newPage)
      setTimeout(() => movementsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }

    return (
      <div className="space-y-6">

        {showManualAdjustmentForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-5 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Edit2 className="w-7 h-7" />
                    <div>
                      <h2 className="text-2xl font-bold">Manko / Přebytek</h2>
                      <p className="text-orange-100 text-sm mt-1">Manuální úprava skladu</p>
                    </div>
                  </div>
                  <button onClick={() => { setShowManualAdjustmentForm(false); setAdjustmentQuantity(''); setAdjustmentNote('') }} className="text-orange-100 hover:text-white">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleManualAdjustment} className="p-6 space-y-6">
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border-l-4 border-purple-500">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Typ úpravy *</h3>
                  <select value={adjustmentType} onChange={e => setAdjustmentType(e.target.value as 'increase' | 'decrease')} className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 bg-white">
                    <option value="increase">Přebytek (+)</option>
                    <option value="decrease">Manko (-)</option>
                  </select>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border-l-4 border-blue-500">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Detaily</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Množství *</label>
                      <Input type="number" step="0.001" value={adjustmentQuantity} onChange={e => setAdjustmentQuantity(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                      <Input type="date" value={adjustmentDate} onChange={e => setAdjustmentDate(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-5 border-l-4 border-amber-500">
                  <h3 className="text-lg font-semibold mb-3 text-gray-800">Poznámka</h3>
                  <Input type="text" value={adjustmentNote} onChange={e => setAdjustmentNote(e.target.value)} placeholder="Důvod úpravy..." />
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t-2 border-gray-200">
                  <Button type="button" variant="secondary" onClick={() => { setShowManualAdjustmentForm(false); setAdjustmentQuantity(''); setAdjustmentNote('') }}>Zrušit</Button>
                  <Button type="submit" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                    {adjustmentType === 'increase' ? 'Přidat přebytek' : 'Odebrat manko'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filtry pohybů */}
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          <button onClick={() => { setFilterDate(''); setFilterType('all'); setFilterMinQuantity(''); setFilterNote('') }} className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded flex items-center justify-center" title="Vymazat filtry">✕</button>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
          <div ref={filterTypeRef} className="relative">
            <div onClick={() => setFilterTypeDropdownOpen(!filterTypeDropdownOpen)} className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-purple-500">
              {filterType === 'all' && 'Vše'}
              {filterType === 'in'  && <span className="text-green-600">Příjem (+)</span>}
              {filterType === 'out' && <span className="text-red-600">Výdej (-)</span>}
            </div>
            {filterTypeDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
                <div onClick={() => { setFilterType('all');  setFilterTypeDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center">Vše</div>
                <div onClick={() => { setFilterType('in');   setFilterTypeDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center text-green-600">Příjem (+)</div>
                <div onClick={() => { setFilterType('out');  setFilterTypeDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center text-red-600">Výdej (-)</div>
              </div>
            )}
          </div>
          <input type="number" value={filterMinQuantity} onChange={e => setFilterMinQuantity(e.target.value)} placeholder="Min. množství" className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
          <input type="text"   value={filterNote}         onChange={e => setFilterNote(e.target.value)}         placeholder="Poznámka..."    className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
        </div>

        {/* Tabulka pohybů */}
        <div ref={movementsSectionRef} className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredMovements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{stockMovements.length === 0 ? 'Žádné skladové pohyby' : 'Žádné pohyby odpovídající filtru'}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 border-b rounded-t-lg text-xs font-semibold text-gray-700">
                <button
                  onClick={() => setShowManualAdjustmentForm(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-medium rounded border border-orange-200 transition-colors whitespace-nowrap"
                >
                  <Edit2 className="w-3 h-3 shrink-0" />
                  Manko/Přebytek
                </button>
                <div className="text-center">Datum</div>
                <div className="text-center">Typ</div>
                <div className="text-center">Množství</div>
                <div className="text-center">Poznámka</div>
              </div>

              <div className="divide-y divide-gray-100">
                {filteredMovements.slice((movementsPage - 1) * movementsPerPage, movementsPage * movementsPerPage).map((movement) => (
                  <div key={movement.id} id={`movement-${movement.id}`} className={`${highlightMovementId === movement.id ? 'border-2 border-purple-500 bg-purple-50' : expandedMovements.has(movement.id) ? 'bg-gray-50' : ''}`}>
                    <div className="p-4 grid grid-cols-[auto_1fr_1fr_1fr_1fr] items-center gap-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleMovement(movement.id)}>
                      <button className="w-8">
                        {expandedMovements.has(movement.id) ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                      </button>
                      <div className="text-center text-sm font-medium text-gray-900">{formatDate(movement.date)}</div>
                      <div className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${movement.type === 'stock_in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {movement.type === 'stock_in' ? 'Naskladnění' : 'Vyskladnění'}
                        </span>
                      </div>
                      <div className="text-center text-sm font-medium" style={{ color: movement.type === 'stock_out' ? '#dc2626' : '#111827' }}>
                        {formatQuantity(Math.abs(movement.quantity), movement.unit)}
                      </div>
                      <div className="text-center text-sm text-gray-600 truncate">{movement.note || '-'}</div>
                    </div>

                    {expandedMovements.has(movement.id) && (
                      <div className="border-t p-4 bg-gray-50 space-y-3">
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                          <div className="text-sm flex items-center justify-center gap-4 flex-wrap">
                            {movement.receipt && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Příjemka:</span>
                                <button onClick={() => router.push(`/receipts?highlight=${movement.receipt!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.receipt.receiptNumber}</button>
                              </div>
                            )}
                            {movement.deliveryNote && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Výdejka:</span>
                                <button onClick={() => router.push(`/delivery-notes?highlight=${movement.deliveryNote!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.deliveryNote.deliveryNumber}</button>
                              </div>
                            )}
                            {movement.transaction && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Transakce:</span>
                                <button onClick={() => router.push(`/transactions?highlight=${movement.transaction!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.transaction.transactionCode}</button>
                              </div>
                            )}
                            {movement.customerOrder && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Objednávka:</span>
                                <button onClick={() => router.push(`/customer-orders?highlight=${movement.customerOrder!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.customerOrder.orderNumber}</button>
                              </div>
                            )}
                            {movement.purchaseOrder && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Objednávka:</span>
                                <button onClick={() => router.push(`/purchase-orders?highlight=${movement.purchaseOrder!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.purchaseOrder.orderNumber}</button>
                              </div>
                            )}
                            {movement.receivedInvoice && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Faktura přijatá:</span>
                                <button onClick={() => router.push(`/invoices/received?highlight=${movement.receivedInvoice!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.receivedInvoice.invoiceNumber}</button>
                              </div>
                            )}
                            {movement.issuedInvoice && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">Faktura vydaná:</span>
                                <button onClick={() => router.push(`/invoices/issued?highlight=${movement.issuedInvoice!.id}`)} className="text-blue-600 hover:underline font-medium">{movement.issuedInvoice.invoiceNumber}</button>
                              </div>
                            )}
                          </div>
                        </div>
                        {movement.type === 'stock_in' && (movement.supplier || movement.purchasePrice) && (
                          <div className="p-3 bg-green-50 border border-green-200 rounded">
                            <div className="text-sm flex items-center justify-center gap-6 flex-wrap">
                              {movement.supplier && <div><span className="text-gray-600">Dodavatel:</span> <span className="ml-2 font-medium">{movement.supplier.name}</span></div>}
                              {movement.purchasePrice && (() => {
                                const productVatRate = ep.rows.find(s => s.productId === selectedProductId)?.vatRate ?? 21
                                const itemIsNonVat   = isNonVatPayer(productVatRate)
                                const vatPerUnit     = (isVatPayer && !itemIsNonVat) ? movement.purchasePrice * productVatRate / 100 : 0
                                return (
                                  <div>
                                    {isVatPayer && !itemIsNonVat ? (
                                      <>
                                        <span className="text-gray-500">Nákup bez DPH:</span> <span className="font-medium">{formatPrice(movement.purchasePrice)}</span>
                                        <span className="mx-2 text-gray-400">|</span>
                                        <span className="text-gray-600">s DPH ({productVatRate}%):</span> <span className="ml-1 font-bold text-gray-900">{formatPrice(movement.purchasePrice + vatPerUnit)}</span>
                                      </>
                                    ) : (
                                      <><span className="text-gray-600">Nákupní cena:</span> <span className="ml-2 font-medium">{formatPrice(movement.purchasePrice)}</span></>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredMovements.length > 0 && (
                <div className="p-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">Zobrazit:</span>
                    {[10, 20, 50, 100].map(count => (
                      <button key={count} onClick={() => { setMovementsPerPage(count); setMovementsPage(1) }} className={`px-3 py-1.5 rounded text-sm font-medium ${movementsPerPage === count ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{count}</button>
                    ))}
                    <span className="text-sm text-gray-500 ml-2">({filteredMovements.length} celkem)</span>
                  </div>
                  {movementsTotalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleMovementsPageChange(Math.max(1, movementsPage - 1))} disabled={movementsPage === 1} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-medium">Předchozí</button>
                      {movementsPages.map((page, index) => page === '...'
                        ? <span key={`e-${index}`} className="px-2 text-gray-500">...</span>
                        : <button key={page} onClick={() => handleMovementsPageChange(page as number)} className={`px-3 py-1.5 rounded text-sm font-medium ${movementsPage === page ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{page}</button>
                      )}
                      <button onClick={() => handleMovementsPageChange(Math.min(movementsTotalPages, movementsPage + 1))} disabled={movementsPage >= movementsTotalPages} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-medium">Další</button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ──────────────────── Main inventory view ────────────────────
  const totalPages = Math.ceil(filteredAndSortedSummary.length / itemsPerPage)

  const pages: (number | string)[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage <= 3) {
      pages.push(2, 3, 4, '...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      pages.push('...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  return (
    <EntityPage highlightId={highlightId}>
      <EntityPage.Header
        title="Skladová evidence"
        icon={Warehouse}
        color="purple"
        total={ep.rows.length}
        filtered={filteredAndSortedSummary.length}
        onRefresh={ep.refresh}
      />

      {/* Filtry */}
      <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
        <button onClick={() => { setFilterName(''); setFilterCategory(''); setFilterMinStock(''); setFilterMinReserved(''); setFilterMinAvailable(''); setFilterMinExpected(''); setFilterStatus('all') }} className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs rounded flex items-center justify-center" title="Vymazat filtry">✕</button>
        <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Produkt..." className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
        <div ref={filterCategoryRef} className="relative">
          <div onClick={() => setFilterCategoryDropdownOpen(!filterCategoryDropdownOpen)} className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-purple-500 truncate">
            {filterCategory ? categories.find(c => c.id === filterCategory)?.name || 'Kategorie' : 'Kategorie'}
          </div>
          {filterCategoryDropdownOpen && (
            <div className="absolute z-50 mt-1 w-40 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
              <div onClick={() => { setFilterCategory(''); setFilterCategoryDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs">Vše</div>
              {categories.map((cat: any) => (
                <div key={cat.id} onClick={() => { setFilterCategory(cat.id); setFilterCategoryDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs truncate">{cat.name}</div>
              ))}
            </div>
          )}
        </div>
        <input type="number" value={filterMinStock}     onChange={e => setFilterMinStock(e.target.value)}     placeholder="≥ Skladem"  className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
        <input type="number" value={filterMinReserved}  onChange={e => setFilterMinReserved(e.target.value)}  placeholder="≥ Rezerv."  className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
        <input type="number" value={filterMinAvailable} onChange={e => setFilterMinAvailable(e.target.value)} placeholder="≥ Dostup."  className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
        <input type="number" value={filterMinExpected}  onChange={e => setFilterMinExpected(e.target.value)}  placeholder="≥ Očekáv."  className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-purple-500" />
        <div ref={filterStatusRef} className="relative">
          <div onClick={() => setFilterStatusDropdownOpen(!filterStatusDropdownOpen)} className="px-2 py-1.5 border border-gray-300 rounded text-xs text-center cursor-pointer bg-white hover:border-purple-500">
            {filterStatus === 'all'   && 'Status'}
            {filterStatus === 'ok'    && <span className="text-green-600">OK</span>}
            {filterStatus === 'low'   && <span className="text-orange-600">Nízký</span>}
            {filterStatus === 'empty' && <span className="text-red-600">Vyprodáno</span>}
          </div>
          {filterStatusDropdownOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg">
              <div onClick={() => { setFilterStatus('all');   setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center">Vše</div>
              <div onClick={() => { setFilterStatus('ok');    setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center text-green-600">OK</div>
              <div onClick={() => { setFilterStatus('low');   setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center text-orange-600">Nízký stav</div>
              <div onClick={() => { setFilterStatus('empty'); setFilterStatusDropdownOpen(false) }} className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-xs text-center text-red-600">Vyprodáno</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabulka */}
      <div ref={sectionRef} className="bg-white rounded-lg shadow-sm border border-gray-200">
        {ep.rows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Zatím není nic naskladněno</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 border-b rounded-t-lg text-xs font-semibold text-gray-700">
              <div className="w-8"></div>
              <div className="text-left cursor-pointer hover:text-purple-600" onClick={() => handleSort('productName')}>Produkt <SortIcon field="productName" /></div>
              <div className="text-center cursor-pointer hover:text-purple-600" onClick={() => handleSort('category')}>Kategorie <SortIcon field="category" /></div>
              <div className="text-center cursor-pointer hover:text-purple-600" onClick={() => handleSort('physicalStock')}>Skladem <SortIcon field="physicalStock" /></div>
              <div className="text-center cursor-pointer hover:text-purple-600" onClick={() => handleSort('reservedStock')}>Rezervováno <SortIcon field="reservedStock" /></div>
              <div className="text-center cursor-pointer hover:text-purple-600" onClick={() => handleSort('availableStock')}>Dostupné <SortIcon field="availableStock" /></div>
              <div className="text-center cursor-pointer hover:text-purple-600" onClick={() => handleSort('expectedQuantity')}>Očekáváno <SortIcon field="expectedQuantity" /></div>
              <div className="text-center">Status</div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredAndSortedSummary.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((item) => (
                <div key={item.productId} id={`product-${item.productId}`} className={`${highlightId === item.productId ? 'border-2 border-purple-500 bg-purple-50' : ''}`}>
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 cursor-pointer hover:bg-purple-50 transition-colors" onClick={() => setSelectedProductId(item.productId)}>
                    <div className="w-8"><ChevronRight className="h-5 w-5 text-gray-400" /></div>
                    <div className="text-left text-sm font-medium text-gray-900 truncate">{item.productName}</div>
                    <div className="text-center text-sm text-gray-600 truncate">{item.category?.name || '-'}</div>
                    <div className={`text-center text-sm font-semibold ${item.stockStatus === 'empty' ? 'text-red-600' : item.stockStatus === 'low' ? 'text-orange-600' : 'text-green-600'}`}>{formatQuantity(item.physicalStock, item.unit)}</div>
                    <div className="text-center text-sm font-semibold text-orange-600">{item.reservedStock > 0 ? formatQuantity(item.reservedStock, item.unit) : '-'}</div>
                    <div className="text-center text-sm font-semibold text-green-600">{formatQuantity(item.availableStock, item.unit)}</div>
                    <div className="text-center text-sm font-semibold text-blue-600">{item.expectedQuantity > 0 ? `+${formatQuantity(item.expectedQuantity, item.unit)}` : '-'}</div>
                    <div className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.stockStatus === 'empty' ? 'bg-red-100 text-red-800' : item.stockStatus === 'low' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                        {item.stockStatus === 'empty' ? 'Vyprodáno' : item.stockStatus === 'low' ? 'Nízký' : 'OK'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 font-bold border-t-2 border-gray-300">
                <div className="w-8"></div>
                <div className="text-left text-sm">Celkem ({filteredAndSortedSummary.length})</div>
                <div></div><div></div><div></div><div></div><div></div><div></div>
              </div>
            </div>

            {filteredAndSortedSummary.length > 0 && (
              <div className="p-4 border-t flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Zobrazit:</span>
                  {[10, 20, 50, 100].map(count => (
                    <button key={count} onClick={() => { setItemsPerPage(count); setCurrentPage(1) }} className={`px-3 py-1.5 rounded text-sm font-medium ${itemsPerPage === count ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{count}</button>
                  ))}
                  <span className="text-sm text-gray-500 ml-2">({filteredAndSortedSummary.length} celkem)</span>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-medium">Předchozí</button>
                    {pages.map((page, index) => page === '...'
                      ? <span key={`e-${index}`} className="px-2 text-gray-500">...</span>
                      : <button key={page} onClick={() => handlePageChange(page as number)} className={`px-3 py-1.5 rounded text-sm font-medium ${currentPage === page ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{page}</button>
                    )}
                    <button onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 text-sm font-medium">Další</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </EntityPage>
  )
}
