'use client'

import { DollarSign, TrendingUp, Warehouse, AlertTriangle, CheckCircle, BarChart3, Star, Activity, ShoppingCart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { formatPrice } from '@/lib/utils'
import type { DashboardStats, OverdueSummary, OrderStats } from '../types'

interface Props {
  stats:           DashboardStats
  overdueInvoices: OverdueSummary
  invoiceBalance:  number
  orderStats:      OrderStats
  paymentBar:      { cash: number; card: number }
}

export function KpiCards({ stats, overdueInvoices, invoiceBalance, orderStats }: Props) {
  const alertCount = stats.lowStockCount + stats.outOfStockCount + overdueInvoices.total

  return (
    <>
      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-emerald-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600">Tržby dnes</p>
                <p className="text-2xl font-bold text-emerald-900">{formatPrice(stats.todayRevenue)}</p>
                <p className="text-xs text-emerald-500 mt-1">{stats.todayTransactionCount} transakcí</p>
              </div>
              <div className="p-3 bg-emerald-200 rounded-full"><DollarSign className="h-6 w-6 text-emerald-700" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Tržby tento měsíc</p>
                <p className="text-2xl font-bold text-blue-900">{formatPrice(stats.monthRevenue)}</p>
                <p className="text-xs text-blue-500 mt-1">{stats.monthTransactionCount} transakcí</p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full"><TrendingUp className="h-6 w-6 text-blue-700" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Hodnota skladu</p>
                <p className="text-2xl font-bold text-purple-900">{formatPrice(stats.totalInventoryValue)}</p>
                <p className="text-xs text-purple-500 mt-1">{stats.productCount} produktů</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full"><Warehouse className="h-6 w-6 text-purple-700" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br hover:shadow-lg transition-shadow ${alertCount > 0 ? 'from-orange-50 to-red-100 border-orange-200' : 'from-green-50 to-green-100 border-green-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${alertCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>Upozornění</p>
                <p className={`text-2xl font-bold ${alertCount > 0 ? 'text-orange-900' : 'text-green-900'}`}>{alertCount}</p>
                <p className={`text-xs mt-1 ${alertCount > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                  {alertCount > 0 ? (
                    <>
                      {stats.outOfStockCount > 0 && <span>{stats.outOfStockCount} vyprod.</span>}
                      {stats.lowStockCount > 0 && <span className="ml-1">{stats.lowStockCount} nízký</span>}
                      {overdueInvoices.total > 0 && <span className="ml-1">{overdueInvoices.total} po splat.</span>}
                    </>
                  ) : 'Vše v pořádku'}
                </p>
              </div>
              <div className={`p-3 rounded-full ${alertCount > 0 ? 'bg-orange-200' : 'bg-green-200'}`}>
                {alertCount > 0 ? <AlertTriangle className="h-6 w-6 text-orange-700" /> : <CheckCircle className="h-6 w-6 text-green-700" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-600">Průměr za den</p>
                <p className="text-2xl font-bold text-cyan-900">{formatPrice(stats.avgDailyRevenue)}</p>
                <p className="text-xs text-cyan-500 mt-1">tento měsíc</p>
              </div>
              <div className="p-3 bg-cyan-200 rounded-full"><BarChart3 className="h-6 w-6 text-cyan-700" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-3">
                <p className="text-sm font-medium text-amber-600">Nejprodávanější</p>
                {stats.topProduct ? (
                  <>
                    <p className="text-lg font-bold text-amber-900 truncate">{stats.topProduct.name}</p>
                    <p className="text-xs text-amber-500 mt-1">{stats.topProduct.quantity.toFixed(1)} {stats.topProduct.unit} tento měsíc</p>
                  </>
                ) : (
                  <p className="text-sm text-amber-400 mt-1">Žádné prodeje</p>
                )}
              </div>
              <div className="p-3 bg-amber-200 rounded-full flex-shrink-0"><Star className="h-6 w-6 text-amber-700" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br hover:shadow-lg transition-shadow ${invoiceBalance >= 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${invoiceBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>Bilance faktur</p>
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
              <div className="p-3 bg-indigo-200 rounded-full"><ShoppingCart className="h-6 w-6 text-indigo-700" /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
