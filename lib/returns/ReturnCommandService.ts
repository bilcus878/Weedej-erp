/**
 * ReturnCommandService — single authoritative entry point for all return business logic.
 *
 * ARCHITECTURE:
 * ─ Every write operation on a ReturnRequest goes through this service.
 * ─ API routes are thin adapters: auth → parse → call service → HTTP response.
 * ─ All validation (business rules, state machine, quantities) happens here.
 * ─ All audit log writes happen INSIDE transactions so they can never be lost.
 * ─ Domain events are emitted AFTER commit (fire-and-forget, cannot roll back).
 * ─ The service is stateless and has no framework dependencies — fully testable.
 *
 * ACTOR: every command accepts actorId + actorName from the authenticated session.
 */

import { prisma }             from '@/lib/prisma'
import { createAuditLog }     from '@/lib/auditService'
import { getNextDocumentNumber } from '@/lib/documentSeries'
import { calculateLineVat, calculateVatSummary, round2, calculateVatFromNet } from '@/lib/vatCalculation'
import { STANDARD_RETURN_DAYS } from './returnWorkflow'
import type { ReturnStatus }  from './returnWorkflow'
import {
  assertRequiredStatus,
  assertStatusTransition,
  assertItemOwnership,
  assertApprovedQuantities,
  assertNoExistingRefund,
  assertCurrency,
  rewrapPrismaError,
  ReturnValidationError,
} from './ReturnValidationService'
import { processReturnRefund }  from './returnRefundService'
import { restockReturnItems }   from './returnStockService'
import { mapReturnFull }        from './returnMapper'
import { ReturnEventBus }       from './ReturnEventBus'

// ── Full include spec ─────────────────────────────────────────────────────────
// Centralised here so the service controls the shape it returns.

export const RETURN_FULL_INCLUDE = {
  items:         { include: { product: { select: { name: true } } } },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  attachments:   { orderBy: { createdAt: 'asc' as const } },
  customerOrder: { select: { orderNumber: true } },
  customer:      { select: { id: true, name: true } },
  creditNotes:   { select: { id: true, creditNoteNumber: true } },
  exchangeOrder: { select: { id: true, orderNumber: true } },
  handledBy:     { select: { id: true, name: true } },
} as const

export const RETURN_LIST_INCLUDE = {
  items:         { select: { id: true, itemStatus: true } },
  customerOrder: { select: { orderNumber: true } },
} as const

// ── Input shapes ──────────────────────────────────────────────────────────────

export interface CreateReturnItemInput {
  sourceOrderItemId?: string | null
  productName:      string
  unit:             string
  originalQuantity: number
  returnedQuantity: number
  unitPrice?:       number
  unitPriceWithVat?: number
  vatRate?:         number
}

export interface CreateReturnInput {
  customerOrderId?: string | null
  type:             string
  reason:           string
  reasonDetail?:    string
  customerName?:    string
  customerEmail?:   string
  customerPhone?:   string
  customerAddress?: string
  customerId?:      string
  eshopUserId?:     string
  items:            CreateReturnItemInput[]
}

export interface ApproveReturnItemInput {
  id:                  string
  itemStatus:          'approved' | 'rejected' | 'partial'
  approvedQuantity?:   number | null
  condition?:          string | null
  conditionNote?:      string | null
  itemRejectionReason?: string | null
}

export interface ApproveReturnInput {
  items:          ApproveReturnItemInput[]
  resolutionType: string
  adminNote?:     string
}

export interface RejectReturnInput {
  rejectionReason: string
  adminNote?:      string
}

export interface ReceiveGoodsItemInput {
  id:            string
  condition:     string
  conditionNote?: string
}

export interface ReceiveGoodsInput {
  items:      ReceiveGoodsItemInput[]
  restock:    boolean
  adminNote?: string
}

export interface ProcessRefundInput {
  refundMethod:    string
  refundReference?: string
  adminNote?:      string
}

export interface StatusTransitionInput {
  toStatus: ReturnStatus
  note?:    string
}

// ── Actor context ─────────────────────────────────────────────────────────────

