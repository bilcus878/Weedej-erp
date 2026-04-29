'use client'

import { useState } from 'react'
import { updateEshopOrderStatus } from '../services/eshopOrderService'
import type { EshopOrder } from '../types'

export function useEshopOrderActions(onRefresh: () => Promise<void>) {
  const [processingId, setProcessingId] = useState<string | null>(null)

  async function handleUpdateStatus(orderId: string, newStatus: string) {
    setProcessingId(orderId)
    try {
      await updateEshopOrderStatus(orderId, newStatus)
      await onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Nepodařilo se aktualizovat status')
    } finally {
      setProcessingId(null)
    }
  }

  function handlePrintPDF(order: EshopOrder) {
    if (order.issuedInvoice?.id) {
      // Issued invoice exists — serve the authoritative invoice PDF
      window.open(`/api/invoices/${order.issuedInvoice.id}/pdf`, '_blank')
    } else {
      // No invoice yet — serve the customer order PDF
      window.open(`/api/customer-orders/${order.id}/pdf`, '_blank')
    }
  }

  return { processingId, handleUpdateStatus, handlePrintPDF }
}
