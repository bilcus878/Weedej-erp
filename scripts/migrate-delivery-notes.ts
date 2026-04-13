// Migrační skript pro vytvoření výdejek ze starých transakcí
// Spusť pomocí: npx ts-node scripts/migrate-delivery-notes.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateDeliveryNotes() {
  console.log('🔍 Hledám transakce bez výdejek...')

  // Najdi všechny prodejní transakce (issued, sumup) které nemají výdejku
  const transactionsWithoutDeliveryNotes = await prisma.transaction.findMany({
    where: {
      invoiceType: { in: ['issued', 'sumup'] },
      deliveryNote: null, // Transakce BEZ výdejky
    },
    include: {
      items: true,
      customer: true,
    },
    orderBy: {
      transactionDate: 'asc', // Od nejstarších
    },
  })

  console.log(`📦 Nalezeno ${transactionsWithoutDeliveryNotes.length} transakcí bez výdejek`)

  if (transactionsWithoutDeliveryNotes.length === 0) {
    console.log('✅ Všechny transakce již mají výdejky!')
    return
  }

  // Získej aktuální nastavení číslování
  let settings = await prisma.settings.findUnique({
    where: { id: 'default' },
  })

  if (!settings) {
    console.log('⚠️  Settings neexistuje, vytvářím...')
    settings = await prisma.settings.create({
      data: {
        id: 'default',
        lastDeliveryNoteNumber: 0,
        lastDeliveryNoteYear: 0,
      },
    })
  }

  const currentYear = new Date().getFullYear()
  let deliveryNoteCounter = settings.lastDeliveryNoteNumber || 0
  let deliveryNoteYear = settings.lastDeliveryNoteYear || 0

  // Pokud je nový rok, resetuj čítač
  if (deliveryNoteYear !== currentYear) {
    deliveryNoteCounter = 0
    deliveryNoteYear = currentYear
  }

  let createdCount = 0
  let skippedCount = 0

  console.log('🚀 Začínám migraci...\n')

  for (const transaction of transactionsWithoutDeliveryNotes) {
    // Inkrementuj čítač
    deliveryNoteCounter++
    const deliveryNumber = `VY-${currentYear}${String(deliveryNoteCounter).padStart(4, '0')}`

    const hasItems = transaction.items && transaction.items.length > 0

    try {
      // Vytvoř výdejku (i bez položek!)
      await prisma.deliveryNote.create({
        data: {
          deliveryNumber,
          transactionId: transaction.id,
          customerId: transaction.customerId,
          customerName: transaction.customerName || transaction.customer?.name || null,
          deliveryDate: transaction.transactionDate,
          status: 'delivered', // Už byla doručena
          processedAt: transaction.transactionDate, // Zpracováno v čase transakce
          note: hasItems
            ? `Migrováno ze staré transakce ${transaction.transactionCode}`
            : `Migrováno ze staré transakce ${transaction.transactionCode} - DOPLŇ POLOŽKY!`,
          items: hasItems ? {
            create: transaction.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
            })),
          } : undefined,
        },
      })

      if (hasItems) {
        console.log(`✅ ${deliveryNumber} <- ${transaction.transactionCode} (${transaction.items.length} položek)`)
      } else {
        console.log(`⚠️  ${deliveryNumber} <- ${transaction.transactionCode} (BEZ položek - doplň je!)`)
        skippedCount++
      }
      createdCount++
    } catch (error) {
      console.error(`❌ Chyba při vytváření výdejky pro ${transaction.transactionCode}:`, error)
      // Pokračuj dál, neukončuj celou migraci
    }
  }

  // Ulož aktualizované čítadlo do settings
  await prisma.settings.update({
    where: { id: 'default' },
    data: {
      lastDeliveryNoteNumber: deliveryNoteCounter,
      lastDeliveryNoteYear: currentYear,
    },
  })

  console.log('\n📊 SOUHRN:')
  console.log(`✅ Vytvořeno výdejek celkem: ${createdCount}`)
  console.log(`   - S položkami: ${createdCount - skippedCount}`)
  console.log(`   - Bez položek (doplň je!): ${skippedCount}`)
  console.log(`📝 Aktuální čítač: ${deliveryNoteCounter}`)

  if (skippedCount > 0) {
    console.log('\n💡 NEXT STEP:')
    console.log('   1. Otevři Transakce a doplň položky k transakcím bez položek')
    console.log('   2. Při uložení se položky automaticky propíšou do výdejky')
  }

  console.log('\n🎉 Migrace dokončena!')
}

// Spusť migraci
migrateDeliveryNotes()
  .catch((error) => {
    console.error('💥 Fatální chyba:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
