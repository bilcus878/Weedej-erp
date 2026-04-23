import type { CustomerOrder } from '../types'
import type { OrderDetailData } from '@/components/erp'

export function mapCustomerOrderToOrderDetail(order: CustomerOrder): OrderDetailData {
  const isPaid = ['paid', 'shipped', 'delivered'].includes(order.status)
  return {
    id:            order.id,
    orderNumber:   order.orderNumber,
    orderDate:     order.orderDate,
    status:        order.status,
    totalAmount:   order.totalAmount,
    totalVatAmount: order.totalVatAmount ?? null,
    paidAt:        order.paidAt ?? null,
    shippedAt:     order.shippedAt ?? null,
    customerName:  order.customer?.name || order.customerName || 'Anonymní odběratel',
    customerEmail: order.customerEmail || (order.customer as any)?.email || null,
    customerPhone: order.customerPhone || (order.customer as any)?.phone || null,
    customerAddress: order.customerAddress || null,
    billingIco:    (order.customer as any)?.ico || null,
    note:          order.note ?? null,
    discountAmount: order.discountAmount ?? null,
    issuedInvoice: order.issuedInvoice ? {
      id:             order.issuedInvoice.id,
      invoiceNumber:  order.issuedInvoice.invoiceNumber,
      paymentType:    order.issuedInvoice.paymentType,
      paymentStatus:  isPaid ? 'paid' : 'unpaid',
      status:         order.status,
      invoiceDate:    order.orderDate,
      dueDate:        order.issuedInvoice.dueDate ?? null,
    } : null,
    deliveryNotes: (order.deliveryNotes || []).map(dn => ({
      id:             dn.id,
      deliveryNumber: dn.deliveryNumber,
      deliveryDate:   dn.deliveryDate,
      status:         dn.status || 'active',
      items: (dn.items || []).map(item => ({
        id:              item.id,
        quantity:        Number(item.quantity),
        unit:            'ks',
        productId:       item.productId ?? null,
        inventoryItemId: item.inventoryItemId ?? null,
        productName:     null,
        price:           item.product ? Number(item.product.price) : null,
        priceWithVat:    null,
        vatRate:         null,
        vatAmount:       null,
        product:         item.product ? { id: '', name: '', price: Number(item.product.price || 0) } : null,
      })),
    })),
    items: order.items.map(item => ({
      id:           item.id || '',
      productId:    item.productId || null,
      productName:  item.productName || null,
      quantity:     Number(item.quantity),
      unit:         item.unit,
      price:        Number(item.price),
      vatRate:      Number(item.vatRate ?? 0),
      vatAmount:    Number(item.vatAmount ?? 0),
      priceWithVat: Number(item.priceWithVat ?? item.price),
      product:      item.product
        ? { id: item.product.id || '', name: item.product.name || '', price: Number(item.price), unit: item.unit }
        : null,
    })),
  }
}
