export type Supplier = { id: string; name: string }
export type Product  = { id: string; name: string }

export type ReceiptItem = {
  id: string
  quantity: number
  receivedQuantity?: number
  unit: string
  purchasePrice: number
  product?: Product
  productName?: string
}

export type Receipt = {
  id: string
  receiptNumber: string
  receiptDate: string
  status: string
  supplierId?: string
  supplier?: Supplier
  items: ReceiptItem[]
}

export type OrderItem = {
  id: string
  quantity: number
  unit: string
  expectedPrice: number
  vatRate?: number
  product?: Product
  productName?: string
}

export type PurchaseOrderRef = {
  id: string
  orderNumber: string
  expectedDate?: string | null
  supplierId?: string
  supplierName?: string
  supplierEntityType?: string
  supplierICO?: string
  supplierDIC?: string
  supplierAddress?: string
  supplierContactPerson?: string
  supplierEmail?: string
  supplierPhone?: string
  supplierBankAccount?: string
  supplierWebsite?: string
  supplier?: Supplier
  items?: OrderItem[]
  note?: string
}

export type ReceivedInvoice = {
  id: string
  invoiceNumber: string
  isTemporary: boolean
  invoiceDate: string
  dueDate?: string | null
  totalAmount: number
  paymentType: string
  attachmentUrl?: string | null
  note?: string | null
  variableSymbol?: string
  constantSymbol?: string
  specificSymbol?: string
  supplierName?: string
  supplierEntityType?: string
  supplierContactPerson?: string
  supplierEmail?: string
  supplierPhone?: string
  supplierIco?: string
  supplierDic?: string
  supplierBankAccount?: string
  supplierWebsite?: string
  supplierAddress?: string
  supplierNote?: string
  discountAmount?: number
  discountType?: string
  discountValue?: number
  status?: string
  stornoReason?: string
  stornoAt?: string
  stornoBy?: string
  receipts?: Receipt[]
  purchaseOrder?: PurchaseOrderRef | null
  createdAt: string
}
