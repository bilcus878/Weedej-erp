export interface SupplierOrderDetailItem {
  id: string
  productId?: string | null
  productName?: string | null
  quantity: number
  alreadyReceivedQuantity?: number
  unit: string
  price: number
  vatRate: number
  vatAmount: number
  priceWithVat: number
  product?: { id: string; name: string; price: number; unit: string } | null
}

export interface SupplierOrderDetailReceiptItem {
  id: string
  quantity: number
  receivedQuantity?: number
  unit: string
  productName?: string | null
  purchasePrice: number
  productId?: string | null
  inventoryItemId?: string | null
  product?: { id?: string; name: string } | null
}

export interface SupplierOrderDetailReceipt {
  id: string
  receiptNumber: string
  receiptDate: string
  status: string
  items: SupplierOrderDetailReceiptItem[]
}

export interface SupplierOrderDetailInvoice {
  id: string
  invoiceNumber: string
  paymentStatus?: string
  status: string
  invoiceDate: string
}

export interface SupplierOrderDetailData {
  id: string
  orderNumber: string
  orderDate: string
  status: string
  totalAmount: number
  expectedDate?: string | null
  supplierName?: string | null
  supplierEmail?: string | null
  supplierPhone?: string | null
  supplierAddress?: string | null
  supplierContactPerson?: string | null
  supplierEntityType?: string | null
  supplierICO?: string | null
  supplierDIC?: string | null
  supplierBankAccount?: string | null
  supplierWebsite?: string | null
  paymentType?: string | null
  dueDate?: string | null
  variableSymbol?: string | null
  stornoAt?: string | null
  stornoBy?: string | null
  stornoReason?: string | null
  discountAmount?: number | null
  note?: string | null
  items: SupplierOrderDetailItem[]
  receivedInvoice?: SupplierOrderDetailInvoice | null
  receipts?: SupplierOrderDetailReceipt[]
}
