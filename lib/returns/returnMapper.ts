/**
 * Maps raw Prisma ReturnRequest rows to the API response shape.
 * Kept in lib/ so it can be used by both API routes and ReturnCommandService
 * without creating a dependency on Next.js internals.
 */

import type { ReturnStatus } from './returnWorkflow'
import { round2, calculateLineVat, calculateVatSummary } from '@/lib/vatCalculation'

// Allowed transitions — mirrors returnWorkflow.ALLOWED_TRANSITIONS but expressed
// as an array for the client (which needs "what can I do next?").
export function getAllowedTransitions(status: ReturnStatus): ReturnStatus[] {
  const MAP: Record<ReturnStatus, ReturnStatus[]> = {
    submitted:          ['under_review', 'cancelled'],
    under_review:       ['waiting_for_goods', 'inspecting', 'cancelled'],
    waiting_for_goods:  ['goods_received', 'cancelled'],
    goods_received:     ['inspecting'],
    inspecting:         ['approved', 'partially_approved', 'rejected'],
    approved:           ['resolved'],
    partially_approved: ['resolved'],
    rejected:           ['closed'],
    resolved:           ['closed'],
    closed:             [],
    cancelled:          [],
  }
  return MAP[status] ?? []
}

// eslint-disable-next-line -- mapping raw Prisma result; explicit type would duplicate schema
export function mapReturnFull(r: any) {
  const approvedItems = r.items.filter((i: any) =>
    i.itemStatus === 'approved' || i.itemStatus === 'partial'
  )

  // Compute expected refund using the same gross→net back-calculation as
  // returnRefundService so the displayed figure matches what will be on the credit note.
  const vatLines = approvedItems.map((i: any) => {
    const qty     = Number(i.approvedQuantity ?? i.returnedQuantity)
    const gross   = Number(i.unitPriceWithVat)
    const vatRate = Number(i.vatRate)
    const net     = round2(gross / (1 + vatRate / 100))
    return calculateLineVat(qty, net, vatRate)
  })
  const summary             = calculateVatSummary(vatLines)
  const totalApprovedRefund = Math.round(summary.totalWithVat * 100) / 100

  const creditNote = r.creditNotes?.[0] ?? null

  return {
    id:           r.id,
    returnNumber: r.returnNumber,
    type:         r.type,
    reason:       r.reason,
    reasonDetail: r.reasonDetail,
    status:       r.status,
    requestDate:  r.requestDate,
    returnDeadline:  r.returnDeadline,
    warrantyExpiry:  r.warrantyExpiry,
    customerName:    r.customerName,
    customerEmail:   r.customerEmail,
    customerPhone:   r.customerPhone,
    customerAddress: r.customerAddress,
    customerId:      r.customerId,
    eshopUserId:     r.eshopUserId,
    customerOrderId:     r.customerOrderId,
    customerOrderNumber: r.customerOrder?.orderNumber ?? null,
    returnShippingPaidBy:   r.returnShippingPaidBy,
    returnTrackingNumber:   r.returnTrackingNumber,
    returnCarrier:          r.returnCarrier,
    returnShippingCost:     r.returnShippingCost ? Number(r.returnShippingCost) : null,
    currency:               r.currency,
    resolutionType:         r.resolutionType,
    refundAmount:           r.refundAmount ? Number(r.refundAmount) : null,
    refundMethod:           r.refundMethod,
    refundReference:        r.refundReference,
    refundProcessedAt:      r.refundProcessedAt,
    refundStatus:           r.refundStatus,
    externalTransactionId:  r.externalTransactionId ?? null,
    adminNote:              r.adminNote,
    rejectionReason:        r.rejectionReason,
    handledById:            r.handledById,
    handledByName:          r.handledBy?.name ?? null,
    closedAt:               r.closedAt,
    exchangeOrderId:        r.exchangeOrderId,
    exchangeOrderNumber:    r.exchangeOrder?.orderNumber ?? null,
    creditNoteId:           creditNote?.id           ?? null,
    creditNoteNumber:       creditNote?.creditNoteNumber ?? null,
    itemCount:           r.items.length,
    approvedItemCount:   approvedItems.length,
    items: r.items.map((i: any) => ({
      id:                     i.id,
      productId:              i.productId,
      productName:            i.productName,
      unit:                   i.unit,
      originalQuantity:       Number(i.originalQuantity),
      returnedQuantity:       Number(i.returnedQuantity),
      approvedQuantity:       i.approvedQuantity ? Number(i.approvedQuantity) : null,
      unitPrice:              Number(i.unitPrice),
      unitPriceWithVat:       Number(i.unitPriceWithVat),
      vatRate:                Number(i.vatRate),
      condition:              i.condition,
      conditionNote:          i.conditionNote,
      itemStatus:             i.itemStatus,
      itemRejectionReason:    i.itemRejectionReason,
      restockInventoryItemId: i.restockInventoryItemId,
    })),
    statusHistory: r.statusHistory.map((h: any) => ({
      id:            h.id,
      fromStatus:    h.fromStatus,
      toStatus:      h.toStatus,
      changedBy:     h.changedBy,
      changedByName: h.changedByName,
      note:          h.note,
      createdAt:     h.createdAt,
    })),
    attachments: r.attachments.map((a: any) => ({
      id:             a.id,
      url:            a.url,
      filename:       a.filename,
      mimeType:       a.mimeType,
      sizeBytes:      a.sizeBytes,
      type:           a.type,
      uploadedBy:     a.uploadedBy,
      uploadedByName: a.uploadedByName,
      createdAt:      a.createdAt,
    })),
    totalApprovedRefund,
    canTransitionTo: getAllowedTransitions(r.status as ReturnStatus),
  }
}
