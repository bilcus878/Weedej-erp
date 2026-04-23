import type { PurchaseOrder } from '../types'
import type { SupplierOrderDetailData } from '@/components/erp'

export function mapPurchaseOrderToSupplierDetail(order: PurchaseOrder): SupplierOrderDetailData {
  const sup = order.supplier as any
  const n   = Number

  return {
    id:           order.id,
    orderNumber:  order.orderNumber,
    orderDate:    order.orderDate,
    status:       order.status,
    totalAmount:  order.totalAmount || 0,
    expectedDate: order.expectedDate,
    supplierName:          order.supplierName          || sup?.name,
    supplierEmail:         order.supplierEmail         || sup?.email,
    supplierPhone:         order.supplierPhone         || sup?.phone,
    supplierAddress:       order.supplierAddress       || sup?.address,
    supplierContactPerson: order.supplierContactPerson || sup?.contact,
    supplierEntityType:    order.supplierEntityType    || sup?.entityType,
    supplierICO:           order.supplierICO           || sup?.ico,
    supplierDIC:           order.supplierDIC           || sup?.dic,
    supplierBankAccount:   order.supplierBankAccount   || sup?.bankAccount,
    supplierWebsite:       order.supplierWebsite       || sup?.website,
    paymentType:    order.invoice?.paymentType   || null,
    dueDate:        order.invoice?.dueDate        || null,
    variableSymbol: order.invoice?.variableSymbol || null,
    stornoAt:     order.stornoAt,
    stornoBy:     order.stornoBy,
    stornoReason: order.stornoReason,
    discountAmount: (order as any).discountAmount || null,
    note: order.note,
    items: order.items.map((item, i) => {
      const price        = n(item.expectedPrice || 0)
      const vatRate      = n(item.vatRate || 21)
      const vatAmount    = price * vatRate / 100
      const priceWithVat = price + vatAmount
      return {
        id:          item.id || String(i),
        productId:   item.isManual ? null : (item.productId || null),
        productName: item.productName || item.product?.name || null,
        quantity:    n(item.quantity),
        alreadyReceivedQuantity: n(item.alreadyReceivedQuantity || 0),
        unit: item.unit,
        price, vatRate, vatAmount, priceWithVat,
        product: item.product
          ? { id: item.product.id, name: item.product.name, price: item.product.purchasePrice || 0, unit: item.product.unit }
          : null,
      }
    }),
    receivedInvoice: order.invoice
      ? { id: order.invoice.id, invoiceNumber: order.invoice.invoiceNumber, status: 'active', invoiceDate: '' }
      : null,
    receipts: order.receipts?.map(r => ({
      id: r.id, receiptNumber: r.receiptNumber, receiptDate: r.receiptDate, status: r.status,
      items: r.items?.map(ri => ({
        id: ri.id, quantity: n(ri.quantity),
        receivedQuantity: ri.receivedQuantity != null ? n(ri.receivedQuantity) : undefined,
        unit: ri.unit, productName: ri.productName || ri.product?.name || null,
        purchasePrice: n(ri.purchasePrice), product: null,
        productId: ri.productId ?? null, inventoryItemId: ri.inventoryItemId ?? null,
      })) || [],
    })) || [],
  }
}
