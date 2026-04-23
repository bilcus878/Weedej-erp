export interface Supplier {
  id: string
  name: string
  entityType?: string
  contact?: string
  email?: string
  phone?: string
  ico?: string
  dic?: string
  bankAccount?: string
  website?: string
  address?: string
}

export interface Product {
  id: string
  name: string
  unit: string
  purchasePrice?: number
  vatRate?: number
  category?: { id: string; name: string } | null
}

export interface PurchaseOrderItem {
  id?: string
  productId?: string
  productName?: string
  isManual: boolean
  quantity: number
  alreadyReceivedQuantity?: number
  unit: string
  expectedPrice: number
  vatRate: number
  vatAmount?: number
  priceWithVat?: number
  product?: Product
}

export interface ReceiptItem {
  id: string
  quantity: number
  receivedQuantity?: number
  purchasePrice: number
  unit: string
  productId?: string | null
  inventoryItemId?: string | null
  product?: { name: string }
  productName?: string
}

export interface Receipt {
  id: string
  receiptNumber: string
  receiptDate: string
  status: string
  stornoReason?: string
  supplier?: { name: string }
  items?: ReceiptItem[]
}

export interface PurchaseOrder {
  id: string
  orderNumber: string
  orderDate: string
  expectedDate?: string
  status: string
  note?: string
  stornoReason?: string
  stornoAt?: string
  stornoBy?: string
  totalAmount?: number
  totalAmountWithoutVat?: number
  totalVatAmount?: number
  supplier?: Supplier
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
  items: PurchaseOrderItem[]
  receipts?: Receipt[]
  invoice?: { id: string; invoiceNumber: string; paymentType?: string; dueDate?: string; variableSymbol?: string }
  [key: string]: any
}

export interface ManualSupplierData {
  name: string
  entityType: string
  contactPerson: string
  email: string
  phone: string
  ico: string
  dic: string
  bankAccount: string
  website: string
  address: string
  note: string
}

export interface CreatePurchaseOrderPayload {
  orderNumber: string
  supplierId: string | null
  orderDate: string
  expectedDate: string | null
  dueDate: string | null
  paymentType: string | null
  variableSymbol: string | null
  constantSymbol: string | null
  specificSymbol: string | null
  note: string
  isManualSupplier: boolean
  isAnonymousSupplier: boolean
  saveSupplierToDatabase: boolean
  manualSupplierData: ManualSupplierData | null
  items: {
    productId: string | null
    productName: string | null
    isManual: boolean
    quantity: number
    unit: string
    expectedPrice: number
  }[]
}
