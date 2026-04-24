export interface InventorySummary {
  productId: string
  productName: string
  unit: string
  price: number
  vatRate: number
  category?: { id: string; name: string } | null
  physicalStock: number
  reservedStock: number
  availableStock: number
  expectedQuantity: number
  totalExpectedStock: number
  avgPurchasePrice: number
  totalPurchaseValue: number
  totalSalesValue: number
  stockStatus: 'empty' | 'low' | 'ok'
}

export interface StockMovement {
  id: string
  type: 'stock_in' | 'stock_out'
  date: string
  createdAt?: string
  quantity: number
  unit: string
  purchasePrice?: number
  supplier?: { id: string; name: string } | null
  note?: string | null
  transaction?: { id: string; transactionCode: string; invoiceType?: string; receiptId?: string | null }
  receipt?: { id: string; receiptNumber: string }
  deliveryNote?: { id: string; deliveryNumber: string }
  customerOrder?: { id: string; orderNumber: string }
  purchaseOrder?: { id: string; orderNumber: string }
  receivedInvoice?: { id: string; invoiceNumber: string }
  issuedInvoice?: { id: string; invoiceNumber: string }
}

export interface Product {
  id: string
  name: string
  price: number
  purchasePrice?: number | null
  unit: string
}

export interface Category {
  id: string
  name: string
}

export type SortField = 'productName' | 'category' | 'physicalStock' | 'reservedStock' | 'availableStock' | 'expectedQuantity'
export type SortDirection = 'asc' | 'desc'
