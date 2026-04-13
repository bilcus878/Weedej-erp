// Helper funkce pro automatické vytvoření výdejky z transakce
import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from './documentNumbering'

/**
 * Vytvoří výdejku automaticky z transakce (SumUp nebo vystavená faktura)
 *
 * @param transactionId ID transakce
 * @returns DeliveryNote nebo null pokud transakce nemá položky
 */
export async function createDeliveryNoteFromTransaction(transactionId: string) {
  // Načti transakci s položkami
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { items: true }
  })

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  // Kontrola, že transakce ještě nemá výdejku
  const existingDeliveryNote = await prisma.deliveryNote.findUnique({
    where: { transactionId: transaction.id }
  })

  if (existingDeliveryNote) {
    console.warn(`Transaction ${transactionId} already has a delivery note`)
    return existingDeliveryNote
  }

  const hasItems = transaction.items && transaction.items.length > 0

  // Vytvoř výdejku v transakci (ON-COMMIT číslování)
  const deliveryNote = await prisma.$transaction(async (tx) => {
    // 1. Získej další číslo výdejky (ON-COMMIT) - použij datum transakce pro správný rok!
    const deliveryNumber = await getNextDocumentNumber('delivery-note', tx, transaction.transactionDate)

    // 2. Vytvoř výdejku (i bez položek!)
    const note = await tx.deliveryNote.create({
      data: {
        deliveryNumber,
        transactionId: transaction.id,
        customerId: transaction.customerId,
        customerName: transaction.customerName,
        deliveryDate: transaction.transactionDate,
        status: "active", // ✅ OPRAVEN STATUS: "active" místo "delivered"
        processedAt: new Date(), // Okamžitě zpracováno (pro SumUp)
        note: hasItems ? undefined : 'Transakce nemá položky - doplň je!',
        items: hasItems ? {
          create: transaction.items
            // 🛡️ SENIOR FIX: VYFILTRUJ SLEVY! Výdejka obsahuje jen produkty, ne slevy.
            // Sleva má productId = null a nemá být ve výdejce (neskladuje se sleva!)
            .filter(item => item.productId !== null)
            .map(item => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit
            }))
        } : undefined
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // 3. ✅ Vytvoř skladové pohyby (záporné InventoryItems) a propoj je s výdejkou
    if (hasItems) {
      console.log(`  → Vytvářím skladové pohyby pro ${note.items.length} položek...`)

      for (const deliveryItem of note.items) {
        if (deliveryItem.productId) {
          // Vytvoř záporný InventoryItem pro vyskladnění
          const inventoryItem = await tx.inventoryItem.create({
            data: {
              productId: deliveryItem.productId,
              quantity: -Number(deliveryItem.quantity), // ZÁPORNÉ množství = vyskladnění
              unit: deliveryItem.unit,
              purchasePrice: 0, // Při vyskladnění neřešíme nákupní cenu
              transactionId: transaction.id, // ✅ PROPOJ s transakcí (pro rozkliknutelnost)
              date: transaction.transactionDate, // Datum transakce, ne dnešní datum
              note: null // Poznámka není potřeba - výdejka se zobrazuje v detailu
            }
          })

          // Propoj DeliveryNoteItem s InventoryItem
          await tx.deliveryNoteItem.update({
            where: { id: deliveryItem.id },
            data: {
              inventoryItemId: inventoryItem.id
            }
          })

          console.log(`  ✓ Vytvořen skladový pohyb: ${deliveryItem.product?.name} (${inventoryItem.id}) pro výdejku ${deliveryNumber}`)
        }
      }
    }

    return note
  })

  if (hasItems) {
    console.log(`✓ Vytvořena výdejka ${deliveryNote.deliveryNumber} pro transakci ${transaction.transactionCode} (${transaction.items.length} položek)`)
  } else {
    console.log(`⚠️  Vytvořena výdejka ${deliveryNote.deliveryNumber} pro transakci ${transaction.transactionCode} (BEZ položek - doplň je!)`)
  }

  return deliveryNote
}

