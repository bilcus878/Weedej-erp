// Vyčištění testovacích vystavených faktur
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
})

async function main() {
  console.log('🧹 Mazání VŠECH vystavených faktur a resetování číslování...')

  // 1. Nejprve zkontroluj, kolik jich je
  const count = await prisma.issuedInvoice.count()
  console.log(`📊 Aktuálně v databázi: ${count} vystavených faktur`)

  if (count === 0) {
    console.log('✅ Databáze je již čistá!')
  } else {
    // 2. Smazat všechny vystavené faktury (včetně těch, co mají unique constraint)
    console.log('🗑️  Mazání...')
    const deletedInvoices = await prisma.issuedInvoice.deleteMany({})
    console.log(`✓ Smazáno ${deletedInvoices.count} vystavených faktur`)
  }

  // 3. Resetovat číslování
  const deletedSeries = await prisma.documentSeries.deleteMany({
    where: {
      documentType: {
        in: ['issued-invoice', 'issued_invoice']
      }
    }
  })
  console.log(`✓ Resetováno číslování (smazáno ${deletedSeries.count} záznamů)`)

  // 4. Ověření
  const finalCount = await prisma.issuedInvoice.count()
  console.log(`\n📊 Po vyčištění: ${finalCount} vystavených faktur`)

  console.log('\n✅ Hotovo! Můžeš znovu spustit SumUp synchronizaci.')
}

main()
  .catch((e) => {
    console.error('❌ Chyba:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
