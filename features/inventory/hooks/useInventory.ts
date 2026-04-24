'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEntityPage } from '@/components/erp'
import { fetchInventorySummary } from '../services/inventoryService'
import type { InventorySummary, Product, Category, SortField, SortDirection } from '../types'

export function useInventory() {
  const highlightId  = useSearchParams().get('highlight')
  const sectionRef   = useRef<HTMLDivElement>(null)

  const [categories,  setCategories]  = useState<Category[]>([])
  const [products,    setProducts]    = useState<Product[]>([])
  const [isVatPayer,  setIsVatPayer]  = useState(true)

  const [sortField,     setSortField]     = useState<SortField>('productName')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const [filterName,                    setFilterName]                    = useState('')
  const [filterCategory,                setFilterCategory]                = useState('')
  const [filterCategoryDropdownOpen,    setFilterCategoryDropdownOpen]    = useState(false)
  const [filterMinStock,                setFilterMinStock]                = useState('')
  const [filterMinReserved,             setFilterMinReserved]             = useState('')
  const [filterMinAvailable,            setFilterMinAvailable]            = useState('')
  const [filterMinExpected,             setFilterMinExpected]             = useState('')
  const [filterStatus,                  setFilterStatus]                  = useState('all')
  const [filterStatusDropdownOpen,      setFilterStatusDropdownOpen]      = useState(false)

  const [currentPage,  setCurrentPage]  = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const filterCategoryRef = useRef<HTMLDivElement>(null)
  const filterStatusRef   = useRef<HTMLDivElement>(null)

  const ep = useEntityPage<InventorySummary>({
    fetchData: async () => {
      const result = await fetchInventorySummary()
      setProducts(result.products)
      setCategories(result.categories)
      setIsVatPayer(result.isVatPayer)
      return result.summary
    },
    getRowId:    r => r.productId,
    filterFn:    () => true,
    highlightId,
  })

  const filteredAndSorted = useMemo(() => {
    let filtered = ep.rows
    if (filterName)         filtered = filtered.filter(item => item.productName.toLowerCase().includes(filterName.toLowerCase()))
    if (filterCategory)     filtered = filtered.filter(item => item.category?.id === filterCategory)
    if (filterMinStock)     filtered = filtered.filter(item => item.physicalStock   >= parseFloat(filterMinStock))
    if (filterMinReserved)  filtered = filtered.filter(item => item.reservedStock   >= parseFloat(filterMinReserved))
    if (filterMinAvailable) filtered = filtered.filter(item => item.availableStock  >= parseFloat(filterMinAvailable))
    if (filterMinExpected)  filtered = filtered.filter(item => item.expectedQuantity >= parseFloat(filterMinExpected))
    if (filterStatus !== 'all') filtered = filtered.filter(item => item.stockStatus === filterStatus)
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortField as keyof InventorySummary]
      let bVal: any = b[sortField as keyof InventorySummary]
      if (sortField === 'category') { aVal = a.category?.name || ''; bVal = b.category?.name || '' }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ?  1 : -1
      return 0
    })
  }, [ep.rows, sortField, sortDirection, filterName, filterCategory, filterMinStock, filterMinReserved, filterMinAvailable, filterMinExpected, filterStatus])

  useEffect(() => {
    if (highlightId && filteredAndSorted.length > 0) {
      const index = filteredAndSorted.findIndex(item => item.productId === highlightId)
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
    function handleClickOutside(event: MouseEvent) {
      if (filterCategoryRef.current && !filterCategoryRef.current.contains(event.target as Node)) setFilterCategoryDropdownOpen(false)
      if (filterStatusRef.current   && !filterStatusRef.current.contains(event.target as Node))   setFilterStatusDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSort(field: SortField) {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDirection('asc') }
  }

  function clearFilters() {
    setFilterName(''); setFilterCategory(''); setFilterMinStock('')
    setFilterMinReserved(''); setFilterMinAvailable(''); setFilterMinExpected(''); setFilterStatus('all')
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage)
    setTimeout(() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  return {
    ep, products, categories, isVatPayer, sectionRef,
    filteredAndSorted,
    sortField, sortDirection, handleSort,
    filterName, setFilterName,
    filterCategory, setFilterCategory,
    filterCategoryDropdownOpen, setFilterCategoryDropdownOpen, filterCategoryRef,
    filterMinStock, setFilterMinStock,
    filterMinReserved, setFilterMinReserved,
    filterMinAvailable, setFilterMinAvailable,
    filterMinExpected, setFilterMinExpected,
    filterStatus, setFilterStatus,
    filterStatusDropdownOpen, setFilterStatusDropdownOpen, filterStatusRef,
    currentPage, itemsPerPage, setItemsPerPage,
    handlePageChange, clearFilters,
    setCurrentPage,
  }
}
