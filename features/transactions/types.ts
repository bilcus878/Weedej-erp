export interface TransactionItem {
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

export interface Transaction {
  id: string
  transactionCode: string
  sumupTransactionCode?: string | null
  totalAmount: number
  paymentType: string
  status: string
  transactionDate: string
  receiptId?: string | null
  items: TransactionItem[]
  customer?: { id: string; name: string } | null
  customerName?: string | null
  deliveryNote?: {
    id: string
    deliveryNumber: string
    deliveryDate: string
    items?: { id: string; quantity: number; product?: { price: number } }[]
    customerOrder?: {
      id: string
      orderNumber: string
      orderDate: string
      note?: string | null
      customer?: { id: string; name: string } | null
    } | null
  } | null
  issuedInvoice?: { id: string; invoiceNumber: string } | null
}
