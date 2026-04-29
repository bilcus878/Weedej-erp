'use client'

import { markOrderPaid, cancelCustomerOrder, updateCustomerOrderStatus } from '../services/customerOrderService'
import type { CustomerOrder } from '../types'

export function useCustomerOrderActions(onRefresh: () => Promise<void>) {
  async function handleMarkPaid(orderId: string) {
    if (!confirm('Označit objednávku jako zaplacenou?')) return
    try {
      await markOrderPaid(orderId)
      await onRefresh()
      alert('Objednávka označena jako zaplacená')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Nepodařilo se označit jako zaplacenou')
    }
  }

  async function handleCancelOrder(orderId: string) {
    if (!confirm('Zrušit objednávku? Tím se uvolní všechny rezervace.')) return
    try {
      await cancelCustomerOrder(orderId)
      await onRefresh()
      alert('Objednávka zrušena')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Nepodařilo se zrušit objednávku')
    }
  }

  async function handleUpdateStatus(orderId: string, status: string) {
    if (status === 'cancelled') return handleCancelOrder(orderId)
    const labels: Record<string, string> = { delivered: 'Doručená' }
    if (!confirm(`Změnit status objednávky na: ${labels[status] ?? status}?`)) return
    try {
      await updateCustomerOrderStatus(orderId, status)
      await onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Nepodařilo se změnit status')
    }
  }

  function handlePrintPDF(order: CustomerOrder) {
    if (order.issuedInvoice?.id) {
      // Prefer the issued invoice PDF (legally authoritative)
      window.open(`/api/invoices/${order.issuedInvoice.id}/pdf`, '_blank')
    } else {
      // No invoice yet — serve the order PDF
      window.open(`/api/customer-orders/${order.id}/pdf`, '_blank')
    }
  }

  return { handleMarkPaid, handleCancelOrder, handleUpdateStatus, handlePrintPDF }
}
