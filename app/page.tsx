// Dashboard - hlavní stránka (/)
// Moderní přehled celého systému - účetnictví, sklad, faktury, zákazníci

'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatPrice, formatDate } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  FileText,
  Users,
  Warehouse,
  CreditCard,
  Banknote,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Star,
  Zap,
  BarChart3,
  Activity,
  ExternalLink,
  Settings
} from 'lucide-react'

interface Stats {
  totalInventoryValue: number
  todayRevenue: number
  monthRevenue: number
  productCount: number
  lowStockCount: number
  outOfStockCount: number
  topProduct: {
    name: string
    quantity: number
    unit: string
  } | null
  avgDailyRevenue: number
  cashRevenue: number
  cardRevenue: number
  cashPercentage: number
  cardPercentage: number
  todayTransactionCount: number
  monthTransactionCount: number
}

interface ReceivedInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  totalAmount: number
  status?: string
  supplierName?: string
  purchaseOrder?: { supplier?: { name: string }, supplierName?: string }
  receipts?: { supplier?: { name: string } }[]
}

interface IssuedInvoice {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate?: string
  totalAmount: number
  status?: string
  customerName?: string
  customer?: { name: string }
}

interface CustomerOrder {
  id: string
  orderNumber: string
  orderDate: string
  totalAmount: number
  status: string
  customerName?: string
  customer?: { name: string }
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [receivedInvoices, setReceivedInvoices] = useState<ReceivedInvoice[]>([])
  const [issuedInvoices, setIssuedInvoices] = useState<IssuedInvoice[]>([])
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllData()
  }, [])

  async function fetchAllData() {
    try {
      const [statsRes, receivedRes, issuedRes, ordersRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/invoices/received'),
        fetch('/api/issued-invoices'),
        fetch('/api/customer-orders')
      ])

      const statsData = await statsRes.json()
      const receivedData = await receivedRes.json()
      const issuedData = await issuedRes.json()
      const ordersData = await ordersRes.json()

      setStats(statsData)
      setReceivedInvoices(Array.isArray(receivedData) ? receivedData : [])
      setIssuedInvoices(Array.isArray(issuedData) ? issuedData : [])
      setCustomerOrders(Array.isArray(ordersData) ? ordersData : [])
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
    } finally {
      setLoading(false)
    }
  }

  // Bilance faktur
  const invoiceBalance = useMemo(() => {
    const receivedTotal = receivedInvoices
      .filter(i => i.status !== 'storno')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0)
    const issuedTotal = issuedInvoices
      .filter(i => i.status !== 'storno')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0)
    return issuedTotal - receivedTotal
  }, [receivedInvoices, issuedInvoices])

  // Faktury po splatnosti
  const overdueInvoices = useMemo(() => {
    const now = new Date()
    const received = receivedInvoices.filter(i => {
      if (!i.dueDate || i.status === 'received' || i.status === 'storno') return false
      return new Date(i.dueDate) < now
    })
    const issued = issuedInvoices.filter(i => {
      if (!i.dueDate || i.status === 'paid' || i.status === 'storno') return false
      return new Date(i.dueDate) < now
    })
    return { receivedCount: received.length, issuedCount: issued.length, total: received.length + issued.length }
  }, [receivedInvoices, issuedInvoices])

  // Blížící se splatnost (7 dní)
  const upcomingDue = useMemo(() => {
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const received = receivedInvoices
      .filter(i => {
        if (!i.dueDate || i.status === 'received' || i.status === 'storno') return false
        const dueDate = new Date(i.dueDate)
        return dueDate >= now && dueDate <= nextWeek
      })
      .map(i => ({ ...i, type: 'received' as const }))

    const issued = issuedInvoices
      .filter(i => {
        if (!i.dueDate || i.status === 'paid' || i.status === 'storno') return false
        const dueDate = new Date(i.dueDate)
        return dueDate >= now && dueDate <= nextWeek
      })
      .map(i => ({ ...i, type: 'issued' as const, invoiceDate: i.issueDate }))

    return [...received, ...issued]
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 6)
  }, [receivedInvoices, issuedInvoices])

  // Statistiky objednávek
  const orderStats = useMemo(() => {
    const active = customerOrders.filter(o => o.status !== 'storno')
    const newCount = customerOrders.filter(o => o.status === 'new').length
    const processingCount = customerOrders.filter(o => o.status === 'processing' || o.status === 'paid').length
    const totalValue = active.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    return { total: customerOrders.length, newCount, processingCount, totalValue }
  }, [customerOrders])

  // Poslední objednávky
  const recentOrders = useMemo(() => {
    return [...customerOrders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 5)
  }, [customerOrders])

  // Poslední faktury (přijaté + vydané dohromady)
  const recentInvoices = useMemo(() => {
    const received = receivedInvoices
      .slice(0, 10)
      .map(i => ({
        id: i.id,
        number: i.invoiceNumber,
        date: i.invoiceDate,
        amount: i.totalAmount || 0,
        status: i.status,
        type: 'received' as const,
        name: i.supplierName ||
          i.purchaseOrder?.supplier?.name ||
          i.purchaseOrder?.supplierName ||
          i.receipts?.[0]?.supplier?.name ||
          'Anonymní'
      }))

    const issued = issuedInvoices
      .slice(0, 10)
      .map(i => ({
        id: i.id,
        number: i.invoiceNumber,
        date: i.issueDate,
        amount: i.totalAmount || 0,
        status: i.status,
        type: 'issued' as const,
        name: i.customer?.name || i.customerName || 'Anonymní'
      }))

    return [...received, ...issued]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8)
  }, [receivedInvoices, issuedInvoices])

  // Platební mix - vizuální bar
  const paymentBar = useMemo(() => {
    if (!stats) return { cash: 50, card: 50 }
    const total = stats.cashRevenue + stats.cardRevenue
    if (total === 0) return { cash: 50, card: 50 }
    return {
      cash: (stats.cashRevenue / total) * 100,
      card: (stats.cardRevenue / total) * 100
    }
  }, [stats])

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
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: status }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Načítání dashboardu...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 font-medium">Nepodařilo se načíst statistiky</p>
        </div>
      </div>
    )
  }

  const alertCount = stats.lowStockCount + stats.outOfStockCount + overdueInvoices.total

  return (
    <div className="space-y-6">
      {/* Hlavička */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-l-4 border-blue-500 rounded-lg shadow-sm py-4 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-600">
            Dashboard
          </h1>
        </div>
      </div>

      {/* KPI karty - hlavní metriky */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tržby dnes */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-emerald-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Tržby dnes</p>
                <p className="text-2xl font-bold text-emerald-900">{formatPrice(stats.todayRevenue)}</p>
                <p className="text-xs text-emerald-500 mt-1">
                  {stats.todayTransactionCount} transakcí
                </p>
              </div>
              <div className="p-3 bg-emerald-200 rounded-full">
                <DollarSign className="h-6 w-6 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tržby měsíc */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Tržby tento měsíc</p>
                <p className="text-2xl font-bold text-blue-900">{formatPrice(stats.monthRevenue)}</p>
                <p className="text-xs text-blue-500 mt-1">
                  {stats.monthTransactionCount} transakcí
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hodnota skladu */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Hodnota skladu</p>
                <p className="text-2xl font-bold text-purple-900">{formatPrice(stats.totalInventoryValue)}</p>
                <p className="text-xs text-purple-500 mt-1">
                  {stats.productCount} produktů
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Warehouse className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upozornění */}
        <Card className={`bg-gradient-to-br hover:shadow-lg transition-shadow ${
          alertCount > 0
            ? 'from-orange-50 to-red-100 border-orange-200'
            : 'from-green-50 to-green-100 border-green-200'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${alertCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  Upozornění
                </p>
                <p className={`text-2xl font-bold ${alertCount > 0 ? 'text-orange-900' : 'text-green-900'}`}>
                  {alertCount}
                </p>
                <p className={`text-xs mt-1 ${alertCount > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                  {alertCount > 0 ? (
                    <>
                      {stats.outOfStockCount > 0 && <span>{stats.outOfStockCount} vyprod.</span>}
                      {stats.lowStockCount > 0 && <span className="ml-1">{stats.lowStockCount} nízký</span>}
                      {overdueInvoices.total > 0 && <span className="ml-1">{overdueInvoices.total} po splat.</span>}
                    </>
                  ) : (
                    'Vše v pořádku'
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-full ${alertCount > 0 ? 'bg-orange-200' : 'bg-green-200'}`}>
                {alertCount > 0 ? (
                  <AlertTriangle className="h-6 w-6 text-orange-700" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-700" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Druhá řada - Denní průměr, Nejprodávanější, Bilance faktur, Objednávky */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Průměr za den */}
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-600">Průměr za den</p>
                <p className="text-2xl font-bold text-cyan-900">{formatPrice(stats.avgDailyRevenue)}</p>
                <p className="text-xs text-cyan-500 mt-1">tento měsíc</p>
              </div>
              <div className="p-3 bg-cyan-200 rounded-full">
                <BarChart3 className="h-6 w-6 text-cyan-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nejprodávanější */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-3">
                <p className="text-sm font-medium text-amber-600">Nejprodávanější</p>
                {stats.topProduct ? (
                  <>
                    <p className="text-lg font-bold text-amber-900 truncate">{stats.topProduct.name}</p>
                    <p className="text-xs text-amber-500 mt-1">
                      {stats.topProduct.quantity.toFixed(1)} {stats.topProduct.unit} tento měsíc
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-amber-400 mt-1">Žádné prodeje</p>
                )}
              </div>
              <div className="p-3 bg-amber-200 rounded-full flex-shrink-0">
                <Star className="h-6 w-6 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bilance faktur */}
        <Card className={`bg-gradient-to-br hover:shadow-lg transition-shadow ${
          invoiceBalance >= 0
            ? 'from-green-50 to-green-100 border-green-200'
            : 'from-red-50 to-red-100 border-red-200'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${invoiceBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Bilance faktur
                </p>
                <p className={`text-2xl font-bold ${invoiceBalance >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {invoiceBalance >= 0 ? '+' : ''}{formatPrice(invoiceBalance)}
                </p>
                <p className={`text-xs mt-1 ${invoiceBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {invoiceBalance >= 0 ? 'příjmy > výdaje' : 'výdaje > příjmy'}
                </p>
              </div>
              <div className={`p-3 rounded-full ${invoiceBalance >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
                <Activity className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Objednávky */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">Objednávky</p>
                <p className="text-2xl font-bold text-indigo-900">{orderStats.total}</p>
                <p className="text-xs text-indigo-500 mt-1">
                  {orderStats.newCount > 0 && <span className="text-yellow-600">{orderStats.newCount} nových</span>}
                  {orderStats.newCount > 0 && orderStats.processingCount > 0 && ' • '}
                  {orderStats.processingCount > 0 && <span className="text-blue-600">{orderStats.processingCount} k expedici</span>}
                  {orderStats.newCount === 0 && orderStats.processingCount === 0 && <span>{formatPrice(orderStats.totalValue)}</span>}
                </p>
              </div>
              <div className="p-3 bg-indigo-200 rounded-full">
                <ShoppingCart className="h-6 w-6 text-indigo-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platební mix - vizuální bar */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Platební metody tento měsíc
            </h3>
            <p className="text-sm text-gray-500">
              Celkem: {formatPrice(stats.cashRevenue + stats.cardRevenue)}
            </p>
          </div>

          {/* Progress bar */}
          <div className="relative h-8 rounded-full overflow-hidden bg-gray-100 mb-3">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700 flex items-center justify-center"
              style={{ width: `${paymentBar.card}%` }}
            >
              {paymentBar.card > 15 && (
                <span className="text-white text-xs font-medium">
                  Karta {paymentBar.card.toFixed(0)}%
                </span>
              )}
            </div>
            <div
              className="absolute right-0 top-0 h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 flex items-center justify-center"
              style={{ width: `${paymentBar.cash}%` }}
            >
              {paymentBar.cash > 15 && (
                <span className="text-white text-xs font-medium">
                  Hotovost {paymentBar.cash.toFixed(0)}%
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              <span className="text-gray-600">Karta:</span>
              <span className="font-semibold text-gray-900">{formatPrice(stats.cardRevenue)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-500" />
              <span className="text-gray-600">Hotovost:</span>
              <span className="font-semibold text-gray-900">{formatPrice(stats.cashRevenue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blížící se splatnost + Poslední faktury */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blížící se splatnost */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Blížící se splatnost
              <span className="text-xs font-normal text-gray-400 ml-1">(7 dní)</span>
            </h3>
            {upcomingDue.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-green-600 font-medium text-sm">Žádné faktury se splatností v příštích 7 dnech</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingDue.map((invoice) => {
                  const isReceived = invoice.type === 'received'
                  const daysUntilDue = Math.ceil(
                    (new Date(invoice.dueDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  )

                  return (
                    <div
                      key={invoice.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        isReceived ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-blue-50 hover:bg-blue-100'
                      }`}
                      onClick={() => window.location.href = isReceived
                        ? `/invoices/received?highlight=${invoice.id}`
                        : `/invoices/issued?highlight=${invoice.id}`
                      }
                    >
                      <div className="flex items-center gap-3">
                        {isReceived ? (
                          <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <ArrowUpCircle className="h-5 w-5 text-blue-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-gray-500">
                            {isReceived ? 'Přijatá' : 'Vydaná'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${daysUntilDue <= 2 ? 'text-red-600' : 'text-gray-700'}`}>
                          {daysUntilDue === 0 ? 'Dnes' : daysUntilDue === 1 ? 'Zítra' : `Za ${daysUntilDue} dní`}
                        </p>
                        <p className="text-xs text-gray-500">{formatPrice(invoice.totalAmount || 0)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Poslední faktury */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Poslední faktury
              </h3>
              <a
                href="/invoices/dashboard"
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
              >
                Zobrazit vše <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {recentInvoices.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Žádné faktury</p>
            ) : (
              <div className="space-y-2">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                    onClick={() => window.location.href = invoice.type === 'received'
                      ? `/invoices/received?highlight=${invoice.id}`
                      : `/invoices/issued?highlight=${invoice.id}`
                    }
                  >
                    <div className="flex items-center gap-3">
                      {invoice.type === 'received' ? (
                        <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5 text-blue-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invoice.number}</p>
                        <p className="text-xs text-gray-500">{invoice.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        invoice.type === 'received' ? 'text-emerald-700' : 'text-blue-700'
                      }`}>
                        {invoice.type === 'received' ? '-' : '+'}{formatPrice(invoice.amount)}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(invoice.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Poslední objednávky */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Poslední objednávky zákazníků
            </h3>
            <a
              href="/customer-orders"
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
            >
              Zobrazit vše <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">Žádné objednávky</p>
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

      {/* Rychlá navigace */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Rychlá navigace
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Skladová evidence */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
              <a href="/inventory/dashboard" className="flex items-center gap-2 mb-3 group">
                <div className="p-2 bg-emerald-200 rounded-lg group-hover:bg-emerald-300 transition-colors">
                  <Warehouse className="h-4 w-4 text-emerald-700" />
                </div>
                <span className="text-sm font-semibold text-emerald-800 group-hover:underline">Sklad</span>
              </a>
              <div className="space-y-1 ml-1">
                <a href="/inventory" className="block text-xs text-gray-600 hover:text-emerald-700 hover:underline py-0.5">Skladová evidence</a>
                <a href="/receipts" className="block text-xs text-gray-600 hover:text-emerald-700 hover:underline py-0.5">Příjemky</a>
                <a href="/delivery-notes" className="block text-xs text-gray-600 hover:text-emerald-700 hover:underline py-0.5">Výdejky</a>
                <a href="/inventory/inventura" className="block text-xs text-gray-600 hover:text-emerald-700 hover:underline py-0.5">Inventura</a>
              </div>
            </div>

            {/* Objednávky */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <a href="/orders/dashboard" className="flex items-center gap-2 mb-3 group">
                <div className="p-2 bg-blue-200 rounded-lg group-hover:bg-blue-300 transition-colors">
                  <ShoppingCart className="h-4 w-4 text-blue-700" />
                </div>
                <span className="text-sm font-semibold text-blue-800 group-hover:underline">Objednávky</span>
              </a>
              <div className="space-y-1 ml-1">
                <a href="/purchase-orders" className="block text-xs text-gray-600 hover:text-blue-700 hover:underline py-0.5">Vydané</a>
                <a href="/customer-orders" className="block text-xs text-gray-600 hover:text-blue-700 hover:underline py-0.5">Vystavené</a>
                <a href="/transactions" className="block text-xs text-gray-600 hover:text-blue-700 hover:underline py-0.5">SumUp</a>
                <a href="/eshop-orders" className="block text-xs text-gray-600 hover:text-blue-700 hover:underline py-0.5">Eshop</a>
              </div>
            </div>

            {/* Faktury */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl p-4">
              <a href="/invoices/dashboard" className="flex items-center gap-2 mb-3 group">
                <div className="p-2 bg-rose-200 rounded-lg group-hover:bg-rose-300 transition-colors">
                  <FileText className="h-4 w-4 text-rose-700" />
                </div>
                <span className="text-sm font-semibold text-rose-800 group-hover:underline">Faktury</span>
              </a>
              <div className="space-y-1 ml-1">
                <a href="/invoices/received" className="block text-xs text-gray-600 hover:text-rose-700 hover:underline py-0.5">Přijaté</a>
                <a href="/invoices/issued" className="block text-xs text-gray-600 hover:text-rose-700 hover:underline py-0.5">Vystavené</a>
                <a href="/credit-notes" className="block text-xs text-gray-600 hover:text-rose-700 hover:underline py-0.5">Dobropisy</a>
              </div>
            </div>

            {/* Kontakty */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <a href="/customers/dashboard" className="flex items-center gap-2 mb-3 group">
                <div className="p-2 bg-amber-200 rounded-lg group-hover:bg-amber-300 transition-colors">
                  <Users className="h-4 w-4 text-amber-700" />
                </div>
                <span className="text-sm font-semibold text-amber-800 group-hover:underline">Kontakty</span>
              </a>
              <div className="space-y-1 ml-1">
                <a href="/suppliers" className="block text-xs text-gray-600 hover:text-amber-700 hover:underline py-0.5">Dodavatelé</a>
                <a href="/customers" className="block text-xs text-gray-600 hover:text-amber-700 hover:underline py-0.5">Odběratelé</a>
              </div>
            </div>

            {/* Nastavení */}
            <div className="bg-gradient-to-br from-slate-50 to-gray-100 border border-slate-200 rounded-xl p-4">
              <a href="/settings" className="flex items-center gap-2 mb-3 group">
                <div className="p-2 bg-slate-200 rounded-lg group-hover:bg-slate-300 transition-colors">
                  <Settings className="h-4 w-4 text-slate-700" />
                </div>
                <span className="text-sm font-semibold text-slate-800 group-hover:underline">Nastavení</span>
              </a>
              <div className="space-y-1 ml-1">
                <a href="/settings" className="block text-xs text-gray-600 hover:text-slate-700 hover:underline py-0.5">Obecné</a>
                <a href="/products" className="block text-xs text-gray-600 hover:text-slate-700 hover:underline py-0.5">Katalog zboží</a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
