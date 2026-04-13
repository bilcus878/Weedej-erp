// Dashboard faktur
// URL: /invoices/dashboard

'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatPrice, formatDate } from '@/lib/utils'
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  DollarSign,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Banknote,
  Building2
} from 'lucide-react'

interface ReceivedInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  totalAmount: number
  paymentType?: string
  status?: string
  supplierName?: string
  receipts?: { supplier?: { name: string } }[]
  purchaseOrder?: { supplier?: { name: string }, supplierName?: string }
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

export default function InvoicesDashboard() {
  const [receivedInvoices, setReceivedInvoices] = useState<ReceivedInvoice[]>([])
  const [issuedInvoices, setIssuedInvoices] = useState<IssuedInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [receivedRes, issuedRes] = await Promise.all([
        fetch('/api/invoices/received'),
        fetch('/api/issued-invoices')
      ])
      const receivedData = await receivedRes.json()
      const issuedData = await issuedRes.json()
      setReceivedInvoices(Array.isArray(receivedData) ? receivedData : [])
      setIssuedInvoices(Array.isArray(issuedData) ? issuedData : [])
    } catch (error) {
      console.error('Chyba při načítání dat:', error)
      setReceivedInvoices([])
      setIssuedInvoices([])
    } finally {
      setLoading(false)
    }
  }

  // Výpočet statistik pro přijaté faktury
  const receivedStats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const activeInvoices = receivedInvoices.filter(i => i.status !== 'storno')
    const totalCount = receivedInvoices.length
    const stornoCount = receivedInvoices.filter(i => i.status === 'storno').length
    const pendingCount = receivedInvoices.filter(i => i.status === 'pending').length
    const receivedCount = receivedInvoices.filter(i => i.status === 'received').length

    const totalValue = activeInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)

    // Tento měsíc
    const thisMonthInvoices = activeInvoices.filter(i => {
      const date = new Date(i.invoiceDate)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    const thisMonthValue = thisMonthInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)

    // Minulý měsíc
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const lastMonthInvoices = activeInvoices.filter(i => {
      const date = new Date(i.invoiceDate)
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
    })
    const lastMonthValue = lastMonthInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)

    const monthGrowth = lastMonthValue > 0
      ? ((thisMonthValue - lastMonthValue) / lastMonthValue) * 100
      : 0

    // Po splatnosti
    const overdueCount = activeInvoices.filter(i => {
      if (!i.dueDate || i.status === 'received') return false
      return new Date(i.dueDate) < now
    }).length

    // Typ platby
    const cashCount = activeInvoices.filter(i => i.paymentType === 'cash').length
    const cardCount = activeInvoices.filter(i => i.paymentType === 'card').length
    const transferCount = activeInvoices.filter(i => i.paymentType === 'transfer').length

    const avgValue = totalCount > 0 ? totalValue / activeInvoices.length : 0

    return {
      totalCount,
      stornoCount,
      pendingCount,
      receivedCount,
      totalValue,
      thisMonthCount: thisMonthInvoices.length,
      thisMonthValue,
      monthGrowth,
      overdueCount,
      cashCount,
      cardCount,
      transferCount,
      avgValue
    }
  }, [receivedInvoices])

  // Výpočet statistik pro vydané faktury
  const issuedStats = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const activeInvoices = issuedInvoices.filter(i => i.status !== 'storno')
    const totalCount = issuedInvoices.length
    const stornoCount = issuedInvoices.filter(i => i.status === 'storno').length
    const paidCount = issuedInvoices.filter(i => i.status === 'paid').length
    const unpaidCount = issuedInvoices.filter(i => i.status === 'unpaid' || i.status === 'issued').length

    const totalValue = activeInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)

    // Tento měsíc
    const thisMonthInvoices = activeInvoices.filter(i => {
      const date = new Date(i.issueDate)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
    const thisMonthValue = thisMonthInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)

    // Minulý měsíc
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const lastMonthInvoices = activeInvoices.filter(i => {
      const date = new Date(i.issueDate)
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
    })
    const lastMonthValue = lastMonthInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0)

    const monthGrowth = lastMonthValue > 0
      ? ((thisMonthValue - lastMonthValue) / lastMonthValue) * 100
      : 0

    // Po splatnosti
    const overdueCount = activeInvoices.filter(i => {
      if (!i.dueDate || i.status === 'paid') return false
      return new Date(i.dueDate) < now
    }).length

    const avgValue = totalCount > 0 ? totalValue / activeInvoices.length : 0

    return {
      totalCount,
      stornoCount,
      paidCount,
      unpaidCount,
      totalValue,
      thisMonthCount: thisMonthInvoices.length,
      thisMonthValue,
      monthGrowth,
      overdueCount,
      avgValue
    }
  }, [issuedInvoices])

  // Top 5 dodavatelů podle hodnoty přijatých faktur
  const topSuppliers = useMemo(() => {
    const supplierMap = new Map<string, { count: number; value: number }>()

    receivedInvoices
      .filter(i => i.status !== 'storno')
      .forEach(invoice => {
        const supplierName = invoice.supplierName ||
          invoice.purchaseOrder?.supplier?.name ||
          invoice.purchaseOrder?.supplierName ||
          invoice.receipts?.[0]?.supplier?.name ||
          'Anonymní dodavatel'
        const existing = supplierMap.get(supplierName) || { count: 0, value: 0 }
        supplierMap.set(supplierName, {
          count: existing.count + 1,
          value: existing.value + (invoice.totalAmount || 0)
        })
      })

    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']

    return Array.from(supplierMap.entries())
      .map(([name, data], index) => ({
        name,
        count: data.count,
        value: data.value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [receivedInvoices])

  // Top 5 zákazníků podle hodnoty vydaných faktur
  const topCustomers = useMemo(() => {
    const customerMap = new Map<string, { count: number; value: number }>()

    issuedInvoices
      .filter(i => i.status !== 'storno')
      .forEach(invoice => {
        const customerName = invoice.customer?.name || invoice.customerName || 'Anonymní zákazník'
        const existing = customerMap.get(customerName) || { count: 0, value: 0 }
        customerMap.set(customerName, {
          count: existing.count + 1,
          value: existing.value + (invoice.totalAmount || 0)
        })
      })

    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']

    return Array.from(customerMap.entries())
      .map(([name, data], index) => ({
        name,
        count: data.count,
        value: data.value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [issuedInvoices])

  // Poslední přijaté faktury
  const recentReceivedInvoices = useMemo(() => {
    return [...receivedInvoices]
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime())
      .slice(0, 5)
  }, [receivedInvoices])

  // Poslední vydané faktury
  const recentIssuedInvoices = useMemo(() => {
    return [...issuedInvoices]
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 5)
  }, [issuedInvoices])

  // Faktury blížící se splatnosti (příštích 7 dní)
  const upcomingDueInvoices = useMemo(() => {
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

  const getReceivedStatusBadge = (status?: string) => {
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
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Aktivní' }
    }
  }

  const getIssuedStatusBadge = (status?: string) => {
    switch (status) {
      case 'issued':
      case 'unpaid':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Nezaplaceno' }
      case 'paid':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Zaplaceno' }
      case 'storno':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Storno' }
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Aktivní' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Načítání...</p>
      </div>
    )
  }

  // Celkové statistiky (přijaté + vydané)
  const totalInvoicesCount = receivedStats.totalCount + issuedStats.totalCount
  const totalReceivedValue = receivedStats.totalValue
  const totalIssuedValue = issuedStats.totalValue
  const balance = totalIssuedValue - totalReceivedValue

  return (
    <div className="space-y-6">
      {/* Hlavička */}
      <div className="bg-gradient-to-r from-slate-50 to-emerald-50 border-l-4 border-emerald-500 rounded-lg shadow-sm py-4 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-emerald-600">
            Dashboard faktur
          </h1>
        </div>
      </div>

      {/* KPI karty - celkový přehled */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Celkový počet faktur */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Celkem faktur</p>
                <p className="text-2xl font-bold text-slate-900">{totalInvoicesCount}</p>
                <p className="text-xs text-slate-500 mt-1">
                  <span className="text-emerald-600">{receivedStats.totalCount} přijatých</span>
                  {' • '}
                  <span className="text-blue-600">{issuedStats.totalCount} vydaných</span>
                </p>
              </div>
              <div className="p-3 bg-slate-200 rounded-full">
                <FileText className="h-6 w-6 text-slate-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Příjmy (vydané faktury) */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Příjmy (vydané)</p>
                <p className="text-2xl font-bold text-blue-900">{formatPrice(totalIssuedValue)}</p>
                <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                  {issuedStats.monthGrowth > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">+{issuedStats.monthGrowth.toFixed(1)}% tento měsíc</span>
                    </>
                  ) : issuedStats.monthGrowth < 0 ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">{issuedStats.monthGrowth.toFixed(1)}% tento měsíc</span>
                    </>
                  ) : (
                    <span className="text-gray-600">beze změny</span>
                  )}
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <ArrowUpCircle className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Výdaje (přijaté faktury) */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Výdaje (přijaté)</p>
                <p className="text-2xl font-bold text-emerald-900">{formatPrice(totalReceivedValue)}</p>
                <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                  {receivedStats.monthGrowth > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-orange-600" />
                      <span className="text-orange-600">+{receivedStats.monthGrowth.toFixed(1)}% tento měsíc</span>
                    </>
                  ) : receivedStats.monthGrowth < 0 ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">{receivedStats.monthGrowth.toFixed(1)}% tento měsíc</span>
                    </>
                  ) : (
                    <span className="text-gray-600">beze změny</span>
                  )}
                </p>
              </div>
              <div className="p-3 bg-emerald-200 rounded-full">
                <ArrowDownCircle className="h-6 w-6 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bilance */}
        <Card className={`bg-gradient-to-br ${balance >= 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>Bilance</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {balance >= 0 ? '+' : ''}{formatPrice(balance)}
                </p>
                <p className={`text-xs mt-1 ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {balance >= 0 ? 'Příjmy převyšují výdaje' : 'Výdaje převyšují příjmy'}
                </p>
              </div>
              <div className={`p-3 rounded-full ${balance >= 0 ? 'bg-green-200' : 'bg-red-200'}`}>
                <DollarSign className={`h-6 w-6 ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Druhá řada - přijaté faktury detaily */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Čekající přijaté</p>
                <p className="text-2xl font-bold text-yellow-900">{receivedStats.pendingCount}</p>
                <p className="text-xs text-yellow-500 mt-1">
                  {receivedStats.overdueCount > 0 && (
                    <span className="text-red-600">{receivedStats.overdueCount} po splatnosti</span>
                  )}
                </p>
              </div>
              <div className="p-3 bg-yellow-200 rounded-full">
                <Clock className="h-6 w-6 text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Tento měsíc</p>
                <p className="text-2xl font-bold text-purple-900">{receivedStats.thisMonthCount}</p>
                <p className="text-xs text-purple-500 mt-1">{formatPrice(receivedStats.thisMonthValue)}</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Calendar className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-600">Hotovost</p>
                <p className="text-2xl font-bold text-cyan-900">{receivedStats.cashCount}</p>
                <p className="text-xs text-cyan-500 mt-1">
                  <span className="text-gray-600">Karta: {receivedStats.cardCount}</span>
                  {' • '}
                  <span className="text-gray-600">Převod: {receivedStats.transferCount}</span>
                </p>
              </div>
              <div className="p-3 bg-cyan-200 rounded-full">
                <Banknote className="h-6 w-6 text-cyan-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">Nezaplacené vydané</p>
                <p className="text-2xl font-bold text-indigo-900">{issuedStats.unpaidCount}</p>
                <p className="text-xs text-indigo-500 mt-1">
                  {issuedStats.overdueCount > 0 && (
                    <span className="text-red-600">{issuedStats.overdueCount} po splatnosti</span>
                  )}
                </p>
              </div>
              <div className="p-3 bg-indigo-200 rounded-full">
                <CreditCard className="h-6 w-6 text-indigo-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Třetí sekce - Top dodavatelé a zákazníci */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 dodavatelů */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              Top 5 dodavatelů (přijaté faktury)
            </h3>
            {topSuppliers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Žádní dodavatelé</p>
            ) : (
              <div className="space-y-3">
                {topSuppliers.map((supplier, index) => {
                  const percentage = receivedStats.totalValue > 0
                    ? (supplier.value / receivedStats.totalValue) * 100
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
                          {supplier.count} fakt. • {formatPrice(supplier.value)}
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

        {/* Top 5 zákazníků */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Top 5 zákazníků (vydané faktury)
            </h3>
            {topCustomers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Žádní zákazníci</p>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((customer, index) => {
                  const percentage = issuedStats.totalValue > 0
                    ? (customer.value / issuedStats.totalValue) * 100
                    : 0
                  return (
                    <div key={customer.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-700">{customer.name}</span>
                        </div>
                        <span className="text-gray-500">
                          {customer.count} fakt. • {formatPrice(customer.value)}
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
      </div>

      {/* Čtvrtá sekce - Blížící se splatnost */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Blížící se splatnost (7 dní)
          </h3>
          {upcomingDueInvoices.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-gray-500">Žádné faktury se splatností v příštích 7 dnech</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingDueInvoices.map((invoice) => {
                const isReceived = invoice.type === 'received'
                const status = isReceived
                  ? getReceivedStatusBadge((invoice as ReceivedInvoice).status)
                  : getIssuedStatusBadge((invoice as IssuedInvoice).status)
                const StatusIcon = status.icon
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

      {/* Pátá sekce - Poslední faktury */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Poslední přijaté faktury */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
              Poslední přijaté faktury
            </h3>
            {recentReceivedInvoices.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Žádné přijaté faktury</p>
            ) : (
              <div className="space-y-2">
                {recentReceivedInvoices.map((invoice) => {
                  const status = getReceivedStatusBadge(invoice.status)
                  const StatusIcon = status.icon
                  const supplierName = invoice.supplierName ||
                    invoice.purchaseOrder?.supplier?.name ||
                    invoice.purchaseOrder?.supplierName ||
                    invoice.receipts?.[0]?.supplier?.name ||
                    'Anonymní'

                  return (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/invoices/received?highlight=${invoice.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-5 w-5 ${status.color}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-gray-500">{supplierName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatPrice(invoice.totalAmount || 0)}</p>
                        <p className="text-xs text-gray-500">{formatDate(invoice.invoiceDate)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Poslední vydané faktury */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-blue-600" />
              Poslední vydané faktury
            </h3>
            {recentIssuedInvoices.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Žádné vydané faktury</p>
            ) : (
              <div className="space-y-2">
                {recentIssuedInvoices.map((invoice) => {
                  const status = getIssuedStatusBadge(invoice.status)
                  const StatusIcon = status.icon
                  const customerName = invoice.customer?.name || invoice.customerName || 'Anonymní'

                  return (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/invoices/issued?highlight=${invoice.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-5 w-5 ${status.color}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-gray-500">{customerName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatPrice(invoice.totalAmount || 0)}</p>
                        <p className="text-xs text-gray-500">{formatDate(invoice.issueDate)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
