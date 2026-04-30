// ─── Accounting Normalizer ────────────────────────────────────────────────────
// Queries each document type from DB and maps to unified AccountingDocument DTO.
// All monetary values in CZK. Tax breakdown computed from line items.

import { prisma } from '@/lib/prisma'
import type { AccountingDocument, AccountingVatLine, DocType, ExportParams, ExportPreview } from './types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildVatLines(items: { vatRate: any; price: any; vatAmount: any; priceWithVat: any; quantity: any }[]): AccountingVatLine[] {
  const map = new Map<number, AccountingVatLine>()
  for (const item of items) {
    const rate   = Number(item.vatRate ?? 21)
    const qty    = Number(item.quantity ?? 1)
    const base   = Number(item.price ?? 0) * qty
    const vat    = Number(item.vatAmount ?? 0) * qty
    const gross  = Number(item.priceWithVat ?? 0) * qty
    const existing = map.get(rate)
    if (existing) {
      existing.taxBase    += base
      existing.vatAmount  += vat
      existing.grossAmount += gross
    } else {
      map.set(rate, { vatRate: rate, taxBase: base, vatAmount: vat, grossAmount: gross })
    }
  }
  return [...map.values()].sort((a, b) => b.vatRate - a.vatRate)
}

function sumVat(lines: AccountingVatLine[]) {
  return {
    totalTaxBase: lines.reduce((s, l) => s + l.taxBase, 0),
    totalVat:     lines.reduce((s, l) => s + l.vatAmount, 0),
    totalAmount:  lines.reduce((s, l) => s + l.grossAmount, 0),
  }
}

// ─── 1. Issued invoices ───────────────────────────────────────────────────────

async function normalizeIssuedInvoices(from: Date, to: Date): Promise<AccountingDocument[]> {
  const rows = await prisma.issuedInvoice.findMany({
    where: { invoiceDate: { gte: from, lte: to }, status: { not: 'storno' } },
    include: { items: true },
    orderBy: { invoiceDate: 'asc' },
  })

  return rows.map(inv => {
    const vatLines = buildVatLines(inv.items)
    const totals   = vatLines.length > 0
      ? sumVat(vatLines)
      : { totalTaxBase: Number(inv.totalAmountWithoutVat), totalVat: Number(inv.totalVatAmount), totalAmount: Number(inv.totalAmount) }

    return {
      docType:        'issued_invoice',
      docNumber:      inv.invoiceNumber,
      sourceId:       inv.id,
      docDate:        toDate(inv.invoiceDate),
      dueDate:        inv.dueDate ? toDate(inv.dueDate) : null,
      taxPointDate:   toDate(inv.invoiceDate),
      partyName:      inv.customerName,
      partyIco:       inv.customerIco,
      partyDic:       inv.customerDic,
      partyAddress:   inv.customerAddress,
      partyType:      'customer',
      currency:       'CZK',
      vatLines,
      ...totals,
      paymentStatus:  inv.paymentStatus,
      paidAmount:     inv.paymentStatus === 'paid' ? Number(inv.totalAmount) : 0,
      paymentType:    inv.paymentType,
      variableSymbol: inv.variableSymbol,
      constantSymbol: inv.constantSymbol,
      note:           inv.note,
      status:         inv.status,
      pdfPath:        inv.pdfPath,
    } satisfies AccountingDocument
  })
}

// ─── 2. Received invoices ─────────────────────────────────────────────────────

async function normalizeReceivedInvoices(from: Date, to: Date): Promise<AccountingDocument[]> {
  const rows = await prisma.receivedInvoice.findMany({
    where: { invoiceDate: { gte: from, lte: to }, status: { not: 'storno' } },
    orderBy: { invoiceDate: 'asc' },
  })

  return rows.map(inv => {
    const taxBase = Number(inv.totalAmountWithoutVat)
    const vat     = Number(inv.totalVatAmount)
    const gross   = Number(inv.totalAmount)
    const vatRate = taxBase > 0 ? Math.round((vat / taxBase) * 100) : 21
    const vatLines: AccountingVatLine[] = gross > 0
      ? [{ vatRate, taxBase, vatAmount: vat, grossAmount: gross }]
      : []

    return {
      docType:        'received_invoice',
      docNumber:      inv.invoiceNumber,
      sourceId:       inv.id,
      docDate:        toDate(inv.invoiceDate),
      dueDate:        inv.dueDate ? toDate(inv.dueDate) : null,
      taxPointDate:   toDate(inv.invoiceDate),
      partyName:      inv.supplierName,
      partyIco:       inv.supplierIco,
      partyDic:       inv.supplierDic,
      partyAddress:   inv.supplierAddress,
      partyType:      'supplier',
      currency:       'CZK',
      vatLines,
      totalTaxBase:   taxBase,
      totalVat:       vat,
      totalAmount:    gross,
      paymentStatus:  inv.status === 'active' ? 'unpaid' : 'paid',
      paidAmount:     null,
      paymentType:    inv.paymentType,
      variableSymbol: inv.variableSymbol,
      constantSymbol: inv.constantSymbol,
      note:           inv.note,
      status:         inv.status,
      pdfPath:        inv.pdfPath,
    } satisfies AccountingDocument
  })
}

