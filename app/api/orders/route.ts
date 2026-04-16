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
import { generateInvoicePdfBase64 } from '@/lib/serverInvoicePdf'
import { verifyApiKey, corsHeaders, handleOptions } from '@/lib/apiKeyAuth'

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

  let createdOrder: any

  try {
    createdOrder = await prisma.$transaction(async (tx) => {
      // ESH{YYYY}{XXXX} numbering — uses existing documentSeries 'eshop-order'
      const orderNumber = await getNextDocumentNumber('eshop-order', tx, paidAt)

      const order = await tx.customerOrder.create({
        data: {
          orderNumber,
          source:             'eshop',
          status:             'processing',   // paid + ERP received = processing
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
            create: body.items.map(item => {
              const price       = item.unitPriceCzk
              const vatRate     = item.vatRate
              const vatAmount   = Math.round(price * vatRate) / 100
              const priceWithVat = Math.round((price + vatAmount) * 100) / 100
              return {
                productName:   item.name,
                quantity:      item.quantity,
                unit:          'ks',
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

  // ── Create expected výdejka (warehouse release) ───────────────────────────
  try {
    await createExpectedVydejka(createdOrder)
    console.log(`[ERP /api/orders] Výdejka created for orderId=${createdOrder.id}`)
  } catch (err: any) {
    console.error(`[ERP /api/orders] Výdejka creation failed for orderId=${createdOrder.id}:`, err?.message)
  }

  // ── Reload with issuedInvoice for response ────────────────────────────────
  const fullOrder = await prisma.customerOrder.findUniqueOrThrow({
    where: { id: createdOrder.id },
    include: { issuedInvoice: { include: { items: true } } },
  })

  return buildSuccessResponse(fullOrder, origin, 201)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function buildSuccessResponse(
  order: any,
  origin: string | null,
  status = 200,
) {
  const invoice = order.issuedInvoice
  const erpUrl  = process.env.ERP_PUBLIC_URL || process.env.NEXTAUTH_URL || ''

  let invoicePdfBase64: string | null = null
  let invoicePdfUrl:    string | null = null

  if (invoice) {
    invoicePdfUrl = `${erpUrl}/api/invoices/${invoice.id}/pdf`

    // Generate PDF server-side for inline attachment in e-shop email
    try {
      const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
      if (settings) {
        invoicePdfBase64 = await generateInvoicePdfBase64(
          {
            invoiceNumber:        invoice.invoiceNumber,
            invoiceDate:          invoice.invoiceDate.toISOString(),
            duzp:                 invoice.invoiceDate.toISOString(),  // payment = DUZP
            totalAmount:          Number(invoice.totalAmount),
            totalAmountWithoutVat: Number(invoice.totalAmountWithoutVat),
            totalVatAmount:       Number(invoice.totalVatAmount),
            paymentType:          invoice.paymentType,
            customerName:         invoice.customerName ?? undefined,
            customerAddress:      invoice.customerAddress ?? undefined,
            customerEmail:        invoice.customerEmail ?? undefined,
            customerPhone:        invoice.customerPhone ?? undefined,
            customerICO:          invoice.customerIco ?? undefined,
            customerDIC:          invoice.customerDic ?? undefined,
            items: (invoice.items ?? []).map((item: any) => ({
              productName:  item.productName,
              quantity:     Number(item.quantity),
              unit:         item.unit,
              price:        Number(item.price),
              vatRate:      Number(item.vatRate),
              vatAmount:    Number(item.vatAmount),
              priceWithVat: Number(item.priceWithVat),
            })),
          },
          {
            companyName:  settings.companyName,
            ico:          settings.ico,
            dic:          settings.dic,
            address:      settings.address,
            phone:        settings.phone,
            email:        settings.email,
            bankAccount:  settings.bankAccount,
            isVatPayer:   settings.isVatPayer,
          }
        )
      }
    } catch (pdfErr: any) {
      console.error(`[ERP /api/orders] PDF generation failed for invoiceId=${invoice.id}:`, pdfErr?.message)
    }
  }

  return NextResponse.json(
    {
      erpOrderNumber:  order.orderNumber,
      invoiceNumber:   invoice?.invoiceNumber ?? null,
      invoicePdfBase64,
      invoicePdfUrl,
    },
    { status, headers: corsHeaders(origin) }
  )
}

/**
 * Creates an expected (draft) delivery note for warehouse workers.
 * They will mark it as dispatched, which triggers the shipped webhook.
 */
async function createExpectedVydejka(order: any) {
  const { getNextDocumentNumber: getNum } = await import('@/lib/documentNumbering')

  await prisma.$transaction(async (tx) => {
    const deliveryNumber = await getNum('delivery-note', tx)

    await tx.deliveryNote.create({
      data: {
        deliveryNumber,
        customerOrderId: order.id,
        customerName:    order.customerName,
        deliveryDate:    new Date(),
        status:          'draft',   // warehouse worker processes this
        note:            `Očekávaná výdejka pro eshop objednávku ${order.orderNumber}`,
        items: {
          create: order.items.map((item: any) => ({
            productName:     item.productName,
            quantity:        item.quantity,
            orderedQuantity: item.quantity,
            unit:            item.unit,
          })),
        },
      },
    })
  })
}
