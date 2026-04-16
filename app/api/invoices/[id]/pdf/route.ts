/**
 * GET /api/invoices/[id]/pdf
 *
 * Serves an invoice as application/pdf.
 * Protected by API key (X-API-Key or Authorization: Bearer).
 *
 * § 35 ZDPH — invoices are append-only; this endpoint reads but never mutates.
 * GDPR — URL contains invoice UUID, not customer PII.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateInvoicePdfBuffer } from '@/lib/serverInvoicePdf'
import { verifyApiKey } from '@/lib/apiKeyAuth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth: API key required
  const auth = await verifyApiKey(request)
  if (!auth.success) return auth.response

  const invoice = await prisma.issuedInvoice.findUnique({
    where: { id: params.id },
    include: { items: true },
  })

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found', code: 'NOT_FOUND' }, { status: 404 })
  }

  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  if (!settings) {
    return NextResponse.json({ error: 'Company settings not configured', code: 'NO_SETTINGS' }, { status: 500 })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateInvoicePdfBuffer(
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
        items: invoice.items.map(item => ({
          productName:  item.productName ?? undefined,
          quantity:     Number(item.quantity),
          unit:         item.unit,
          price:        Number(item.price),
          vatRate:      Number(item.vatRate),
          vatAmount:    Number(item.vatAmount),
          priceWithVat: Number(item.priceWithVat),
        })),
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
    console.error(`[InvoicePDF] PDF generation failed for invoiceId=${params.id}:`, err?.message)
    return NextResponse.json({ error: 'PDF generation failed', code: 'PDF_ERROR' }, { status: 500 })
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="faktura-${invoice.invoiceNumber}.pdf"`,
      'Content-Length':      String(pdfBuffer.byteLength),
      // Immutable for archiving (§ 35) — ETag based on invoice number
      'Cache-Control':       'private, max-age=31536000, immutable',
      'ETag':                `"${invoice.invoiceNumber}"`,
    },
  })
}
