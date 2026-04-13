// API Endpoint pro statistiky (pro dashboard)
// URL: http://localhost:3000/api/stats

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // ✅ OPRAVENO: Celková hodnota AKTUÁLNÍHO skladu (ne všeho naskladněného!)
    const products = await prisma.product.findMany({
      include: {
        inventoryItems: true,
        transactionItems: {
          include: {
            transaction: true,
          },
        },
      },
    })

    let totalInventoryValue = 0
    let lowStockCount = 0
    let outOfStockCount = 0

    products.forEach(product => {
      // Naskladněno celkem
      const totalStocked = product.inventoryItems.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
      )

      // Prodáno celkem (pouze prodeje, ne příjaté faktury!)
      const totalSold = product.transactionItems.reduce((sum, item) => {
        if (item.transaction.invoiceType !== 'received') {
          return sum + Number(item.quantity)
        }
        return sum
      }, 0)

      // Aktuální stav = Naskladněno - Prodáno
      const currentStock = totalStocked - totalSold

      // Průměrná nákupní cena
      const totalValueOfAllStocked = product.inventoryItems.reduce(
        (sum, item) => sum + (Number(item.quantity) * Number(item.purchasePrice)),
        0
      )
      const avgPurchasePrice = totalStocked > 0 ? totalValueOfAllStocked / totalStocked : 0

      // Hodnota aktuálního skladu = aktuální množství × průměrná nákupní cena
      totalInventoryValue += currentStock * avgPurchasePrice

      // Počítej stavy skladu
      if (currentStock === 0) {
        outOfStockCount++
      } else if (currentStock < 10) {
        lowStockCount++
      }
    })

    // ✅ OPRAVENO: Tržby dnes (POUZE prodeje, ne příjaté faktury!)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayTransactions = await prisma.transaction.findMany({
      where: {
        transactionDate: {
          gte: today,
          lt: tomorrow,
        },
        invoiceType: {
          in: ['issued', 'sumup'], // POUZE prodeje (vystavené FA + SumUp)
        },
        status: {
          in: ['completed', 'SUCCESSFUL'], // SumUp používá 'SUCCESSFUL'
        },
      },
    })

    const todayRevenue = todayTransactions.reduce(
      (sum, tx) => sum + Number(tx.totalAmount),
      0
    )

    // ✅ OPRAVENO: Tržby tento měsíc (POUZE prodeje!)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthTransactions = await prisma.transaction.findMany({
      where: {
        transactionDate: {
          gte: firstDayOfMonth,
        },
        invoiceType: {
          in: ['issued', 'sumup'], // POUZE prodeje
        },
        status: {
          in: ['completed', 'SUCCESSFUL'],
        },
      },
    })

    const monthRevenue = monthTransactions.reduce(
      (sum, tx) => sum + Number(tx.totalAmount),
      0
    )

    // Počet produktů
    const productCount = await prisma.product.count()

    // ✅ NOVÉ: Nejprodávanější produkt tento měsíc
    const monthTransactionItems = await prisma.transactionItem.findMany({
      where: {
        transaction: {
          transactionDate: {
            gte: firstDayOfMonth,
          },
          invoiceType: {
            in: ['issued', 'sumup'],
          },
          status: {
            in: ['completed', 'SUCCESSFUL'],
          },
        },
      },
      include: {
        product: true,
      },
    })

    // Sečti prodané množství pro každý produkt
    const productSales = monthTransactionItems.reduce((acc, item) => {
      if (!item.product) return acc

      const productId = item.productId || ''
      if (!acc[productId]) {
        acc[productId] = {
          productName: item.product.name,
          totalQuantity: 0,
          unit: item.unit,
        }
      }
      acc[productId].totalQuantity += Number(item.quantity)
      return acc
    }, {} as Record<string, { productName: string; totalQuantity: number; unit: string }>)

    // Najdi nejprodávanější produkt
    const topProduct = Object.values(productSales).sort((a, b) => b.totalQuantity - a.totalQuantity)[0] || null

    // ✅ NOVÉ: Průměrný prodej za den (tržby měsíce / počet dní v měsíci)
    const currentDay = today.getDate()
    const avgDailyRevenue = currentDay > 0 ? monthRevenue / currentDay : 0

    // ✅ NOVÉ: Poměr hotovost vs karta (tento měsíc)
    const cashRevenue = monthTransactions
      .filter(tx => tx.paymentType === 'cash')
      .reduce((sum, tx) => sum + Number(tx.totalAmount), 0)

    const cardRevenue = monthTransactions
      .filter(tx => tx.paymentType === 'card')
      .reduce((sum, tx) => sum + Number(tx.totalAmount), 0)

    const totalPayments = cashRevenue + cardRevenue
    const cashPercentage = totalPayments > 0 ? (cashRevenue / totalPayments) * 100 : 0
    const cardPercentage = totalPayments > 0 ? (cardRevenue / totalPayments) * 100 : 0

    // ✅ NOVÉ: Počet transakcí dnes/měsíc
    const todayTransactionCount = todayTransactions.length
    const monthTransactionCount = monthTransactions.length

    return NextResponse.json({
      // Základní statistiky
      totalInventoryValue, // ✅ Hodnota AKTUÁLNÍHO skladu
      todayRevenue, // ✅ Pouze prodeje dnes
      monthRevenue, // ✅ Pouze prodeje tento měsíc
      productCount,
      lowStockCount, // ✅ Počítá správně (naskladněno - prodáno)
      outOfStockCount, // ✅ Počítá správně

      // ✅ NOVÉ statistiky
      topProduct: topProduct ? {
        name: topProduct.productName,
        quantity: topProduct.totalQuantity,
        unit: topProduct.unit,
      } : null,
      avgDailyRevenue, // Průměrný prodej za den
      cashRevenue,
      cardRevenue,
      cashPercentage,
      cardPercentage,
      todayTransactionCount,
      monthTransactionCount,
    })
  } catch (error) {
    console.error('Chyba při načítání statistik:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst statistiky' },
      { status: 500 }
    )
  }
}
