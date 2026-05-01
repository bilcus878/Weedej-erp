/**
 * Financial processing for return requests.
 *
 * DESIGN PRINCIPLES:
 * ─ All monetary arithmetic uses calculateLineVat() + calculateVatSummary()
 *   from lib/vatCalculation — the same functions used by every other document.
 *   This guarantees per-line rounding, consistent with Czech VAT law.
 * ─ NO raw floating-point accumulation. Totals are the sum of already-rounded
 *   per-line values.
 * ─ The returned totalRefund equals CreditNote.totalAmount exactly. The caller
 *   MUST store this value on ReturnRequest.refundAmount to maintain consistency.
 * ─ A financial consistency check is run inside the transaction after CreditNote
 *   creation. Any discrepancy rolls back the entire transaction before commit.
 * ─ refundStatus is returned so the caller can set it on ReturnRequest.
 *   CreditNote creation = accounting document. Money movement = separate concern.
 */

import { Prisma }                 from '@prisma/client'
import { getNextDocumentNumber }  from '@/lib/documentSeries'
import { calculateLineVat, calculateVatSummary, round2 } from '@/lib/vatCalculation'
import { assertFinancialConsistency } from './ReturnFinancialConsistency'

// ── Input / output types ──────────────────────────────────────────────────────

export interface RefundLineItem {
  productName:      string | null
  unit:             string
  approvedQty:      number   // plain JS number (Decimal converted by caller)
  unitPrice:        number   // net price per unit — from stored ReturnRequestItem.unitPrice
  unitPriceWithVat: number   // gross price per unit — from stored ReturnRequestItem.unitPriceWithVat
  vatRate:          number   // from stored ReturnRequestItem.vatRate
}

export interface ProcessRefundInput {
  returnRequestId: string
  customerOrderId: string | null
  currency:        string   // must be validated by caller (assertCurrency)
  refundMethod:    string
  refundReference: string | null
  items:           RefundLineItem[]
}

export type RefundStatus = 'none' | 'pending' | 'completed' | 'failed'

export interface ProcessRefundResult {
  creditNoteId:      string | null
  creditNoteNumber:  string | null
  /** Gross refund total — identical to |CreditNote.totalAmount|. Store on ReturnRequest.refundAmount. */
  totalRefund:       number
  hasAccountingDoc:  boolean
  /**
   * Initial refundStatus to set on ReturnRequest.
   * - store_credit  → completed immediately (no async payment needed)
   * - all others    → pending (requires execution via payment provider or bank)
   */
  refundStatus:      RefundStatus
}

// ── Refund status logic ───────────────────────────────────────────────────────

function deriveInitialRefundStatus(refundMethod: string): RefundStatus {
  // Store credit can be applied immediately in the system — no external payment needed.
  // All other methods require external execution (bank transfer, card refund, etc.)
  return refundMethod === 'store_credit' ? 'completed' : 'pending'
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function processReturnRefund(
  tx:    Prisma.TransactionClient,
  input: ProcessRefundInput,
): Promise<ProcessRefundResult> {
  const { returnRequestId, customerOrderId, currency, refundMethod, refundReference, items } = input

  const refundStatus = deriveInitialRefundStatus(refundMethod)

  const refundLines = items.filter(i => i.approvedQty > 0)
  if (refundLines.length === 0) {
    return {
      creditNoteId: null, creditNoteNumber: null,
      totalRefund: 0, hasAccountingDoc: false, refundStatus: 'none',
    }
  }

  // ── Financial computation ─────────────────────────────────────────────────
  //
  // Derive net from gross (back-calculation) so we avoid the gross ≠ net+VAT
  // divergence that occurs when unitPrice and unitPriceWithVat were rounded
  // independently at order creation time.
  //
  // The same derivation is used in approve/route.ts to compute the provisional
  // refundAmount — ensuring both values are identical when the CreditNote is created.

  const vatLineInputs = refundLines.map(item => {
    const derivedNet = round2(item.unitPriceWithVat / (1 + item.vatRate / 100))
    return {
      quantity:            item.approvedQty,
      unitPriceWithoutVat: derivedNet,
      vatRate:             item.vatRate,
    }
  })

  const lineResults = vatLineInputs.map(l =>
    calculateLineVat(l.quantity, l.unitPriceWithoutVat, l.vatRate)
  )
  const summary = calculateVatSummary(lineResults)

  // Build credit note items — each line is individually rounded
  const creditNoteItemsData = refundLines.map((item, idx) => ({
    productName:  item.productName ?? null,
    quantity:     item.approvedQty,
    unit:         item.unit,
    price:        round2(vatLineInputs[idx].unitPriceWithoutVat),  // net unit price
    vatRate:      item.vatRate,
    vatAmount:    round2(lineResults[idx].vatAmount / item.approvedQty),  // per-unit VAT
    priceWithVat: item.unitPriceWithVat,
  }))

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

  // Without an invoice, record refund metadata on ReturnRequest only
  if (!issuedInvoiceId) {
    return {
      creditNoteId:     null,
      creditNoteNumber: null,
      totalRefund:      summary.totalWithVat,
      hasAccountingDoc: false,
      refundStatus,
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

  // ── Financial consistency check ───────────────────────────────────────────
  //
  // Recomputes totals from the just-created CreditNote items and verifies they
  // match the stored header amounts. Any discrepancy > 0.01 CZK throws a 500
  // error that rolls back this entire transaction — no partial state is possible.
  //
  // This runs INSIDE the transaction (before commit) so it acts as a final audit
  // on every refund. In years of production use this should always pass; if it
  // ever fails, it indicates a bug in the calculation code that must be fixed.

  await assertFinancialConsistency(tx, creditNote.id)

  return {
    creditNoteId:     creditNote.id,
    creditNoteNumber: creditNote.creditNoteNumber,
    // totalRefund equals |CreditNote.totalAmount| — verified by assertFinancialConsistency
    totalRefund:      summary.totalWithVat,
    hasAccountingDoc: true,
    refundStatus,
  }
}
