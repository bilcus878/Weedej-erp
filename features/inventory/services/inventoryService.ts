import type { InventorySummary, Product, Category, StockMovement } from '../types'

interface FetchSummaryResult {
  summary:    InventorySummary[]
  products:   Product[]
  categories: Category[]
  isVatPayer: boolean
}

export async function fetchInventorySummary(): Promise<FetchSummaryResult> {
  const [summaryRes, productsRes, categoriesRes, settingsRes] = await Promise.all([
    fetch('/api/inventory/summary', { cache: 'no-store' }),
    fetch('/api/products',          { cache: 'no-store' }),
    fetch('/api/categories'),
    fetch('/api/settings'),
  ])
  const [summaryData, productsData, categoriesData, settingsData] = await Promise.all([
    summaryRes.json(), productsRes.json(), categoriesRes.json(), settingsRes.json(),
  ])
  return {
    summary:    Array.isArray(summaryData)    ? summaryData    : [],
    products:   Array.isArray(productsData)   ? productsData   : [],
    categories: Array.isArray(categoriesData) ? categoriesData : [],
    isVatPayer: settingsData.isVatPayer !== false,
  }
}

export async function fetchProductDetails(productId: string): Promise<any> {
  const res = await fetch(`/api/products/${productId}`)
  return res.json()
}

export async function increaseInventory(
  productId:     string,
  quantity:      number,
  unit:          string,
  purchasePrice: number,
  date:          string,
  note:          string,
): Promise<void> {
  const res = await fetch('/api/inventory', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ productId, quantity, unit, purchasePrice, date, note }),
  })
  if (!res.ok) throw new Error('Chyba při ukládání')
}

export async function decreaseInventory(
  productId: string,
  quantity:  number,
  note:      string,
  date:      string,
): Promise<void> {
  const res = await fetch('/api/inventory/decrease', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ productId, quantity, note, date }),
  })
  if (!res.ok) throw new Error('Chyba při odečítání')
}

export function mapInventoryItemsToMovements(inventoryItems: any[]): StockMovement[] {
  const movements: StockMovement[] = inventoryItems.map((item: any) => {
    const deliveryNoteItems = item.deliveryNoteItems || []
    const deliveryNote      = deliveryNoteItems[0]?.deliveryNote
    return {
      id:            item.id,
      type:          item.quantity < 0 ? 'stock_out' : 'stock_in',
      date:          item.date,
      quantity:      item.quantity,
      unit:          item.unit,
      purchasePrice: item.purchasePrice,
      supplier:      item.supplier,
      note:          item.note,
      createdAt:     item.createdAt || item.date,
      transaction:   item.transaction
        ? { id: item.transaction.id, transactionCode: item.transaction.transactionCode, receiptId: item.transaction.receiptId, invoiceType: item.transaction.invoiceType }
        : undefined,
      receipt: item.receipt
        ? { id: item.receipt.id, receiptNumber: item.receipt.receiptNumber }
        : undefined,
      receivedInvoice: item.receipt?.receivedInvoice
        ? { id: item.receipt.receivedInvoice.id, invoiceNumber: item.receipt.receivedInvoice.invoiceNumber }
        : undefined,
      purchaseOrder: item.receipt?.purchaseOrder
        ? { id: item.receipt.purchaseOrder.id, orderNumber: item.receipt.purchaseOrder.orderNumber }
        : undefined,
      deliveryNote: deliveryNote
        ? { id: deliveryNote.id, deliveryNumber: deliveryNote.deliveryNumber }
        : undefined,
      customerOrder: deliveryNote?.customerOrder
        ? { id: deliveryNote.customerOrder.id, orderNumber: deliveryNote.customerOrder.orderNumber }
        : undefined,
      issuedInvoice: (deliveryNote?.customerOrder?.issuedInvoice || item.transaction?.issuedInvoice)
        ? {
            id:            deliveryNote?.customerOrder?.issuedInvoice?.id || item.transaction?.issuedInvoice?.id,
            invoiceNumber: deliveryNote?.customerOrder?.issuedInvoice?.invoiceNumber || item.transaction?.issuedInvoice?.invoiceNumber,
          }
        : undefined,
    }
  })
  movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return movements
}
