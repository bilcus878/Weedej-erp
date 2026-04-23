export interface InvoiceItem {
  id: string
  quantity: number
  unit: string
  price: number | null
  vatRate?: number
  vatAmount?: number
  priceWithVat?: number
  productId?: string
  productName?: string
  product: { id: string; name: string }
}

export interface InvoiceDeliveryNoteItem {
  id: string
  quantity: number
  unit: string
  productId?: string | null
  inventoryItemId?: string | null
  productName?: string | null
  price?: number | null
  priceWithVat?: number | null
  vatAmount?: number | null
  vatRate?: number | null
  product?: { price: number; vatRate?: number }
}

export interface InvoiceDeliveryNote {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status?: string
  items?: InvoiceDeliveryNoteItem[]
  totalAmount?: number
}

export interface IssuedInvoice {
  id: string
  transactionCode: string
  totalAmount: number
  paymentType: string
  status: string
  transactionDate: string
  items: InvoiceItem[]
  customer?: {
    id: string
    name: string
    email?: string
    phone?: string
    ico?: string
    dic?: string
    address?: string
  } | null
  customerOrderId?: string
  customerOrderNumber?: string
  customerOrderSource?: string
  transactionId?: string
  receiptId?: string
  deliveryNotes?: InvoiceDeliveryNote[]
  _original?: { customerOrder?: { paidAt?: string; shippedAt?: string } }
  // Snapshot fields from API
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  customerIco?: string
  customerDic?: string
  dueDate?: string | null
  variableSymbol?: string | null
  constantSymbol?: string | null
  specificSymbol?: string | null
  paymentReference?: string | null
  shippingMethod?: string | null
  pickupPointId?: string | null
  pickupPointName?: string | null
  pickupPointAddress?: string | null
  pickupPointCarrier?: string | null
  billingName?: string | null
  billingCompany?: string | null
  billingIco?: string | null
  billingStreet?: string | null
  billingCity?: string | null
  billingZip?: string | null
  billingCountry?: string | null
  note?: string | null
  trackingNumber?: string | null
  carrier?: string | null
  shippedAt?: string | null
}

export interface CreditNoteData {
  id: string
  creditNoteNumber: string
  creditNoteDate: string
  totalAmount: number
  reason: string | null
  status: string
  items: {
    id: string
    productName: string | null
    quantity: number
    unit: string
    price: number
    vatRate: number
  }[]
}

export interface CreditNoteFormItem {
  productName: string
  quantity: string
  unit: string
  price: string
  vatRate: string
}
