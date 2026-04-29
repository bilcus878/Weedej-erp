/**
 * DocumentArchiveService — Weedej ERP
 *
 * Single entry point for archiving every business document as a PDF.
 * Called fire-and-forget from API routes immediately after document creation/update.
 *
 * Business rules enforced here:
 *   - Issued invoices, credit notes, received invoices → immutable (written once, never overwritten)
 *   - Customer orders → versioned (new PDF on every significant change)
 *   - Purchase orders, receipts, delivery notes → single PDF (overwrite on re-archive)
 *
 * Storage backend is pluggable via the StorageAdapter interface.
 * Swap LocalDiskAdapter for S3Adapter or MinioAdapter with one line change.
 */

import { prisma } from '@/lib/prisma'
import { generateInvoicePdfBuffer }      from '@/lib/serverInvoicePdf'
import {
  generateCustomerOrderPdfBuffer,
  generatePurchaseOrderPdfBuffer,
  generateReceiptPdfBuffer,
  generateDeliveryNotePdfBuffer,
  generateCreditNotePdfBuffer,
  generateReceivedInvoicePdfBuffer,
  type SimpleItem,
} from './serverPdfGenerators'
import { diskAdapter }                   from './LocalDiskAdapter'
import { resolveDocumentPath }           from './PathResolver'
import type { StorageAdapter }           from './StorageAdapter'
import type { CompanySettings }          from '@/lib/pdfGenerator'

// Change this to swap storage backends (S3Adapter, MinioAdapter, etc.)
const storage: StorageAdapter = diskAdapter

// ─── Settings helper ──────────────────────────────────────────────────────────

async function getSettings(): Promise<CompanySettings> {
  const s = await prisma.settings.findUnique({ where: { id: 'default' } })
  if (!s) throw new Error('[Archive] Company settings not configured')
  return {
    companyName: s.companyName,
    ico:         s.ico,
    dic:         s.dic,
    address:     s.address,
    phone:       s.phone,
    email:       s.email,
    bankAccount: s.bankAccount,
    isVatPayer:  s.isVatPayer,
  }
}

// ─── 1. Issued Invoice ────────────────────────────────────────────────────────

/**
 * Immutable — generates once and never overwrites.
 * Complies with §35 ZDPH (10-year invoice retention).
 */
export async function archiveIssuedInvoice(invoiceId: string): Promise<string> {
  const invoice = await prisma.issuedInvoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { items: true },
  })

  // Immutability guard: if a file already exists on disk, honour it.
  if (invoice.pdfPath) {
    const onDisk = await storage.exists(invoice.pdfPath)
    if (onDisk) return invoice.pdfPath
  }

  const settings = await getSettings()
  const buffer   = await generateInvoicePdfBuffer(
    {
      invoiceNumber:         invoice.invoiceNumber,
      invoiceDate:           invoice.invoiceDate.toISOString(),
      duzp:                  invoice.invoiceDate.toISOString(),
      dueDate:               invoice.dueDate?.toISOString(),
      totalAmount:           Number(invoice.totalAmount),
      totalAmountWithoutVat: Number(invoice.totalAmountWithoutVat),
      totalVatAmount:        Number(invoice.totalVatAmount),
      paymentType:           invoice.paymentType,
      status:                invoice.status,
      customerName:          invoice.customerName   ?? undefined,
      customerAddress:       invoice.customerAddress ?? undefined,
      customerEmail:         invoice.customerEmail  ?? undefined,
      customerPhone:         invoice.customerPhone  ?? undefined,
      customerICO:           invoice.customerIco    ?? undefined,
      customerDIC:           invoice.customerDic    ?? undefined,
      items: invoice.items.map(i => ({
        productName:  i.productName  ?? undefined,
        quantity:     Number(i.quantity),
        unit:         i.unit,
        price:        Number(i.price),
        vatRate:      Number(i.vatRate),
        vatAmount:    Number(i.vatAmount),
        priceWithVat: Number(i.priceWithVat),
      })),
    },
    settings,
  )

  const pdfPath = resolveDocumentPath('issued-invoices', invoice.invoiceNumber, invoice.invoiceDate)
  await storage.write(pdfPath, buffer)
  await prisma.issuedInvoice.update({ where: { id: invoiceId }, data: { pdfPath } })

  return pdfPath
}

