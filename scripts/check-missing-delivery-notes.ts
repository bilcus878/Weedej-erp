// Skript pro kontrolu a doplnění chybějících výdejek
// Spusť pomocí: npx tsx scripts/check-missing-delivery-notes.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAndCreateMissingDeliveryNotes() {
  console.log('🔍 Kontroluji transakce bez výdejek...\n')

  // Najdi všechny prodejní transakce (issued, sumup) které NEMAJÍ výdejku
  const transactionsWithoutDeliveryNotes = await prisma.transaction.findMany({
    where: {
      invoiceType: { in: ['issued', 'sumup'] },
      deliveryNote: null,
    },
    include: {
      items: true,
      customer: true,
    },
    orderBy: {
      transactionDate: 'asc',
    },
  })

  console.log(`📊 STAV:`)
  console.log(`   Transakcí bez výdejky: ${transactionsWithoutDeliveryNotes.length}\n`)

  if (transactionsWithoutDeliveryNotes.length === 0) {
    console.log('✅ Perfektní! Všechny transakce mají výdejky!')
    return
  }

  // Rozdělíme na ty s položkami a ty bez
  const withItems = transactionsWithoutDeliveryNotes.filter(t => t.items && t.items.length > 0)
  const withoutItems = transactionsWithoutDeliveryNotes.filter(t => !t.items || t.items.length === 0)

  console.log(`📦 Transakce S položkami (VYTVOŘÍM výdejky): ${withItems.length}`)
  if (withItems.length > 0) {
    withItems.forEach(t => {
      console.log(`   - ${t.transactionCode} (${t.items.length} položek)`)
    })
  }

  console.log(`\n⚠️  Transakce BEZ položek (PŘESKOČÍM): ${withoutItems.length}`)
  if (withoutItems.length > 0) {
    withoutItems.forEach(t => {
      console.log(`   - ${t.transactionCode} - DOPLŇ POLOŽKY A SPUSŤ ZNOVU!`)
    })
  }

  if (withItems.length === 0) {
    console.log('\n💡 Nejsou žádné transakce s položkami k vytvoření výdejek.')
    console.log('   Pokud jsi doplnil položky, možná potřebuješ restartovat aplikaci.')
    return
  }

  console.log('\n❓ Chceš vytvořit výdejky pro transakce s položkami? (y/n)')

  // Automaticky pokračuj (pro skript)
  console.log('🚀 Automaticky pokračuji...\n')

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

  if (deliveryNoteYear !== currentYear) {
    deliveryNoteCounter = 0
    deliveryNoteYear = currentYear
  }

  let createdCount = 0

  for (const transaction of withItems) {
    deliveryNoteCounter++
    const deliveryNumber = `VY-${currentYear}${String(deliveryNoteCounter).padStart(4, '0')}`

    try {
      await prisma.deliveryNote.create({
        data: {
          deliveryNumber,
          transactionId: transaction.id,
          customerId: transaction.customerId,
          customerName: transaction.customerName || transaction.customer?.name || null,
          deliveryDate: transaction.transactionDate,
          status: 'delivered',
          processedAt: transaction.transactionDate,
          note: `Automaticky vytvořeno ze transakce ${transaction.transactionCode}`,
          items: {
            create: transaction.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
            })),
          },
        },
      })

      console.log(`✅ ${deliveryNumber} <- ${transaction.transactionCode} (${transaction.items.length} položek)`)
      createdCount++
    } catch (error) {
      console.error(`❌ Chyba při vytváření výdejky pro ${transaction.transactionCode}:`, error)
    }
  }

  // Ulož aktualizované čítadlo
  await prisma.settings.update({
    where: { id: 'default' },
    data: {
      lastDeliveryNoteNumber: deliveryNoteCounter,
      lastDeliveryNoteYear: currentYear,
    },
  })

  console.log('\n' + '='.repeat(50))
  console.log('📊 VÝSLEDEK:')
  console.log(`✅ Vytvořeno nových výdejek: ${createdCount}`)
  console.log(`⏭️  Přeskočeno (nemají položky): ${withoutItems.length}`)
  console.log(`📝 Nový čítač výdejek: ${deliveryNoteCounter}`)

  if (withoutItems.length > 0) {
    console.log('\n💡 TIP:')
    console.log('   Pro transakce bez položek:')
    console.log('   1. Otevři transakci v aplikaci')
    console.log('   2. Doplň položky')
    console.log('   3. Spusť tento skript znovu: npx tsx scripts/check-missing-delivery-notes.ts')
  }

  console.log('\n🎉 Hotovo!')
}

checkAndCreateMissingDeliveryNotes()
  .catch((error) => {
    console.error('💥 Chyba:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
