'use client'

import { useState, useEffect, useRef } from 'react'
import { fetchPendingOrders, receiveFromOrder } from '../services/receiptService'
import type { PurchaseOrder, Supplier, ReceiptItem, InvoiceData } from '../types'
import { emptyBatchFormData, type BatchFormData } from '@/features/batches/types'

type ShowToast = (type: 'success' | 'error', message: string) => void

export function useReceiptProcessing(
  showToast: ShowToast,
  onRefresh: () => Promise<void>,
) {
  const [suppliers,          setSuppliers]          = useState<Supplier[]>([])
  const [pendingOrders,      setPendingOrders]       = useState<PurchaseOrder[]>([])
  const [pendingOrdersError, setPendingOrdersError]  = useState<string | null>(null)

  const [showProcessModal,         setShowProcessModal]         = useState(false)
  const [processingOrderId,        setProcessingOrderId]        = useState<string | null>(null)
  const [processingReceiptItems,   setProcessingReceiptItems]   = useState<ReceiptItem[]>([])
  const [receivedQuantities,       setReceivedQuantities]       = useState<Record<string, number>>({})
  const [batchData,                setBatchData]                = useState<Record<string, BatchFormData>>({})
  const [invoiceData,              setInvoiceData]              = useState<InvoiceData>({
    invoiceNumber: '', invoiceDate: new Date().toISOString().split('T')[0], dueDate: '', note: '',
  })
  const [processReceiptDate,       setProcessReceiptDate]       = useState(new Date().toISOString().split('T')[0])
  const [hasExistingInvoice,       setHasExistingInvoice]       = useState(false)
  const [isInvoiceSectionExpanded, setIsInvoiceSectionExpanded] = useState(false)
  const [isProcessing,             setIsProcessing]             = useState(false)

  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  async function loadPendingOrders() {
    const result = await fetchPendingOrders()
    setPendingOrders(result.orders)
    setSuppliers(result.suppliers)
    setPendingOrdersError(result.error)
  }

  useEffect(() => {
    loadPendingOrders()
    const interval = setInterval(() => {
      fetchPendingOrders().then(result => {
        if (!result.error) { setPendingOrders(result.orders); setPendingOrdersError(null) }
        else setPendingOrdersError(result.error)
      })
    }, 30000)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') { onRefreshRef.current(); loadPendingOrders() }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', handleVisibility) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCreateFromOrder(orderId: string) {
    const order: any = pendingOrders.find(o => o.id === orderId)
    if (!order) return
    setProcessingOrderId(orderId)
    const itemsWithRemaining = order.items
      .filter((item: any) => item.remainingQuantity > 0)
      .map((item: any) => ({
        id: item.id, productId: item.productId, productName: item.productName,
        product: item.product, quantity: item.quantity,
        receivedQuantity: item.remainingQuantity, unit: item.unit,
        purchasePrice: item.expectedPrice || 0, isManual: false,
        remainingQuantity: item.remainingQuantity,
        alreadyReceived: Number(item.alreadyReceivedQuantity),
      }))
    setProcessingReceiptItems(itemsWithRemaining)
    const initialQuantities: Record<string, number> = {}
    itemsWithRemaining.forEach((item: any) => { initialQuantities[item.id] = item.remainingQuantity })
    setReceivedQuantities(initialQuantities)
    const invoice   = order.invoice
    const hasInvoice = !!(invoice && invoice.isTemporary === false)
    setHasExistingInvoice(hasInvoice)
    if (hasInvoice) {
      setInvoiceData({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate:   invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate:       invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        note:          invoice.note || '',
      })
    } else {
      setInvoiceData({ invoiceNumber: '', invoiceDate: new Date().toISOString().split('T')[0], dueDate: '', note: '' })
    }
    setShowProcessModal(true)
  }

  async function handleConfirmProcess() {
    if (!processingOrderId || isProcessing) return
    setIsProcessing(true)
    try {
      const items = processingReceiptItems.map((item: any) => {
        const bd = batchData[item.id!]
        return {
          productId:        item.productId!,
          receivedQuantity: receivedQuantities[item.id!] || 0,
          batchData: (bd?.batchNumber?.trim())
            ? { batchNumber: bd.batchNumber.trim(), productionDate: bd.productionDate || null, expiryDate: bd.expiryDate || null, supplierLotRef: bd.supplierLotRef || null }
            : null,
        }
      })
      await receiveFromOrder(processingOrderId, items, invoiceData, processReceiptDate)
      closeProcessModal()
      await Promise.all([onRefreshRef.current(), loadPendingOrders()])
      showToast('success', '✅ Příjem zpracován a naskladněn!')
    } catch (error: any) {
      showToast('error', error.message || 'Nepodařilo se zpracovat příjem')
    } finally {
      setIsProcessing(false)
    }
  }

  function closeProcessModal() {
    setShowProcessModal(false)
    setProcessingOrderId(null)
    setProcessingReceiptItems([])
    setReceivedQuantities({})
    setBatchData({})
    setProcessReceiptDate(new Date().toISOString().split('T')[0])
  }

  return {
    suppliers, pendingOrders, pendingOrdersError,
    showProcessModal, processingOrderId, processingReceiptItems,
    receivedQuantities, setReceivedQuantities,
    batchData, setBatchData,
    invoiceData, setInvoiceData,
    processReceiptDate, setProcessReceiptDate,
    hasExistingInvoice, isInvoiceSectionExpanded, setIsInvoiceSectionExpanded,
    isProcessing,
    handleCreateFromOrder, handleConfirmProcess, closeProcessModal,
    loadPendingOrders,
  }
}
