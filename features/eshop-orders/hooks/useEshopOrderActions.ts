'use client'

import { useState } from 'react'
import { generateEshopOrderPDF } from '@/lib/generateEshopOrderPDF'
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

  async function handlePrintPDF(order: EshopOrder) {
    try {
      const settings = await fetch('/api/settings').then(r => r.json())
      await generateEshopOrderPDF(order, settings)
    } catch {
      alert('Nepodařilo se vygenerovat PDF')
    }
  }

  return { processingId, handleUpdateStatus, handlePrintPDF }
}
