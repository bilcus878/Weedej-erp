import type { Transaction } from '../types'
import type { OrderDetailData } from '@/components/erp'

export function mapTransactionToOrderDetail(tx: Transaction): OrderDetailData {
  return {
    id:           tx.id,
    orderNumber:  tx.transactionCode,
    orderDate:    tx.transactionDate,
    status:       tx.status === 'completed' ? 'paid' : tx.status === 'storno' ? 'cancelled' : 'new',
    totalAmount:  tx.totalAmount,
    paidAt:       tx.transactionDate,
    customerName: tx.deliveryNote?.customerOrder?.customer?.name || tx.customer?.name || tx.customerName || 'Anonymní zákazník',
    paymentReference: tx.sumupTransactionCode || null,
    items: tx.items
      .filter(i => i.productId !== null)
      .map(i => ({
        id:           i.id,
        productId:    i.productId || null,
        productName:  i.productName || i.product?.name || null,
        quantity:     Number(i.quantity),
        unit:         i.unit,
        price:        Number(i.price || 0),
        vatRate:      Number(i.vatRate || 0),
        vatAmount:    Number(i.vatAmount || 0),
        priceWithVat: Number(i.priceWithVat || 0),
        product: i.product
          ? { id: i.product.id, name: i.product.name, price: Number(i.price || 0), unit: i.unit }
          : null,
      })),
    issuedInvoice: tx.issuedInvoice ? {
      id:            tx.issuedInvoice.id,
      invoiceNumber: tx.issuedInvoice.invoiceNumber,
      paymentStatus: 'paid',
      status:        'completed',
      invoiceDate:   tx.transactionDate,
    } : null,
    deliveryNotes: tx.deliveryNote ? [{
      id:             tx.deliveryNote.id,
      deliveryNumber: tx.deliveryNote.deliveryNumber,
      deliveryDate:   tx.deliveryNote.deliveryDate,
      status:         'active',
      items: (tx.deliveryNote.items || []).map(i => ({
        id:              i.id,
        quantity:        Number(i.quantity),
        unit:            (i as any).unit || 'ks',
        productId:       (i as any).productId       ?? null,
        inventoryItemId: (i as any).inventoryItemId ?? null,
        productName:     (i as any).productName     ?? null,
      })),
    }] : [],
  }
}
