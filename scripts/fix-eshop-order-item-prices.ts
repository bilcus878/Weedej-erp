/**
 * Migrace starých dat: oprava CustomerOrderItem z eshop objednávek
 *
 * Problém: Starý webhook posílal qty=5 (gramy) + unitPriceCzk = cena balení (702 Kč)
 * místo ceny za gram (140 Kč). ERP pak uložil priceWithVat=850/g × qty=5 → rowTotal=4250 (CHYBA).
 *
 * Fix: pro všechna CustomerOrderItem ze zdroje 'eshop' kde unit != 'ks':
 *   - nastavit quantity=1, unit='ks'
 *   - price, priceWithVat, vatAmount zůstávají (jsou to ceny balení, ne ceny/g)
 *
 * Spuštění: npx ts-node scripts/fix-eshop-order-item-prices.ts
 * nebo:     npx tsx scripts/fix-eshop-order-item-prices.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Spouštím migraci eshop order item cen...')

  // Najdi všechna CustomerOrderItem z eshop objednávek kde unit není ks
  const brokenItems = await prisma.customerOrderItem.findMany({
    where: {
      customerOrder: { source: 'eshop' },
      unit: { not: 'ks' },
    },
    include: {
      customerOrder: { select: { orderNumber: true, totalAmount: true } },
    },
  })

  if (brokenItems.length === 0) {
    console.log('✓ Žádné položky k opravě — data jsou v pořádku.')
    return
  }

  console.log(`Nalezeno ${brokenItems.length} položek ke kontrole...`)

  let fixed = 0
  let skipped = 0

  for (const item of brokenItems) {
    const qty          = Number(item.quantity)
    const priceWithVat = Number(item.priceWithVat)
    const orderTotal   = Number(item.customerOrder.totalAmount)

    // Detekce "starého" záznamu: rowTotal (priceWithVat × qty) výrazně přesahuje totalAmount objednávky
    const rowTotal = priceWithVat * qty
    const isLikelyBroken = rowTotal > orderTotal * 1.05

    if (!isLikelyBroken) {
      skipped++
      continue
    }

    // Oprava: qty=1, unit='ks' — cena zůstává (je to cena balení)
    await prisma.customerOrderItem.update({
      where: { id: item.id },
      data: {
        quantity: 1,
        unit: 'ks',
      },
    })

    console.log(
      `  ✓ Opraveno: objednávka ${item.customerOrder.orderNumber} | ` +
      `produkt: ${item.productName} | ` +
      `${qty} ${item.unit} → 1 ks | ` +
      `priceWithVat: ${priceWithVat} Kč (zůstává)`
    )
    fixed++
  }

  console.log(`\nHotovo: ${fixed} opraveno, ${skipped} přeskočeno (vypadalo OK).`)
}

main()
  .catch((e) => {
    console.error('Chyba při migraci:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
