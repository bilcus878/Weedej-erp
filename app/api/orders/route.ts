/**
 * POST /api/orders  — E-shop → ERP order sync
 * GET  /api/orders?eshopOrderId=<uuid> — check existing order
 *
 * CONTRACT (per brief):
 *   Request:  { eshopOrderId, items, customer, totalCzk, paymentReference, paidAt }
 *   Response: { erpOrderNumber, invoiceNumber, invoicePdfBase64, invoicePdfUrl }
 *
 * Czech law:
 *   § 28 ZDPH — invoice issued immediately (payment = taxable supply)
 *   § 35 ZDPH — invoices archived 10 years (append-only IssuedInvoice table)
 *
 * GDPR:
 *   Logs use order IDs only — no PII in log output.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentNumbering'
import { createIssuedInvoiceFromCustomerOrder } from '@/lib/createIssuedInvoice'
import { verifyApiKey, corsHeaders, handleOptions } from '@/lib/apiKeyAuth'
import { createReservations } from '@/lib/reservationManagement'

export const dynamic = 'force-dynamic'

// ─── Zod schema ──────────────────────────────────────────────────────────────

const AddressSchema = z.object({
  street:  z.string().default('Neuvedena'),    // optional — pickup orders have no address
  city:    z.string().default(''),
  zip:     z.string().default(''),
  country: z.string().default('CZ'),
})

const ItemSchema = z.object({
  sku:          z.string().optional(),
  name:         z.string().min(1),
  quantity:     z.number().positive(),
  unit:         z.string().optional().default('ks'),  // ERP base unit (g, ml, ks…)
  unitPriceCzk: z.number().nonnegative(),   // CZK, excl. VAT
  vatRate:      z.number().nonnegative().default(21),
})

const OrderSchema = z.object({
  eshopOrderId:     z.string().min(1, 'eshopOrderId is required'),
  items:            z.array(ItemSchema).min(1),
  customer: z.object({
    name:    z.string().min(1),
    email:   z.string().email(),
    address: AddressSchema,
  }),
  totalCzk:         z.number().positive(),   // CZK incl. VAT
  paymentReference: z.string().min(1),
  paidAt:           z.string().datetime({ offset: true }),
})

// ─── OPTIONS ─────────────────────────────────────────────────────────────────

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request)
}

// ─── GET — check existing order by eshopOrderId ──────────────────────────────

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin')
  const auth = await verifyApiKey(request)
  if (!auth.success) return auth.response

  const { searchParams } = new URL(request.url)
  const eshopOrderId = searchParams.get('eshopOrderId')

  if (!eshopOrderId) {
    return NextResponse.json(
      { error: 'Missing eshopOrderId query param', code: 'MISSING_PARAM' },
      { status: 400, headers: corsHeaders(origin) }
    )
  }

  const order = await prisma.customerOrder.findUnique({
    where: { eshopOrderId },
    include: { issuedInvoice: { select: { id: true, invoiceNumber: true } } },
  })

  if (!order) {
    return NextResponse.json(
      { error: 'Order not found', code: 'NOT_FOUND' },
      { status: 404, headers: corsHeaders(origin) }
    )
  }

  const erpUrl = process.env.ERP_PUBLIC_URL || process.env.NEXTAUTH_URL || ''
  const invoicePdfUrl = order.issuedInvoice
    ? `${erpUrl}/api/invoices/${order.issuedInvoice.id}/pdf`
    : null

  return NextResponse.json({
    erpOrderNumber:  order.orderNumber,
    invoiceNumber:   order.issuedInvoice?.invoiceNumber ?? null,
    invoicePdfUrl,
  }, { headers: corsHeaders(origin) })
}

// ─── POST — create order ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const auth = await verifyApiKey(request)
  if (!auth.success) return auth.response

  // ── Parse body ────────────────────────────────────────────────────────────
  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON', code: 'INVALID_JSON' },
      { status: 400, headers: corsHeaders(origin) }
    )
  }

  const parsed = OrderSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 422, headers: corsHeaders(origin) }
    )
  }

  const body = parsed.data
  // Log using order ID only (GDPR: no PII in logs)
  console.log(`[ERP /api/orders] Processing order eshopOrderId=${body.eshopOrderId}`)

  // ── Idempotency check ─────────────────────────────────────────────────────
  // Unique constraint on eshopOrderId — return existing on duplicate (HTTP 200, not 409)
  const existing = await prisma.customerOrder.findUnique({
    where: { eshopOrderId: body.eshopOrderId },
    include: { issuedInvoice: { include: { items: true } } },
  })

  if (existing) {
    console.log(`[ERP /api/orders] Duplicate eshopOrderId=${body.eshopOrderId}, returning existing order=${existing.orderNumber}`)
    return buildSuccessResponse(existing, origin)
  }

  // ── Create order in DB transaction ────────────────────────────────────────
  const paidAt = new Date(body.paidAt)
  const customerAddress = [
    body.customer.address.street,
    `${body.customer.address.zip} ${body.customer.address.city}`,
    body.customer.address.country,
  ].join(', ')

  // Compute totals (all values in CZK Decimal, never float)
  const totalAmountWithoutVat = body.items.reduce(
    (sum, i) => sum + Math.round(i.unitPriceCzk * i.quantity * 100) / 100,
    0
  )
  const totalVatAmount = Math.round((body.totalCzk - totalAmountWithoutVat) * 100) / 100
  const totalAmount = body.totalCzk

  // ── Resolve ERP product IDs from SKUs (before transaction — reads only) ──
  // sku = erpProductId sent by e-shop when product is linked to ERP catalogue.
  // Unlinked / manual items have no sku → productId stays null → no reservation.
  const resolvedItems = await Promise.all(
    body.items.map(async item => {
      let productId: string | null = null
      if (item.sku) {
        const product = await prisma.product.findUnique({
          where:  { id: item.sku },
          select: { id: true },
        })
        productId = product?.id ?? null
      }
      return { ...item, productId }
    })
  )

  let createdOrder: any

  try {
    createdOrder = await prisma.$transaction(async (tx) => {
      // ESH{YYYY}{XXXX} numbering — uses existing documentSeries 'eshop-order'
      const orderNumber = await getNextDocumentNumber('eshop-order', tx, paidAt)

      const order = await tx.customerOrder.create({
        data: {
          orderNumber,
          source:             'eshop',
          status:             'paid',          // Stripe payment confirmed before sync
          paidAt,
          eshopOrderId:       body.eshopOrderId,
          paymentReference:   body.paymentReference,
          customerName:       body.customer.name,
          customerEmail:      body.customer.email,
          customerAddress,
          customerEntityType: 'individual',
          totalAmount,
          totalAmountWithoutVat,
          totalVatAmount,
          note:               `Platba: ${body.paymentReference}`,
          items: {
            create: resolvedItems.map(item => {
              const price        = item.unitPriceCzk
              const vatRate      = item.vatRate
              // Compute gross first (price × (1 + vatRate/100)), then derive vatAmount.
              // Bottom-up approach (price + round(price×vatRate/100)) loses a halér for
              // most per-gram prices (e.g. 82.64 → 99.99 instead of 100.00).
              const priceWithVat = Math.round(price * (1 + vatRate / 100) * 100) / 100
              const vatAmount    = Math.round((priceWithVat - price) * 100) / 100
              return {
                productId:       item.productId,   // null for unlinked items
                productName:     item.name,
                quantity:        item.quantity,
                unit:            item.unit,
                price,
                vatRate,
                vatAmount,
                priceWithVat,
                shippedQuantity: 0,
              }
            }),
          },
        },
        include: { items: true },
      })

      // ── Reserve stock atomically within the same transaction ─────────────
      // Only items with a linked ERP productId are reservable.
      // Unlinked / manual items are skipped — no reservation created.
      const reservableItems = order.items
        .filter(i => i.productId !== null)
        .map(i => ({
          productId: i.productId as string,
          quantity:  Number(i.quantity),
          unit:      i.unit,
        }))

      if (reservableItems.length > 0) {
        await createReservations(order.id, reservableItems, tx)
        console.log(
          `[ERP /api/orders] Reserved stock for ${reservableItems.length} item(s) on orderId=${order.id}`
        )
      }

      return order
    })
  } catch (err: any) {
    // Unique constraint violation = race-condition duplicate → treat as idempotent
    if (err?.code === 'P2002' && err?.meta?.target?.includes('eshopOrderId')) {
      const existing2 = await prisma.customerOrder.findUnique({
        where: { eshopOrderId: body.eshopOrderId },
        include: { issuedInvoice: { include: { items: true } } },
      })
      if (existing2) return buildSuccessResponse(existing2, origin)
    }
    console.error(`[ERP /api/orders] DB error for eshopOrderId=${body.eshopOrderId}:`, err?.code ?? err?.message)
    return NextResponse.json(
      { error: 'Failed to create order', code: 'DB_ERROR' },
      { status: 500, headers: corsHeaders(origin) }
    )
  }

  // ── Generate invoice immediately (§ 28 ZDPH) ─────────────────────────────
  let invoice: any = null
  try {
    invoice = await createIssuedInvoiceFromCustomerOrder(createdOrder.id, {
      paymentType:    'card',
      variableSymbol: createdOrder.orderNumber,
    })
    console.log(`[ERP /api/orders] Invoice created: invoiceId=${invoice.id}`)
  } catch (err: any) {
    // Soft failure — order exists, invoice can be created manually
    console.error(`[ERP /api/orders] Invoice generation failed for orderId=${createdOrder.id}:`, err?.message)
  }

  // ── Return — PDF je on-demand přes /api/invoices/[id]/pdf ─────────────────
  // Generating the PDF synchronously (pdfmake) adds 3-6s and risks webhook timeout.
  // The e-shop stores invoicePdfUrl and the customer can download the PDF on demand.
  const erpUrl = process.env.ERP_PUBLIC_URL || process.env.NEXTAUTH_URL || ''
  const invoicePdfUrl = invoice ? `${erpUrl}/api/invoices/${invoice.id}/pdf` : null

  return NextResponse.json(
    {
      erpOrderNumber:   createdOrder.orderNumber,
      invoiceNumber:    invoice?.invoiceNumber ?? null,
      invoicePdfBase64: null,   // Not generated here — use invoicePdfUrl for on-demand PDF
      invoicePdfUrl,
    },
    { status: 201, headers: corsHeaders(origin) }
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns order data for idempotent duplicate requests.
 * PDF is NOT generated here — fetched on-demand via /api/invoices/[id]/pdf.
 */
function buildSuccessResponse(
  order: any,
  origin: string | null,
  status = 200,
) {
  const invoice = order.issuedInvoice
  const erpUrl  = process.env.ERP_PUBLIC_URL || process.env.NEXTAUTH_URL || ''
  const invoicePdfUrl = invoice ? `${erpUrl}/api/invoices/${invoice.id}/pdf` : null

  return NextResponse.json(
    {
      erpOrderNumber:   order.orderNumber,
      invoiceNumber:    invoice?.invoiceNumber ?? null,
      invoicePdfBase64: null,
      invoicePdfUrl,
    },
    { status, headers: corsHeaders(origin) }
  )
}