// ─── 2. Credit Note ───────────────────────────────────────────────────────────

/** Immutable — credit notes are legal documents and cannot be changed. */
export async function archiveCreditNote(creditNoteId: string): Promise<string> {
  const cn = await prisma.creditNote.findUniqueOrThrow({
    where:   { id: creditNoteId },
    include: { items: true, issuedInvoice: true },
  })

  if (cn.pdfPath) {
    const onDisk = await storage.exists(cn.pdfPath)
    if (onDisk) return cn.pdfPath
  }

  const settings = await getSettings()
  const buffer   = await generateCreditNotePdfBuffer(
    {
      creditNoteNumber:      cn.creditNoteNumber,
      creditNoteDate:        cn.creditNoteDate.toISOString(),
      originalInvoiceNumber: cn.issuedInvoice.invoiceNumber,
      customerName:          cn.customerName   ?? undefined,
      customerAddress:       cn.customerAddress ?? undefined,
      customerEmail:         cn.customerEmail   ?? undefined,
      customerPhone:         cn.customerPhone   ?? undefined,
      customerIco:           cn.customerIco     ?? undefined,
      customerDic:           cn.customerDic     ?? undefined,
      reason:                cn.reason,
      note:                  cn.note,
      totalAmount:           Number(cn.totalAmount),
      totalAmountWithoutVat: Number(cn.totalAmountWithoutVat),
      totalVatAmount:        Number(cn.totalVatAmount),
      items: cn.items.map(i => ({
        productName:  i.productName ?? undefined,
        quantity:     Number(i.quantity),
        unit:         i.unit,
        price:        Number(i.price),
        vatRate:      Number(i.vatRate),
        priceWithVat: Number(i.priceWithVat),
      })),
    },
    settings,
  )

  const pdfPath = resolveDocumentPath('credit-notes', cn.creditNoteNumber, cn.creditNoteDate)
  await storage.write(pdfPath, buffer)
  await prisma.creditNote.update({ where: { id: creditNoteId }, data: { pdfPath } })

  return pdfPath
}

// ─── 3. Received Invoice ──────────────────────────────────────────────────────

/** Immutable — stores a ledger copy. The scanned original stays in attachmentUrl. */
export async function archiveReceivedInvoice(invoiceId: string): Promise<string> {
  const inv = await prisma.receivedInvoice.findUniqueOrThrow({ where: { id: invoiceId } })

  if (inv.pdfPath) {
    const onDisk = await storage.exists(inv.pdfPath)
    if (onDisk) return inv.pdfPath
  }

  const settings = await getSettings()
  const buffer   = await generateReceivedInvoicePdfBuffer(
    {
      invoiceNumber:         inv.invoiceNumber,
      invoiceDate:           inv.invoiceDate.toISOString(),
      dueDate:               inv.dueDate?.toISOString(),
      supplierName:          inv.supplierName   ?? undefined,
      supplierAddress:       inv.supplierAddress ?? undefined,
      supplierIco:           inv.supplierIco    ?? undefined,
      supplierDic:           inv.supplierDic    ?? undefined,
      supplierEmail:         inv.supplierEmail  ?? undefined,
      supplierPhone:         inv.supplierPhone  ?? undefined,
      paymentType:           inv.paymentType,
      totalAmount:           Number(inv.totalAmount),
      totalAmountWithoutVat: Number(inv.totalAmountWithoutVat),
      totalVatAmount:        Number(inv.totalVatAmount),
      note:                  inv.note,
      variableSymbol:        inv.variableSymbol,
      isTemporary:           inv.isTemporary,
    },
    settings,
  )

  const pdfPath = resolveDocumentPath('received-invoices', inv.invoiceNumber, inv.invoiceDate)
  await storage.write(pdfPath, buffer)
  await prisma.receivedInvoice.update({ where: { id: invoiceId }, data: { pdfPath } })

  return pdfPath
}

// ─── 4. Customer Order (versioned) ───────────────────────────────────────────

/**
 * Versioned — every call creates a new order_vN.pdf.
 * Call this on: creation, status change, tracking number update.
 */
