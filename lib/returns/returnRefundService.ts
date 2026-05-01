/**
 * Financial processing for return requests.
 *
 * DESIGN PRINCIPLES:
 * - All monetary arithmetic uses calculateLineVat() + calculateVatSummary()
 *   from lib/vatCalculation — the same functions used by every other document.
 *   This guarantees per-line rounding, consistent with Czech VAT law.
 * - NO raw floating-point accumulation. Totals are the sum of already-rounded
 *   per-line values.
 * - The returned totalRefund equals CreditNote.totalAmount exactly. The caller
 *   MUST store this value on ReturnRequest.refundAmount to maintain consistency.
 */

import { Prisma }           from '@prisma/client'
import { getNextDocumentNumber } from '@/lib/documentSeries'
import { calculateLineVat, calculateVatSummary, round2 } from '@/lib/vatCalculation'

// ── Input / output types ──────────────────────────────────────────────────────

export interface RefundLineItem {
  productName:      string | null
  unit:             string
  approvedQty:      number   // must already be a plain JS number (Decimal converted by caller)
  unitPrice:        number   // net price per unit — from stored ReturnRequestItem.unitPrice
  unitPriceWithVat: number   // gross price per unit — from stored ReturnRequestItem.unitPriceWithVat
  vatRate:          number   // from stored ReturnRequestItem.vatRate
}

export interface ProcessRefundInput {
  returnRequestId: string
  customerOrderId: string | null
  refundMethod:    string
  refundReference: string | null
  items:           RefundLineItem[]
}

export interface ProcessRefundResult {
  creditNoteId:      string | null
  creditNoteNumber:  string | null
  /** Gross refund total — identical to |CreditNote.totalAmount|. Store on ReturnRequest.refundAmount. */
  totalRefund:       number
  hasAccountingDoc:  boolean
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function processReturnRefund(
  tx:    Prisma.TransactionClient,
  input: ProcessRefundInput,
): Promise<ProcessRefundResult> {
  const { returnRequestId, customerOrderId, refundMethod, refundReference, items } = input

  const refundLines = items.filter(i => i.approvedQty > 0)
  if (refundLines.length === 0) {
    return { creditNoteId: null, creditNoteNumber: null, totalRefund: 0, hasAccountingDoc: false }
  }

  // ── Financial computation ─────────────────────────────────────────────────
  //
  // Use calculateLineVat() for each line → this rounds at the line level, which
  // is the legally correct approach under Czech VAT accounting rules.
  // Then use calculateVatSummary() for document totals (sum of rounded lines).
  //
  // We derive VAT from the GROSS price (unitPriceWithVat) using back-calculation
  // to stay consistent with how the original CustomerOrder stored its data.

  const vatLineInputs = refundLines.map(item => {
    // Derive net from gross to avoid the gross≠net+vat divergence (W2).
    // round2(gross / (1 + rate/100)) is the canonical back-calculation.
    const derivedNet = round2(item.unitPriceWithVat / (1 + item.vatRate / 100))
    return {
      quantity:            item.approvedQty,
      unitPriceWithoutVat: derivedNet,
      vatRate:             item.vatRate,
    }
  })

  // calculateVatSummary takes the output of calculateLineVat per item.
  const lineResults = vatLineInputs.map(l =>
    calculateLineVat(l.quantity, l.unitPriceWithoutVat, l.vatRate)
  )
  const summary = calculateVatSummary(lineResults)

  // Build credit note items: each line carries its own individually-rounded amounts
  const creditNoteItemsData = refundLines.map((item, idx) => {
    const line = lineResults[idx]
    return {
      productName:  item.productName ?? null,
      quantity:     item.approvedQty,
      unit:         item.unit,
      price:        round2(vatLineInputs[idx].unitPriceWithoutVat),
      vatRate:      item.vatRate,
      vatAmount:    round2(line.vatAmount / item.approvedQty),  // per-unit VAT for the credit note item
      priceWithVat: item.unitPriceWithVat,
    }
  })

  // ── Locate the issued invoice ─────────────────────────────────────────────

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
        customerId:         order.customerId         ?? null,
        customerName:       order.customerName       ?? null,
        customerEntityType: order.customerEntityType ?? null,
        customerEmail:      order.customerEmail      ?? null,
        customerPhone:      order.customerPhone      ?? null,
        customerAddress:    order.customerAddress    ?? null,
      }
    }
  }

  // Without an invoice, record the refund on the ReturnRequest only
  if (!issuedInvoiceId) {
    return {
      creditNoteId:     null,
      creditNoteNumber: null,
      totalRefund:      summary.totalWithVat,
      hasAccountingDoc: false,
    }
  }

  // ── Create CreditNote ─────────────────────────────────────────────────────

  const creditNoteNumber = await getNextDocumentNumber('credit-note', tx)

  const creditNote = await tx.creditNote.create({
    data: {
      creditNoteNumber,
      issuedInvoiceId,
      returnRequestId,
      ...invoiceCustomerData,
      creditNoteDate:        new Date(),
      // Negative values: credit notes reduce the original invoice
      totalAmount:           -summary.totalWithVat,
      totalAmountWithoutVat: -summary.totalWithoutVat,
      totalVatAmount:        -summary.totalVat,
      reason:                'Vrácení z reklamace',
      note:                  refundReference ? `Ref: ${refundReference}` : null,
      items:                 { create: creditNoteItemsData },
    },
  })

  return {
    creditNoteId:     creditNote.id,
    creditNoteNumber: creditNote.creditNoteNumber,
    // totalRefund matches |CreditNote.totalAmount| — no divergence possible
    totalRefund:      summary.totalWithVat,
    hasAccountingDoc: true,
  }
}
