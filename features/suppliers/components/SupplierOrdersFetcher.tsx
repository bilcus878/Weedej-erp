'use client'

import { useState, useEffect } from 'react'
import { EntityOrdersButton, type EntityOrder } from '@/components/warehouse/entity/EntityOrdersButton'

interface Props {
  supplierId: string
  onAction:   (id: string) => void
}

export function SupplierOrdersFetcher({ supplierId, onAction }: Props) {
  const [orders, setOrders] = useState<EntityOrder[]>([])

  useEffect(() => {
    fetch(`/api/purchase-orders?supplierId=${supplierId}`)
      .then(r => r.json())
      .then((data: Array<{ id: string; orderNumber: string; orderDate: string; status: string; totalAmount?: number }>) =>
        setOrders(data.map(o => ({ id: o.id, orderNumber: o.orderNumber, orderDate: o.orderDate, status: o.status, totalAmount: o.totalAmount })))
      )
      .catch(() => {})
  }, [supplierId])

  return <EntityOrdersButton entityType="supplier" entityId={supplierId} orders={orders} onAction={onAction} />
}
