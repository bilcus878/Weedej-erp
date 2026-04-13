// Dashboard objednávek vydaných
// URL: /purchase-orders/dashboard

'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatPrice, formatDate } from '@/lib/utils'
import {
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  DollarSign,
  Users,
  TrendingDown
} from 'lucide-react'

interface PurchaseOrder {
  id: string
  orderNumber: string
  orderDate: string
  expectedDate?: string
  status: string
  totalAmount?: number
  totalAmountWithoutVat?: number
  supplier?: {
    id: string
    name: string
  }
  supplierName?: string
  items: {
    id: string
    quantity: number
    expectedPrice: number
  }[]
}

interface SupplierStats {
  name: string
  ordersCount: number
  totalValue: number
  color: string
}

export default function PurchaseOrdersDashboard() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch('/api/purchase-orders')
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  // Výpočet statistik
  const stats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Celkové statistiky
    const totalOrders = orders.length
    const pendingOrders = orders.filter(o => o.status === 'pending').length
    const partiallyReceivedOrders = orders.filter(o => o.status === 'partially_received').length
    const receivedOrders = orders.filter(o => o.status === 'received').length
    const stornoOrders = orders.filter(o => o.status === 'storno').length

    // Finanční statistiky
    const totalValue = orders
      .filter(o => o.status !== 'storno')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    const pendingValue = orders
      .filter(o => o.status === 'pending')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    const receivedValue = orders
      .filter(o => o.status === 'received')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    // Tento měsíc
    const thisMonthOrders = orders.filter(o => {
      const orderDate = new Date(o.orderDate)
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
    })

    const thisMonthValue = thisMonthOrders
      .filter(o => o.status !== 'storno')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    // Minulý měsíc pro srovnání
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

    const lastMonthOrders = orders.filter(o => {
      const orderDate = new Date(o.orderDate)
      return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear
    })

    const lastMonthValue = lastMonthOrders
      .filter(o => o.status !== 'storno')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    const monthGrowth = lastMonthValue > 0
      ? ((thisMonthValue - lastMonthValue) / lastMonthValue) * 100
      : 0

    // Počet položek
    const totalItems = orders
      .filter(o => o.status !== 'storno')
      .reduce((sum, o) => sum + o.items.length, 0)

    // Průměrná hodnota objednávky
    const avgOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0

    // Opožděné dodávky
    const overdueOrders = orders.filter(o => {
      if (o.status === 'received' || o.status === 'storno' || !o.expectedDate) return false
      return new Date(o.expectedDate) < now
    }).length

    return {
      totalOrders,
      pendingOrders,
      partiallyReceivedOrders,
      receivedOrders,
      stornoOrders,
      totalValue,
      pendingValue,
      receivedValue,
      thisMonthOrders: thisMonthOrders.length,
      thisMonthValue,
      monthGrowth,
      totalItems,
      avgOrderValue,
      overdueOrders
    }
  }, [orders])

  // Top 5 dodavatelů podle hodnoty objednávek
  const topSuppliers = useMemo(() => {
    const supplierMap = new Map<string, { count: number; value: number }>()

    orders
      .filter(o => o.status !== 'storno')
      .forEach(order => {
        const supplierName = order.supplier?.name || order.supplierName || 'Anonymní dodavatel'
        const existing = supplierMap.get(supplierName) || { count: 0, value: 0 }
        supplierMap.set(supplierName, {
          count: existing.count + 1,
          value: existing.value + (order.totalAmount || 0)
        })
      })

    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']

    return Array.from(supplierMap.entries())
      .map(([name, data], index) => ({
        name,
        ordersCount: data.count,
        totalValue: data.value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
  }, [orders])

  // Poslední objednávky
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 8)
  }, [orders])

  // Objednávky s blížícím se datem dodání
  const upcomingOrders = useMemo(() => {
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return orders
      .filter(o => {
        if (!o.expectedDate || o.status === 'received' || o.status === 'storno') return false
        const expectedDate = new Date(o.expectedDate)
        return expectedDate >= now && expectedDate <= nextWeek
      })
      .sort((a, b) => new Date(a.expectedDate!).getTime() - new Date(b.expectedDate!).getTime())
      .slice(0, 5)
  }, [orders])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Čeká' }
      case 'partially_received':
        return { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Částečně' }
      case 'received':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Přijato' }
      case 'storno':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Storno' }
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Neznámý' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Načítání...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hlavička - zelený design */}
      <div className="bg-gradient-to-r from-slate-50 to-emerald-50 border-l-4 border-emerald-500 rounded-lg shadow-sm py-4 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-emerald-700">
            Dashboard objednávek vydaných
          </h1>
        </div>
      </div>

      {/* KPI karty - hlavní metriky */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Celkový počet objednávek */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Celkem objednávek</p>
                <p className="text-2xl font-bold text-emerald-900">{stats.totalOrders}</p>
                <p className="text-xs text-emerald-500 mt-1">
                  <span className="text-yellow-600">{stats.pendingOrders} čeká</span>
                  {stats.overdueOrders > 0 && <span className="text-red-600 ml-2">{stats.overdueOrders} opožděno</span>}
                </p>
              </div>
              <div className="p-3 bg-emerald-200 rounded-full">
                <Package className="h-6 w-6 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Celková hodnota */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Celková hodnota</p>
                <p className="text-2xl font-bold text-blue-900">{formatPrice(stats.totalValue)}</p>
                <p className="text-xs text-blue-500 mt-1">
                  <span className="text-green-600">{formatPrice(stats.receivedValue)} přijato</span>
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tento měsíc */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Tento měsíc</p>
                <p className="text-2xl font-bold text-purple-900">{stats.thisMonthOrders}</p>
                <p className="text-xs text-purple-500 mt-1 flex items-center gap-1">
                  {stats.monthGrowth > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">+{stats.monthGrowth.toFixed(1)}%</span>
                    </>
                  ) : stats.monthGrowth < 0 ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">{stats.monthGrowth.toFixed(1)}%</span>
                    </>
                  ) : (
                    <span className="text-gray-600">beze změny</span>
                  )}
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Calendar className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Průměrná hodnota */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Průměrná hodnota</p>
                <p className="text-2xl font-bold text-slate-900">{formatPrice(stats.avgOrderValue)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.totalItems} položek celkem
                </p>
              </div>
              <div className="p-3 bg-slate-200 rounded-full">
                <TrendingUp className="h-6 w-6 text-slate-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Druhá řada - statusy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Čekající */}
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Čekající</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.pendingOrders}</p>
                <p className="text-xs text-yellow-500 mt-1">{formatPrice(stats.pendingValue)}</p>
              </div>
              <div className="p-3 bg-yellow-200 rounded-full">
                <Clock className="h-6 w-6 text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Částečně přijato */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Částečně přijato</p>
                <p className="text-2xl font-bold text-orange-900">{stats.partiallyReceivedOrders}</p>
                <p className="text-xs text-orange-500 mt-1">rozpracované</p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <AlertCircle className="h-6 w-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Přijato */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Přijato</p>
                <p className="text-2xl font-bold text-green-900">{stats.receivedOrders}</p>
                <p className="text-xs text-green-500 mt-1">dokončené</p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Třetí sekce - tabulky */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 dodavatelů */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Top 5 dodavatelů podle hodnoty
            </h3>
            {topSuppliers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Žádní dodavatelé</p>
            ) : (
              <div className="space-y-3">
                {topSuppliers.map((supplier, index) => {
                  const percentage = stats.totalValue > 0
                    ? (supplier.totalValue / stats.totalValue) * 100
                    : 0
                  return (
                    <div key={supplier.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-700">{supplier.name}</span>
                        </div>
                        <span className="text-gray-500">
                          {supplier.ordersCount} obj. • {formatPrice(supplier.totalValue)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 ml-8">
                        <div
                          className={`${supplier.color} h-2 rounded-full transition-all duration-500`}
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

        {/* Blížící se dodání */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Očekávané dodání (7 dní)
            </h3>
            {upcomingOrders.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-500">Žádné očekávané dodávky v příštích 7 dnech</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingOrders.map((order) => {
                  const status = getStatusBadge(order.status)
                  const StatusIcon = status.icon
                  const isOverdue = order.expectedDate && new Date(order.expectedDate) < new Date()

                  return (
                    <div
                      key={order.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        isOverdue ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => window.location.href = `/purchase-orders?highlight=${order.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-5 w-5 ${status.color}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">
                            {order.supplier?.name || order.supplierName || 'Anonymní dodavatel'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                          {order.expectedDate ? formatDate(order.expectedDate) : '-'}
                        </p>
                        <p className="text-xs text-gray-500">{formatPrice(order.totalAmount || 0)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Čtvrtá sekce - Poslední objednávky */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Poslední objednávky
          </h3>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Žádné objednávky</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Číslo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Dodavatel</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Datum</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Položek</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Hodnota</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const status = getStatusBadge(order.status)
                    const StatusIcon = status.icon

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/purchase-orders?highlight=${order.id}`}
                      >
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{order.orderNumber}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          {order.supplier?.name || order.supplierName || 'Anonymní dodavatel'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-center">{formatDate(order.orderDate)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-center">{order.items.length}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                          {formatPrice(order.totalAmount || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
