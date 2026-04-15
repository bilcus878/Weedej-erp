// API Endpoint pro reset databáze
// URL: /api/settings/reset-database

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/settings/reset-database - Reset databáze (zachová nastavení, produkty, zákazníky, dodavatele)
export async function POST() {
  try {
    console.log('🗑️  Začínám reset databáze...')

    // Smazání v správném pořadí kvůli foreign key constraints

    // 1. ReceiptItems (musí před Receipts)
    const receiptItemsCount = await prisma.receiptItem.deleteMany({})
    console.log(`  ✓ Smazáno ${receiptItemsCount.count} položek příjemek`)

    // 2. ReceivedInvoices (musí před Receipts)
    const receivedInvoicesCount = await prisma.receivedInvoice.deleteMany({})
    console.log(`  ✓ Smazáno ${receivedInvoicesCount.count} přijatých faktur`)

    // 3. Receipts
    const receiptsCount = await prisma.receipt.deleteMany({})
    console.log(`  ✓ Smazáno ${receiptsCount.count} příjemek`)

    // 4. PurchaseOrderItems (musí před PurchaseOrders)
    const purchaseOrderItemsCount = await prisma.purchaseOrderItem.deleteMany({})
    console.log(`  ✓ Smazáno ${purchaseOrderItemsCount.count} položek objednávek`)

    // 5. PurchaseOrders
    const purchaseOrdersCount = await prisma.purchaseOrder.deleteMany({})
    console.log(`  ✓ Smazáno ${purchaseOrdersCount.count} objednávek dodavatelům`)

    // 6. DeliveryNoteItems (musí před DeliveryNotes)
    const deliveryNoteItemsCount = await prisma.deliveryNoteItem.deleteMany({})
    console.log(`  ✓ Smazáno ${deliveryNoteItemsCount.count} položek výdejek`)

    // 7. DeliveryNotes
    const deliveryNotesCount = await prisma.deliveryNote.deleteMany({})
    console.log(`  ✓ Smazáno ${deliveryNotesCount.count} výdejek`)

    // 8. IssuedInvoices (vystavené faktury)
    const issuedInvoicesCount = await prisma.issuedInvoice.deleteMany({})
    console.log(`  ✓ Smazáno ${issuedInvoicesCount.count} vystavených faktur`)

    // 9. CustomerOrderItems (musí před CustomerOrders)
    const customerOrderItemsCount = await prisma.customerOrderItem.deleteMany({})
    console.log(`  ✓ Smazáno ${customerOrderItemsCount.count} položek objednávek zákazníků`)

    // 10. Reservations (musí před CustomerOrders)
    const reservationsCount = await prisma.reservation.deleteMany({})
    console.log(`  ✓ Smazáno ${reservationsCount.count} rezervací`)

    // 11. CustomerOrders
    const customerOrdersCount = await prisma.customerOrder.deleteMany({})
    console.log(`  ✓ Smazáno ${customerOrdersCount.count} objednávek zákazníků`)

    // 12. TransactionItems (musí před Transactions)
    const transactionItemsCount = await prisma.transactionItem.deleteMany({})
    console.log(`  ✓ Smazáno ${transactionItemsCount.count} položek transakcí`)

    // 13. Transactions
    const transactionsCount = await prisma.transaction.deleteMany({})
    console.log(`  ✓ Smazáno ${transactionsCount.count} transakcí/faktur`)

    // 14. InventoryItems (skladové pohyby)
    const inventoryItemsCount = await prisma.inventoryItem.deleteMany({})
    console.log(`  ✓ Smazáno ${inventoryItemsCount.count} skladových pohybů`)

    // 15. DocumentSeries (číslování - reset na 0)
    const documentSeriesCount = await prisma.documentSeries.deleteMany({})
    console.log(`  ✓ Resetováno ${documentSeriesCount.count} číselných řad`)

    console.log('\n✅ Reset databáze dokončen!')

    // Počet zachovaných záznamů
    const productsCount = await prisma.product.count()
    const categoriesCount = await prisma.category.count()
    const customersCount = await prisma.customer.count()
    const suppliersCount = await prisma.supplier.count()
    const settingsCount = await prisma.settings.count()

    console.log('\n📦 Zachováno:')
    console.log(`  → Produkty: ${productsCount}`)
    console.log(`  → Kategorie: ${categoriesCount}`)
    console.log(`  → Zákazníci: ${customersCount}`)
    console.log(`  → Dodavatelé: ${suppliersCount}`)
    console.log(`  → Nastavení: ${settingsCount}`)

    return NextResponse.json({
      success: true,
      message: `Databáze resetována!\n\nZachováno:\n- Produkty: ${productsCount}\n- Kategorie: ${categoriesCount}\n- Zákazníci: ${customersCount}\n- Dodavatelé: ${suppliersCount}\n- Nastavení: ${settingsCount}`,
      deleted: {
        receipts: receiptsCount.count,
        purchaseOrders: purchaseOrdersCount.count,
        deliveryNotes: deliveryNotesCount.count,
        issuedInvoices: issuedInvoicesCount.count,
        customerOrders: customerOrdersCount.count,
        transactions: transactionsCount.count,
        inventoryItems: inventoryItemsCount.count,
        reservations: reservationsCount.count,
      },
      preserved: {
        products: productsCount,
        categories: categoriesCount,
        customers: customersCount,
        suppliers: suppliersCount,
        settings: settingsCount,
      },
    })
  } catch (error) {
    console.error('❌ Chyba při resetování databáze:', error)
    return NextResponse.json(
      {
        error: 'Nepodařilo se resetovat databázi',
        details: error instanceof Error ? error.message : 'Neznámá chyba',
      },
      { status: 500 }
    )
  }
}
