import { prisma }      from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import type { DateRange } from '@/lib/analytics/dateRange'
import type { ProductsReport } from '../types'

interface ProductServiceParams { range: DateRange }

export async function getProductsReport({ range }: ProductServiceParams): Promise<ProductsReport> {
  const items = await prisma.customerOrderItem.findMany({
    where: {
      customerOrder: {
        orderDate: { gte: range.from, lte: range.to },
        status:    { not: 'storno' },
      },
    },
    select: {
      productId:   true,
      productName: true,
      quantity:    true,
      price:       true,
      customerOrder: { select: { orderDate: true } },
      product: { select: { category: { select: { name: true } } } },
    },
  })

  const productMap: Record<string, { productName: string; quantity: number; revenue: number; category: string }> = {}
  for (const item of items) {
    const k = item.productId ?? item.productName ?? 'Neznámý'
    if (!productMap[k]) productMap[k] = { productName: item.productName ?? k, quantity: 0, revenue: 0, category: item.product?.category?.name ?? 'Bez kategorie' }
    const qty = Number(item.quantity)
    const rev = qty * Number(item.price ?? 0)
    productMap[k].quantity += qty
    productMap[k].revenue  += rev
  }

  const allProducts = Object.values(productMap)
  const topByRevenue = [...allProducts].sort((a, b) => b.revenue - a.revenue).slice(0, 15)
  const topByQty     = [...allProducts].sort((a, b) => b.quantity - a.quantity).slice(0, 15)

  const catMap: Record<string, { revenue: number; quantity: number }> = {}
  for (const p of allProducts) {
    if (!catMap[p.category]) catMap[p.category] = { revenue: 0, quantity: 0 }
    catMap[p.category].revenue  += p.revenue
    catMap[p.category].quantity += p.quantity
  }
  const categoryBreakdown = Object.entries(catMap)
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.revenue - a.revenue)

  const totalSold      = allProducts.reduce((s, p) => s + p.quantity, 0)
  const uniqueProducts = allProducts.length

  return {
    totalSold:        { label: 'Prodaných kusů',    value: totalSold,      formatted: `${totalSold.toFixed(1)}` },
    uniqueProducts:   { label: 'Unikátních produktů', value: uniqueProducts, formatted: String(uniqueProducts) },
    topByRevenue:     topByRevenue.map(p => ({ productName: p.productName, quantity: p.quantity, revenue: p.revenue })),
    topByQty:         topByQty.map(p    => ({ productName: p.productName, quantity: p.quantity, revenue: p.revenue })),
    categoryBreakdown,
  }
}
