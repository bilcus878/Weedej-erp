'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage, useFilters } from '@/components/erp'
import type { SelectOption } from '@/components/erp'
import { fetchInventorySummary } from '../services/inventoryService'
import type { InventorySummary, Product, Category, SortField, SortDirection } from '../types'

const STATUS_OPTIONS: SelectOption[] = [
  { value: '',      label: 'Status'                                    },
  { value: 'ok',    label: 'OK',        className: 'text-green-600'  },
  { value: 'low',   label: 'Nízký',     className: 'text-orange-600' },
  { value: 'empty', label: 'Vyprodáno', className: 'text-red-600'    },
]

export function useInventory() {
  const highlightId = useSearchParams().get('highlight')
  const resetPage   = useRef<() => void>(() => {})
  const sectionRef  = useRef<HTMLDivElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [products,   setProducts]   = useState<Product[]>([])
  const [isVatPayer, setIsVatPayer] = useState(true)

  const [sortField,     setSortField]     = useState<SortField>('productName')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [itemsPerPage,  setItemsPerPage]  = useState(20)

  const catOptions: SelectOption[] = [
    { value: '', label: 'Kategorie' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ]

  const filters = useFilters<InventorySummary>([
    { key: 'name',        type: 'text',   placeholder: 'Produkt...',  match: (r, v) => r.productName.toLowerCase().includes(v.toLowerCase()) },
    { key: 'category',    type: 'select', options: catOptions,        match: (r, v) => !v || r.category?.id === v },
    { key: 'minStock',    type: 'number', placeholder: '≥ Skladem',   match: (r, v) => r.physicalStock    >= v },
    { key: 'minReserved', type: 'number', placeholder: '≥ Rezerv.',   match: (r, v) => r.reservedStock    >= v },
    { key: 'minAvail',    type: 'number', placeholder: '≥ Dostup.',   match: (r, v) => r.availableStock   >= v },
    { key: 'minExpected', type: 'number', placeholder: '≥ Očekáv.',   match: (r, v) => r.expectedQuantity >= v },
    { key: 'status',      type: 'select', options: STATUS_OPTIONS,    match: (r, v) => !v || r.stockStatus === v },
  ], () => resetPage.current())

  const ep = useEntityPage<InventorySummary>({
    fetchData: async () => {
      const result = await fetchInventorySummary()
      setProducts(result.products)
      setCategories(result.categories)
      setIsVatPayer(result.isVatPayer)
      return result.summary
    },
    getRowId:    r => r.productId,
    filterFn:    filters.fn,
    highlightId: null, // highlight handled below to account for sort order + custom itemsPerPage
  })

  resetPage.current = () => ep.setPage(1)

  const filteredAndSorted = useMemo(() => [...ep.filtered].sort((a, b) => {
    let aVal: any = a[sortField as keyof InventorySummary]
    let bVal: any = b[sortField as keyof InventorySummary]
    if (sortField === 'category') { aVal = a.category?.name || ''; bVal = b.category?.name || '' }
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ?  1 : -1
    return 0
  }), [ep.filtered, sortField, sortDirection])

  // Navigate to highlighted row accounting for sort order and custom itemsPerPage
  useEffect(() => {
    if (!highlightId || filteredAndSorted.length === 0) return
    const index = filteredAndSorted.findIndex(item => item.productId === highlightId)
    if (index !== -1) {
      ep.setPage(Math.floor(index / itemsPerPage) + 1)
      setTimeout(() => {
        document.getElementById(`product-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId, ep.rows, itemsPerPage])

  function handleSort(field: SortField) {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  function handlePageChange(newPage: number) {
    ep.setPage(newPage)
    setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  return {
    ep, products, categories, isVatPayer, filters, highlightId, sectionRef,
    filteredAndSorted,
    sortField, sortDirection, handleSort,
    itemsPerPage, setItemsPerPage,
    handlePageChange,
  }
}
