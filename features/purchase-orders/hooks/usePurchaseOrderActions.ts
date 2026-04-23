'use client'

import { generatePurchaseOrderPDF, openPDFInNewTab } from '@/lib/pdfGenerator'
import type { PurchaseOrder } from '../types'

export function usePurchaseOrderActions(rows: PurchaseOrder[]) {
  async function handleDownloadPDF(orderId: string) {
    const order = rows.find(o => o.id === orderId)
    if (!order) return
    try {
      const pdfData = {
        orderNumber:     order.orderNumber,
        orderDate:       order.orderDate,
        expectedDate:    order.expectedDate,
        supplierName:    order.supplier?.name || order.supplierName || 'Neznámý dodavatel',
        supplierAddress: order.supplier?.address,
        supplierICO:     order.supplier?.ico,
        supplierDIC:     order.supplier?.dic,
        items: order.items.map(item => ({
          productName: item.product?.name || item.productName || 'Neznámý produkt',
          quantity:    Number(item.quantity),
          unit:        item.unit,
          price:       Number(item.expectedPrice || 0),
        })),
        totalAmount: order.items.reduce(
          (sum, item) => sum + Number(item.quantity) * Number(item.expectedPrice || 0), 0
        ),
        note:         order.note,
        status:       order.status,
        stornoReason: order.stornoReason,
        stornoAt:     order.stornoAt,
      }
      const settingsRes = await fetch('/api/settings')
      const settings    = await settingsRes.json()
      const pdfBlob     = await generatePurchaseOrderPDF(pdfData, settings)
      openPDFInNewTab(pdfBlob)
    } catch (error: any) {
      alert(`Chyba při generování PDF: ${error.message}`)
    }
  }

  return { handleDownloadPDF }
}
