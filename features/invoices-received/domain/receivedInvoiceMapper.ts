import type { ReceivedInvoice } from '../types'
import type { SupplierOrderDetailData } from '@/components/erp'

export function mapInvoiceToSupplierDetail(inv: ReceivedInvoice): SupplierOrderDetailData {
  const po = inv.purchaseOrder as any
  const n  = Number

  return {
    id:           inv.id,
    orderNumber:  inv.invoiceNumber,
    orderDate:    inv.invoiceDate,
    status:       inv.status || 'pending',
    totalAmount:  inv.totalAmount,
    expectedDate: inv.purchaseOrder?.expectedDate,
    supplierName:          inv.supplierName          || po?.supplierName          || po?.supplier?.name  || inv.receipts?.[0]?.supplier?.name,
    supplierEmail:         inv.supplierEmail         || po?.supplierEmail         || po?.supplier?.email,
    supplierPhone:         inv.supplierPhone         || po?.supplierPhone         || po?.supplier?.phone,
    supplierAddress:       inv.supplierAddress       || po?.supplierAddress       || po?.supplier?.address,
    supplierContactPerson: inv.supplierContactPerson || po?.supplierContactPerson || po?.supplier?.contact,
    supplierEntityType:    inv.supplierEntityType    || po?.supplierEntityType    || po?.supplier?.entityType,
    supplierICO:           inv.supplierIco           || po?.supplierICO           || po?.supplier?.ico,
    supplierDIC:           inv.supplierDic           || po?.supplierDIC           || po?.supplier?.dic,
    supplierBankAccount:   inv.supplierBankAccount   || po?.supplierBankAccount   || po?.supplier?.bankAccount,
    supplierWebsite:       inv.supplierWebsite       || po?.supplierWebsite       || po?.supplier?.website,
    paymentType:    inv.paymentType    || null,
    dueDate:        inv.dueDate        || null,
    variableSymbol: inv.variableSymbol || null,
    stornoAt:       inv.stornoAt,
    stornoBy:       inv.stornoBy,
    stornoReason:   inv.stornoReason,
    discountAmount: inv.discountAmount || null,
    note:           inv.note           || null,
    items: (inv.purchaseOrder?.items ?? []).map((item: any, i: number) => {
      const price        = n(item.expectedPrice || 0)
      const vatRate      = n(item.vatRate || 21)
      const vatAmount    = price * vatRate / 100
      const priceWithVat = price + vatAmount
      return {
        id:          item.id || String(i),
        productId:   item.productId || null,
        productName: item.productName || item.product?.name || null,
        quantity:    n(item.quantity),
        alreadyReceivedQuantity: n(item.alreadyReceivedQuantity || 0),
        unit:        item.unit,
        price, vatRate, vatAmount, priceWithVat,
        product: item.product
          ? { id: item.product.id, name: item.product.name, price: 0, unit: item.unit }
          : null,
      }
    }),
    receipts: inv.receipts?.map(r => ({
      id: r.id, receiptNumber: r.receiptNumber, receiptDate: r.receiptDate, status: r.status,
      items: r.items?.map(ri => ({
        id: ri.id, quantity: n(ri.quantity),
        receivedQuantity: ri.receivedQuantity != null ? n(ri.receivedQuantity) : undefined,
        unit: ri.unit, productName: ri.productName || ri.product?.name || null,
        purchasePrice: n(ri.purchasePrice), product: null,
        productId: ri.productId ?? null,
        inventoryItemId: ri.inventoryItemId ?? null,
      })) || [],
    })) || [],
  }
}
