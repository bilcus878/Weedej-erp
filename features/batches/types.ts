export type BatchStatus = 'active' | 'quarantine' | 'recalled' | 'expired' | 'consumed'

// ── Individual product-batch (used by inventory links /batches/[id]) ──────────

export interface Batch {
  id:             string
  batchNumber:    string
  productId:      string
  productionDate: string | null
  expiryDate:     string | null
  supplierLotRef: string | null
  supplierId:     string | null
  receivedDate:   string
  status:         BatchStatus
  notes:          string | null
  createdAt:      string
  updatedAt:      string
  product?:       { id: string; name: string; unit: string }
  supplier?:      { id: string; name: string } | null
  currentStock?:  number
}

export interface BatchMovement {
  id:            string
  quantity:      number
  unit:          string
  date:          string
  purchasePrice: number
  note:          string | null
  supplier?:     { id: string; name: string } | null
  receipt?:      {
    id:              string
    receiptNumber:   string
    purchaseOrder?:  { id: string; orderNumber: string } | null
    receivedInvoice?: { id: string; invoiceNumber: string } | null
  } | null
  deliveryNoteItems?: Array<{
    deliveryNote?: {
      id:             string
      deliveryNumber: string
      customerOrder?: { id: string; orderNumber: string } | null
    } | null
  }>
}

export interface BatchDetail {
  batch:         Batch
  movements:     BatchMovement[]
  currentStock:  number
  totalReceived: number
  totalConsumed: number
}

// ── Lot — receipt-level view (one batchNumber, N products) ────────────────────

export interface LotProduct {
  id:           string       // Batch.id (UUID) — used for /batches/[id] deep-link
  productId:    string
  name:         string
  unit:         string
  status:       BatchStatus
  currentStock: number
  expiryDate:   string | null
}

export interface Lot {
  batchNumber:    string
  supplierLotRef: string | null
  receivedDate:   string | null
  supplier?:      { id: string; name: string } | null
  productCount:   number
  totalStock:     number
  status:         BatchStatus | 'mixed'
  notes:          string | null
  products:       LotProduct[]
}

export interface LotListResult {
  lots:  Lot[]
  total: number
  page:  number
  limit: number
}

// Movement enriched with product context (lot detail shows all products)
export interface LotMovement {
  id:            string
  quantity:      number
  unit:          string
  date:          string
  purchasePrice: number
  note:          string | null
  productId:     string
  productName:   string
  batchId:       string
  supplier?:     { id: string; name: string } | null
  receipt?:      {
    id:             string
    receiptNumber:  string
    purchaseOrder?: { id: string; orderNumber: string } | null
  } | null
  deliveryNoteItems?: Array<{
    deliveryNote?: {
      id:             string
      deliveryNumber: string
      customerOrder?: { id: string; orderNumber: string } | null
    } | null
  }>
}

export interface LotDetail {
  lot:           Lot
  movements:     LotMovement[]
  totalReceived: number
  totalConsumed: number
}

// ── Form data (receipt modal) ─────────────────────────────────────────────────

export interface BatchFormData {
  batchNumber:    string
  productionDate: string
  expiryDate:     string
  supplierLotRef: string
}

export function emptyBatchFormData(): BatchFormData {
  return { batchNumber: '', productionDate: '', expiryDate: '', supplierLotRef: '' }
}
