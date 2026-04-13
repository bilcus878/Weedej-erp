// Dashboard všech objednávek (komplexní)
// URL: /orders/dashboard

'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatPrice, formatDate } from '@/lib/utils'
import {
  ShoppingCart,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  DollarSign,
  Users,
  TrendingDown,
  Package,
  Store,
  CreditCard,
  Globe
} from 'lucide-react'

interface PurchaseOrder {
  id: string
  orderNumber: string
  orderDate: string
  status: string
  totalAmount?: number
  supplier?: { name: string }
  supplierName?: string
  items: { id: string }[]
  type: 'purchase'
}

interface CustomerOrder {
  id: string
  orderNumber: string
  orderDate: string
  status: string
  totalAmount?: number
  customer?: { name: string }
  customerName?: string
  items: { id: string }[]
  type: 'customer'
}

interface Transaction {
  id: string
  transactionCode: string  // Transactions používají transactionCode, ne transactionNumber
  transactionDate: string  // Transactions používají transactionDate, ne date
  status: string
  totalAmount: number | string  // API vrací string, musíme konvertovat
  items: { id: string }[]
  type: 'sumup'
}

interface EshopOrder {
  id: string
  orderNumber: string
  orderDate: string
  status: string
  totalAmount?: number
  customerName?: string
  items: { id: string }[]
  type: 'eshop'
}

type AllOrders = PurchaseOrder | CustomerOrder | Transaction | EshopOrder