// ─── 3. Credit notes ──────────────────────────────────────────────────────────

async function normalizeCreditNotes(from: Date, to: Date): Promise<AccountingDocument[]> {
  const rows = await prisma.creditNote.findMany({
    where: { creditNoteDate: { gte: from, lte: to }, status: { not: 'storno' } },
    include: { items: true, issuedInvoice: { select: { invoiceNumber: true } } },
    orderBy: { creditNoteDate: 'asc' },
  })

  return rows.map(cn => {
    const vatLines = buildVatLines(cn.items)
    const totals   = vatLines.length > 0
      ? sumVat(vatLines)
      : { totalTaxBase: Number(cn.totalAmountWithoutVat), totalVat: Number(cn.totalVatAmount), totalAmount: Number(cn.totalAmount) }

    return {
      docType:        'credit_note',
      docNumber:      cn.creditNoteNumber,
      sourceId:       cn.id,
      docDate:        toDate(cn.creditNoteDate),
      dueDate:        null,
      taxPointDate:   toDate(cn.creditNoteDate),
      partyName:      cn.customerName,
      partyIco:       cn.customerIco,
      partyDic:       cn.customerDic,
      partyAddress:   cn.customerAddress,
      partyType:      'customer',
      currency:       'CZK',
      vatLines,
      ...totals,
      paymentStatus:  'paid',
      paidAmount:     Number(cn.totalAmount),
      paymentType:    null,
      variableSymbol: cn.issuedInvoice.invoiceNumber,
      constantSymbol: null,
      note:           cn.note ?? cn.reason,
      status:         cn.status,
      pdfPath:        cn.pdfPath,
    } satisfies AccountingDocument
  })
}

// ─── 4. Payments / transactions ───────────────────────────────────────────────

async function normalizePayments(from: Date, to: Date): Promise<AccountingDocument[]> {
  const rows = await prisma.transaction.findMany({
    where: { transactionDate: { gte: from, lte: to } },
    orderBy: { transactionDate: 'asc' },
  })

  return rows.map(tx => {
    const taxBase = Number(tx.totalAmountWithoutVat)
    const vat     = Number(tx.totalVatAmount)
    const gross   = Number(tx.totalAmount)
    const vatRate = taxBase > 0 ? Math.round((vat / taxBase) * 100) : 21
    const vatLines: AccountingVatLine[] = gross > 0
      ? [{ vatRate, taxBase, vatAmount: vat, grossAmount: gross }]
      : []

    const isSupplier = tx.invoiceType === 'received'
    const partyName  = isSupplier ? (tx.supplierName ?? tx.customerName) : tx.customerName
    const partyIco   = isSupplier ? (tx.supplierICO ?? tx.customerICO)   : tx.customerICO
    const partyDic   = isSupplier ? (tx.supplierDIC ?? tx.customerDIC)   : tx.customerDIC
    const partyAddr  = isSupplier ? (tx.supplierAddress ?? tx.customerAddress) : tx.customerAddress

    return {
      docType:        'payment',
      docNumber:      tx.transactionCode,
      sourceId:       tx.id,
      docDate:        toDate(tx.transactionDate),
      dueDate:        null,
      taxPointDate:   toDate(tx.transactionDate),
      partyName,
      partyIco,
      partyDic,
      partyAddress:   partyAddr,
      partyType:      isSupplier ? 'supplier' : 'customer',
      currency:       'CZK',
      vatLines,
      totalTaxBase:   taxBase,
      totalVat:       vat,
      totalAmount:    gross,
      paymentStatus:  tx.status === 'completed' ? 'paid' : 'unpaid',
      paidAmount:     gross,
      paymentType:    tx.paymentType,
      variableSymbol: null,
      constantSymbol: null,
      note:           tx.note,
      status:         tx.status,
      pdfPath:        null,
    } satisfies AccountingDocument
  })
}

