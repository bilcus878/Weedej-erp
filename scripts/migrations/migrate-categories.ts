// Migrace pro přesun kategorií z Product.category (String) na Category model
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateCategories() {
  console.log('🔄 Začínám migraci kategorií...')

  try {
    // 1. Získej všechny unikátní kategorie z existujících produktů
    const products = await prisma.$queryRaw<{ category: string }[]>`
      SELECT DISTINCT category
      FROM "Product"
      WHERE category IS NOT NULL AND category != ''
    `

    console.log(`📦 Nalezeno ${products.length} unikátních kategorií`)

    // 2. Vytvoř Category záznamy pro každou unikátní kategorii
    for (const { category } of products) {
      await prisma.category.upsert({
        where: { name: category },
        update: {},
        create: { name: category },
      })
      console.log(`✅ Kategorie "${category}" vytvořena`)
    }

    console.log('✨ Migrace dokončena!')
  } catch (error) {
    console.error('❌ Chyba při migraci:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateCategories()
