export interface EshopOrderItem {
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

export interface EshopDeliveryNoteItem {
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

export interface EshopDeliveryNote {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status: string
  items: EshopDeliveryNoteItem[]
}

export interface EshopIssuedInvoice {
  id: string
  invoiceNumber: string
  paymentType: string
  paymentStatus: string
  status: string
  invoiceDate: string
  dueDate?: string | null
  variableSymbol?: string | null
  constantSymbol?: string | null
  specificSymbol?: string | null
}

export interface EshopUser {
  id: string
  email: string
  name?: string | null
  phone?: string | null
}

export interface EshopOrder {
  id: string
  orderNumber: string
  orderDate: string
  status: string
  totalAmount: number
  totalAmountWithoutVat: number
  totalVatAmount: number
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
  items: EshopOrderItem[]
  issuedInvoice?: EshopIssuedInvoice | null
  EshopUser?: EshopUser | null
  deliveryNotes?: EshopDeliveryNote[]
}
