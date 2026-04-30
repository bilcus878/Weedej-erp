/**
 * Shared query builder and response mapper for return request API routes.
 */

import { prisma } from '@/lib/prisma'
import type { ReturnStatus } from '@/lib/returns/returnWorkflow'

// Full include spec reused across GET endpoints
export const RETURN_FULL_INCLUDE = {
  items:         { include: { product: { select: { name: true } } } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  attachments:   { orderBy: { createdAt: 'asc' as const } },
  customerOrder: { select: { orderNumber: true } },
  customer:      { select: { id: true, name: true } },
  creditNotes:   { select: { id: true, creditNoteNumber: true } },
  exchangeOrder: { select: { id: true, orderNumber: true } },
  handledBy:     { select: { id: true, name: true } },
}

// Minimal include for list view
export const RETURN_LIST_INCLUDE = {
  items:         { select: { id: true, itemStatus: true } },
  customerOrder: { select: { orderNumber: true } },
}

// Compute allowed next statuses for the client
function getAllowedTransitions(status: ReturnStatus): ReturnStatus[] {
  const TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
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
  return TRANSITIONS[status] ?? []
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapReturnFull(r: any) {
  const approvedItems = r.items.filter((i: any) =>
    i.itemStatus === 'approved' || i.itemStatus === 'partial'
  )
  const totalApprovedRefund = approvedItems.reduce((sum: number, i: any) => {
    const qty = Number(i.approvedQuantity ?? i.returnedQuantity)
    return sum + qty * Number(i.unitPriceWithVat)
  }, 0)

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
    resolutionType:         r.resolutionType,
    refundAmount:           r.refundAmount ? Number(r.refundAmount) : null,
    refundMethod:           r.refundMethod,
    refundReference:        r.refundReference,
    refundProcessedAt:      r.refundProcessedAt,
    adminNote:              r.adminNote,
    rejectionReason:        r.rejectionReason,
    handledById:            r.handledById,
    handledByName:          r.handledBy?.name ?? null,
    closedAt:               r.closedAt,
    exchangeOrderId:        r.exchangeOrderId,
    exchangeOrderNumber:    r.exchangeOrder?.orderNumber ?? null,
    creditNoteId:           creditNote?.id ?? null,
    creditNoteNumber:       creditNote?.creditNoteNumber ?? null,
    itemCount:              r.items.length,
    approvedItemCount:      approvedItems.length,
    items:                  r.items.map((i: any) => ({
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
      id:           h.id,
      fromStatus:   h.fromStatus,
      toStatus:     h.toStatus,
      changedBy:    h.changedBy,
      changedByName: h.changedByName,
      note:         h.note,
      createdAt:    h.createdAt,
    })),
    attachments: r.attachments.map((a: any) => ({
      id:            a.id,
      url:           a.url,
      filename:      a.filename,
      mimeType:      a.mimeType,
      sizeBytes:     a.sizeBytes,
      type:          a.type,
      uploadedBy:    a.uploadedBy,
      uploadedByName: a.uploadedByName,
      createdAt:     a.createdAt,
    })),
    totalApprovedRefund: Math.round(totalApprovedRefund * 100) / 100,
    canTransitionTo:     getAllowedTransitions(r.status as ReturnStatus),
  }
}
