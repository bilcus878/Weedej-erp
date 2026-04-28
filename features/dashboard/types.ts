export interface DashboardStats {
  totalInventoryValue: number
  todayRevenue: number
  monthRevenue: number
  productCount: number
  lowStockCount: number
  outOfStockCount: number
  topProduct: { name: string; quantity: number; unit: string } | null
  avgDailyRevenue: number
  cashRevenue: number
  cardRevenue: number
  cashPercentage: number
  cardPercentage: number
  todayTransactionCount: number
  monthTransactionCount: number
}

export interface ReceivedInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate?: string
  totalAmount: number
  status?: string
  supplierName?: string
  purchaseOrder?: { supplier?: { name: string }; supplierName?: string }
  receipts?: { supplier?: { name: string } }[]
}

export interface IssuedInvoice {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate?: string
  totalAmount: number
  status?: string
  customerName?: string
  customer?: { name: string }
}

export interface CustomerOrder {
  id: string
  orderNumber: string
  orderDate: string
  totalAmount: number
  status: string
  customerName?: string
  customer?: { name: string }
}

export interface DashboardData {
  stats:             DashboardStats
  receivedInvoices:  ReceivedInvoice[]
  issuedInvoices:    IssuedInvoice[]
  customerOrders:    CustomerOrder[]
  inventorySummary:  InventorySummaryItem[]
}

export interface NormalizedInvoice {
  id: string
  number: string
  date: string
  amount: number
  status?: string
  type: 'received' | 'issued'
  name: string
}

export interface OverdueSummary {
  receivedCount: number
  issuedCount:   number
  total:         number
}

export interface OrderStats {
  total:           number
  newCount:        number
  processingCount: number
  totalValue:      number
}

export interface InventorySummaryItem {
  productId:     string
  productName:   string
  unit:          string
  physicalStock: number
  availableStock: number
  stockStatus:   'empty' | 'low' | 'ok'
}
