export type BatchStatus = 'active' | 'quarantine' | 'recalled' | 'expired' | 'consumed'

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
    id:             string
    receiptNumber:  string
    purchaseOrder?: { id: string; orderNumber: string } | null
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
  batch:          Batch
  movements:      BatchMovement[]
  currentStock:   number
  totalReceived:  number
  totalConsumed:  number
}

// Inline batch input form data per receipt item
export interface BatchFormData {
  batchNumber:    string
  productionDate: string
  expiryDate:     string
  supplierLotRef: string
}

export function emptyBatchFormData(): BatchFormData {
  return { batchNumber: '', productionDate: '', expiryDate: '', supplierLotRef: '' }
}