export async function archiveCustomerOrder(orderId: string): Promise<string> {
  const order = await prisma.customerOrder.findUniqueOrThrow({
    where:   { id: orderId },
    include: { items: { include: { product: true } }, customer: true },
  })

  const settings    = await getSettings()
  const nextVersion = (order.pdfVersionCount ?? 0) + 1

  // Resolve effective customer name/address (DB relation or snapshot fields)
  const customerName    = order.customerName    ?? order.customer?.name    ?? 'Anonymní odběratel'
  const customerAddress = order.customerAddress ?? order.customer?.address ?? undefined
  const customerEmail   = order.customerEmail   ?? order.customer?.email   ?? undefined
  const customerPhone   = order.customerPhone   ?? order.customer?.phone   ?? undefined
  const customerIco     = (order as any).customerIco  ?? order.customer?.ico   ?? undefined
  const customerDic     = (order as any).customerDic  ?? order.customer?.dic   ?? undefined

  const buffer = await generateCustomerOrderPdfBuffer(
    {
      orderNumber:     order.orderNumber,
      orderDate:       order.orderDate.toISOString(),
      status:          order.status,
      customerName,
      customerAddress,
      customerEmail,
      customerPhone,
      customerIco,
      customerDic,
      shippingMethod:  order.shippingMethod ?? undefined,
      trackingNumber:  order.trackingNumber ?? undefined,
      carrier:         order.carrier        ?? undefined,
      note:            order.note           ?? undefined,
      totalAmount:     Number(order.totalAmount),
      items: order.items.map(i => ({
        productName:  i.productName ?? i.product?.name ?? undefined,
        quantity:     Number(i.quantity),
        unit:         i.unit,
        price:        Number(i.price),
        vatRate:      Number(i.vatRate),
        priceWithVat: Number(i.priceWithVat),
      })),
      stornoReason: (order as any).stornoReason ?? undefined,
      stornoAt:     (order as any).stornoAt     ?? undefined,
    },
    settings,
  )

  const pdfPath = resolveDocumentPath('customer-orders', order.orderNumber, order.orderDate, { version: nextVersion })
  await storage.write(pdfPath, buffer)
  await prisma.customerOrder.update({
    where: { id: orderId },
    data:  { pdfPath, pdfVersionCount: nextVersion },
  })

  return pdfPath
}

// ─── 5. Purchase Order ────────────────────────────────────────────────────────

/** Single PDF — overwritten if regenerated (PO sent once, rarely changes). */
export async function archivePurchaseOrder(purchaseOrderId: string): Promise<string> {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({
    where:   { id: purchaseOrderId },
    include: { items: { include: { product: true } } },
  })

  const settings = await getSettings()

  const items: SimpleItem[] = po.items.map(i => ({
    productName: i.productName ?? i.product?.name ?? '(Neznámý produkt)',
    quantity:    Number(i.quantity),
    unit:        i.unit,
    price:       Number(i.expectedPrice ?? 0),
  }))

  const buffer = await generatePurchaseOrderPdfBuffer(
    {
      orderNumber:      po.orderNumber,
      orderDate:        po.orderDate.toISOString(),
      expectedDate:     po.expectedDate?.toISOString(),
      supplierName:     po.supplierName    || 'Neznámý dodavatel',
      supplierAddress:  po.supplierAddress ?? undefined,
      supplierICO:      po.supplierICO     ?? undefined,
      supplierDIC:      po.supplierDIC     ?? undefined,
      supplierPhone:    (po as any).supplierPhone ?? undefined,
      supplierEmail:    (po as any).supplierEmail ?? undefined,
      items,
      totalAmount:      Number(po.totalAmountWithoutVat ?? po.totalAmount ?? 0),
      note:             po.note,
      status:           po.status,
      stornoReason:     po.stornoReason,
      stornoAt:         po.stornoAt?.toISOString(),
    },
    settings,
  )

  const pdfPath = resolveDocumentPath('purchase-orders', po.orderNumber, po.orderDate)
  await storage.write(pdfPath, buffer)
  await prisma.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { pdfPath } })

  return pdfPath
}

// ─── 6. Stock Receipt (Příjemka) ──────────────────────────────────────────────

