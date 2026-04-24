'use client'

import { useState, useEffect } from 'react'
import { EntityOrdersButton, type EntityOrder } from '@/components/warehouse/entity/EntityOrdersButton'

interface Props {
  customerId: string
  onAction:   (id: string) => void
}

export function CustomerOrdersFetcher({ customerId, onAction }: Props) {
  const [orders, setOrders] = useState<EntityOrder[]>([])

  useEffect(() => {
    fetch(`/api/customer-orders?customerId=${customerId}`)
      .then(r => r.json())
      .then((data: Array<{ id: string; orderNumber: string; orderDate: string; status: string; totalAmount?: number }>) =>
        setOrders(data.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderDate: o.orderDate, status: o.status, totalAmount: o.totalAmount })))
      )
      .catch(() => {})
  }, [customerId])

  return <EntityOrdersButton entityType="customer" entityId={customerId} orders={orders} onAction={onAction} />
}