// ─── 5. Customer orders ───────────────────────────────────────────────────────

async function normalizeCustomerOrders(from: Date, to: Date): Promise<AccountingDocument[]> {
  const rows = await prisma.customerOrder.findMany({
    where: { orderDate: { gte: from, lte: to }, stornoAt: null },
    include: { items: true },
    orderBy: { orderDate: 'asc' },
  })

  return rows.map(ord => {
    const vatLines = buildVatLines(ord.items)
    const totals   = vatLines.length > 0
      ? sumVat(vatLines)
      : { totalTaxBase: Number(ord.totalAmountWithoutVat), totalVat: Number(ord.totalVatAmount), totalAmount: Number(ord.totalAmount) }

    const paid = ord.paidAt != null || ord.status === 'paid'

    return {
      docType:        'customer_order',
      docNumber:      ord.orderNumber,
      sourceId:       ord.id,
      docDate:        toDate(ord.orderDate),
      dueDate:        null,
      taxPointDate:   toDate(ord.paidAt ?? ord.orderDate),
      partyName:      ord.customerName,
      partyIco:       null,
      partyDic:       null,
      partyAddress:   ord.customerAddress,
      partyType:      'customer',
      currency:       'CZK',
      vatLines,
      ...totals,
      paymentStatus:  paid ? 'paid' : 'unpaid',
      paidAmount:     paid ? Number(ord.totalAmount) : 0,
      paymentType:    null,
      variableSymbol: null,
      constantSymbol: null,
      note:           ord.note,
      status:         ord.status,
      pdfPath:        ord.pdfPath,
    } satisfies AccountingDocument
  })
}

// ─── 6. Delivery notes ────────────────────────────────────────────────────────

async function normalizeDeliveryNotes(from: Date, to: Date): Promise<AccountingDocument[]> {
  const rows = await prisma.deliveryNote.findMany({
    where: { deliveryDate: { gte: from, lte: to }, stornoAt: null },
    include: { items: true },
    orderBy: { deliveryDate: 'asc' },
  })

  return rows.map(dn => {
    const vatLines = buildVatLines(dn.items.map(i => ({
      vatRate: i.vatRate ?? 21,
      price: i.price ?? 0,
      vatAmount: i.vatAmount ?? 0,
      priceWithVat: i.priceWithVat ?? 0,
      quantity: i.quantity,
    })))
    const totals = vatLines.length > 0
      ? sumVat(vatLines)
      : { totalTaxBase: 0, totalVat: 0, totalAmount: dn.items.reduce((s, i) => s + Number(i.priceWithVat ?? 0) * Number(i.quantity), 0) }

    return {
      docType:        'delivery_note',
      docNumber:      dn.deliveryNumber,
      sourceId:       dn.id,
      docDate:        toDate(dn.deliveryDate),
      dueDate:        null,
      taxPointDate:   toDate(dn.deliveryDate),
      partyName:      dn.customerName,
      partyIco:       null,
      partyDic:       null,
      partyAddress:   null,
      partyType:      'customer',
      currency:       'CZK',
      vatLines,
      ...totals,
      paymentStatus:  null,
      paidAmount:     null,
      paymentType:    null,
      variableSymbol: null,
      constantSymbol: null,
      note:           dn.note,
      status:         dn.status,
      pdfPath:        dn.pdfPath,
    } satisfies AccountingDocument
  })
}

// ─── 7. Receipts (goods receipt notes — Příjemky) ────────────────────────────

