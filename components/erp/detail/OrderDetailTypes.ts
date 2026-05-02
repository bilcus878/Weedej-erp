export interface OrderDetailItem {
  id: string
  productId?: string | null
  productName?: string | null
  quantity: number
  unit: string
  price: number
  vatRate: number
  vatAmount: number
  priceWithVat: number
  product?: { id: string; name: string; price: number; unit: string } | null
}

export interface OrderDetailDeliveryNoteItem {
  id: string
  quantity: number
  unit: string
  productId?: string | null
  inventoryItemId?: string | null
  productName?: string | null
  price?: number | null
  priceWithVat?: number | null
  vatRate?: number | null
  vatAmount?: number | null
  product?: { id: string; name: string; price: number } | null
}

export interface OrderDetailDeliveryNote {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status: string
  items: OrderDetailDeliveryNoteItem[]
}

export interface OrderDetailInvoice {
  id: string
  invoiceNumber: string
  paymentType?:  string
  paymentStatus: string
  status: string
  invoiceDate: string
  dueDate?: string | null
  variableSymbol?: string | null
  constantSymbol?: string | null
  specificSymbol?: string | null
}

export interface OrderDetailData {
  id: string
  orderNumber: string
  orderDate: string
  status: string
  totalAmount: number
  totalVatAmount?: number | null
  paidAt?: string | null
  shippedAt?: string | null
  customerName?: string | null
  customerEmail?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  paymentReference?: string | null
  trackingNumber?: string | null
  carrier?: string | null
  stornoAt?: string | null
  stornoBy?: string | null
  stornoReason?: string | null
  discountAmount?: number | null
  note?: string | null
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
  items: OrderDetailItem[]
  issuedInvoice?: OrderDetailInvoice | null
  deliveryNotes?: OrderDetailDeliveryNote[]
}