/**
 * Vytvoří výdejku (DRAFT) automaticky z objednávky zákazníka
 * NOVÁ LOGIKA: Vytváří výdejku JEN s MNOŽSTVÍM CO ZBÝVÁ (quantity - shippedQuantity)
 * Umožňuje vytvořit VÍCE výdejek pro postupné vyskladnění
 *
 * @param customerOrderId ID objednávky zákazníka
 * @returns DeliveryNote nebo null pokud už je vše vyskladněno
 */
export async function createDeliveryNoteFromCustomerOrder(customerOrderId: string) {
  // Načti objednávku s položkami
  const order = await prisma.customerOrder.findUnique({
    where: { id: customerOrderId },
    include: { items: { include: { product: true } } }
  })

  if (!order) {
    throw new Error('Customer order not found')
  }

  const hasItems = order.items && order.items.length > 0

  if (!hasItems) {
    throw new Error('Objednávka nemá položky')
  }

  // Spočítej zbývající množství pro každou položku
  const remainingItems = order.items
    .map(item => ({
      ...item,
      remainingQuantity: Number(item.quantity) - Number(item.shippedQuantity || 0)
    }))
    .filter(item => item.remainingQuantity > 0) // Jen položky, co ještě zbývají

  if (remainingItems.length === 0) {
    throw new Error('Všechny položky již byly vyskladněny')
  }

  // Vytvoř výdejku v transakci (ON-COMMIT číslování)
  const deliveryNote = await prisma.$transaction(async (tx) => {
    // 1. Získej další číslo výdejky (ON-COMMIT)
    const deliveryNumber = await getNextDocumentNumber('delivery-note', tx)

    // 2. Vytvoř výdejku se statusem DRAFT (čeká na vyskladnění)
    const note = await tx.deliveryNote.create({
      data: {
        deliveryNumber,
        customerOrderId: order.id, // ✅ Propoj s objednávkou (ne deliveryNoteId!)
        customerId: order.customerId,
        customerName: order.customerName,
        deliveryDate: new Date(),
        status: "draft",
        note: `Objednávka ${order.orderNumber} - částečné vyskladnění`,
        items: {
          create: remainingItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.remainingQuantity, // ✅ JEN CO ZBÝVÁ!
            unit: item.unit
          }))
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    return note
  })

  console.log(`✓ Vytvořena výdejka (DRAFT) ${deliveryNote.deliveryNumber} pro objednávku ${order.orderNumber} (${remainingItems.length} položek, zbývá vyskladnit)`)

  return deliveryNote
}

/**
 * Zpracuje výdejku (změní status na "delivered")
 * Kontroluje dostupnost skladu před zpracováním
 *
 * @param deliveryNoteId ID výdejky
 * @param allowNegativeStock Povolit záporný sklad (z nastavení)
 */
export async function processDeliveryNote(
  deliveryNoteId: string,
  allowNegativeStock: boolean = false
) {
  // Načti výdejku
  const deliveryNote = await prisma.deliveryNote.findUnique({
    where: { id: deliveryNoteId },
    include: { items: { include: { product: true } } }
  })

  if (!deliveryNote) {
    throw new Error('Delivery note not found')
  }

  // Kontrola statusu
  if (deliveryNote.status === 'delivered' && deliveryNote.processedAt) {
    throw new Error('Výdejka již byla zpracována')
  }

  if (deliveryNote.status === 'cancelled') {
    throw new Error('Výdejka je zrušena')
  }

  // Kontrola dostupnosti skladu
  if (!allowNegativeStock) {
    const { canDeliverQuantity } = await import('./stockCalculation')

    for (const item of deliveryNote.items) {
      if (item.productId) {
        const check = await canDeliverQuantity(
          item.productId,
          Number(item.quantity),
          allowNegativeStock
        )

        if (!check.canDeliver) {
          throw new Error(check.message || 'Nedostatečný sklad')
        }
      }
    }
  }

  // Zpracuj výdejku
  const updated = await prisma.deliveryNote.update({
    where: { id: deliveryNoteId },
    data: {
      status: 'delivered',
      processedAt: new Date()
    },
    include: {
      items: true
    }
  })

  console.log(`✓ Výdejka ${deliveryNote.deliveryNumber} byla zpracována`)

  return updated
}
