/**
 * Financial processing for return requests.
 *
 * When a refund is approved, this service creates a CreditNote linked to the
 * original IssuedInvoice. The CreditNote carries the correct VAT breakdown
 * and is linked back to the ReturnRequest via returnRequestId.
 *
 * If the original order has no issued invoice (e.g., cash sale without invoice),
 * the refund is recorded on the ReturnRequest directly without a formal
 * accounting document. The caller receives a flag indicating which path was taken.
 */

import { Prisma } from '@prisma/client'
import { getNextDocumentNumber } from '@/lib/documentSeries'

interface RefundItemInput {
  productName:     string | null
  unit:            string
  approvedQty:     number
  unitPrice:       number       // net price per unit
  unitPriceWithVat: number      // gross price per unit
  vatRate:         number
}

interface ProcessRefundInput {
  returnRequestId: string
  customerOrderId: string | null
  refundMethod:    string
  refundReference: string | null
  items:           RefundItemInput[]
}

interface ProcessRefundResult {
  creditNoteId:    string | null
  creditNoteNumber: string | null
  totalRefund:     number
  hasAccountingDoc: boolean
}

export async function processReturnRefund(
  tx:    Prisma.TransactionClient,
  input: ProcessRefundInput
): Promise<ProcessRefundResult> {
  const { returnRequestId, customerOrderId, refundMethod, refundReference, items } = input

  // Only create credit note for items with approved quantity
  const refundItems = items.filter(i => i.approvedQty > 0)
  if (refundItems.length === 0) {
    return { creditNoteId: null, creditNoteNumber: null, totalRefund: 0, hasAccountingDoc: false }
  }

  // Calculate totals
  let totalWithoutVat = 0
  let totalVat        = 0
  let totalWithVat    = 0

  const creditNoteItemsData = refundItems.map(item => {
    const lineNet  = item.unitPrice * item.approvedQty
    const lineVat  = (item.unitPrice * item.vatRate / 100) * item.approvedQty
    const lineGross = item.unitPriceWithVat * item.approvedQty

    totalWithoutVat += lineNet
    totalVat        += lineVat
    totalWithVat    += lineGross

    return {
      productName:  item.productName ?? null,
      quantity:     item.approvedQty,
      unit:         item.unit,
      price:        Math.round(item.unitPrice * 100) / 100,
      vatRate:      item.vatRate,
      vatAmount:    Math.round((item.unitPrice * item.vatRate / 100) * 100) / 100,
      priceWithVat: Math.round(item.unitPriceWithVat * 100) / 100,
    }
  })

  totalWithoutVat = Math.round(totalWithoutVat * 100) / 100
  totalVat        = Math.round(totalVat * 100) / 100
  totalWithVat    = Math.round(totalWithVat * 100) / 100

  // Find the issued invoice from the original order
  let issuedInvoiceId: string | null = null
  let invoiceCustomerData: Record<string, string | null> = {}

  if (customerOrderId) {
    const order = await tx.customerOrder.findUnique({
      where:   { id: customerOrderId },
      include: { issuedInvoice: true },
    })
    if (order?.issuedInvoice) {
      issuedInvoiceId = order.issuedInvoice.id
      invoiceCustomerData = {
        customerId:          order.customerId ?? null,
        customerName:        order.customerName ?? null,
        customerEntityType:  order.customerEntityType ?? null,
        customerEmail:       order.customerEmail ?? null,
        customerPhone:       order.customerPhone ?? null,
        customerAddress:     order.customerAddress ?? null,
      }
    }
  }

  // Without an invoice, record refund metadata only — no formal accounting doc
  if (!issuedInvoiceId) {
    return {
      creditNoteId:     null,
      creditNoteNumber: null,
      totalRefund:      totalWithVat,
      hasAccountingDoc: false,
    }
  }

  const creditNoteNumber = await getNextDocumentNumber('credit-note', tx)

  const creditNote = await tx.creditNote.create({
    data: {
      creditNoteNumber,
      issuedInvoiceId,
      returnRequestId,
      ...invoiceCustomerData,
      creditNoteDate:        new Date(),
      totalAmount:           -totalWithVat,
      totalAmountWithoutVat: -totalWithoutVat,
      totalVatAmount:        -totalVat,
      reason:                `Vrácení z reklamace`,
      note:                  refundReference ? `Ref: ${refundReference}` : null,
      items:                 { create: creditNoteItemsData },
    },
  })

  return {
    creditNoteId:     creditNote.id,
    creditNoteNumber: creditNote.creditNoteNumber,
    totalRefund:      totalWithVat,
    hasAccountingDoc: true,
  }
}
