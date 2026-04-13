// Inventura
// URL: /inventory/inventura

'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { formatQuantity, formatDate } from '@/lib/utils'
import {
  ClipboardList,
  Play,
  Save,
  X,
  Check,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  History,
  Eye,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface InventorySummary {
  productId: string
  productName: string
  unit: string
  physicalStock: number
  category?: { id: string; name: string } | null
}

interface InventuraItem {
  productId: string
  productName: string
  unit: string
  systemStock: number
  actualStock: string
  category?: { id: string; name: string } | null
  checked: boolean
}

interface InventuraRecord {
  id: string
  inventuraNumber: string
  inventuraDate: string
  totalProducts: number
  checkedProducts: number
  differencesCount: number
  surplusCount: number
  shortageCount: number
  status: string
  note?: string | null
}

interface InventuraDetail {
  id: string
  inventuraNumber: string
  inventuraDate: string
  totalProducts: number
  checkedProducts: number
  differencesCount: number
  surplusCount: number
  shortageCount: number
  status: string
  note?: string | null
  items: {
    id: string
    productId: string
    productName: string
    unit: string
    category?: string | null
    systemStock: number
    actualStock: number
    difference: number
    differenceType: string
  }[]
}

export default function InventuraPage() {
  const [summary, setSummary] = useState<InventorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [inventuraActive, setInventuraActive] = useState(false)
  const [inventuraItems, setInventuraItems] = useState<InventuraItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false)
  const [saving, setSaving] = useState(false)

  // Historie inventur
  const [inventuraHistory, setInventuraHistory] = useState<InventuraRecord[]>([])
  const [showHistory, setShowHistory] = useState(true)
  const [selectedInventura, setSelectedInventura] = useState<InventuraDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Filtr pro historii
  const [historySearchQuery, setHistorySearchQuery] = useState('')
  const [historyShowOnlyDifferences, setHistoryShowOnlyDifferences] = useState(false)

  useEffect(() => {
    fetchData()
    fetchHistory()
  }, [])

  async function fetchData() {
    try {
      const [summaryRes, categoriesRes] = await Promise.all([
        fetch('/api/inventory/summary'),
        fetch('/api/categories')
      ])

      const summaryData = await summaryRes.json()
      const categoriesData = await categoriesRes.json()

      setSummary(summaryData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchHistory() {
    try {
      const res = await fetch('/api/inventura')
      if (res.ok) {
        const data = await res.json()
        setInventuraHistory(data)
      }
    } catch (error) {
      console.error('Chyba při načítání historie:', error)
    }
  }

  async function fetchInventuraDetail(id: string) {
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/inventura/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedInventura(data)
      }
    } catch (error) {
      console.error('Chyba při načítání detailu:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  function startInventura() {
    const items: InventuraItem[] = summary.map(item => ({
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      systemStock: item.physicalStock,
      actualStock: '',
      category: item.category,
      checked: false
    }))

    setInventuraItems(items)
    setInventuraActive(true)
    setShowHistory(false)
  }

  function cancelInventura() {
    if (confirm('Opravdu chcete zrušit inventuru? Všechny zadané hodnoty budou ztraceny.')) {
      setInventuraActive(false)
      setInventuraItems([])
      setSearchQuery('')
      setCategoryFilter('')
      setShowOnlyDifferences(false)
      setShowHistory(true)
    }
  }

  function updateActualStock(productId: string, value: string) {
    setInventuraItems(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, actualStock: value, checked: value !== '' }
          : item
      )
    )
  }

  function setAsSystem(productId: string) {
    setInventuraItems(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, actualStock: item.systemStock.toString(), checked: true }
          : item
      )
    )
  }

  async function saveInventura() {
    const unchecked = inventuraItems.filter(item => !item.checked)
    if (unchecked.length > 0) {
      if (!confirm(`${unchecked.length} položek nemá zadanou skutečnou hodnotu. Chcete pokračovat? Nevyplněné položky budou považovány za shodné se systémem.`)) {
        return
      }
    }

    setSaving(true)

    try {
      const res = await fetch('/api/inventura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: inventuraItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            unit: item.unit,
            systemStock: item.systemStock,
            actualStock: item.actualStock,
            category: item.category
          })),
          note: null
        })
      })

      if (res.ok) {
        const data = await res.json()
        alert(`Inventura ${data.inventuraNumber} uložena! Zpracováno ${data.differencesCount} rozdílů.`)
        setInventuraActive(false)
        setInventuraItems([])
        setShowHistory(true)
        fetchData()
        fetchHistory()
      } else {
        throw new Error('Chyba při ukládání')
      }
    } catch (error) {
      console.error('Chyba při ukládání inventury:', error)
      alert('Nepodařilo se uložit inventuru')
    } finally {
      setSaving(false)
    }
  }

  // Filtrované položky pro aktivní inventuru
  const filteredItems = useMemo(() => {
    let items = inventuraItems

    if (searchQuery) {
      items = items.filter(item =>
        item.productName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (categoryFilter) {
      items = items.filter(item => item.category?.id === categoryFilter)
    }

    if (showOnlyDifferences) {
      items = items.filter(item => {
        const actual = parseFloat(item.actualStock)
        return !isNaN(actual) && actual !== item.systemStock
      })
    }

    return items
  }, [inventuraItems, searchQuery, categoryFilter, showOnlyDifferences])

  // Statistiky inventury
  const inventuraStats = useMemo(() => {
    const total = inventuraItems.length
    const checked = inventuraItems.filter(item => item.checked).length
    const differences = inventuraItems.filter(item => {
      const actual = parseFloat(item.actualStock)
      return !isNaN(actual) && actual !== item.systemStock
    }).length
    const surpluses = inventuraItems.filter(item => {
      const actual = parseFloat(item.actualStock)
      return !isNaN(actual) && actual > item.systemStock
    }).length
    const shortages = inventuraItems.filter(item => {
      const actual = parseFloat(item.actualStock)
      return !isNaN(actual) && actual < item.systemStock
    }).length

    return { total, checked, differences, surpluses, shortages }
  }, [inventuraItems])

  // Filtrované položky pro detail inventury
  const filteredDetailItems = useMemo(() => {
    if (!selectedInventura) return []

    let items = selectedInventura.items

    if (historySearchQuery) {
      items = items.filter(item =>
        item.productName.toLowerCase().includes(historySearchQuery.toLowerCase())
      )
    }

    if (historyShowOnlyDifferences) {
      items = items.filter(item => item.differenceType !== 'none')
    }

    return items
  }, [selectedInventura, historySearchQuery, historyShowOnlyDifferences])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Načítání...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hlavička */}
      <div className="bg-gradient-to-r from-slate-50 to-orange-50 border-l-4 border-orange-500 rounded-lg shadow-sm py-4 px-6">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-orange-700">
              Inventura
              {inventuraActive && (
                <span className="ml-3 text-sm font-normal text-gray-600">
                  (Zkontrolováno <span className="font-semibold text-orange-600">{inventuraStats.checked}</span> z <span className="font-semibold text-gray-700">{inventuraStats.total}</span>)
                </span>
              )}
            </h1>
          </div>

          {!inventuraActive ? (
            <button
              onClick={startInventura}
              className="flex-shrink-0 group relative px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              <span>Zahájit inventuru</span>
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={cancelInventura}
                className="flex-shrink-0 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg shadow hover:bg-gray-600 transition-all flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                <span>Zrušit</span>
              </button>
              <button
                onClick={saveInventura}
                disabled={saving}
                className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Ukládám...' : 'Uložit inventuru'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {!inventuraActive ? (
        <>
          {/* Úvodní návod */}
          <Card>
            <CardContent className="p-8">
              <div className="text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="h-8 w-8 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Jak provést inventuru?</h2>
                <div className="text-left space-y-4 text-gray-600">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <p>Klikněte na <strong>"Zahájit inventuru"</strong> pro načtení seznamu produktů</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <p>Pro každý produkt zadejte <strong>skutečné množství</strong> na skladě. Pokud se shoduje, klikněte na <strong>"="</strong></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <p>Systém automaticky vypočítá <strong>rozdíly</strong> (manko/přebytek)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                    <p>Klikněte na <strong>"Uložit inventuru"</strong> pro aplikování změn do skladu</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historie inventur */}
          <Card>
            <CardContent className="p-6">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowHistory(!showHistory)}
              >
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <History className="h-5 w-5 text-orange-600" />
                  Historie inventur ({inventuraHistory.length})
                </h3>
                {showHistory ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {showHistory && (
                <div className="mt-4">
                  {inventuraHistory.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Zatím nebyla provedena žádná inventura</p>
                  ) : (
                    <div className="space-y-2">
                      {inventuraHistory.map(inv => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => fetchInventuraDetail(inv.id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <ClipboardList className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{inv.inventuraNumber}</p>
                              <p className="text-sm text-gray-500">{formatDate(inv.inventuraDate)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="font-semibold text-gray-900">{inv.totalProducts}</p>
                              <p className="text-xs text-gray-500">produktů</p>
                            </div>
                            <div className="text-center">
                              <p className={`font-semibold ${inv.differencesCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {inv.differencesCount}
                              </p>
                              <p className="text-xs text-gray-500">rozdílů</p>
                            </div>
                            {inv.surplusCount > 0 && (
                              <div className="text-center">
                                <p className="font-semibold text-green-600">+{inv.surplusCount}</p>
                                <p className="text-xs text-gray-500">přebytků</p>
                              </div>
                            )}
                            {inv.shortageCount > 0 && (
                              <div className="text-center">
                                <p className="font-semibold text-red-600">-{inv.shortageCount}</p>
                                <p className="text-xs text-gray-500">mank</p>
                              </div>
                            )}
                            <Eye className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal - detail inventury */}
          {selectedInventura && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ClipboardList className="w-7 h-7" />
                      <div>
                        <h2 className="text-2xl font-bold">{selectedInventura.inventuraNumber}</h2>
                        <p className="text-orange-100 text-sm mt-1">
                          {formatDate(selectedInventura.inventuraDate)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedInventura(null)
                        setHistorySearchQuery('')
                        setHistoryShowOnlyDifferences(false)
                      }}
                      className="text-orange-100 hover:text-white transition-colors"
                    >
                      <X className="w-7 h-7" />
                    </button>
                  </div>
                </div>

                {/* Statistiky */}
                <div className="grid grid-cols-5 gap-2 p-4 bg-gray-50 border-b">
                  <div className="text-center p-2 bg-white rounded">
                    <p className="text-lg font-bold text-gray-900">{selectedInventura.totalProducts}</p>
                    <p className="text-xs text-gray-500">Celkem</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <p className="text-lg font-bold text-blue-600">{selectedInventura.checkedProducts}</p>
                    <p className="text-xs text-gray-500">Zkontrolováno</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <p className="text-lg font-bold text-purple-600">{selectedInventura.differencesCount}</p>
                    <p className="text-xs text-gray-500">Rozdílů</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <p className="text-lg font-bold text-green-600">{selectedInventura.surplusCount}</p>
                    <p className="text-xs text-gray-500">Přebytků</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded">
                    <p className="text-lg font-bold text-red-600">{selectedInventura.shortageCount}</p>
                    <p className="text-xs text-gray-500">Mank</p>
                  </div>
                </div>

                {/* Filtry */}
                <div className="flex items-center gap-4 p-4 border-b">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Hledat produkt..."
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => setHistoryShowOnlyDifferences(!historyShowOnlyDifferences)}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                      historyShowOnlyDifferences
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                    Jen rozdíly
                  </button>
                </div>

                {/* Tabulka */}
                <div className="flex-1 overflow-auto p-4">
                  {loadingDetail ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">Načítání...</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border">
                      {/* Hlavička */}
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 bg-gray-100 border-b text-xs font-semibold text-gray-700">
                        <div>Produkt</div>
                        <div className="text-center">Systém</div>
                        <div className="text-center">Skutečnost</div>
                        <div className="text-center">Rozdíl</div>
                      </div>

                      {/* Položky */}
                      <div className="divide-y max-h-[400px] overflow-y-auto">
                        {filteredDetailItems.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-gray-500">Žádné položky</p>
                          </div>
                        ) : (
                          filteredDetailItems.map(item => (
                            <div
                              key={item.id}
                              className={`grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-4 px-4 py-3 ${
                                item.differenceType === 'surplus' ? 'bg-green-50' :
                                item.differenceType === 'shortage' ? 'bg-red-50' : ''
                              }`}
                            >
                              <div>
                                <p className="font-medium text-gray-900">{item.productName}</p>
                                <p className="text-xs text-gray-500">{item.category || 'Bez kategorie'}</p>
                              </div>
                              <div className="text-center text-gray-700">
                                {formatQuantity(item.systemStock, item.unit)}
                              </div>
                              <div className="text-center font-medium text-gray-900">
                                {formatQuantity(item.actualStock, item.unit)}
                              </div>
                              <div className="text-center">
                                {item.differenceType !== 'none' ? (
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                    item.differenceType === 'surplus'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {item.differenceType === 'surplus' && <TrendingUp className="h-3 w-3" />}
                                    {item.differenceType === 'shortage' && <TrendingDown className="h-3 w-3" />}
                                    {item.difference > 0 ? '+' : ''}{formatQuantity(item.difference, item.unit)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    <Check className="h-3 w-3" />
                                    OK
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Aktivní inventura - statistiky */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-slate-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{inventuraStats.total}</p>
                <p className="text-xs text-slate-600">Celkem produktů</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-900">{inventuraStats.checked}</p>
                <p className="text-xs text-blue-600">Zkontrolováno</p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-900">{inventuraStats.differences}</p>
                <p className="text-xs text-purple-600">Rozdílů</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-900">{inventuraStats.surpluses}</p>
                <p className="text-xs text-green-600">Přebytků</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-900">{inventuraStats.shortages}</p>
                <p className="text-xs text-red-600">Mank</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtry */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Hledat produkt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 rounded-md border border-gray-300 px-3 min-w-[180px]"
            >
              <option value="">Všechny kategorie</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowOnlyDifferences(!showOnlyDifferences)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                showOnlyDifferences
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="h-4 w-4" />
              Jen rozdíly
            </button>
          </div>

          {/* Tabulka inventury */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] items-center gap-4 px-4 py-3 bg-gray-100 border-b rounded-t-lg text-xs font-semibold text-gray-700">
              <div>Produkt</div>
              <div className="text-center">Systém</div>
              <div className="text-center">Skutečnost</div>
              <div className="text-center">Rozdíl</div>
              <div className="text-center">Akce</div>
            </div>

            <div className="divide-y">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Žádné položky odpovídající filtru</p>
                </div>
              ) : (
                filteredItems.map(item => {
                  const actual = parseFloat(item.actualStock)
                  const diff = !isNaN(actual) ? actual - item.systemStock : null
                  const hasDiff = diff !== null && diff !== 0

                  return (
                    <div
                      key={item.productId}
                      className={`grid grid-cols-[2fr_1fr_1fr_1fr_80px] items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        item.checked ? (hasDiff ? 'bg-yellow-50' : 'bg-green-50') : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500">{item.category?.name || 'Bez kategorie'}</p>
                      </div>
                      <div className="text-center">
                        <span className="text-gray-700 font-medium">
                          {formatQuantity(item.systemStock, item.unit)}
                        </span>
                      </div>
                      <div className="text-center">
                        <input
                          type="number"
                          step="0.001"
                          value={item.actualStock}
                          onChange={(e) => updateActualStock(item.productId, e.target.value)}
                          placeholder="?"
                          className={`w-full max-w-[100px] mx-auto px-2 py-1 border rounded text-center text-sm ${
                            item.checked
                              ? hasDiff
                                ? 'border-yellow-400 bg-yellow-50'
                                : 'border-green-400 bg-green-50'
                              : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <div className="text-center">
                        {diff !== null ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            diff > 0
                              ? 'bg-green-100 text-green-800'
                              : diff < 0
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {diff > 0 && <TrendingUp className="h-3 w-3" />}
                            {diff < 0 && <TrendingDown className="h-3 w-3" />}
                            {diff === 0 && <Check className="h-3 w-3" />}
                            {diff > 0 ? '+' : ''}{formatQuantity(diff, item.unit)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      <div className="text-center">
                        <button
                          onClick={() => setAsSystem(item.productId)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors"
                          title="Nastavit jako systémovou hodnotu"
                        >
                          =
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
