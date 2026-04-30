import type {
  ReturnStatus,
  ReturnType,
  ReturnReason,
  ReturnResolutionType,
  ReturnRefundMethod,
  ReturnItemCondition,
  ReturnItemStatus,
} from '@/lib/returns/returnWorkflow'

export type {
  ReturnStatus,
  ReturnType,
  ReturnReason,
  ReturnResolutionType,
  ReturnRefundMethod,
  ReturnItemCondition,
  ReturnItemStatus,
}

export interface ReturnAttachment {
  id:             string
  url:            string
  filename:       string
  mimeType:       string | null
  sizeBytes:      number | null
  type:           string
  uploadedBy:     string | null
  uploadedByName: string | null
  createdAt:      string
}

export interface ReturnStatusHistoryEntry {
  id:           string
  fromStatus:   string | null
  toStatus:     string
  changedBy:    string | null
  changedByName: string | null
  note:         string | null
  createdAt:    string
}

export interface ReturnRequestItem {
  id:              string
  productId:       string | null
  productName:     string | null
  unit:            string
  originalQuantity:  number
  returnedQuantity:  number
  approvedQuantity:  number | null
  unitPrice:         number
  unitPriceWithVat:  number
  vatRate:           number
  condition:         ReturnItemCondition | null
  conditionNote:     string | null
  itemStatus:        ReturnItemStatus
  itemRejectionReason: string | null
  restockInventoryItemId: string | null
}

export interface ReturnRequestListItem {
  id:           string
  returnNumber: string
  type:         ReturnType
  reason:       ReturnReason
  status:       ReturnStatus
  requestDate:  string
  customerName: string | null
  customerEmail: string | null
  customerOrderId:     string | null
  customerOrderNumber: string | null
  refundAmount:        number | null
  resolutionType:      ReturnResolutionType | null
  itemCount:           number
  approvedItemCount:   number
}

export interface ReturnRequestDetail extends ReturnRequestListItem {
  reasonDetail:      string | null
  returnDeadline:    string | null
  warrantyExpiry:    string | null
  customerPhone:     string | null
  customerAddress:   string | null
  customerId:        string | null
  eshopUserId:       string | null
  returnShippingPaidBy:    string | null
  returnTrackingNumber:    string | null
  returnCarrier:           string | null
  returnShippingCost:      number | null
  refundMethod:            ReturnRefundMethod | null
  refundReference:         string | null
  refundProcessedAt:       string | null
  adminNote:               string | null
  rejectionReason:         string | null
  handledById:             string | null
  handledByName:           string | null
  closedAt:                string | null
  exchangeOrderId:         string | null
  exchangeOrderNumber:     string | null
  creditNoteId:            string | null
  creditNoteNumber:        string | null
  items:                   ReturnRequestItem[]
  statusHistory:           ReturnStatusHistoryEntry[]
  attachments:             ReturnAttachment[]
  // Computed
  totalApprovedRefund:     number
  canTransitionTo:         ReturnStatus[]
}

// ── Input types for API calls ──────────────────────────────────────────────

export interface CreateReturnItemInput {
  productId:        string | null
  productName:      string
  unit:             string
  originalQuantity: number
  returnedQuantity: number
  unitPrice:        number
  unitPriceWithVat: number
  vatRate:          number
}

export interface CreateReturnInput {
  customerOrderId:   string | null
  type:              ReturnType
  reason:            ReturnReason
  reasonDetail?:     string
  customerName?:     string
  customerEmail?:    string
  customerPhone?:    string
  customerAddress?:  string
  customerId?:       string
  eshopUserId?:      string
  items:             CreateReturnItemInput[]
}

export interface ApproveReturnInput {
  items: Array<{
    id:              string
    itemStatus:      ReturnItemStatus
    approvedQuantity: number | null
    condition:       ReturnItemCondition | null
    conditionNote:   string | null
    itemRejectionReason: string | null
  }>
  resolutionType:  ReturnResolutionType
  refundAmount?:   number
  adminNote?:      string
}

export interface RejectReturnInput {
  rejectionReason: string
  adminNote?:      string
}

export interface ReceiveGoodsInput {
  items: Array<{
    id:        string
    condition: ReturnItemCondition
    conditionNote?: string
  }>
  restock:   boolean
  adminNote?: string
}

export interface ProcessRefundInput {
  refundAmount:    number
  refundMethod:    ReturnRefundMethod
  refundReference?: string
  adminNote?:      string
}

export interface StatusTransitionInput {
  toStatus: ReturnStatus
  note?:    string
}
