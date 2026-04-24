export interface CreditNoteItem {
  id: string
  productName: string | null
  quantity: number
  unit: string
  price: number
  vatRate: number
  vatAmount: number
  priceWithVat: number
}

export interface CreditNote {
  id: string
  creditNoteNumber: string
  issuedInvoiceId: string
  invoiceNumber: string
  creditNoteDate: string
  totalAmount: number
  totalAmountWithoutVat: number
  totalVatAmount: number
  reason: string | null
  note: string | null
  status: string
  stornoReason: string | null
  stornoAt: string | null
  customer: {
    id: string
    name: string
    entityType?: string
    ico?: string
    dic?: string
    address?: string
    phone?: string
    email?: string
    contact?: string
    website?: string
    bankAccount?: string
    note?: string
  } | null
  customerName: string | null
  customerEntityType: string | null
  customerEmail: string | null
  customerPhone: string | null
  customerAddress: string | null
  customerIco: string | null
  customerDic: string | null
  items: CreditNoteItem[]
  customerOrderId: string | null
  customerOrderNumber: string | null
  transactionId: string | null
  transactionCode: string | null
}
