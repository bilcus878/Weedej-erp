// Utility funkce pro výpočet stavu skladu
import { prisma } from '@/lib/prisma'

/**
 * Vypočítá aktuální stav skladu pro produkt
 *
 * NOVÝ SYSTÉM (2026):
 * - Příjmy: InventoryItems s KLADNÝM množstvím (naskladnění z příjemek)
 * - Výdeje: InventoryItems se ZÁPORNÝM množstvím (vyskladnění z výdejek)
 * - Reálný sklad = Součet všech InventoryItems (kladné + záporné)
 *
 * Tento systém je jednodušší a jednotný - VŠECHNY pohyby skladu jsou v InventoryItems!
 */
export async function calculateCurrentStock(productId: string): Promise<number> {
  // Součet VŠECH InventoryItems (kladné = příjem, záporné = výdej)
  const total = await prisma.inventoryItem.aggregate({
    where: { productId },
    _sum: { quantity: true }
  })

  return Number(total._sum.quantity || 0)
}

/**
 * Vypočítá očekávaný sklad z objednávek
 *
 * Vrací ZBÝVAJÍCÍ množství z PurchaseOrderItems kde status objednávky je:
 * - pending (čeká)
 * - confirmed (potvrzena)
 * - partially_received (částečně přijata)
 *
 * Počítá se jako: quantity - alreadyReceivedQuantity
 * (objednané - už přijaté = ještě očekáváme)
 */
export async function calculateExpectedStock(productId: string): Promise<number> {
  // Musíme načíst položky a spočítat rozdíl ručně, protože aggregate neumí počítat rozdíly mezi poli
  const orderItems = await prisma.purchaseOrderItem.findMany({
    where: {
      productId,
      purchaseOrder: {
        status: { in: ["pending", "confirmed", "partially_received"] }
      }
    },
    select: {
      quantity: true,
      alreadyReceivedQuantity: true
    }
  })

  // Součet (objednané - už přijaté) pro každou položku
  const expectedTotal = orderItems.reduce((sum, item) => {
    const remaining = Number(item.quantity) - Number(item.alreadyReceivedQuantity)
    return sum + remaining
  }, 0)

  return expectedTotal
}

/**
 * Vypočítá celkový očekávaný stav skladu
 * Reálný sklad + Očekávaný příjem z objednávek
 */
export async function calculateTotalExpectedStock(productId: string): Promise<number> {
  const currentStock = await calculateCurrentStock(productId)
  const expectedStock = await calculateExpectedStock(productId)

  return currentStock + expectedStock
}

/**
 * Kontrola, zda je možné vyskladnit zadané množství
 *
 * @param productId ID produktu
 * @param quantity Množství k vyskladnění
 * @param allowNegative Povolit záporný sklad (z nastavení)
 * @returns { canDeliver: boolean, currentStock: number, message?: string }
 */
export async function canDeliverQuantity(
  productId: string,
  quantity: number,
  allowNegative: boolean = false
): Promise<{
  canDeliver: boolean
  currentStock: number
  message?: string
}> {
  const currentStock = await calculateCurrentStock(productId)

  // Pokud je povolený záporný sklad, vždy lze vyskladnit
  if (allowNegative) {
    return {
      canDeliver: true,
      currentStock
    }
  }

  // Kontrola, zda je dostatek skladu
  if (currentStock < quantity) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, unit: true }
    })

    return {
      canDeliver: false,
      currentStock,
      message: `Nedostatečný sklad pro ${product?.name || 'produkt'}. Aktuální stav: ${currentStock} ${product?.unit || 'ks'}, požadováno: ${quantity} ${product?.unit || 'ks'}`
    }
  }

  return {
    canDeliver: true,
    currentStock
  }
}

/**
 * Vypočítá rezervované množství pro produkt v základních jednotkách (g/ml/ks).
 *
 * Variantní položky (unit='ks', variantValue nastaveno) se převádějí:
 *   reservedBase = quantity × variantValue   (např. 2 ks × 3 ml = 6 ml)
 * Ostatní položky (unit='ml'/'g'/'ks' bez variantValue):
 *   reservedBase = quantity
 *
 * Záměrně nepoužívá aggregate._sum — potřebujeme per-řádkový výpočet s variantValue.
 */
export async function calculateReservedStock(productId: string): Promise<number> {
  const reservations = await prisma.reservation.findMany({
    where: { productId, status: 'active' },
    select: { quantity: true, unit: true, variantValue: true, variantUnit: true },
  })

  return reservations.reduce((sum, r) => {
    const qty = Number(r.quantity)
    const vv  = r.variantValue != null ? Number(r.variantValue) : null
    const vu  = r.variantUnit
    // Variant: unit='ks' s nastavenou variantValue v g/ml
    const isVariant = r.unit === 'ks' && vv != null && vu != null && vu !== 'ks'
    return sum + (isVariant ? qty * vv! : qty)
  }, 0)
}

/**
 * Vypočítá dostupné množství pro produkt
 * Dostupné = Fyzický sklad - Rezervace
 */
export async function calculateAvailableStock(productId: string): Promise<number> {
  const physicalStock = await calculateCurrentStock(productId)
  const reservedStock = await calculateReservedStock(productId)

  return physicalStock - reservedStock
}

/**
 * Získá shrnutí stavu skladu pro všechny produkty
 * Používá se pro zobrazení v inventory page
 *
 * Vrací 3 hodnoty skladu:
 * - physicalStock (Skladem): Reálné fyzické množství
 * - reservedStock (Rezervováno): Množství v aktivních objednávkách
 * - availableStock (Dostupné): Fyzický sklad - Rezervace
 */
export async function getAllProductsStock(): Promise<Array<{
  productId: string
  productName: string
  unit: string
  physicalStock: number      // Fyzický sklad (skladem)
  reservedStock: number      // Rezervované množství
  availableStock: number     // Dostupné = Fyzický - Rezervace
  expectedStock: number      // Očekáváno z objednávek
  totalExpectedStock: number // Celkem očekáváno = Dostupné + Očekáváno
}>> {
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, name: true, unit: true }
  })

  const stockData = await Promise.all(
    products.map(async (product) => {
      const physicalStock = await calculateCurrentStock(product.id)
      const reservedStock = await calculateReservedStock(product.id)
      const availableStock = physicalStock - reservedStock
      const expectedStock = await calculateExpectedStock(product.id)

      return {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        physicalStock,      // Skladem
        reservedStock,      // Rezervováno
        availableStock,     // Dostupné
        expectedStock,      // Očekáváno
        totalExpectedStock: availableStock + expectedStock // Celkem očekáváno
      }
    })
  )

  return stockData
}
