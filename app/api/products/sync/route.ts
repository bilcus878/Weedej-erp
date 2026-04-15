// API Endpoint pro synchronizaci produktů ze SumUp
// URL: http://localhost:3000/api/products/sync

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchSumUpItems } from '@/lib/sumup'

export const dynamic = 'force-dynamic'

// POST /api/products/sync - Synchronizovat produkty ze SumUp Items API
export async function POST() {
  try {
    console.log('='.repeat(80))
    console.log('ZAČÍNÁM SYNCHRONIZACI PRODUKTŮ ZE SUMUP ITEMS API')
    console.log('='.repeat(80))

    // 1. Stáhnout produkty ze SumUp Items API (/me/items)
    const sumupProducts = await fetchSumUpItems()

    // 2. Pro každý produkt: buď vytvoř nový, nebo aktualizuj existující
    const syncedProducts = []

    for (const sumupProduct of sumupProducts) {
      // Pokud produkt má kategorii, najdi nebo vytvoř kategorii
      let categoryId: string | null = null
      if (sumupProduct.category) {
        const category = await prisma.category.upsert({
          where: { name: sumupProduct.category },
          update: {},
          create: {
            name: sumupProduct.category,
            sumupId: null, // SumUp kategorie nemají ID
          },
        })
        categoryId = category.id
      }

      // Zkontroluj jestli produkt existuje
      const existingProduct = await prisma.product.findUnique({
        where: { sumupId: sumupProduct.id },
      })

      let product
      if (existingProduct) {
        // Produkt existuje -> NEMĚŇ NIC! Nech uživatelské úpravy
        product = existingProduct
      } else {
        // Produkt neexistuje -> Vytvoř nový
        product = await prisma.product.create({
          data: {
            sumupId: sumupProduct.id,
            name: sumupProduct.name,
            price: sumupProduct.price,
            categoryId,
            unit: 'ks', // Defaultní jednotka
          },
        })
      }

      syncedProducts.push(product)
    }

    const created = syncedProducts.filter(p => p.createdAt === p.updatedAt).length
    const updated = syncedProducts.length - created

    console.log('='.repeat(80))
    console.log('SYNCHRONIZACE DOKONČENA')
    console.log(`Celkem: ${syncedProducts.length}, Nových: ${created}, Aktualizovaných: ${updated}`)
    console.log('='.repeat(80))

    return NextResponse.json({
      message: `Synchronizováno ${syncedProducts.length} produktů (${created} nových, ${updated} aktualizovaných)`,
      total: syncedProducts.length,
      created,
      updated,
      products: syncedProducts,
    })
  } catch (error) {
    console.error('Chyba při synchronizaci produktů:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se synchronizovat produkty ze SumUp' },
      { status: 500 }
    )
  }
}
