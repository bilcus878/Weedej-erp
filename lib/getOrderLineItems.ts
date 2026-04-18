import { prisma } from '@/lib/prisma'

export interface OrderLineItem {
  id: string
  productId: string | null
  productName: string | null
  quantity: number
  unit: string
  price: number
  vatRate: number
  vatAmount: number
  priceWithVat: number
  shippedQuantity: number
  product: {
    id: string
    name: string
    price: number
    unit: string
    vatRate: number
  } | null
}

/**
 * Authoritative source for order line items — all three modules (order detail,
 * invoice, delivery note) must read prices from here, never from the product catalog.
 */
export async function getOrderLineItems(customerOrderId: string): Promise<OrderLineItem[]> {
  const order = await prisma.customerOrder.findUnique({
    where: { id: customerOrderId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, price: true, unit: true, vatRate: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!order) return []

  return order.items.map(item => ({
    id:              item.id,
    productId:       item.productId,
    productName:     item.productName,
    quantity:        Number(item.quantity),
    unit:            item.unit,
    price:           Number(item.price),
    vatRate:         Number(item.vatRate),
    vatAmount:       Number(item.vatAmount),
    priceWithVat:    Number(item.priceWithVat),
    shippedQuantity: Number(item.shippedQuantity ?? 0),
    product: item.product
      ? {
          id:      item.product.id,
          name:    item.product.name,
          price:   Number(item.product.price),
          unit:    item.product.unit,
          vatRate: Number(item.product.vatRate),
        }
      : null,
  }))
}