async function normalizeReceipts(from: Date, to: Date): Promise<AccountingDocument[]> {
  const rows = await prisma.receipt.findMany({
    where: { receiptDate: { gte: from, lte: to }, stornoAt: null },
    include: { items: true },
    orderBy: { receiptDate: 'asc' },
  })

  return rows.map(r => {
    const grossTotal = r.items.reduce((s, i) => s + Number(i.priceWithVat ?? i.purchasePrice) * Number(i.receivedQuantity ?? i.quantity), 0)
    const vatTotal   = r.items.reduce((s, i) => s + Number(i.vatAmount ?? 0) * Number(i.receivedQuantity ?? i.quantity), 0)
    const taxBase    = grossTotal - vatTotal

    const vatLines   = buildVatLines(r.items.map(i => ({
      vatRate: i.vatRate ?? 21,
      price: Number(i.purchasePrice),
      vatAmount: Number(i.vatAmount ?? 0),
      priceWithVat: Number(i.priceWithVat ?? i.purchasePrice),
      quantity: Number(i.receivedQuantity ?? i.quantity),
    })))

    return {
      docType:        'receipt',
      docNumber:      r.receiptNumber,
      sourceId:       r.id,
      docDate:        toDate(r.receiptDate),
      dueDate:        null,
      taxPointDate:   toDate(r.receiptDate),
      partyName:      r.supplierName,
      partyIco:       r.supplierICO,
      partyDic:       r.supplierDIC,
      partyAddress:   r.supplierAddress,
      partyType:      'supplier',
      currency:       'CZK',
      vatLines,
      totalTaxBase:   taxBase,
      totalVat:       vatTotal,
      totalAmount:    grossTotal,
      paymentStatus:  null,
      paidAmount:     null,
      paymentType:    null,
      variableSymbol: null,
      constantSymbol: null,
      note:           r.note,
      status:         r.status,
      pdfPath:        r.pdfPath,
    } satisfies AccountingDocument
  })
}

// ─── 8. Stock movements ───────────────────────────────────────────────────────

async function normalizeStockMovements(from: Date, to: Date): Promise<AccountingDocument[]> {
  const rows = await prisma.inventoryItem.findMany({
    where: { date: { gte: from, lte: to } },
    include: { product: { select: { name: true } }, supplier: { select: { name: true, ico: true, dic: true } } },
    orderBy: { date: 'asc' },
  })

  return rows.map((item, idx) => {
    const qty   = Number(item.quantity)
    const price = Number(item.purchasePrice)
    const gross = qty * price
    const vatR  = Number(item.vatRate ?? 21)
    const vat   = gross * vatR / (100 + vatR)
    const base  = gross - vat

    return {
      docType:        'stock_movement',
      docNumber:      `SKL-${item.id.slice(0, 8).toUpperCase()}`,
      sourceId:       item.id,
      docDate:        toDate(item.date),
      dueDate:        null,
      taxPointDate:   toDate(item.date),
      partyName:      item.supplier?.name ?? null,
      partyIco:       item.supplier?.ico  ?? null,
      partyDic:       item.supplier?.dic  ?? null,
      partyAddress:   null,
      partyType:      'supplier',
      currency:       'CZK',
      vatLines:       [{ vatRate: vatR, taxBase: base, vatAmount: vat, grossAmount: gross }],
      totalTaxBase:   base,
      totalVat:       vat,
      totalAmount:    gross,
      paymentStatus:  null,
      paidAmount:     null,
      paymentType:    null,
      variableSymbol: null,
      constantSymbol: null,
      note:           `${item.product?.name ?? '?'} | ${qty} ${item.unit} × ${price} Kč`,
      status:         'active',
      pdfPath:        null,
    } satisfies AccountingDocument
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

const FETCHERS: Record<DocType, (from: Date, to: Date) => Promise<AccountingDocument[]>> = {
  issued_invoice:   normalizeIssuedInvoices,
  received_invoice: normalizeReceivedInvoices,
  credit_note:      normalizeCreditNotes,
  payment:          normalizePayments,
  customer_order:   normalizeCustomerOrders,
  delivery_note:    normalizeDeliveryNotes,
  receipt:          normalizeReceipts,
  stock_movement:   normalizeStockMovements,
}

export async function fetchDocuments(
  params: Pick<ExportParams, 'dateFrom' | 'dateTo' | 'documentTypes'>
): Promise<Map<DocType, AccountingDocument[]>> {
  const result = new Map<DocType, AccountingDocument[]>()

  await Promise.all(
    params.documentTypes.map(async type => {
      const docs = await FETCHERS[type](params.dateFrom, params.dateTo)
      result.set(type, docs)
    })
  )

  return result
}

export async function previewDocuments(
  params: Pick<ExportParams, 'dateFrom' | 'dateTo' | 'documentTypes'>
): Promise<ExportPreview> {
  const counts: Partial<Record<DocType, number>> = {}
  let totalRows = 0

  await Promise.all(
    params.documentTypes.map(async type => {
      const docs = await FETCHERS[type](params.dateFrom, params.dateTo)
      counts[type] = docs.length
      totalRows += docs.length
    })
  )

  return { counts, totalRows }
}
