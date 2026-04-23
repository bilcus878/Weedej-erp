export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  ico?: string
}

export interface Product {
  id: string
  name: string
  unit: string
  price: number
  vatRate: number
  category?: { id: string; name: string } | null
}

export interface CustomerOrderItem {
  id?: string
  productId?: string | null
  productName?: string | null
  quantity: number
  shippedQuantity?: number
  unit: string
  price: number
  vatRate: number
  vatAmount?: number | null
  priceWithVat?: number | null
  product?: Product | null
}

export interface DeliveryNoteItem {
  id: string
  quantity: number
  productId?: string | null
  inventoryItemId?: string | null
  product?: { price: number } | null
}

export interface DeliveryNote {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status?: string
  note?: string
  items?: DeliveryNoteItem[]
}

export interface IssuedInvoiceSummary {
  id: string
  invoiceNumber: string
  paymentType: string
  dueDate?: string | null
}

export interface CustomerOrder {
  id: string
  orderNumber: string
  orderDate: string
  status: string
  totalAmount: number
  totalAmountWithoutVat?: number | null
  totalVatAmount?: number | null
  paidAt?: string | null
  shippedAt?: string | null
  note?: string | null
  customer?: Customer | null
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  customerEntityType?: string | null
  items: CustomerOrderItem[]
  reservations?: unknown[]
  deliveryNotes?: DeliveryNote[]
  issuedInvoice?: IssuedInvoiceSummary | null
  discountAmount?: number | null
  discountType?: string | null
  discountValue?: number | null
}

export interface ManualCustomerData {
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

export interface CreateOrderPayload {
  orderDate: string
  customerId: string | null
  customerName: string
  customerEmail: string
  customerPhone: string
  customerAddress: string
  note: string
  dueDate: string
  paymentType: string
  variableSymbol: string | null
  constantSymbol: string | null
  specificSymbol: string | null
  isManualCustomer: boolean
  isAnonymousCustomer: boolean
  saveCustomerToDatabase: boolean
  manualCustomerData: ManualCustomerData | null
  discountType: string | null
  discountValue: number | null
  items: {
    productId: string | null
    productName: string | null
    quantity: number
    unit: string
    price: number
    vatRate: number
  }[]
}
