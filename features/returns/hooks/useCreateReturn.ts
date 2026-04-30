'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createReturn } from '../services/returnService'
import type { ReturnType, ReturnReason } from '../types'

// Minimal order shape we need — avoids coupling to the full customer-orders feature
export interface OrderSearchResult {
  id:              string
  orderNumber:     string
  orderDate:       string
  status:          string
  totalAmount:     number
  customerName:    string | null
  customerEmail:   string | null
  customerPhone:   string | null
  customerAddress: string | null
  items: OrderSearchItem[]
}

export interface OrderSearchItem {
  id:           string
  productId:    string | null
  productName:  string | null
  quantity:     number
  unit:         string
  price:        number        // bez DPH
  vatRate:      number
  priceWithVat: number | null
}

export interface ItemSelection {
  checked: boolean
  qty:     number
}

export function useCreateReturn(onClose: () => void) {
  const router = useRouter()

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // ── Step 1: order search ──────────────────────────────────────────────────
  const [orderSearch,   setOrderSearch]   = useState('')
  const [orders,        setOrders]        = useState<OrderSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderSearchResult | null>(null)

  // ── Step 2: item selections ───────────────────────────────────────────────
  const [selections, setSelections] = useState<Map<string, ItemSelection>>(new Map())

  // ── Step 3: return details ────────────────────────────────────────────────
  const [type,         setType]         = useState<ReturnType>('return')
  const [reason,       setReason]       = useState<ReturnReason>('defective')
  const [reasonDetail, setReasonDetail] = useState('')
  const [custName,     setCustName]     = useState('')
  const [custEmail,    setCustEmail]    = useState('')
  const [custPhone,    setCustPhone]    = useState('')

  // ── Submit ────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // ── Load orders on mount + debounced re-fetch on search change ────────────
  const fetchOrders = useCallback(async (q: string) => {
    setSearchLoading(true)
    try {
      const url = q ? `/api/customer-orders?search=${encodeURIComponent(q)}` : '/api/customer-orders'
      const res = await fetch(url)
      if (res.ok) setOrders(await res.json())
    } finally {
      setSearchLoading(false)
    }
  }, [])

  // Initial load (recent orders)
  useEffect(() => { fetchOrders('') }, [fetchOrders])

  // Debounced search
  useEffect(() => {
    if (!orderSearch) { fetchOrders(''); return }
    const t = setTimeout(() => fetchOrders(orderSearch), 300)
    return () => clearTimeout(t)
  }, [orderSearch, fetchOrders])

  // ── Select order → prefill state, go to step 2 ───────────────────────────
  function selectOrder(order: OrderSearchResult) {
    setSelectedOrder(order)
    setCustName(order.customerName  ?? '')
    setCustEmail(order.customerEmail ?? '')
    setCustPhone(order.customerPhone ?? '')
    // Default: all items selected, full quantity
    setSelections(new Map(
      order.items.map(item => [item.id, { checked: true, qty: item.quantity }])
    ))
    setStep(2)
  }

  function toggleItem(id: string) {
    setSelections(prev => {
      const next = new Map(prev)
      const cur  = next.get(id)!
      next.set(id, { ...cur, checked: !cur.checked })
      return next
    })
  }

  function setItemQty(id: string, qty: number) {
    setSelections(prev => {
      const next = new Map(prev)
      const cur  = next.get(id)!
      next.set(id, { ...cur, qty })
      return next
    })
  }

  const selectedCount = selectedOrder
    ? [...selections.values()].filter(s => s.checked && s.qty > 0).length
    : 0

  // ── Submit ────────────────────────────────────────────────────────────────
  async function submit() {
    if (!selectedOrder || selectedCount === 0) return
    setError(null)
    setSubmitting(true)
    try {
      const items = selectedOrder.items
        .filter(i => selections.get(i.id)?.checked && (selections.get(i.id)?.qty ?? 0) > 0)
        .map(i => {
          const sel = selections.get(i.id)!
          const withVat = i.priceWithVat ?? parseFloat((i.price * (1 + i.vatRate / 100)).toFixed(2))
          return {
            productId:        i.productId,
            productName:      i.productName ?? '',
            unit:             i.unit,
            originalQuantity: i.quantity,
            returnedQuantity: sel.qty,
            unitPrice:        i.price,
            unitPriceWithVat: withVat,
            vatRate:          i.vatRate,
          }
        })

      const result = await createReturn({
        customerOrderId: selectedOrder.id,
        type,
        reason,
        reasonDetail: reasonDetail.trim() || undefined,
        customerName:  custName  || undefined,
        customerEmail: custEmail || undefined,
        customerPhone: custPhone || undefined,
        items,
      })

      onClose()
      router.push(`/returns/${result.id}`)
    } catch (e: any) {
      setError(e.message ?? 'Nepodařilo se vytvořit reklamaci')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    step, setStep,
    // step 1
    orderSearch, setOrderSearch,
    orders, searchLoading,
    selectedOrder, selectOrder,
    // step 2
    selections, toggleItem, setItemQty, selectedCount,
    // step 3
    type, setType,
    reason, setReason,
    reasonDetail, setReasonDetail,
    custName, setCustName,
    custEmail, setCustEmail,
    custPhone, setCustPhone,
    // submit
    submitting, error, submit,
  }
}
