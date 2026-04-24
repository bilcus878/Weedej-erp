import { isNonVatPayer, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import type { SupplierOrderDetailData, SupplierOrderDetailItem } from '@/components/erp'
import type { Receipt } from '../types'

export function mapReceiptToSupplierDetail(receipt: Receipt, isVatPayer: boolean): SupplierOrderDetailData {
  const supplier = (receipt.purchaseOrder as any)?.supplier || receipt.supplier

  const items: SupplierOrderDetailItem[] = receipt.items.map((item, idx) => {
    const unitPrice    = Number(item.purchasePrice) || 0
    const itemVatRate  = Number(item.vatRate ?? item.product?.vatRate ?? DEFAULT_VAT_RATE)
    const isItemNonVat = isNonVatPayer(itemVatRate)
    const vatPerUnit   = item.vatAmount != null ? Number(item.vatAmount) : (isItemNonVat ? 0 : unitPrice * itemVatRate / 100)
    const priceWithVat = item.priceWithVat != null ? Number(item.priceWithVat) : (unitPrice + vatPerUnit)
    return {
      id:                      item.id || String(idx),
      productId:               item.productId ?? null,
      productName:             item.productName ?? null,
      quantity:                Number(item.quantity),
      alreadyReceivedQuantity: Number(item.receivedQuantity ?? item.quantity),
      unit:                    item.unit,
      price:                   unitPrice,
      vatRate:                 itemVatRate,
      vatAmount:               vatPerUnit,
      priceWithVat,
      product: item.product
        ? { id: item.product.id, name: item.product.name, price: Number(item.product.purchasePrice || 0), unit: item.product.unit }
        : null,
    }
  })

  const isStorno    = receipt.status === 'storno' || receipt.status === 'cancelled'
  const totalAmount = items.reduce((sum, item) => {
    const qty = Number(item.alreadyReceivedQuantity ?? item.quantity)
    return sum + qty * (isVatPayer ? item.priceWithVat : item.price)
  }, 0)

  return {
    id:              receipt.id,
    orderNumber:     receipt.receiptNumber,
    orderDate:       receipt.receiptDate,
    status:          isStorno ? 'storno' : 'received',
    totalAmount,
    supplierName:    supplier?.name || receipt.supplierName || null,
    supplierEmail:   (supplier as any)?.email   || null,
    supplierPhone:   (supplier as any)?.phone   || null,
    supplierAddress: (supplier as any)?.address || null,
    supplierICO:     (supplier as any)?.ico     || null,
    supplierDIC:     (supplier as any)?.dic     || null,
    stornoAt:        receipt.stornoAt    || null,
    stornoBy:        null,
    stornoReason:    receipt.stornoReason || null,
    note:            receipt.note        || null,
    items,
    receivedInvoice: receipt.receivedInvoice
      ? {
          id:            receipt.receivedInvoice.id,
          invoiceNumber: receipt.receivedInvoice.invoiceNumber,
          paymentStatus: 'unknown',
          status:        'active',
          invoiceDate:   receipt.receiptDate,
        }
      : null,
    receipts: [{
      id:            receipt.id,
      receiptNumber: receipt.receiptNumber,
      receiptDate:   receipt.receiptDate,
      status:        isStorno ? 'storno' : 'active',
      items: receipt.items.map(item => ({
        id:              item.id || '',
        quantity:        Number(item.quantity),
        receivedQuantity: Number(item.receivedQuantity ?? item.quantity),
        unit:            item.unit,
        productName:     item.productName || item.product?.name || null,
        purchasePrice:   Number(item.purchasePrice),
        productId:       item.productId || null,
        inventoryItemId: item.inventoryItemId || null,
        product:         item.product ? { name: item.product.name } : null,
      })),
    }],
  }
}
