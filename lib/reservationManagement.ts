// Správa rezervací skladu pro e-shop objednávky
// Rezervace zajišťuje, že objednané zboží nebude mezitím prodáno jinému zákazníkovi

import { prisma } from '@/lib/prisma'

/**
 * Vytvoří rezervace pro novou objednávku
 * Volá se automaticky při vytvoření CustomerOrder
 * @param customerOrderId ID objednávky
 * @param items Položky objednávky
 * @param tx Transakční klient (pokud voláno uvnitř transakce)
 */
export async function createReservations(
  customerOrderId: string,
  items: Array<{ productId: string | null; quantity: number; unit: string }>,
  tx?: any
) {
  const client = tx || prisma
  const reservations = []

  for (const item of items) {
    // Rezervace jen pro produkty z katalogu (ne manuální položky)
    if (item.productId) {
      const reservation = await client.reservation.create({
        data: {
          customerOrderId,
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          status: 'active'
        }
      })
      reservations.push(reservation)
    }
  }

  return reservations
}

/**
 * Zruší všechny rezervace pro danou objednávku
 * Volá se když je objednávka zrušena (status = 'cancelled')
 * @param tx Transakční klient — VŽDY předej tx pokud voláno uvnitř transakce
 */
export async function cancelReservations(customerOrderId: string, tx?: any) {
  const client = tx || prisma
  return client.reservation.updateMany({
    where: {
      customerOrderId,
      status: 'active',
    },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
    },
  })
}

/**
 * Splní rezervace (označí je jako fulfilled)
 * Volá se když je objednávka odeslána (status = 'shipped')
 * V tu chvíli se vytvoří výdejka, která reálně vyskladní zboží
 * @param tx Transakční klient — VŽDY předej tx pokud voláno uvnitř transakce
 */
export async function fulfillReservations(customerOrderId: string, tx?: any) {
  const client = tx || prisma
  return client.reservation.updateMany({
    where: {
      customerOrderId,
      status: 'active',
    },
    data: {
      status: 'fulfilled',
      fulfilledAt: new Date(),
    },
  })
}

/**
 * Vypočítá celkové rezervované množství pro daný produkt
 * Vrátí pouze aktivní rezervace (status = 'active')
 */
export async function calculateReservedStock(productId: string): Promise<number> {
  const result = await prisma.reservation.aggregate({
    where: {
      productId,
      status: 'active' // Jen aktivní rezervace
    },
    _sum: {
      quantity: true
    }
  })

  return Number(result._sum.quantity || 0)
}

/**
 * Zkontroluje, zda je možné rezervovat dané množství produktu
 * Bere v úvahu současný fyzický sklad a již existující rezervace
 */
export async function canReserveQuantity(
  productId: string,
  quantity: number
): Promise<{
  canReserve: boolean
  availableStock: number
  message?: string
}> {
  // Importuj funkci pro výpočet fyzického skladu
  const { calculateCurrentStock } = await import('@/lib/stockCalculation')

  const physicalStock = await calculateCurrentStock(productId)
  const reservedStock = await calculateReservedStock(productId)
  const availableStock = physicalStock - reservedStock

  if (availableStock < quantity) {
    return {
      canReserve: false,
      availableStock,
      message: `Nedostatečný dostupný sklad. Skladem: ${physicalStock}, rezervováno: ${reservedStock}, dostupné: ${availableStock}, požadováno: ${quantity}`
    }
  }

  return {
    canReserve: true,
    availableStock
  }
}

/**
 * Získá všechny aktivní rezervace pro daný produkt
 * Užitečné pro přehled, kdo má produkt rezervovaný
 */
export async function getActiveReservationsForProduct(productId: string) {
  return await prisma.reservation.findMany({
    where: {
      productId,
      status: 'active'
    },
    include: {
      customerOrder: {
        include: {
          customer: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  })
}
