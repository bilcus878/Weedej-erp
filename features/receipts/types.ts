export interface Supplier { id: string; name: string }
export interface Product  { id: string; name: string; unit: string; purchasePrice?: number; vatRate?: number; batchTracking?: boolean }

export interface PurchaseOrder {
  id: string
  orderNumber: string
  status: string
  supplier?: Supplier
  items: any[]
}

export interface ReceiptItem {
  id?: string
  productId?: string
  productName?: string
  isManual: boolean
  quantity: number
  receivedQuantity?: number
  remainingQuantity?: number
  alreadyReceived?: number
  unit: string
  purchasePrice: number
  vatRate?: number
  vatAmount?: number
  priceWithVat?: number
  product?: Product
  inventoryItemId?: string
  batchId?: string | null
  batch?: { id: string; batchNumber: string } | null
}

export interface ReceivedInvoice { id: string; invoiceNumber: string }

export interface Receipt {
  id: string
  receiptNumber: string
  receiptDate: string
  status: string
  stornoReason?: string
  stornoAt?: string
  note?: string
  supplier?: Supplier
  supplierName?: string
  purchaseOrder?: PurchaseOrder
  receivedInvoice?: ReceivedInvoice
  items: ReceiptItem[]
}

export interface InvoiceData {
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  note: string
}

export interface BatchInput {
  batchNumber:    string
  productionDate: string
  expiryDate:     string
  supplierLotRef: string
}