export interface Actor {
  id:   string
  name: string | null | undefined
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ReturnCommandService {

  // ── createReturn ────────────────────────────────────────────────────────────

  static async createReturn(input: CreateReturnInput, actor: Actor) {
    let customerName    = input.customerName    ?? null
    let customerEmail   = input.customerEmail   ?? null
    let customerPhone   = input.customerPhone   ?? null
    let customerAddress = input.customerAddress ?? null
    let customerId      = input.customerId      ?? null
    let returnDeadline: Date | null = null

    const orderItemsById = new Map<string, {
      price: number; priceWithVat: number; vatRate: number
      productId: string | null; productName: string | null
      unit: string; quantity: number
    }>()

    if (input.customerOrderId) {
      const order = await prisma.customerOrder.findUnique({
        where:   { id: input.customerOrderId },
        include: { customer: true, items: true },
      })
      if (!order) throw new ReturnValidationError('Objednávka nebyla nalezena', 404)

      customerName    = customerName    || order.customerName    || order.customer?.name    || null
      customerEmail   = customerEmail   || order.customerEmail   || order.customer?.email   || null
      customerPhone   = customerPhone   || order.customerPhone   || order.customer?.phone   || null
      customerAddress = customerAddress || order.customerAddress || order.customer?.address || null
      customerId      = customerId      || order.customerId      || null

      const deadline = new Date(order.orderDate)
      deadline.setDate(deadline.getDate() + STANDARD_RETURN_DAYS)
      returnDeadline = deadline

      for (const item of order.items) {
        const net     = Number(item.price)
        const vatRate = Number(item.vatRate)
        const stored  = Number(item.priceWithVat)
        const gross   = stored > 0
          ? stored
          : calculateVatFromNet(net, vatRate).priceWithVat
        orderItemsById.set(item.id, {
          price: net, priceWithVat: gross, vatRate,
          productId: item.productId, productName: item.productName,
          unit: item.unit, quantity: Number(item.quantity),
        })
      }

      for (const item of input.items) {
        if (item.sourceOrderItemId && !orderItemsById.has(item.sourceOrderItemId)) {
          throw new ReturnValidationError(
            `Položka ${item.sourceOrderItemId} nepatří k objednávce`,
            422,
          )
        }
      }
    }

    const itemsToCreate = input.items.map(item => {
      const ordered = item.sourceOrderItemId ? orderItemsById.get(item.sourceOrderItemId) : null
      return {
        sourceOrderItemId: item.sourceOrderItemId ?? null,
        productId:         ordered?.productId   ?? null,
        productName:       (ordered?.productName ?? item.productName)?.trim() || 'Neznámý produkt',
        unit:              ordered?.unit        ?? item.unit,
        originalQuantity:  item.originalQuantity,
        returnedQuantity:  item.returnedQuantity,
        unitPrice:         ordered?.price        ?? item.unitPrice        ?? 0,
        unitPriceWithVat:  ordered?.priceWithVat ?? item.unitPriceWithVat ?? 0,
        vatRate:           ordered?.vatRate       ?? item.vatRate          ?? 21,
      }
    })

    const returnRequest = await prisma.$transaction(async tx => {
      const returnNumber = await getNextDocumentNumber('return-request', tx)
      const r = await tx.returnRequest.create({
        data: {
          returnNumber,
          currency:        'CZK',
          customerOrderId: input.customerOrderId ?? null,
          customerId,
          eshopUserId:     input.eshopUserId  ?? null,
          customerName,
          customerEmail:   customerEmail  || null,
          customerPhone:   customerPhone  || null,
          customerAddress: customerAddress || null,
          type:            input.type,
          reason:          input.reason,
          reasonDetail:    input.reasonDetail ?? null,
          status:          'submitted',
          requestDate:     new Date(),
          returnDeadline,
          items: { create: itemsToCreate },
          statusHistory: {
            create: {
              fromStatus:    null,
              toStatus:      'submitted',
              changedBy:     actor.id,
              changedByName: actor.name ?? null,
              note:          'Reklamace podána',
            },
          },
        },
        include: RETURN_FULL_INCLUDE,
      })
      return r
    })

    await createAuditLog({
      userId: actor.id, username: actor.name ?? actor.id,
      actionType: 'CREATE', entityName: 'ReturnRequest',
      entityId: returnRequest.id, module: 'returns',
      newValue: returnRequest.returnNumber,
    })

    await ReturnEventBus.emit({
      type: 'return.created',
      returnRequestId: returnRequest.id,
      returnNumber:    returnRequest.returnNumber,
      actorId:   actor.id,
      actorName: actor.name ?? null,
    })

    return mapReturnFull(returnRequest as any)
  }

  // ── approveReturn ───────────────────────────────────────────────────────────

  static async approveReturn(id: string, input: ApproveReturnInput, actor: Actor) {
    const existing = await prisma.returnRequest.findUnique({
      where: { id }, include: { items: true },
    })
    if (!existing) throw new ReturnValidationError('Reklamace nebyla nalezena', 404)

    assertRequiredStatus(existing.status, 'inspecting', 'Rozhodnutí o reklamaci')
    assertItemOwnership(input.items.map(d => d.id), existing.items)
    assertApprovedQuantities(input.items, existing.items)

    const anyApproved = input.items.some(i => i.itemStatus === 'approved' || i.itemStatus === 'partial')
    const anyRejected = input.items.some(i => i.itemStatus === 'rejected')
    const newStatus: ReturnStatus = anyApproved && anyRejected
      ? 'partially_approved' : anyApproved ? 'approved' : 'rejected'

    const resolutionType = newStatus === 'rejected' ? 'rejected' : input.resolutionType

    let refundAmount = 0
    if (resolutionType !== 'rejected') {
      const approvedLines = input.items
        .filter(d => d.itemStatus !== 'rejected')
        .map(d => {
          const item      = existing.items.find(i => i.id === d.id)!
          const qty       = d.approvedQuantity ?? Number(item.returnedQuantity)
          const gross     = Number(item.unitPriceWithVat)
          const vatRate   = Number(item.vatRate)
          const net       = round2(gross / (1 + vatRate / 100))
          return calculateLineVat(qty, net, vatRate)
        })
      refundAmount = calculateVatSummary(approvedLines).totalWithVat
    }

    const updated = await prisma.$transaction(async tx => {
      for (const d of input.items) {
        await tx.returnRequestItem.update({
          where: { id: d.id },
          data:  {
            itemStatus:          d.itemStatus,
            approvedQuantity:    d.approvedQuantity ?? null,
            condition:           d.condition        ?? null,
            conditionNote:       d.conditionNote    ?? null,
            itemRejectionReason: d.itemRejectionReason ?? null,
          },
        })
      }

      const r = await tx.returnRequest.update({
        where: { id, status: 'inspecting' },
        data:  {
          status: newStatus, resolutionType, refundAmount,
          adminNote:   input.adminNote ?? existing.adminNote,
          handledById: actor.id,
        },
        include: RETURN_FULL_INCLUDE,
      }).catch(rewrapPrismaError)

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: 'inspecting', toStatus: newStatus,
          changedBy: actor.id, changedByName: actor.name ?? null,
          note: `Rozhodnutí: ${resolutionType}`,
        },
      })

      return r
    })

    await createAuditLog({
      userId: actor.id, username: actor.name ?? actor.id,
      actionType: 'UPDATE', entityName: 'ReturnRequest',
      entityId: id, fieldName: 'status',
      oldValue: existing.status, newValue: newStatus, module: 'returns',
    })

    await ReturnEventBus.emit({
      type: 'return.status_changed',
      returnRequestId: id,
      returnNumber:    existing.returnNumber,
      fromStatus: existing.status, toStatus: newStatus,
      actorId: actor.id, actorName: actor.name ?? null,
    })

    return mapReturnFull(updated as any)
  }

  // ── rejectReturn ────────────────────────────────────────────────────────────

  static async rejectReturn(id: string, input: RejectReturnInput, actor: Actor) {
    const existing = await prisma.returnRequest.findUnique({ where: { id } })
    if (!existing) throw new ReturnValidationError('Reklamace nebyla nalezena', 404)

    assertStatusTransition(existing.status, 'rejected')

    const updated = await prisma.$transaction(async tx => {
      await tx.returnRequestItem.updateMany({
        where: { returnRequestId: id, itemStatus: 'pending' },
        data:  { itemStatus: 'rejected' },
      })

      const r = await tx.returnRequest.update({
        where: { id, status: 'inspecting' },
        data:  {
          status: 'rejected', resolutionType: 'rejected', refundAmount: 0,
          rejectionReason: input.rejectionReason,
          adminNote:       input.adminNote ?? existing.adminNote,
          handledById:     actor.id,
        },
        include: RETURN_FULL_INCLUDE,
      }).catch(rewrapPrismaError)

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: 'inspecting', toStatus: 'rejected',
          changedBy: actor.id, changedByName: actor.name ?? null,
          note: input.rejectionReason,
        },
      })

      return r
    })

    await createAuditLog({
      userId: actor.id, username: actor.name ?? actor.id,
      actionType: 'UPDATE', entityName: 'ReturnRequest',
      entityId: id, fieldName: 'status',
      oldValue: existing.status, newValue: 'rejected', module: 'returns',
    })

    await ReturnEventBus.emit({
      type: 'return.status_changed',
      returnRequestId: id, returnNumber: existing.returnNumber,
      fromStatus: existing.status, toStatus: 'rejected',
      actorId: actor.id, actorName: actor.name ?? null,
    })

    return mapReturnFull(updated as any)
  }

  // ── receiveGoods ────────────────────────────────────────────────────────────

  static async receiveGoods(id: string, input: ReceiveGoodsInput, actor: Actor) {
    const existing = await prisma.returnRequest.findUnique({
      where: { id }, include: { items: true },
    })
    if (!existing) throw new ReturnValidationError('Reklamace nebyla nalezena', 404)

    assertStatusTransition(existing.status, 'goods_received')
    assertItemOwnership(input.items.map(i => i.id), existing.items)

    const updated = await prisma.$transaction(async tx => {
      for (const itemInput of input.items) {
        await tx.returnRequestItem.update({
          where: { id: itemInput.id },
          data:  {
            condition:     itemInput.condition,
            conditionNote: itemInput.conditionNote ?? null,
          },
        })
      }

      if (input.restock) {
        const restockCandidates = input.items
          .filter(i => i.condition === 'good' || i.condition === 'opened')
          .flatMap(condItem => {
            const item = existing.items.find(ei => ei.id === condItem.id)
            if (!item || !item.productId || item.restockInventoryItemId) return []
            return [{
              returnRequestId: id,
              returnNumber:    existing.returnNumber,
              itemId:          item.id,
              productId:       item.productId,
              approvedQty:     Number(item.returnedQuantity),
              unit:            item.unit,
              condition:       condItem.condition,
            }]
          })

        if (restockCandidates.length > 0) {
          await restockReturnItems(tx, restockCandidates)
        }
      }

      const r = await tx.returnRequest.update({
        where: { id, status: 'waiting_for_goods' },
        data:  {
          status:    'goods_received',
          adminNote: input.adminNote ?? existing.adminNote,
        },
        include: RETURN_FULL_INCLUDE,
      }).catch(rewrapPrismaError)

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: 'waiting_for_goods', toStatus: 'goods_received',
          changedBy: actor.id, changedByName: actor.name ?? null,
          note: input.restock ? 'Zboží přijato a naskladněno' : 'Zboží přijato',
        },
      })

      return r
    })

    await createAuditLog({
      userId: actor.id, username: actor.name ?? actor.id,
      actionType: 'UPDATE', entityName: 'ReturnRequest',
      entityId: id, fieldName: 'status',
      oldValue: existing.status, newValue: 'goods_received', module: 'returns',
    })

    await ReturnEventBus.emit({
      type: 'return.goods_received',
      returnRequestId: id, returnNumber: existing.returnNumber,
      restocked: input.restock,
      actorId: actor.id, actorName: actor.name ?? null,
    })

    return mapReturnFull(updated as any)
  }

  // ── processRefund ───────────────────────────────────────────────────────────

  static async processRefund(id: string, input: ProcessRefundInput, actor: Actor) {
    const existing = await prisma.returnRequest.findUnique({
      where:   { id },
      include: { items: true, creditNotes: { select: { id: true } } },
    })
    if (!existing) throw new ReturnValidationError('Reklamace nebyla nalezena', 404)

    assertCurrency(existing.currency)
    assertStatusTransition(existing.status, 'resolved')
    assertNoExistingRefund(existing.creditNotes)

    const refundLineItems = existing.items
      .filter(i => i.itemStatus === 'approved' || i.itemStatus === 'partial')
      .map(i => ({
        productName:      i.productName,
        unit:             i.unit,
        approvedQty:      Number(i.approvedQuantity ?? i.returnedQuantity),
        unitPrice:        Number(i.unitPrice),
        unitPriceWithVat: Number(i.unitPriceWithVat),
        vatRate:          Number(i.vatRate),
      }))

    const updated = await prisma.$transaction(async tx => {
      const refundResult = await processReturnRefund(tx, {
        returnRequestId: id,
        customerOrderId: existing.customerOrderId,
        currency:        existing.currency,
        refundMethod:    input.refundMethod,
        refundReference: input.refundReference ?? null,
        actorId:         actor.id,
        actorName:       actor.name ?? null,
        items:           refundLineItems,
      }).catch(rewrapPrismaError)

      const r = await tx.returnRequest.update({
        where: {
          id,
          status: { in: ['approved', 'partially_approved'] },
        },
        data: {
          status:            'resolved',
          refundAmount:      refundResult.totalRefund,
          refundStatus:      refundResult.refundStatus,
          refundMethod:      input.refundMethod,
          refundReference:   input.refundReference ?? null,
          refundProcessedAt: new Date(),
          adminNote:         input.adminNote ?? existing.adminNote,
        },
        include: RETURN_FULL_INCLUDE,
      }).catch(rewrapPrismaError)

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: existing.status, toStatus: 'resolved',
          changedBy: actor.id, changedByName: actor.name ?? null,
          note: refundResult.hasAccountingDoc
            ? `Refundace ${refundResult.totalRefund.toFixed(2)} ${existing.currency} — dobropis ${refundResult.creditNoteNumber} (${refundResult.refundStatus})`
            : `Refundace ${refundResult.totalRefund.toFixed(2)} ${existing.currency} (bez dobropisu, ${refundResult.refundStatus})`,
        },
      })

      return { r, refundResult }
    })

    await createAuditLog({
      userId: actor.id, username: actor.name ?? actor.id,
      actionType: 'UPDATE', entityName: 'ReturnRequest',
      entityId: id, fieldName: 'status',
      oldValue: existing.status, newValue: 'resolved', module: 'returns',
    })

    await ReturnEventBus.emit({
      type: 'return.resolved',
      returnRequestId:  id,
      returnNumber:     existing.returnNumber,
      refundAmount:     updated.refundResult.totalRefund,
      currency:         existing.currency,
      creditNoteId:     updated.refundResult.creditNoteId,
      creditNoteNumber: updated.refundResult.creditNoteNumber,
      refundStatus:     updated.refundResult.refundStatus,
      actorId:  actor.id,
      actorName: actor.name ?? null,
    })

    return mapReturnFull(updated.r as any)
  }

  // ── transitionStatus ────────────────────────────────────────────────────────

  static async transitionStatus(id: string, input: StatusTransitionInput, actor: Actor) {
    const existing = await prisma.returnRequest.findUnique({ where: { id } })
    if (!existing) throw new ReturnValidationError('Reklamace nebyla nalezena', 404)

    assertStatusTransition(existing.status, input.toStatus)

    const closeStatuses = new Set<string>(['closed', 'cancelled'])

    const updated = await prisma.$transaction(async tx => {
      const r = await tx.returnRequest.update({
        where: { id, status: existing.status },
        data:  {
          status:      input.toStatus,
          closedAt:    closeStatuses.has(input.toStatus) ? new Date() : undefined,
          handledById: existing.handledById ?? actor.id,
        },
        include: RETURN_FULL_INCLUDE,
      }).catch(rewrapPrismaError)

      await tx.returnStatusHistory.create({
        data: {
          returnRequestId: id,
          fromStatus: existing.status, toStatus: input.toStatus,
          changedBy: actor.id, changedByName: actor.name ?? null,
          note: input.note ?? null,
        },
      })

      return r
    })

    await createAuditLog({
      userId: actor.id, username: actor.name ?? actor.id,
      actionType: 'UPDATE', entityName: 'ReturnRequest',
      entityId: id, fieldName: 'status',
      oldValue: existing.status, newValue: input.toStatus, module: 'returns',
    })

    await ReturnEventBus.emit({
      type: 'return.status_changed',
      returnRequestId: id, returnNumber: existing.returnNumber,
      fromStatus: existing.status, toStatus: input.toStatus,
      actorId: actor.id, actorName: actor.name ?? null,
    })

    return mapReturnFull(updated as any)
  }
}
