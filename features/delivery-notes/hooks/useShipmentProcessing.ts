'use client'

import { useState, useEffect, useRef } from 'react'
import { resolveItemQuantities } from '@/lib/variantConversion'
import { fetchPendingShipments, createDeliveryNoteFromOrder, processDeliveryNote } from '../services/deliveryNoteService'
import type { CustomerOrder, DeliveryNoteItem } from '../types'

type ShowToast = (type: 'success' | 'error', message: string) => void

export function useShipmentProcessing(
  showToast: ShowToast,
  onRefresh: () => Promise<void>,
) {
  const [pendingOrders,      setPendingOrders]      = useState<CustomerOrder[]>([])
  const [showProcessModal,   setShowProcessModal]   = useState(false)
  const [processingNoteId,   setProcessingNoteId]   = useState<string | null>(null)
  const [processingNoteItems, setProcessingNoteItems] = useState<DeliveryNoteItem[]>([])
  const [shippedQuantities,  setShippedQuantities]  = useState<Record<string, number>>({})
  const [processNote,        setProcessNote]        = useState('')
  const [isProcessing,       setIsProcessing]       = useState(false)

  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  async function loadPendingShipments() {
    const data = await fetchPendingShipments()
    setPendingOrders(data)
  }

  useEffect(() => {
    loadPendingShipments()
    const interval = setInterval(() => {
      fetchPendingShipments().then(data => setPendingOrders(data))
    }, 30000)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') { onRefreshRef.current(); loadPendingShipments() }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', handleVisibility) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handlePrepareShipment(orderId: string) {
    const order = pendingOrders.find(o => o.id === orderId)
    if (!order) return
    setProcessingNoteId(orderId)
    const items: DeliveryNoteItem[] = order.items
      .filter(item => item.productId !== null)
      .map(item => {
        const resolved = resolveItemQuantities({
          quantity:        Number(item.quantity),
          unit:            item.unit,
          shippedQuantity: Number(item.shippedQuantity ?? 0),
          shippedBaseQty:  Number(item.shippedBaseQty  ?? 0),
          variantValue:    item.variantValue != null ? Number(item.variantValue) : null,
          variantUnit:     item.variantUnit  ?? null,
        })
        return {
          id: item.id, productId: item.productId || undefined,
          productName: item.productName || undefined,
          quantity: resolved.remainingBaseQty, unit: resolved.baseUnit,
          variantValue: item.variantValue != null ? Number(item.variantValue) : null,
          variantUnit:  item.variantUnit ?? null,
          isVariant: resolved.isVariant,
          orderedBaseQty:   resolved.orderedBaseQty,
          shippedBaseQty:   resolved.shippedBaseQty,
          remainingBaseQty: resolved.remainingBaseQty,
          price:        item.price,
          priceWithVat: item.priceWithVat,
          vatAmount:    item.vatAmount,
          vatRate:      item.vatRate,
          product: item.product
            ? { ...item.product, price: Number((item.product as any).price || item.price || 0) }
            : undefined,
        }
      })
      .filter(item => item.quantity > 0)
    setProcessingNoteItems(items)
    const init: Record<string, number> = {}
    items.forEach(item => { init[item.id!] = item.quantity })
    setShippedQuantities(init)
    setShowProcessModal(true)
  }

  async function handleConfirmProcess() {
    if (!processingNoteId || isProcessing) return
    setIsProcessing(true)
    const isCustomerOrder = pendingOrders.some(o => o.id === processingNoteId)
    const savedOrder = isCustomerOrder ? pendingOrders.find(o => o.id === processingNoteId) ?? null : null
    if (savedOrder) setPendingOrders(prev => prev.filter(o => o.id !== processingNoteId))
    try {
      if (isCustomerOrder) {
        const items = processingNoteItems.map(item => ({
          orderItemId: item.id!,
          productId:   item.productId || null,
          productName: item.productName || null,
          quantity:    shippedQuantities[item.id!] || 0,
          unit:        item.unit,
        }))
        await createDeliveryNoteFromOrder(processingNoteId, items, processNote)
      } else {
        const items = processingNoteItems.map(item => ({ id: item.id!, shippedQuantity: shippedQuantities[item.id!] || 0 }))
        await processDeliveryNote(processingNoteId, items, processNote)
      }
      closeProcessModal()
      await Promise.all([onRefreshRef.current(), loadPendingShipments()])
      showToast('success', '✅ Výdejka byla vyskladněna!')
    } catch (error: any) {
      if (savedOrder) setPendingOrders(prev => [...prev, savedOrder])
      showToast('error', error.message || 'Nepodařilo se zpracovat výdejku')
    } finally {
      setIsProcessing(false)
    }
  }

  function closeProcessModal() {
    setShowProcessModal(false)
    setProcessingNoteId(null)
    setProcessingNoteItems([])
    setShippedQuantities({})
    setProcessNote('')
  }

  return {
    pendingOrders,
    showProcessModal, processingNoteId, processingNoteItems,
    shippedQuantities, setShippedQuantities,
    processNote, setProcessNote,
    isProcessing,
    handlePrepareShipment, handleConfirmProcess, closeProcessModal,
  }
}
