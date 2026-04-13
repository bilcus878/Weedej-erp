// Dashboard zákazníků
// URL: /customers/dashboard

'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatPrice, formatDate } from '@/lib/utils'
import {
  Users,
  Building2,
  User,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  FileText,
  DollarSign,
  Calendar,
  UserPlus,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  ExternalLink
} from 'lucide-react'

interface Customer {
  id: string
  name: string
  entityType?: string
  contact?: string
  email?: string
  phone?: string
  ico?: string
  dic?: string
  address?: string
  createdAt: string
}

interface CustomerOrder {
  id: string
  orderNumber: string
  orderDate: string
  totalAmount: number
  status: string
  customerId?: string
  customerName?: string
  customer?: { id: string; name: string }
  items?: { quantity: number }[]
}

interface IssuedInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  totalAmount: number
  status?: string
  customerId?: string
  customerName?: string
  customer?: { id: string; name: string }
}

export default function CustomersDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [invoices, setInvoices] = useState<IssuedInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [customersRes, ordersRes, invoicesRes] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/customer-orders'),
        fetch('/api/issued-invoices')
      ])
      const customersData = await customersRes.json()
      const ordersData = await ordersRes.json()
      const invoicesData = await invoicesRes.json()
      setCustomers(Array.isArray(customersData) ? customersData : [])
      setOrders(Array.isArray(ordersData) ? ordersData : [])
      setInvoices(Array.isArray(invoicesData) ? invoicesData : [])
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
      setCustomers([])
      setOrders([])
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  // Statistiky zákazníků
  const customerStats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const totalCount = customers.length
    const companyCount = customers.filter(c => c.entityType === 'company' || !c.entityType).length
    const individualCount = customers.filter(c => c.entityType === 'individual').length

    // Noví zákazníci tento měsíc
    const newThisMonth = customers.filter(c => {
      const date = new Date(c.createdAt)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    }).length

    // Minulý měsíc
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const newLastMonth = customers.filter(c => {
      const date = new Date(c.createdAt)
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
    }).length

    const growthPercent = newLastMonth > 0
      ? ((newThisMonth - newLastMonth) / newLastMonth) * 100
      : 0

    // Zákazníci s kontaktem
    const withEmail = customers.filter(c => c.email).length
    const withPhone = customers.filter(c => c.phone).length
    const withAddress = customers.filter(c => c.address).length

    return {
      totalCount,
      companyCount,
      individualCount,
      newThisMonth,
      growthPercent,
      withEmail,
      withPhone,
      withAddress
    }
  }, [customers])

  // Statistiky objednávek
  const orderStats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const activeOrders = orders.filter(o => o.status !== 'storno')
    const totalOrders = orders.length
    const stornoCount = orders.filter(o => o.status === 'storno').length

    // Statusy
    const newCount = orders.filter(o => o.status === 'new').length
    const paidCount = orders.filter(o => o.status === 'paid').length
    const processingCount = orders.filter(o => o.status === 'processing').length
    const shippedCount = orders.filter(o => o.status === 'shipped').length

    const totalValue = activeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    // Tento měsíc
    const thisMonthOrders = activeOrders.filter(o => {
      const date = new Date(o.orderDate)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    const thisMonthValue = thisMonthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    // Minulý měsíc
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const lastMonthOrders = activeOrders.filter(o => {
      const date = new Date(o.orderDate)
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
    })
    const lastMonthValue = lastMonthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)

    const monthGrowth = lastMonthValue > 0
      ? ((thisMonthValue - lastMonthValue) / lastMonthValue) * 100
      : 0

    const avgOrderValue = activeOrders.length > 0 ? totalValue / activeOrders.length : 0

    return {
      totalOrders,
      stornoCount,
      newCount,
      paidCount,
      processingCount,
      shippedCount,
      totalValue,
      thisMonthCount: thisMonthOrders.length,
      thisMonthValue,
      monthGrowth,
      avgOrderValue
    }
  }, [orders])

  // Statistiky faktur
  const invoiceStats = useMemo(() => {
    const activeInvoices = invoices.filter(i => i.status !== 'storno')
    const totalValue = activeInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)
    const paidCount = invoices.filter(i => i.status === 'paid' || i.status === 'active').length
    const unpaidCount = invoices.filter(i => i.status === 'unpaid').length

    return {
      totalCount: invoices.length,
      totalValue,
      paidCount,
      unpaidCount
    }
  }, [invoices])

  // Top 5 zákazníků podle obratu (z faktur)
  const topCustomers = useMemo(() => {
    const customerMap = new Map<string, {
      id: string
      name: string
      invoiceCount: number
      orderCount: number
      totalValue: number
    }>()

    // Faktury
    invoices
      .filter(i => i.status !== 'storno')
      .forEach(invoice => {
        const customerId = invoice.customerId || invoice.customer?.id || ''
        const customerName = invoice.customer?.name || invoice.customerName || 'Anonymní zákazník'
        const key = customerId || customerName
        const existing = customerMap.get(key) || { id: customerId, name: customerName, invoiceCount: 0, orderCount: 0, totalValue: 0 }
        customerMap.set(key, {
          ...existing,
          invoiceCount: existing.invoiceCount + 1,
          totalValue: existing.totalValue + (invoice.totalAmount || 0)
        })
      })

    // Objednávky
    orders
      .filter(o => o.status !== 'storno')
      .forEach(order => {
        const customerId = order.customerId || order.customer?.id || ''
        const customerName = order.customer?.name || order.customerName || 'Anonymní zákazník'
        const key = customerId || customerName
        const existing = customerMap.get(key)
        if (existing) {
          existing.orderCount++
        } else {
          customerMap.set(key, {
            id: customerId,
            name: customerName,
            invoiceCount: 0,
            orderCount: 1,
            totalValue: order.totalAmount || 0
          })
        }
      })

    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']

    return Array.from(customerMap.values())
      .map((data, index) => ({
        ...data,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
  }, [invoices, orders])

  // Celková hodnota pro progress bar
  const topCustomersTotalValue = useMemo(() => {
    return topCustomers.reduce((sum, c) => sum + c.totalValue, 0)
  }, [topCustomers])

  // Poslední objednávky
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 5)
  }, [orders])

  // Noví zákazníci (posledních 5)
  const recentCustomers = useMemo(() => {
    return [...customers]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  }, [customers])

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Nová' }
      case 'paid':
        return { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100', label: 'Zaplacena' }
      case 'processing':
        return { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Připravuje se' }
      case 'shipped':
        return { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Odesláno' }
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
      {/* Hlavička */}
      <div className="bg-gradient-to-r from-slate-50 to-teal-50 border-l-4 border-teal-500 rounded-lg shadow-sm py-4 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-teal-600">
            Dashboard zákazníků
          </h1>
        </div>
      </div>

      {/* KPI karty - první řada */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Celkem zákazníků */}
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-600">Celkem zákazníků</p>
                <p className="text-2xl font-bold text-teal-900">{customerStats.totalCount}</p>
                <p className="text-xs text-teal-500 mt-1">
                  <span className="text-blue-600">{customerStats.companyCount} firem</span>
                  {' • '}
                  <span className="text-purple-600">{customerStats.individualCount} FO</span>
                </p>
              </div>
              <div className="p-3 bg-teal-200 rounded-full">
                <Users className="h-6 w-6 text-teal-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Noví zákazníci tento měsíc */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Noví tento měsíc</p>
                <p className="text-2xl font-bold text-green-900">{customerStats.newThisMonth}</p>
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  {customerStats.growthPercent > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">+{customerStats.growthPercent.toFixed(0)}% oproti min. měsíci</span>
                    </>
                  ) : customerStats.growthPercent < 0 ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">{customerStats.growthPercent.toFixed(0)}% oproti min. měsíci</span>
                    </>
                  ) : (
                    <span className="text-gray-600">beze změny</span>
                  )}
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <UserPlus className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Celkový obrat */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Celkový obrat</p>
                <p className="text-2xl font-bold text-blue-900">{formatPrice(invoiceStats.totalValue)}</p>
                <p className="text-xs text-blue-500 mt-1">
                  z {invoiceStats.totalCount} faktur
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Průměrná hodnota objednávky */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Průměrná objednávka</p>
                <p className="text-2xl font-bold text-purple-900">{formatPrice(orderStats.avgOrderValue)}</p>
                <p className="text-xs text-purple-500 mt-1">
                  z {orderStats.totalOrders} objednávek
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <ShoppingCart className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Druhá řada - statusy objednávek */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Nové objednávky</p>
                <p className="text-2xl font-bold text-yellow-900">{orderStats.newCount}</p>
                <p className="text-xs text-yellow-500 mt-1">čekají na zaplacení</p>
              </div>
              <div className="p-3 bg-yellow-200 rounded-full">
                <Clock className="h-6 w-6 text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Zaplacené</p>
                <p className="text-2xl font-bold text-emerald-900">{orderStats.paidCount}</p>
                <p className="text-xs text-emerald-500 mt-1">k expedici</p>
              </div>
              <div className="p-3 bg-emerald-200 rounded-full">
                <DollarSign className="h-6 w-6 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-600">Připravuje se</p>
                <p className="text-2xl font-bold text-cyan-900">{orderStats.processingCount}</p>
                <p className="text-xs text-cyan-500 mt-1">v přípravě</p>
              </div>
              <div className="p-3 bg-cyan-200 rounded-full">
                <Package className="h-6 w-6 text-cyan-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">Tento měsíc</p>
                <p className="text-2xl font-bold text-indigo-900">{orderStats.thisMonthCount}</p>
                <p className="text-xs text-indigo-500 mt-1 flex items-center gap-1">
                  {formatPrice(orderStats.thisMonthValue)}
                  {orderStats.monthGrowth !== 0 && (
                    orderStats.monthGrowth > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600 ml-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600 ml-1" />
                    )
                  )}
                </p>
              </div>
              <div className="p-3 bg-indigo-200 rounded-full">
                <Calendar className="h-6 w-6 text-indigo-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Třetí sekce - Top zákazníci a nový zákazníci */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 zákazníků */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Top 5 zákazníků podle obratu
            </h3>
            {topCustomers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Žádní zákazníci s objednávkami</p>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((customer, index) => {
                  const percentage = topCustomersTotalValue > 0
                    ? (customer.totalValue / topCustomersTotalValue) * 100
                    : 0
                  return (
                    <div key={customer.id || customer.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          {customer.id ? (
                            <a
                              href={`/customers?highlight=${customer.id}`}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {customer.name}
                            </a>
                          ) : (
                            <span className="font-medium text-gray-700">{customer.name}</span>
                          )}
                        </div>
                        <span className="text-gray-500">
                          {customer.invoiceCount} fakt. • {formatPrice(customer.totalValue)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 ml-8">
                        <div
                          className={`${customer.color} h-2 rounded-full transition-all duration-500`}
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

        {/* Noví zákazníci */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600" />
              Noví zákazníci
            </h3>
            {recentCustomers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Žádní zákazníci</p>
            ) : (
              <div className="space-y-2">
                {recentCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                    onClick={() => window.location.href = `/customers?highlight=${customer.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {customer.entityType === 'individual' ? (
                        <User className="h-5 w-5 text-purple-600" />
                      ) : (
                        <Building2 className="h-5 w-5 text-blue-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                        <p className="text-xs text-gray-500">
                          {customer.entityType === 'individual' ? 'Fyzická osoba' : 'Firma'}
                          {customer.email && ` • ${customer.email}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{formatDate(customer.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Čtvrtá sekce - Poslední objednávky */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Poslední objednávky zákazníků
          </h3>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500">Žádné objednávky</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentOrders.map((order) => {
                const status = getOrderStatusBadge(order.status)
                const StatusIcon = status.icon
                const customerName = order.customer?.name || order.customerName || 'Anonymní'

                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                    onClick={() => window.location.href = `/customer-orders?highlight=${order.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${status.bg}`}>
                        <StatusIcon className={`h-4 w-4 ${status.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">{customerName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatPrice(order.totalAmount || 0)}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.orderDate)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pátá sekce - Statistiky kontaktů */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">S emailem</p>
                <p className="text-2xl font-bold text-slate-900">{customerStats.withEmail}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {customerStats.totalCount > 0
                    ? `${((customerStats.withEmail / customerStats.totalCount) * 100).toFixed(0)}% zákazníků`
                    : '0% zákazníků'
                  }
                </p>
              </div>
              <div className="w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeDasharray={`${customerStats.totalCount > 0 ? (customerStats.withEmail / customerStats.totalCount) * 100 : 0}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">S telefonem</p>
                <p className="text-2xl font-bold text-slate-900">{customerStats.withPhone}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {customerStats.totalCount > 0
                    ? `${((customerStats.withPhone / customerStats.totalCount) * 100).toFixed(0)}% zákazníků`
                    : '0% zákazníků'
                  }
                </p>
              </div>
              <div className="w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeDasharray={`${customerStats.totalCount > 0 ? (customerStats.withPhone / customerStats.totalCount) * 100 : 0}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">S adresou</p>
                <p className="text-2xl font-bold text-slate-900">{customerStats.withAddress}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {customerStats.totalCount > 0
                    ? `${((customerStats.withAddress / customerStats.totalCount) * 100).toFixed(0)}% zákazníků`
                    : '0% zákazníků'
                  }
                </p>
              </div>
              <div className="w-16 h-16">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="3"
                    strokeDasharray={`${customerStats.totalCount > 0 ? (customerStats.withAddress / customerStats.totalCount) * 100 : 0}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
