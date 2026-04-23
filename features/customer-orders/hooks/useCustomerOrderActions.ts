'use client'

import { generateInvoicePDF } from '@/lib/generateInvoicePDF'
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

  async function handlePrintPDF(order: CustomerOrder) {
    try {
      const settings = await fetch('/api/settings').then(r => r.json())
      const fakeTransaction = {
        id:                    order.id,
        transactionCode:       order.issuedInvoice?.invoiceNumber || order.orderNumber,
        totalAmount:           Number(order.totalAmount),
        totalAmountWithoutVat: Number(order.totalAmountWithoutVat ?? 0),
        totalVatAmount:        Number(order.totalVatAmount ?? 0),
        paymentType:           order.issuedInvoice?.paymentType || 'transfer',
        status:                order.status,
        transactionDate:       order.orderDate,
        customer:              order.customer || null,
        customerName:          order.customerName || null,
        customerAddress:       order.customerAddress,
        customerPhone:         order.customerPhone,
        customerEmail:         order.customerEmail,
        items: order.items.map(item => ({
          id:           item.id || '',
          quantity:     Number(item.quantity),
          unit:         item.unit,
          price:        Number(item.price),
          vatRate:      Number(item.vatRate ?? 0),
          vatAmount:    Number(item.vatAmount ?? 0),
          priceWithVat: Number(item.priceWithVat ?? item.price),
          product:      item.product || { id: '', name: item.productName || '' },
        })),
      }
      await generateInvoicePDF(fakeTransaction as any, settings)
    } catch {
      alert('Nepodařilo se vygenerovat PDF')
    }
  }

  return { handleMarkPaid, handleCancelOrder, handleUpdateStatus, handlePrintPDF }
}
