/**
 * GET /api/customer-orders/[id]/pdf
 *
 * Serves a customer order as application/pdf.
 * Protected by NextAuth session (ERP internal use).
 *
 * Strategy (filesystem-first):
 *   1. If pdfPath stored on order AND file exists on disk → stream it.
 *   2. Otherwise → generate on-the-fly and archive asynchronously.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateCustomerOrderPdfBuffer } from '@/lib/documents/serverPdfGenerators'
import { archiveCustomerOrder, archiveAsync } from '@/lib/documents/DocumentArchiveService'
import { diskAdapter } from '@/lib/documents/LocalDiskAdapter'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await prisma.customerOrder.findUnique({
    where:   { id: params.id },
    include: { items: { include: { product: true } }, customer: true },
  })
  if (!order) return NextResponse.json({ error: 'Order not found', code: 'NOT_FOUND' }, { status: 404 })

  const filename = `objednavka-${order.orderNumber.replace(/\//g, '-')}.pdf`

  // ── Fast path: serve from archive ────────────────────────────────────────
  if ((order as any).pdfPath) {
    try {
      const exists = await diskAdapter.exists((order as any).pdfPath)
      if (exists) {
        const buffer = await diskAdapter.read((order as any).pdfPath)
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type':        'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length':      String(buffer.byteLength),
            'Cache-Control':       'private, no-cache',
            'X-PDF-Source':        'archive',
          },
        })
      }
    } catch {
      // Fall through to regeneration
    }
  }

  // ── Slow path: generate on-the-fly ───────────────────────────────────────
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  if (!settings) {
    return NextResponse.json({ error: 'Company settings not configured', code: 'NO_SETTINGS' }, { status: 500 })
  }

  const customerName    = order.customerName    ?? order.customer?.name    ?? 'Anonymní odběratel'
  const customerAddress = order.customerAddress ?? order.customer?.address ?? undefined
  const customerEmail   = order.customerEmail   ?? order.customer?.email   ?? undefined
  const customerPhone   = order.customerPhone   ?? order.customer?.phone   ?? undefined

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateCustomerOrderPdfBuffer(
      {
        orderNumber:    order.orderNumber,
        orderDate:      order.orderDate.toISOString(),
        status:         order.status,
        customerName,
        customerAddress,
        customerEmail,
        customerPhone,
        customerIco:    (order as any).customerIco  ?? order.customer?.ico  ?? undefined,
        customerDic:    (order as any).customerDic  ?? order.customer?.dic  ?? undefined,
        shippingMethod: order.shippingMethod ?? undefined,
        trackingNumber: order.trackingNumber ?? undefined,
        carrier:        order.carrier        ?? undefined,
        note:           order.note           ?? undefined,
        totalAmount:    Number(order.totalAmount),
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
      {
        companyName: settings.companyName,
        ico:         settings.ico,
        dic:         settings.dic,
        address:     settings.address,
        phone:       settings.phone,
        email:       settings.email,
        bankAccount: settings.bankAccount,
        isVatPayer:  settings.isVatPayer,
      }
    )
  } catch (err: any) {
    console.error(`[CustomerOrderPDF] generation failed for orderId=${params.id}:`, err?.message)
    return NextResponse.json({ error: 'PDF generation failed', code: 'PDF_ERROR' }, { status: 500 })
  }

  archiveAsync(() => archiveCustomerOrder(params.id), `CustomerOrder ${order.orderNumber} (on-demand)`)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(pdfBuffer.byteLength),
      'Cache-Control':       'private, no-cache',
      'X-PDF-Source':        'generated',
    },
  })
}
