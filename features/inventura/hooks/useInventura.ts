'use client'

import { useEffect, useState, useMemo } from 'react'
import type {
  InventorySummary, InventuraItem, InventuraRecord,
  InventuraDetail, InventuraStats,
} from '../types'
import {
  fetchInventorySummary, fetchCategories,
  fetchInventuraHistory, fetchInventuraDetail as fetchDetailService,
  saveInventura as saveInventuraService,
} from '../services/inventuraService'

export function useInventura() {
  const [summary,          setSummary]          = useState<InventorySummary[]>([])
  const [categories,       setCategories]       = useState<{ id: string; name: string }[]>([])
  const [loading,          setLoading]          = useState(true)

  const [inventuraActive,  setInventuraActive]  = useState(false)
  const [inventuraItems,   setInventuraItems]   = useState<InventuraItem[]>([])
  const [searchQuery,      setSearchQuery]      = useState('')
  const [categoryFilter,   setCategoryFilter]   = useState('')
  const [showOnlyDiffs,    setShowOnlyDiffs]    = useState(false)
  const [saving,           setSaving]           = useState(false)

  const [inventuraHistory,    setInventuraHistory]    = useState<InventuraRecord[]>([])
  const [showHistory,         setShowHistory]         = useState(true)
  const [selectedInventura,   setSelectedInventura]   = useState<InventuraDetail | null>(null)
  const [loadingDetail,       setLoadingDetail]       = useState(false)
  const [historySearch,       setHistorySearch]       = useState('')
  const [historyShowOnlyDiffs,setHistoryShowOnlyDiffs]= useState(false)

  useEffect(() => {
    Promise.all([
      fetchInventorySummary().then(setSummary),
      fetchCategories().then(setCategories),
      fetchInventuraHistory().then(setInventuraHistory).catch(() => {}),
    ]).catch(err => console.error('Chyba při načítání dat:', err))
      .finally(() => setLoading(false))
  }, [])

  async function refreshHistory() {
    try { setInventuraHistory(await fetchInventuraHistory()) } catch { /* silent */ }
  }

  async function fetchInventuraDetail(id: string) {
    setLoadingDetail(true)
    try {
      setSelectedInventura(await fetchDetailService(id))
    } catch (err) {
      console.error('Chyba při načítání detailu:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  function closeDetail() {
    setSelectedInventura(null)
    setHistorySearch('')
    setHistoryShowOnlyDiffs(false)
  }

  function startInventura() {
    setInventuraItems(summary.map(item => ({
      productId:   item.productId,
      productName: item.productName,
      unit:        item.unit,
      systemStock: item.physicalStock,
      actualStock: '',
      category:    item.category,
      checked:     false,
    })))
    setInventuraActive(true)
    setShowHistory(false)
  }

  function cancelInventura() {
    if (!confirm('Opravdu chcete zrušit inventuru? Všechny zadané hodnoty budou ztraceny.')) return
    setInventuraActive(false)
    setInventuraItems([])
    setSearchQuery('')
    setCategoryFilter('')
    setShowOnlyDiffs(false)
    setShowHistory(true)
  }

  function updateActualStock(productId: string, value: string) {
    setInventuraItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, actualStock: value, checked: value !== '' }
        : item
    ))
  }

  function setAsSystem(productId: string) {
    setInventuraItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, actualStock: item.systemStock.toString(), checked: true }
        : item
    ))
  }

  async function saveInventura() {
    const unchecked = inventuraItems.filter(item => !item.checked)
    if (unchecked.length > 0) {
      if (!confirm(`${unchecked.length} položek nemá zadanou skutečnou hodnotu. Chcete pokračovat? Nevyplněné položky budou považovány za shodné se systémem.`)) return
    }
    setSaving(true)
    try {
      const data = await saveInventuraService({
        items: inventuraItems.map(({ productId, productName, unit, systemStock, actualStock, category }) => ({
          productId, productName, unit, systemStock, actualStock, category,
        })),
        note: null,
      })
      alert(`Inventura ${data.inventuraNumber} uložena! Zpracováno ${data.differencesCount} rozdílů.`)
      setInventuraActive(false)
      setInventuraItems([])
      setShowHistory(true)
      setSummary(await fetchInventorySummary())
      await refreshHistory()
    } catch {
      alert('Nepodařilo se uložit inventuru')
    } finally {
      setSaving(false)
    }
  }

  const filteredItems = useMemo(() => {
    let items = inventuraItems
    if (searchQuery)    items = items.filter(i => i.productName.toLowerCase().includes(searchQuery.toLowerCase()))
    if (categoryFilter) items = items.filter(i => i.category?.id === categoryFilter)
    if (showOnlyDiffs)  items = items.filter(i => { const a = parseFloat(i.actualStock); return !isNaN(a) && a !== i.systemStock })
    return items
  }, [inventuraItems, searchQuery, categoryFilter, showOnlyDiffs])

  const inventuraStats = useMemo((): InventuraStats => {
    const total       = inventuraItems.length
    const checked     = inventuraItems.filter(i => i.checked).length
    const differences = inventuraItems.filter(i => { const a = parseFloat(i.actualStock); return !isNaN(a) && a !== i.systemStock }).length
    const surpluses   = inventuraItems.filter(i => { const a = parseFloat(i.actualStock); return !isNaN(a) && a > i.systemStock }).length
    const shortages   = inventuraItems.filter(i => { const a = parseFloat(i.actualStock); return !isNaN(a) && a < i.systemStock }).length
    return { total, checked, differences, surpluses, shortages }
  }, [inventuraItems])

  const filteredDetailItems = useMemo(() => {
    if (!selectedInventura) return []
    let items = selectedInventura.items
    if (historySearch)        items = items.filter(i => i.productName.toLowerCase().includes(historySearch.toLowerCase()))
    if (historyShowOnlyDiffs) items = items.filter(i => i.differenceType !== 'none')
    return items
  }, [selectedInventura, historySearch, historyShowOnlyDiffs])

  return {
    loading, saving,
    categories,
    inventuraActive, inventuraStats,
    filteredItems,
    searchQuery,      setSearchQuery,
    categoryFilter,   setCategoryFilter,
    showOnlyDiffs,    setShowOnlyDiffs,
    inventuraHistory,
    showHistory,      setShowHistory,
    selectedInventura, loadingDetail,
    filteredDetailItems,
    historySearch,       setHistorySearch,
    historyShowOnlyDiffs,setHistoryShowOnlyDiffs,
    startInventura, cancelInventura,
    updateActualStock, setAsSystem, saveInventura,
    fetchInventuraDetail, closeDetail,
  }
}
