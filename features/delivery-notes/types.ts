export interface DeliveryNoteItem {
  id: string
  productId?: string
  productName?: string
  quantity: number
  orderedQuantity?: number
  unit: string
  inventoryItemId?: string
  variantValue?: number | null
  variantUnit?:  string | null
  isVariant?:    boolean
  orderedBaseQty?:   number
  shippedBaseQty?:   number
  remainingBaseQty?: number
  price?: number | null
  priceWithVat?: number | null
  vatAmount?: number | null
  vatRate?: number | null
  priceSource?: string | null
  product?: { id: string; name: string; price: number; vatRate?: number }
}

export interface DeliveryNote {
  id: string
  deliveryNumber: string
  deliveryDate: string
  status: string
  processedAt?: string
  note?: string
  customer?: { id: string; name: string }
  customerName?: string
  customerOrder?: {
    id: string
    orderNumber: string
    issuedInvoice?: { id: string; invoiceNumber: string }
    [key: string]: any
  }
  issuedInvoice?: { id: string; invoiceNumber: string }
  transaction?: {
    id: string
    transactionCode: string
    invoiceType: string
    receiptId?: string | null
  }
  items: DeliveryNoteItem[]
}

export interface CustomerOrder {
  id: string
  orderNumber: string
  orderDate: string
  status: string
  totalAmount: number
  customer?: { id: string; name: string }
  customerName?: string
  shippingMethod?:     string | null
  pickupPointId?:      string | null
  pickupPointName?:    string | null
  pickupPointAddress?: string | null
  pickupPointCarrier?: string | null
  items: Array<{
    id: string
    productId: string | null
    productName: string | null
    quantity: number
    shippedQuantity?: number
    shippedBaseQty?:  number
    variantValue?:    number | null
    variantUnit?:     string | null
    unit: string
    price: number
    vatRate?: number
    vatAmount?: number
    priceWithVat?: number
    product?: { id: string; name: string; vatRate?: number }
  }>
}
