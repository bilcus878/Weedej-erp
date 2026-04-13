// Script pro reset databáze (zachová produkty a kategorie)

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Mažu data (kromě produktů a kategorií)...\n')

  try {
    // Smažeme v správném pořadí kvůli foreign key constraints

    console.log('  → Mažu ReceiptItems...')
    await prisma.receiptItem.deleteMany({})

    console.log('  → Mažu ReceivedInvoices...')
    await prisma.receivedInvoice.deleteMany({})

    console.log('  → Mažu Receipts...')
    await prisma.receipt.deleteMany({})

    console.log('  → Mažu PurchaseOrderItems...')
    await prisma.purchaseOrderItem.deleteMany({})

    console.log('  → Mažu PurchaseOrders...')
    await prisma.purchaseOrder.deleteMany({})

    console.log('  → Mažu DeliveryNoteItems...')
    await prisma.deliveryNoteItem.deleteMany({})

    console.log('  → Mažu DeliveryNotes...')
    await prisma.deliveryNote.deleteMany({})

    console.log('  → Mažu CustomerOrderItems...')
    await prisma.customerOrderItem.deleteMany({})

    console.log('  → Mažu CustomerOrders...')
    await prisma.customerOrder.deleteMany({})

    console.log('  → Mažu TransactionItems...')
    await prisma.transactionItem.deleteMany({})

    console.log('  → Mažu Transactions...')
    await prisma.transaction.deleteMany({})

    console.log('  → Mažu InventoryItems...')
    await prisma.inventoryItem.deleteMany({})

    console.log('  → Mažu Reservations...')
    await prisma.reservation.deleteMany({})

    console.log('  → Mažu Customers...')
    await prisma.customer.deleteMany({})

    console.log('  → Mažu Suppliers...')
    await prisma.supplier.deleteMany({})

    console.log('\n✅ Databáze resetována!')
    console.log('\n📦 Zachováno:')

    const productCount = await prisma.product.count()
    const categoryCount = await prisma.category.count()

    console.log(`  → Produkty: ${productCount}`)
    console.log(`  → Kategorie: ${categoryCount}`)

  } catch (error) {
    console.error('\n❌ Chyba při resetování databáze:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