/** Single PDF — re-generated after processing to reflect actual received quantities. */
export async function archiveReceipt(receiptId: string): Promise<string> {
  const receipt = await prisma.receipt.findUniqueOrThrow({
    where:   { id: receiptId },
    include: { items: { include: { product: true } }, supplier: true },
  })

  const settings = await getSettings()

  const supplierName    = receipt.supplierName    ?? receipt.supplier?.name    ?? 'Neznámý dodavatel'
  const supplierAddress = receipt.supplierAddress ?? receipt.supplier?.address ?? undefined
  const supplierICO     = receipt.supplierICO     ?? receipt.supplier?.ico     ?? undefined
  const supplierDIC     = receipt.supplierDIC     ?? receipt.supplier?.dic     ?? undefined
  const supplierPhone   = receipt.supplier?.phone ?? undefined
  const supplierEmail   = receipt.supplier?.email ?? undefined

  const items: SimpleItem[] = receipt.items.map(i => ({
    productName: i.productName ?? i.product?.name ?? '(Neznámý produkt)',
    quantity:    Number(i.receivedQuantity ?? i.quantity),
    unit:        i.unit,
    price:       Number(i.purchasePrice),
  }))

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.price, 0)

  const buffer = await generateReceiptPdfBuffer(
    {
      receiptNumber:   receipt.receiptNumber,
      receiptDate:     receipt.receiptDate.toISOString(),
      supplierName,
      supplierAddress,
      supplierICO,
      supplierDIC,
      supplierPhone,
      supplierEmail,
      items,
      totalAmount,
      note:            receipt.note,
      status:          receipt.status,
      stornoReason:    receipt.stornoReason,
      stornoAt:        receipt.stornoAt?.toISOString(),
    },
    settings,
  )

  const pdfPath = resolveDocumentPath('stock-receipts', receipt.receiptNumber, receipt.receiptDate)
  await storage.write(pdfPath, buffer)
  await prisma.receipt.update({ where: { id: receiptId }, data: { pdfPath } })

  return pdfPath
}

// ─── 7. Delivery Note (Výdejka) ───────────────────────────────────────────────

/** Single PDF — re-generated after processing to reflect actual shipped quantities. */
export async function archiveDeliveryNote(deliveryNoteId: string): Promise<string> {
  const dn = await prisma.deliveryNote.findUniqueOrThrow({
    where:   { id: deliveryNoteId },
    include: { items: { include: { product: true } }, customer: true },
  })

  const settings = await getSettings()

  const customerName    = dn.customerName    ?? dn.customer?.name    ?? 'Anonymní odběratel'
  const customerAddress = dn.customer?.address ?? undefined
  const customerEmail   = dn.customer?.email   ?? undefined
  const customerPhone   = dn.customer?.phone   ?? undefined
  const customerICO     = dn.customer?.ico     ?? undefined
  const customerDIC     = dn.customer?.dic     ?? undefined

  const items: SimpleItem[] = dn.items.map(i => ({
    productName: i.productName ?? i.product?.name ?? '(Neznámý produkt)',
    quantity:    Number(i.quantity),
    unit:        i.unit,
    price:       Number(i.price ?? i.priceWithVat ?? 0),
  }))

  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.price, 0)

  const buffer = await generateDeliveryNotePdfBuffer(
    {
      noteNumber:      dn.deliveryNumber,
      noteDate:        dn.deliveryDate.toISOString(),
      customerName,
      customerAddress,
      customerEmail,
      customerPhone,
      customerICO,
      customerDIC,
      items,
      totalAmount,
      note:            dn.note,
      status:          dn.status,
      stornoReason:    dn.stornoReason,
      stornoAt:        dn.stornoAt?.toISOString(),
    },
    settings,
  )

  const pdfPath = resolveDocumentPath('delivery-notes', dn.deliveryNumber, dn.deliveryDate)
  await storage.write(pdfPath, buffer)
  await prisma.deliveryNote.update({ where: { id: deliveryNoteId }, data: { pdfPath } })

  return pdfPath
}

// ─── Safe fire-and-forget wrapper ─────────────────────────────────────────────

/**
 * Runs the archive function without blocking the HTTP response.
 * Errors are logged but never propagate to the caller.
 */
export function archiveAsync(
  fn: () => Promise<string>,
  label: string,
): void {
  fn().then(path => {
    console.log(`[Archive] ✓ ${label} → ${path}`)
  }).catch(err => {
    console.error(`[Archive] ✗ ${label}:`, err?.message ?? err)
  })
}
