// Dashboard skladové evidence
// URL: /inventory/dashboard

'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatPrice, formatQuantity } from '@/lib/utils'
import {
  Warehouse,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShoppingCart,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock
} from 'lucide-react'

interface InventorySummary {
  productId: string
  productName: string
  unit: string
  price: number
  category?: { id: string; name: string } | null
  physicalStock: number
  reservedStock: number
  availableStock: number
  expectedQuantity: number
  avgPurchasePrice: number
  totalPurchaseValue: number
  totalSalesValue: number
  stockStatus: 'empty' | 'low' | 'ok'
}

interface StockMovement {
  id: string
  date: string
  quantity: number
  unit: string
  product: {
    id: string
    name: string
  }
  note?: string | null
}

interface CategoryStats {
  name: string
  count: number
  totalValue: number
  color: string
}

export default function InventoryDashboard() {
  const [summary, setSummary] = useState<InventorySummary[]>([])
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [summaryRes, movementsRes] = await Promise.all([
        fetch('/api/inventory/summary'),
        fetch('/api/inventory?limit=10')
      ])

      const summaryData = await summaryRes.json()
      setSummary(summaryData)

      if (movementsRes.ok) {
        const movementsData = await movementsRes.json()
        setRecentMovements(movementsData.slice(0, 10))
      }
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
    } finally {
      setLoading(false)
    }
  }

  // Výpočet statistik
  const stats = useMemo(() => {
    const totalPurchaseValue = summary.reduce((sum, item) => sum + item.totalPurchaseValue, 0)
    const totalSalesValue = summary.reduce((sum, item) => sum + item.totalSalesValue, 0)
    const potentialProfit = totalSalesValue - totalPurchaseValue
    const profitMargin = totalPurchaseValue > 0 ? ((potentialProfit / totalPurchaseValue) * 100) : 0

    const totalProducts = summary.length
    const emptyProducts = summary.filter(item => item.stockStatus === 'empty').length
    const lowStockProducts = summary.filter(item => item.stockStatus === 'low').length
    const okProducts = summary.filter(item => item.stockStatus === 'ok').length

    const totalReserved = summary.reduce((sum, item) => sum + item.reservedStock, 0)
    const totalExpected = summary.reduce((sum, item) => sum + item.expectedQuantity, 0)

    return {
      totalPurchaseValue,
      totalSalesValue,
      potentialProfit,
      profitMargin,
      totalProducts,
      emptyProducts,
      lowStockProducts,
      okProducts,
      totalReserved,
      totalExpected
    }
  }, [summary])

  // Top 5 produktů podle hodnoty na skladě
  const topByValue = useMemo(() => {
    return [...summary]
      .sort((a, b) => b.totalPurchaseValue - a.totalPurchaseValue)
      .slice(0, 5)
  }, [summary])

  // Produkty s nízkým stavem nebo vyprodané
  const lowStockItems = useMemo(() => {
    return summary
      .filter(item => item.stockStatus === 'low' || item.stockStatus === 'empty')
      .sort((a, b) => a.physicalStock - b.physicalStock)
      .slice(0, 5)
  }, [summary])

  // Statistiky podle kategorií
  const categoryStats = useMemo(() => {
    const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500']
    const catMap = new Map<string, { count: number; totalValue: number }>()

    summary.forEach(item => {
      const catName = item.category?.name || 'Bez kategorie'
      const existing = catMap.get(catName) || { count: 0, totalValue: 0 }
      catMap.set(catName, {
        count: existing.count + 1,
        totalValue: existing.totalValue + item.totalPurchaseValue
      })
    })

    return Array.from(catMap.entries())
      .map(([name, data], index) => ({
        name,
        count: data.count,
        totalValue: data.totalValue,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
  }, [summary])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Načítání...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hlavička - fialový design */}
      <div className="bg-gradient-to-r from-slate-50 to-purple-50 border-l-4 border-purple-500 rounded-lg shadow-sm py-4 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-purple-700">
            Dashboard skladové evidence
          </h1>
        </div>
      </div>

      {/* KPI karty - hlavní metriky */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Celková hodnota skladu (nákupní) */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Hodnota skladu</p>
                <p className="text-2xl font-bold text-purple-900">{formatPrice(stats.totalPurchaseValue)}</p>
                <p className="text-xs text-purple-500 mt-1">nákupní ceny</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Warehouse className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Potenciální tržby */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Potenciální tržby</p>
                <p className="text-2xl font-bold text-green-900">{formatPrice(stats.totalSalesValue)}</p>
                <p className="text-xs text-green-500 mt-1">prodejní ceny</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Potenciální zisk */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Potenciální zisk</p>
                <p className="text-2xl font-bold text-blue-900">{formatPrice(stats.potentialProfit)}</p>
                <p className="text-xs text-blue-500 mt-1">marže {stats.profitMargin.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Počet produktů */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Produktů na skladě</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalProducts}</p>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="text-green-600">{stats.okProducts} OK</span>
                  {stats.lowStockProducts > 0 && <span className="text-orange-600 ml-2">{stats.lowStockProducts} nízký</span>}
                  {stats.emptyProducts > 0 && <span className="text-red-600 ml-2">{stats.emptyProducts} prázdný</span>}
                </p>
              </div>
              <div className="p-3 bg-slate-200 rounded-full">
                <Package className="h-6 w-6 text-slate-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Druhá řada - rezervace a očekávané */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rezervované zboží */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Rezervováno</p>
                <p className="text-2xl font-bold text-orange-900">{stats.totalReserved} ks</p>
                <p className="text-xs text-orange-500 mt-1">v objednávkách zákazníků</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <ShoppingCart className="h-6 w-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Očekávané dodávky */}
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-600">Očekáváno</p>
                <p className="text-2xl font-bold text-cyan-900">{stats.totalExpected} ks</p>
                <p className="text-xs text-cyan-500 mt-1">z objednávek dodavatelů</p>
              </div>
              <div className="p-3 bg-cyan-200 rounded-full">
                <Clock className="h-6 w-6 text-cyan-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Třetí sekce - tabulky */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 produktů podle hodnoty */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Top 5 produktů podle hodnoty
            </h3>
            {topByValue.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Žádné produkty</p>
            ) : (
              <div className="space-y-3">
                {topByValue.map((item, index) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/inventory?selectedProduct=${item.productId}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500">
                          {formatQuantity(item.physicalStock, item.unit)} × {formatPrice(item.avgPurchasePrice)}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-purple-700">{formatPrice(item.totalPurchaseValue)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Produkty s nízkým stavem */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Nízký stav / Vyprodáno
            </h3>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-green-600 font-medium">Všechny produkty mají dostatečný stav</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={item.productId}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      item.stockStatus === 'empty'
                        ? 'bg-red-50 hover:bg-red-100'
                        : 'bg-orange-50 hover:bg-orange-100'
                    }`}
                    onClick={() => window.location.href = `/inventory?selectedProduct=${item.productId}`}
                  >
                    <div className="flex items-center gap-3">
                      {item.stockStatus === 'empty' ? (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-xs text-gray-500">{item.category?.name || 'Bez kategorie'}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.stockStatus === 'empty'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {formatQuantity(item.physicalStock, item.unit)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Čtvrtá sekce - Kategorie a pohyby */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hodnota podle kategorií */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Hodnota podle kategorií
            </h3>
            {categoryStats.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Žádné kategorie</p>
            ) : (
              <div className="space-y-3">
                {categoryStats.map((cat) => {
                  const percentage = stats.totalPurchaseValue > 0
                    ? (cat.totalValue / stats.totalPurchaseValue) * 100
                    : 0
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{cat.name}</span>
                        <span className="text-gray-500">
                          {cat.count} produktů • {formatPrice(cat.totalValue)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${cat.color} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Poslední pohyby */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              Poslední pohyby
            </h3>
            {recentMovements.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Žádné pohyby</p>
            ) : (
              <div className="space-y-2">
                {recentMovements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {movement.quantity > 0 ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{movement.product?.name || 'Neznámý produkt'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(movement.date).toLocaleDateString('cs-CZ')}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${
                      movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {movement.quantity > 0 ? '+' : ''}{formatQuantity(movement.quantity, movement.unit)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
