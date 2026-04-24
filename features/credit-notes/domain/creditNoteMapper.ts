import type { OrderDetailData } from '@/components/erp'
import type { CreditNote } from '../types'

export function mapCreditNoteToOrderDetail(cn: CreditNote): OrderDetailData {
  return {
    id:               cn.id,
    orderNumber:      cn.creditNoteNumber,
    orderDate:        cn.creditNoteDate,
    status:           cn.status === 'storno' ? 'cancelled' : 'paid',
    totalAmount:      cn.totalAmount,
    customerName:     cn.customer?.name || cn.customerName || null,
    customerEmail:    cn.customerEmail,
    customerPhone:    cn.customerPhone,
    customerAddress:  cn.customerAddress,
    billingIco:       cn.customerIco || null,
    billingName:      cn.customer?.name || cn.customerName || null,
    note:             [cn.reason, cn.note].filter(Boolean).join(' · ') || null,
    stornoAt:         cn.stornoAt,
    stornoReason:     cn.stornoReason,
    items: cn.items.map(i => ({
      id:           i.id,
      productId:    null,
      productName:  i.productName,
      quantity:     i.quantity,
      unit:         i.unit,
      price:        i.price,
      vatRate:      i.vatRate,
      vatAmount:    i.vatAmount,
      priceWithVat: i.priceWithVat,
    })),
    issuedInvoice: {
      id:            cn.issuedInvoiceId,
      invoiceNumber: cn.invoiceNumber,
      paymentStatus: 'paid',
      status:        'active',
      invoiceDate:   cn.creditNoteDate,
    },
  }
}
