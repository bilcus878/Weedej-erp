'use client'

export function usePurchaseOrderActions() {
  function handleDownloadPDF(orderId: string) {
    window.open(`/api/purchase-orders/${orderId}/pdf`, '_blank')
  }

  return { handleDownloadPDF }
}
