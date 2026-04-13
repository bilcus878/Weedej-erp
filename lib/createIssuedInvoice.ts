// Helper funkce pro automatické vytvoření vystavené faktury
import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from './documentNumbering'

/**
 * Vytvoří vystavenou fakturu automaticky z SumUp transakce
 *
 * @param transactionId ID transakce
 * @param deliveryNoteId ID výdejky (pokud existuje)
 * @returns IssuedInvoice
 */
export async function createIssuedInvoiceFromTransaction(
  transactionId: string,
  deliveryNoteId?: string
) {
  // Načti transakci
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { items: true }
  })

  if (!transaction) {
    throw new Error('Transaction not found')
  }

  // Kontrola, že transakce ještě nemá fakturu
  const existingInvoice = await prisma.issuedInvoice.findUnique({
    where: { transactionId: transactionId }
  })

  if (existingInvoice) {
    console.warn(`Transaction ${transactionId} already has an issued invoice`)
    return existingInvoice
  }

  // Vytvoř vystavenou fakturu v transakci (ON-COMMIT číslování)
  const invoice = await prisma.$transaction(async (tx) => {
    // 1. Získej další číslo faktury (ON-COMMIT) - použij datum transakce pro správný rok!
    const invoiceNumber = await getNextDocumentNumber('issued-invoice', tx, transaction.transactionDate)

    // 2. Vytvoř vystavenou fakturu
    // ⚠️ VŠECHNY SUMUP FAKTURY jsou "Anonymní zákazník"
    return await tx.issuedInvoice.create({
      data: {
        invoiceNumber,
        transactionId: transactionId, // ✅ OPRAVENO: používáme transaction.id místo transaction.sumupId
        deliveryNoteId: deliveryNoteId,
        customerId: transaction.customerId,
        customerName: transaction.customerName || 'Anonymní zákazník', // ✅ SumUp transakce jsou vždy anonymní
        invoiceDate: transaction.transactionDate,
        totalAmount: transaction.totalAmount,
        totalAmountWithoutVat: transaction.totalAmountWithoutVat || transaction.totalAmount,
        totalVatAmount: transaction.totalVatAmount || 0,
        paymentType: transaction.paymentType,
        paymentStatus: 'paid', // SumUp transakce jsou vždy zaplacené
        status: 'active',
        // Položky faktury z transakce (s DPH)
        items: {
          create: transaction.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price || 0,
            vatRate: item.vatRate || 21,
            vatAmount: item.vatAmount || 0,
            priceWithVat: item.priceWithVat || item.price || 0,
          }))
        }
      }
    })
  })

  console.log(`✓ Vytvořena vystavená faktura ${invoice.invoiceNumber} pro SumUp transakci ${transaction.transactionCode}`)

  return invoice
}

/**
 * Vytvoří vystavenou fakturu pro objednávku zákazníka
 *
 * @param customerOrderId ID objednávky
 * @param paymentDetails Platební údaje z formuláře (dueDate, paymentType, variableSymbol, atd.)
 * @returns IssuedInvoice
 */
export async function createIssuedInvoiceFromCustomerOrder(
  customerOrderId: string,
  paymentDetails?: {
    dueDate?: string
    paymentType?: string
    variableSymbol?: string
    constantSymbol?: string
    specificSymbol?: string
  }
) {
  // Načti objednávku včetně zákazníka
  const order = await prisma.customerOrder.findUnique({
    where: { id: customerOrderId },
    include: {
      items: true,
      customer: true // Načíst i zákazníka z DB pro detaily
    }
  }) as any // Typ any kvůli slevě která není v základním typu

  if (!order) {
    throw new Error('Customer order not found')
  }

  // Kontrola, že objednávka ještě nemá fakturu
  const existingInvoice = await prisma.issuedInvoice.findUnique({
    where: { customerOrderId: order.id }
  })

  if (existingInvoice) {
    console.warn(`Order ${customerOrderId} already has an issued invoice`)
    return existingInvoice
  }

  // Vytvoř vystavenou fakturu v transakci (ON-COMMIT číslování)
  const invoice = await prisma.$transaction(async (tx) => {
    // 1. Získej další číslo faktury (ON-COMMIT)
    const invoiceNumber = await getNextDocumentNumber('issued-invoice', tx)

    // 2. Vytvoř vystavenou fakturu s položkami a platobnými údaji
    return await tx.issuedInvoice.create({
      data: {
        invoiceNumber,
        customerOrderId: order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        customerEntityType: order.customerEntityType || order.customer?.entityType || null,
        // Zkopíruj údaje zákazníka z objednávky
        customerEmail: order.customerEmail || order.customer?.email || null,
        customerPhone: order.customerPhone || order.customer?.phone || null,
        customerAddress: order.customerAddress || order.customer?.address || null,
        customerContactPerson: order.customer?.contact || null, // Customer má "contact", ne "contactPerson"
        customerIco: order.customer?.ico || null,
        customerDic: order.customer?.dic || null,
        customerBankAccount: order.customer?.bankAccount || null,
        customerWebsite: null, // Customer model nemá website pole
        invoiceDate: new Date(),
        dueDate: paymentDetails?.dueDate ? new Date(paymentDetails.dueDate) : null,
        totalAmount: order.totalAmount,
        totalAmountWithoutVat: order.totalAmountWithoutVat || order.totalAmount,
        totalVatAmount: order.totalVatAmount || 0,
        paymentType: paymentDetails?.paymentType || 'transfer', // E-shop objednávky typicky převodem
        variableSymbol: paymentDetails?.variableSymbol || null,
        constantSymbol: paymentDetails?.constantSymbol || null,
        specificSymbol: paymentDetails?.specificSymbol || null,
        paymentStatus: order.status === 'paid' ? 'paid' : 'unpaid',
        status: 'active',
        // Sleva - zkopíruj z objednávky
        discountType: order.discountType || null,
        discountValue: order.discountValue || null,
        discountAmount: order.discountAmount || null,
        items: {
          create: order.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            vatRate: item.vatRate || 21,
            vatAmount: item.vatAmount || 0,
            priceWithVat: item.priceWithVat || item.price,
          }))
        }
      }
    })
  })

  console.log(`✓ Vytvořena vystavená faktura ${invoice.invoiceNumber} pro objednávku ${order.orderNumber}`)

  return invoice
}
