'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { fetchProductDetails, increaseInventory, decreaseInventory, mapInventoryItemsToMovements } from '../services/inventoryService'
import type { InventorySummary, Product, StockMovement } from '../types'

export function useProductMovements(
  summaryRows: InventorySummary[],
  products:    Product[],
  onRefresh:   () => Promise<void>,
) {
  const searchParams = useSearchParams()
  const highlightMovementId = searchParams.get('highlightMovement')

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [stockMovements,    setStockMovements]     = useState<StockMovement[]>([])
  const [expandedMovements, setExpandedMovements]  = useState<Set<string>>(new Set())
  const [loadingMovements,  setLoadingMovements]   = useState(false)
  const movementsSectionRef = useRef<HTMLDivElement>(null)

  const [filterDate,        setFilterDate]        = useState('')
  const [filterType,        setFilterType]        = useState('all')
  const [filterTypeDropdownOpen, setFilterTypeDropdownOpen] = useState(false)
  const [filterMinQuantity, setFilterMinQuantity] = useState('')
  const [filterNote,        setFilterNote]        = useState('')

  const [movementsPage,    setMovementsPage]    = useState(1)
  const [movementsPerPage, setMovementsPerPage] = useState(20)

  const [showManualAdjustmentForm, setShowManualAdjustmentForm] = useState(false)
  const [adjustmentType,     setAdjustmentType]     = useState<'increase' | 'decrease'>('increase')
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('')
  const [adjustmentDate,     setAdjustmentDate]     = useState(new Date().toISOString().split('T')[0])
  const [adjustmentNote,     setAdjustmentNote]     = useState('')

  const filterTypeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const productId = searchParams.get('selectedProduct')
    if (productId && summaryRows.length > 0) setSelectedProductId(productId)
  }, [searchParams, summaryRows])

  useEffect(() => {
    if (selectedProductId) loadProductMovements(selectedProductId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId])

  const hasScrolledToMovement = useRef(false)

  const filteredMovements = useMemo(() => {
    let filtered = [...stockMovements]
    if (filterDate)           filtered = filtered.filter(item => new Date(item.date).toISOString().split('T')[0] === filterDate)
    if (filterType !== 'all') {
      if (filterType === 'in')  filtered = filtered.filter(item => item.quantity > 0)
      if (filterType === 'out') filtered = filtered.filter(item => item.quantity < 0)
    }
    if (filterMinQuantity) filtered = filtered.filter(item => Math.abs(item.quantity) >= parseFloat(filterMinQuantity))
    if (filterNote)        filtered = filtered.filter(item => item.note?.toLowerCase().includes(filterNote.toLowerCase()))
    return filtered
  }, [stockMovements, filterDate, filterType, filterMinQuantity, filterNote])

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
      if (filterTypeRef.current && !filterTypeRef.current.contains(event.target as Node)) setFilterTypeDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadProductMovements(productId: string) {
    setLoadingMovements(true)
    try {
      const data = await fetchProductDetails(productId)
      const movements = data.inventoryItems ? mapInventoryItemsToMovements(data.inventoryItems) : []
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

  const handleBackToInventory = useCallback(() => {
    setSelectedProductId(null)
    setStockMovements([])
  }, [])

  function handleMovementsPageChange(newPage: number) {
    setMovementsPage(newPage)
    setTimeout(() => movementsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  function clearMovementFilters() {
    setFilterDate(''); setFilterType('all'); setFilterMinQuantity(''); setFilterNote('')
  }

  async function handleManualAdjustment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProductId || !adjustmentQuantity) { alert('Vyplňte všechna pole'); return }
    const selectedProduct = products.find(p => p.id === selectedProductId)
    if (!selectedProduct) return
    try {
      const quantity    = parseFloat(adjustmentQuantity)
      const productData = await fetchProductDetails(selectedProductId)
      const avgPrice    = productData.inventoryItems?.length > 0
        ? productData.inventoryItems.reduce((sum: number, item: any) => sum + Number(item.purchasePrice), 0) / productData.inventoryItems.length
        : selectedProduct.purchasePrice || 0
      if (adjustmentType === 'increase') {
        await increaseInventory(selectedProductId, quantity, selectedProduct.unit, avgPrice, adjustmentDate, adjustmentNote || 'Manuální úprava - přebytek')
      } else {
        await decreaseInventory(selectedProductId, quantity, adjustmentNote || 'Manuální úprava - manko', adjustmentDate)
      }
      setShowManualAdjustmentForm(false)
      setAdjustmentQuantity('')
      setAdjustmentNote('')
      setAdjustmentDate(new Date().toISOString().split('T')[0])
      await onRefresh()
      await loadProductMovements(selectedProductId)
    } catch {
      alert('Nepodařilo se uložit úpravu')
    }
  }

  function closeManualAdjustment() {
    setShowManualAdjustmentForm(false)
    setAdjustmentQuantity('')
    setAdjustmentNote('')
  }

  return {
    selectedProductId, setSelectedProductId,
    stockMovements, filteredMovements, expandedMovements, loadingMovements,
    movementsSectionRef, highlightMovementId,
    filterDate, setFilterDate,
    filterType, setFilterType,
    filterTypeDropdownOpen, setFilterTypeDropdownOpen, filterTypeRef,
    filterMinQuantity, setFilterMinQuantity,
    filterNote, setFilterNote,
    movementsPage, movementsPerPage, setMovementsPerPage,
    showManualAdjustmentForm, setShowManualAdjustmentForm,
    adjustmentType, setAdjustmentType,
    adjustmentQuantity, setAdjustmentQuantity,
    adjustmentDate, setAdjustmentDate,
    adjustmentNote, setAdjustmentNote,
    toggleMovement, handleBackToInventory,
    handleMovementsPageChange, clearMovementFilters,
    handleManualAdjustment, closeManualAdjustment,
  }
}
