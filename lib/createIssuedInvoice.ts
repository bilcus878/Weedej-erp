// Helper funkce pro automatické vytvoření vystavené faktury
import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from './documentNumbering'
import { getOrderLineItems } from './getOrderLineItems'
import { archiveIssuedInvoice, archiveAsync } from './documents/DocumentArchiveService'

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
  archiveAsync(() => archiveIssuedInvoice(invoice.id), `IssuedInvoice ${invoice.invoiceNumber}`)

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
  const [order, lineItems] = await Promise.all([
    prisma.customerOrder.findUnique({
      where: { id: customerOrderId },
      include: { customer: true },
    }) as Promise<any>,
    getOrderLineItems(customerOrderId),
  ])

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

  // Billing address resolution:
  // If the order has explicit billing fields, use them for the invoice.
  // Otherwise fall back to the delivery address (customerAddress).
  const hasBilling = Boolean(order.billingName && order.billingStreet)

  const invoiceCustomerName = hasBilling
    ? (order.billingCompany || order.billingName)
    : (order.customerName || order.customer?.name || null)

  const invoiceCustomerAddress = hasBilling
    ? [
        order.billingStreet,
        `${order.billingZip} ${order.billingCity}`.trim(),
        order.billingCountry && order.billingCountry !== 'CZ' ? order.billingCountry : null,
      ].filter(Boolean).join(', ')
    : (order.customerAddress || order.customer?.address || null)

  const invoiceCustomerIco = hasBilling
    ? (order.billingIco || null)
    : (order.customer?.ico || null)

  const invoiceCustomerDic = hasBilling
    ? null   // DPH číslo není v billing snapshot — bude doplněno ručně pokud potřeba
    : (order.customer?.dic || null)

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
        customerName: invoiceCustomerName,
        customerEntityType: order.customerEntityType || order.customer?.entityType || null,
        // Billing-resolved customer data
        customerEmail: order.customerEmail || order.customer?.email || null,
        customerPhone: order.customerPhone || order.customer?.phone || null,
        customerAddress: invoiceCustomerAddress,
        customerContactPerson: order.customer?.contact || null,
        customerIco: invoiceCustomerIco,
        customerDic: invoiceCustomerDic,
        customerBankAccount: order.customer?.bankAccount || null,
        customerWebsite: null,
        invoiceDate: new Date(),
        dueDate: paymentDetails?.dueDate ? new Date(paymentDetails.dueDate) : null,
        totalAmount: order.totalAmount,
        totalAmountWithoutVat: order.totalAmountWithoutVat || order.totalAmount,
        totalVatAmount: order.totalVatAmount || 0,
        paymentType: paymentDetails?.paymentType || 'transfer',
        // Variable symbol = purely numeric part of invoice number (valid for Czech bank transfers).
        // Callers may override, but must never pass the ESH order number — it is not the invoice.
        variableSymbol: paymentDetails?.variableSymbol || invoiceNumber.replace(/^[A-Z]+/, ''),
        constantSymbol: paymentDetails?.constantSymbol || null,
        specificSymbol: paymentDetails?.specificSymbol || null,
        paymentStatus: (order.source === 'eshop' || ['paid', 'processing'].includes(order.status)) ? 'paid' : 'unpaid',
        status: 'active',
        // Sleva - zkopíruj z objednávky
        discountType: order.discountType || null,
        discountValue: order.discountValue || null,
        discountAmount: order.discountAmount || null,
        items: {
          create: lineItems.map(item => ({
            productId:    item.productId,
            productName:  item.productName,
            quantity:     item.quantity,
            unit:         item.unit,
            price:        item.price,
            vatRate:      item.vatRate,
            vatAmount:    item.vatAmount,
            priceWithVat: item.priceWithVat,
          }))
        }
      }
    })
  })

  console.log(`✓ Vytvořena vystavená faktura ${invoice.invoiceNumber} pro objednávku ${order.orderNumber}`)
  archiveAsync(() => archiveIssuedInvoice(invoice.id), `IssuedInvoice ${invoice.invoiceNumber}`)

  return invoice
}
