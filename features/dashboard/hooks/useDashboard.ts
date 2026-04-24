'use client'

import { useEffect, useState, useMemo } from 'react'
import type { DashboardStats, ReceivedInvoice, IssuedInvoice, CustomerOrder } from '../types'
import { fetchDashboardData } from '../services/dashboardService'
import {
  computeInvoiceBalance, computeOverdueInvoices, computeUpcomingDue,
  computeOrderStats, computeRecentOrders, computeRecentInvoices, computePaymentBar,
} from '../domain/dashboardSelectors'

export function useDashboard() {
  const [stats,            setStats]            = useState<DashboardStats | null>(null)
  const [receivedInvoices, setReceivedInvoices] = useState<ReceivedInvoice[]>([])
  const [issuedInvoices,   setIssuedInvoices]   = useState<IssuedInvoice[]>([])
  const [customerOrders,   setCustomerOrders]   = useState<CustomerOrder[]>([])
  const [loading,          setLoading]          = useState(true)

  useEffect(() => {
    fetchDashboardData()
      .then(data => {
        setStats(data.stats)
        setReceivedInvoices(data.receivedInvoices)
        setIssuedInvoices(data.issuedInvoices)
        setCustomerOrders(data.customerOrders)
      })
      .catch(err => console.error('Chyba při načítání dat:', err))
      .finally(() => setLoading(false))
  }, [])

  const invoiceBalance  = useMemo(() => computeInvoiceBalance(receivedInvoices, issuedInvoices),  [receivedInvoices, issuedInvoices])
  const overdueInvoices = useMemo(() => computeOverdueInvoices(receivedInvoices, issuedInvoices), [receivedInvoices, issuedInvoices])
  const upcomingDue     = useMemo(() => computeUpcomingDue(receivedInvoices, issuedInvoices),     [receivedInvoices, issuedInvoices])
  const orderStats      = useMemo(() => computeOrderStats(customerOrders),                        [customerOrders])
  const recentOrders    = useMemo(() => computeRecentOrders(customerOrders),                      [customerOrders])
  const recentInvoices  = useMemo(() => computeRecentInvoices(receivedInvoices, issuedInvoices),  [receivedInvoices, issuedInvoices])
  const paymentBar      = useMemo(() => stats ? computePaymentBar(stats.cashRevenue, stats.cardRevenue) : { cash: 50, card: 50 }, [stats])

  return {
    stats, loading,
    invoiceBalance, overdueInvoices, upcomingDue,
    orderStats, recentOrders, recentInvoices, paymentBar,
  }
}
