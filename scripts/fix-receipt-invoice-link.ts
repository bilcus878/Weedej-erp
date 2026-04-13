// Script pro opravu propojení příjemek s fakturami
// Spustit: npx tsx scripts/fix-receipt-invoice-link.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixReceiptInvoiceLinks() {
  console.log('🔧 Oprava propojení příjemek s fakturami...')

  // Najdi všechny příjemky, které mají purchaseOrderId ale NEMAJÍ receivedInvoiceId
  const receiptsWithoutInvoice = await prisma.receipt.findMany({
    where: {
      purchaseOrderId: { not: null },
      receivedInvoiceId: null
    },
    include: {
      purchaseOrder: {
        include: {
          invoice: true
        }
      }
    }
  })

  console.log(`Našel jsem ${receiptsWithoutInvoice.length} příjemek bez propojení na fakturu`)

  let fixed = 0
  let notFound = 0

  for (const receipt of receiptsWithoutInvoice) {
    if (receipt.purchaseOrder?.invoice) {
      // Propoj příjemku s fakturou
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          receivedInvoiceId: receipt.purchaseOrder.invoice.id
        }
      })

      console.log(`✓ ${receipt.receiptNumber} → ${receipt.purchaseOrder.invoice.invoiceNumber}`)
      fixed++
    } else {
      console.log(`⚠ ${receipt.receiptNumber} - objednávka ${receipt.purchaseOrder?.orderNumber} nemá fakturu`)
      notFound++
    }
  }

  console.log('\n📊 Výsledek:')
  console.log(`  ✓ Opraveno: ${fixed}`)
  console.log(`  ⚠ Nenalezeno: ${notFound}`)
  console.log(`  📝 Celkem: ${receiptsWithoutInvoice.length}`)
}

fixReceiptInvoiceLinks()
  .then(() => {
    console.log('\n✅ Hotovo!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Chyba:', error)
    process.exit(1)
  })
