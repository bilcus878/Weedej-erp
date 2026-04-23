import type { IssuedInvoice } from '../types'
import type { OrderDetailData } from '@/components/erp'
import { DEFAULT_VAT_RATE } from '@/lib/vatCalculation'

export function mapInvoiceToOrderDetail(invoice: IssuedInvoice): OrderDetailData {
  const isPaid   = ['paid', 'shipped', 'delivered'].includes(invoice.status)
  const custName = invoice.customerName || invoice.customer?.name || 'Anonymní zákazník'
  const paidAt   = invoice._original?.customerOrder?.paidAt || (isPaid ? invoice.transactionDate : null)

  return {
    id:               invoice.customerOrderId || invoice.id,
    orderNumber:      invoice.customerOrderNumber || invoice.transactionCode,
    orderDate:        invoice.transactionDate,
    status:           invoice.status,
    totalAmount:      invoice.totalAmount,
    paidAt:           paidAt || null,
    shippedAt:        invoice.shippedAt || null,
    customerName:     custName,
    customerEmail:    invoice.customerEmail  || invoice.customer?.email  || null,
    customerPhone:    invoice.customerPhone  || invoice.customer?.phone  || null,
    customerAddress:  invoice.customerAddress || null,
    paymentReference: invoice.paymentReference || invoice.variableSymbol || null,
    trackingNumber:   invoice.trackingNumber  || null,
    carrier:          invoice.carrier         || null,
    note:             invoice.note            || null,
    shippingMethod:   invoice.shippingMethod  || null,
    pickupPointId:    invoice.pickupPointId   || null,
    pickupPointName:  invoice.pickupPointName || null,
    pickupPointAddress: invoice.pickupPointAddress || null,
    pickupPointCarrier: invoice.pickupPointCarrier || null,
    billingName:      invoice.billingName     || null,
    billingCompany:   invoice.billingCompany  || null,
    billingIco:       invoice.billingIco || invoice.customerIco || invoice.customer?.ico || null,
    billingStreet:    invoice.billingStreet   || null,
    billingCity:      invoice.billingCity     || null,
    billingZip:       invoice.billingZip      || null,
    billingCountry:   invoice.billingCountry  || null,
    items: invoice.items.map(item => ({
      id:           item.id,
      productId:    item.productId || item.product?.id || null,
      productName:  item.productName || item.product?.name || null,
      quantity:     Number(item.quantity),
      unit:         item.unit,
      price:        Number(item.price ?? 0),
      vatRate:      Number(item.vatRate ?? DEFAULT_VAT_RATE),
      vatAmount:    Number(item.vatAmount ?? 0),
      priceWithVat: Number(item.priceWithVat ?? item.price ?? 0),
      product: item.product
        ? { id: item.product.id, name: item.product.name, price: Number((item.product as any).price ?? 0), unit: item.unit }
        : null,
    })),
    issuedInvoice: {
      id:             invoice.id,
      invoiceNumber:  invoice.transactionCode,
      paymentType:    invoice.paymentType,
      paymentStatus:  isPaid ? 'paid' : 'unpaid',
      status:         invoice.status,
      invoiceDate:    invoice.transactionDate,
      dueDate:        invoice.dueDate        ?? null,
      variableSymbol: invoice.variableSymbol ?? null,
      constantSymbol: invoice.constantSymbol ?? null,
      specificSymbol: invoice.specificSymbol ?? null,
    },
    deliveryNotes: (invoice.deliveryNotes || []).map(dn => ({
      id:             dn.id,
      deliveryNumber: dn.deliveryNumber,
      deliveryDate:   dn.deliveryDate,
      status:         dn.status || 'active',
      items: (dn.items || []).map(item => ({
        id:              item.id,
        quantity:        Number(item.quantity),
        unit:            item.unit,
        productId:       item.productId       ?? null,
        inventoryItemId: item.inventoryItemId ?? null,
        productName:     item.productName     || null,
        price:           item.price     != null ? Number(item.price)        : null,
        priceWithVat:    item.priceWithVat != null ? Number(item.priceWithVat) : null,
        vatRate:         item.vatRate   != null ? Number(item.vatRate)       : null,
        vatAmount:       item.vatAmount != null ? Number(item.vatAmount)     : null,
        product: item.product ? { id: '', name: '', price: Number(item.product.price || 0) } : null,
      })),
    })),
  }
}
