// Skript pro smazání všech výdejek a reset číslování
// ⚠️  VAROVÁNÍ: Toto smaže VŠECHNY výdejky!
// Spusť pomocí: npx tsx scripts/reset-delivery-notes.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetDeliveryNotes() {
  console.log('⚠️  ========================================')
  console.log('⚠️  RESET VÝDEJEK')
  console.log('⚠️  Toto smaže VŠECHNY výdejky!')
  console.log('⚠️  ========================================\n')

  // Zjisti aktuální počet výdejek
  const currentCount = await prisma.deliveryNote.count()

  if (currentCount === 0) {
    console.log('✅ Žádné výdejky k smazání.')
    console.log('📝 Číslování je již resetováno.\n')
    return
  }

  console.log(`📦 Nalezeno ${currentCount} výdejek\n`)
  console.log('🚀 Začínám mazání...\n')

  try {
    // 1. Smaž všechny položky výdejek
    const deletedItems = await prisma.deliveryNoteItem.deleteMany({})
    console.log(`   ✅ Smazáno ${deletedItems.count} položek výdejek`)

    // 2. Smaž všechny výdejky
    const deletedNotes = await prisma.deliveryNote.deleteMany({})
    console.log(`   ✅ Smazáno ${deletedNotes.count} výdejek`)

    // 3. Resetuj čítadlo v settings
    const settings = await prisma.settings.findUnique({
      where: { id: 'default' }
    })

    if (settings) {
      await prisma.settings.update({
        where: { id: 'default' },
        data: {
          lastDeliveryNoteNumber: 0,
          lastDeliveryNoteYear: 0
        }
      })
      console.log(`   ✅ Resetováno číslování výdejek na 0`)
    }

    console.log('\n✅ HOTOVO!')
    console.log('📝 Další výdejka bude mít číslo: VY-20250001')
    console.log('\n💡 Pro vytvoření nových výdejek spusť:')
    console.log('   npx tsx scripts/migrate-delivery-notes.ts')

  } catch (error) {
    console.error('\n❌ Chyba při mazání:', error)
    throw error
  }
}

// Spusť reset
resetDeliveryNotes()
  .catch((error) => {
    console.error('💥 Fatální chyba:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
