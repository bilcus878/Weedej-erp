// API Endpoint pro přehled skladu (souhrn po produktech)
// URL: http://localhost:3000/api/inventory/summary

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  calculateCurrentStock,
  calculateExpectedStock,
  calculateReservedStock,
  calculateAvailableStock
} from '@/lib/stockCalculation'

// GET /api/inventory/summary - Získat souhrn skladu (pro každý produkt celkové množství)
export async function GET() {
  try {
    // Získat všechny aktivní produkty
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        inventoryItems: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Pro každý produkt spočítat:
    // - Fyzický sklad (skladem) - reálné množství na skladě
    // - Rezervovaný sklad - objednávky zákazníků
    // - Dostupný sklad - fyzický - rezervovaný
    // - Očekávaný sklad (z objednávek dodavatelů)
    // - Průměrná nákupní cena
    // - Celková hodnota skladu
    const summary = await Promise.all(
      products.map(async (product) => {
        // FYZICKÝ SKLAD - reálné množství na skladě
        const physicalStock = await calculateCurrentStock(product.id)

        // REZERVOVANÝ SKLAD - množství v objednávkách zákazníků
        const reservedStock = await calculateReservedStock(product.id)

        // DOSTUPNÝ SKLAD - fyzický minus rezervovaný
        const availableStock = physicalStock - reservedStock

        // OČEKÁVANÝ SKLAD - z objednávek dodavatelů
        const expectedQuantity = await calculateExpectedStock(product.id)

        // POUZE KLADNÉ POLOŽKY (naskladnění) pro výpočet průměrné ceny
        const stockInItems = product.inventoryItems.filter(item => Number(item.quantity) > 0)

        // Celkové množství naskladněného zboží (pouze příjmy)
        const totalStockedIn = stockInItems.reduce(
          (sum, item) => sum + Number(item.quantity),
          0
        )

        // Celková hodnota naskladněného zboží (pouze příjmy)
        const totalValueOfStockedIn = stockInItems.reduce(
          (sum, item) => sum + (Number(item.quantity) * Number(item.purchasePrice)),
          0
        )

        // Průměrná nákupní cena = celková hodnota naskladnění / celkové naskladněné množství
        const avgPurchasePrice = totalStockedIn > 0
          ? totalValueOfStockedIn / totalStockedIn
          : 0

        // Celková nákupní hodnota FYZICKÉHO skladu = fyzický sklad × průměrná nákupní cena
        const totalPurchaseValue = physicalStock > 0 ? physicalStock * avgPurchasePrice : 0

        // Celková prodejní hodnota FYZICKÉHO skladu = fyzický sklad × prodejní cena
        const totalSalesValue = physicalStock * Number(product.price)

        return {
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          price: product.price, // Prodejní cena (bez DPH)
          vatRate: Number((product as any).vatRate ?? 21), // Sazba DPH produktu
          category: product.category,

          // TŘI STAVY SKLADU PRO E-SHOP
          physicalStock,    // Skladem (fyzické množství)
          reservedStock,    // Rezervováno (objednávky zákazníků)
          availableStock,   // Dostupné (fyzický - rezervovaný)

          expectedQuantity, // Očekáváno (objednávky dodavatelů)
          totalExpectedStock: availableStock + expectedQuantity, // Celkem očekáváno

          avgPurchasePrice, // Průměrná nákupní cena
          totalPurchaseValue, // Celková nákupní hodnota fyzického skladu
          totalSalesValue, // Celková prodejní hodnota fyzického skladu

          stockStatus: physicalStock === 0
            ? 'empty'
            : physicalStock < 10
            ? 'low'
            : 'ok',
        }
      })
    )

    // Seřadit podle názvu
    summary.sort((a, b) => a.productName.localeCompare(b.productName))

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Chyba při načítání přehledu skladu:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst přehled skladu' },
      { status: 500 }
    )
  }
}