export default function OrdersDashboard() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [eshopOrders, setEshopOrders] = useState<EshopOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [purchaseRes, customerRes, transactionsRes] = await Promise.all([
        fetch('/api/purchase-orders'),
        fetch('/api/customer-orders'),
        fetch('/api/transactions')
      ])

      const purchaseData = await purchaseRes.json()
      const customerData = await customerRes.json()
      const transactionsResponse = await transactionsRes.json()

      // Transactions API vrací {transactions: [...]}
      const transactionsData = transactionsResponse.transactions || transactionsResponse

      const mappedPurchase = Array.isArray(purchaseData) ? purchaseData.map((o: any) => ({ ...o, type: 'purchase' as const })) : []
      const mappedCustomer = Array.isArray(customerData) ? customerData.map((o: any) => ({ ...o, type: 'customer' as const })) : []
      const mappedTransactions = Array.isArray(transactionsData) ? transactionsData.map((t: any) => ({ ...t, type: 'sumup' as const })) : []

      console.log('📊 Dashboard data loaded:', {
        purchaseOrders: mappedPurchase.length,
        customerOrders: mappedCustomer.length,
        transactions: mappedTransactions.length,
        sampleTransaction: mappedTransactions[0]
      })

      setPurchaseOrders(mappedPurchase)
      setCustomerOrders(mappedCustomer)
      setTransactions(mappedTransactions)

      // Eshop orders - zatím není API, necháme prázdné
      setEshopOrders([])
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
    } finally {
      setLoading(false)
    }
  }

  // Agregace všech objednávek
  const allOrders: AllOrders[] = useMemo(() => {
    return [
      ...purchaseOrders,
      ...customerOrders,
      ...transactions,
      ...eshopOrders
    ]
  }, [purchaseOrders, customerOrders, transactions, eshopOrders])

  // Helper: Je objednávka/transakce aktivní (ne stornovana)?
  const isActive = (order: AllOrders) => {
    const status = order.status.toLowerCase()
    return status !== 'storno' && status !== 'cancelled' && status !== 'canceled'
  }

  // Helper: Získej totalAmount jako číslo (API může vracet string)
  const getTotalAmount = (order: AllOrders): number => {
    const amount = order.totalAmount
    if (typeof amount === 'string') {
      return parseFloat(amount) || 0
    }
    return amount || 0
  }

  // Výpočet statistik
  const stats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Celkové statistiky
    const totalOrders = allOrders.length
    const purchaseCount = purchaseOrders.length
    const customerCount = customerOrders.length
    const sumupCount = transactions.length
    const eshopCount = eshopOrders.length

    // Finanční statistiky - jen aktivní objednávky
    const totalValue = allOrders
      .filter(isActive)
      .reduce((sum, o) => sum + getTotalAmount(o), 0)

    const purchaseValue = purchaseOrders
      .filter(isActive)
      .reduce((sum, o) => sum + getTotalAmount(o), 0)

    const customerValue = customerOrders
      .filter(isActive)
      .reduce((sum, o) => sum + getTotalAmount(o), 0)

    const sumupValue = transactions
      .filter(isActive)
      .reduce((sum, t) => sum + getTotalAmount(t), 0)

    const eshopValue = eshopOrders
      .filter(isActive)
      .reduce((sum, o) => sum + getTotalAmount(o), 0)

    // Tento měsíc
    const thisMonthOrders = allOrders.filter(o => {
      // Transactions používají transactionDate, ostatní orderDate
      const date = new Date((o as any).orderDate || (o as any).transactionDate || (o as any).date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })

    const thisMonthValue = thisMonthOrders
      .filter(isActive)
      .reduce((sum, o) => sum + getTotalAmount(o), 0)

    // Minulý měsíc
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

    const lastMonthOrders = allOrders.filter(o => {
      // Transactions používají transactionDate, ostatní orderDate
      const date = new Date((o as any).orderDate || (o as any).transactionDate || (o as any).date)
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
    })

    const lastMonthValue = lastMonthOrders
      .filter(isActive)
      .reduce((sum, o) => sum + getTotalAmount(o), 0)

    const monthGrowth = lastMonthValue > 0
      ? ((thisMonthValue - lastMonthValue) / lastMonthValue) * 100
      : 0

    // Průměrná hodnota
    const activeOrdersCount = allOrders.filter(isActive).length
    const avgOrderValue = activeOrdersCount > 0 ? totalValue / activeOrdersCount : 0

    // Celkový počet položek
    const totalItems = allOrders
      .filter(isActive)
      .reduce((sum, o) => sum + o.items.length, 0)

    return {
      totalOrders,
      purchaseCount,
      customerCount,
      sumupCount,
      eshopCount,
      totalValue,
      purchaseValue,
      customerValue,
      sumupValue,
      eshopValue,
      thisMonthOrders: thisMonthOrders.length,
      thisMonthValue,
      monthGrowth,
      avgOrderValue,
      totalItems
    }
  }, [allOrders, purchaseOrders, customerOrders, transactions, eshopOrders])

  // Poslední objednávky (všechny typy)
  const recentOrders = useMemo(() => {
    return [...allOrders]
      .sort((a, b) => {
        // Transactions používají transactionDate, ostatní orderDate
        const dateA = new Date((a as any).orderDate || (a as any).transactionDate || (a as any).date).getTime()
        const dateB = new Date((b as any).orderDate || (b as any).transactionDate || (b as any).date).getTime()
        return dateB - dateA
      })
      .slice(0, 10)
  }, [allOrders])

  // Rozdělení podle typu
  const ordersByType = useMemo(() => {
    return [
      { name: 'Vydané', count: stats.purchaseCount, value: stats.purchaseValue, color: 'bg-emerald-500', icon: Package },
      { name: 'Vystavené', count: stats.customerCount, value: stats.customerValue, color: 'bg-blue-500', icon: ShoppingCart },
      { name: 'SumUp', count: stats.sumupCount, value: stats.sumupValue, color: 'bg-purple-500', icon: CreditCard },
      { name: 'Eshop', count: stats.eshopCount, value: stats.eshopValue, color: 'bg-orange-500', icon: Globe }
    ]
  }, [stats])

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase': return { label: 'Vydaná', color: 'bg-emerald-100 text-emerald-700', icon: Package }
      case 'customer': return { label: 'Vystavená', color: 'bg-blue-100 text-blue-700', icon: ShoppingCart }
      case 'sumup': return { label: 'SumUp', color: 'bg-purple-100 text-purple-700', icon: CreditCard }
      case 'eshop': return { label: 'Eshop', color: 'bg-orange-100 text-orange-700', icon: Globe }
      default: return { label: 'Neznámý', color: 'bg-gray-100 text-gray-700', icon: AlertCircle }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
      case 'new':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Čeká' }
      case 'partially_received':
      case 'processing':
        return { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Zpracovává se' }
      case 'received':
      case 'completed':
      case 'shipped':
      case 'SUCCESSFUL':  // SumUp transakce používají SUCCESSFUL
      case 'active':      // Některé transakce mají status active
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Dokončeno' }
      case 'storno':
      case 'cancelled':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Storno' }
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: status }
    }
  }

  const getOrderLink = (order: AllOrders) => {
    switch (order.type) {
      case 'purchase': return `/purchase-orders?highlight=${order.id}`
      case 'customer': return `/customer-orders?highlight=${order.id}`
      case 'sumup': return `/transactions?highlight=${order.id}`
      case 'eshop': return `/eshop-orders?highlight=${order.id}`
      default: return '#'
    }
  }

  const getOrderNumber = (order: AllOrders) => {
    // Transactions používají transactionCode, ostatní orderNumber
    return (order as any).orderNumber || (order as any).transactionCode || 'N/A'
  }

  const getOrderDate = (order: AllOrders) => {
    // Transactions používají transactionDate, ostatní orderDate
    return (order as any).orderDate || (order as any).transactionDate || (order as any).date
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
      {/* Hlavička - modrý design */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-l-4 border-blue-500 rounded-lg shadow-sm py-4 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-600">
            Dashboard objednávek
          </h1>
        </div>
      </div>

      {/* KPI karty - hlavní metriky */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Celkový počet objednávek */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Celkem objednávek</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalOrders}</p>
                <p className="text-xs text-blue-500 mt-1">
                  všechny typy
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <ShoppingCart className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Celková hodnota */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Celková hodnota</p>
                <p className="text-2xl font-bold text-green-900">{formatPrice(stats.totalValue)}</p>
                <p className="text-xs text-green-500 mt-1">
                  aktivní objednávky
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <DollarSign className="h-6 w-6 text-green-700" />
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

      {/* Druhá řada - rozdělení podle typu */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ordersByType.map((type) => {
          const Icon = type.icon
          const percentage = stats.totalValue > 0 ? (type.value / stats.totalValue) * 100 : 0

          return (
            <Card key={type.name} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 ${type.color} rounded-full`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">{type.name}</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900">{type.count}</p>
                <p className="text-sm text-gray-600 mt-1">{formatPrice(type.value)}</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`${type.color} h-1.5 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% z celkové hodnoty</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Třetí sekce - Poslední objednávky */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Poslední objednávky (všechny typy)
          </h3>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Žádné objednávky</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Typ</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Číslo</th>
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
                    const typeInfo = getTypeLabel(order.type)
                    const TypeIcon = typeInfo.icon

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => window.location.href = getOrderLink(order)}
                      >
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                            <TypeIcon className="h-3 w-3" />
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{getOrderNumber(order)}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-center">{formatDate(getOrderDate(order))}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 text-center">{order.items.length}</td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-900 text-right">
                          {formatPrice(getTotalAmount(order))}
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
