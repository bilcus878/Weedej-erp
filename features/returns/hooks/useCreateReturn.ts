'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createReturn } from '../services/returnService'
import type { ReturnType, ReturnReason } from '../types'

// Minimal order shape we need — fields are already numeric (serialized by /api/returns/search-orders)
export interface OrderSearchResult {
  id:              string
  orderNumber:     string
  orderDate:       string
  status:          string
  source:          string
  totalAmount:     number
  customerName:    string | null
  customerEmail:   string | null
  customerPhone:   string | null
  customerAddress: string | null
  items:           OrderSearchItem[]
}

export interface OrderSearchItem {
  id:           string
  productId:    string | null
  productName:  string | null
  quantity:     number  // already a JS number from search-orders endpoint
  unit:         string
  price:        number  // net price, already a JS number
  vatRate:      number  // already a JS number
  priceWithVat: number | null  // null when priceWithVat was 0 in DB (needs client-side calc)
}

export interface ItemSelection {
  checked: boolean
  qty:     number
}

export function useCreateReturn(onClose: () => void) {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 — order search
  const [orderSearch,   setOrderSearch]   = useState('')
  const [orders,        setOrders]        = useState<OrderSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderSearchResult | null>(null)

  // Step 2 — item selections
  const [selections, setSelections] = useState<Map<string, ItemSelection>>(new Map())

  // Step 3 — return details
  const [type,         setType]         = useState<ReturnType>('return')
  const [reason,       setReason]       = useState<ReturnReason>('defective')
  const [reasonDetail, setReasonDetail] = useState('')
  const [custName,     setCustName]     = useState('')
  const [custEmail,    setCustEmail]    = useState('')
  const [custPhone,    setCustPhone]    = useState('')

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // Fetch from the dedicated search endpoint that:
  //   - includes both internal + eshop orders
  //   - serializes Decimal fields as JS numbers
  //   - searches by order number AND customer name/email
  const fetchOrders = useCallback(async (q: string) => {
    setSearchLoading(true)
    try {
      const url = `/api/returns/search-orders?q=${encodeURIComponent(q)}`
      const res = await fetch(url)
      if (res.ok) setOrders(await res.json())
    } finally {
      setSearchLoading(false)
    }
  }, [])

  // Initial load on mount — fetch recent orders
  useEffect(() => { fetchOrders('') }, [fetchOrders])

  // Debounced search on query change
  useEffect(() => {
    const t = setTimeout(() => fetchOrders(orderSearch), 300)
    return () => clearTimeout(t)
  }, [orderSearch, fetchOrders])

  function selectOrder(order: OrderSearchResult) {
    setSelectedOrder(order)
    setCustName(order.customerName  ?? '')
    setCustEmail(order.customerEmail ?? '')
    setCustPhone(order.customerPhone ?? '')
    // Pre-select all items at full quantity
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

  async function submit() {
    if (!selectedOrder || selectedCount === 0) return
    setError(null)
    setSubmitting(true)
    try {
      const items = selectedOrder.items
        .filter(item => {
          const sel = selections.get(item.id)
          return sel?.checked && (sel.qty ?? 0) > 0
        })
        .map(item => {
          const sel = selections.get(item.id)!

          // Compute gross price per unit.
          // The search-orders endpoint returns priceWithVat=null when the DB value was 0
          // (meaning it was never set). In that case fall back to price × (1 + vatRate/100).
          const unitPriceWithVat = item.priceWithVat != null && item.priceWithVat > 0
            ? item.priceWithVat
            : parseFloat((item.price * (1 + item.vatRate / 100)).toFixed(2))

          // Clamp returned quantity to the ordered quantity
          const returnedQty = Math.min(sel.qty, item.quantity)

          return {
            productId:        item.productId ?? null,
            // Never send empty string — the API requires min(1)
            productName:      item.productName?.trim() || 'Neznámý produkt',
            unit:             item.unit,
            originalQuantity: item.quantity,        // already a JS number
            returnedQuantity: returnedQty,           // clamped
            unitPrice:        item.price,            // already a JS number
            unitPriceWithVat,                        // computed JS number
            vatRate:          item.vatRate,          // already a JS number
          }
        })

      const result = await createReturn({
        customerOrderId: selectedOrder.id,
        type,
        reason,
        reasonDetail: reasonDetail.trim() || undefined,
        customerName:  custName.trim()  || undefined,
        customerEmail: custEmail.trim() || undefined,
        customerPhone: custPhone.trim() || undefined,
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
    orderSearch, setOrderSearch,
    orders, searchLoading,
    selectedOrder, selectOrder,
    selections, toggleItem, setItemQty, selectedCount,
    type, setType,
    reason, setReason,
    reasonDetail, setReasonDetail,
    custName, setCustName,
    custEmail, setCustEmail,
    custPhone, setCustPhone,
    submitting, error, submit,
  }
}
