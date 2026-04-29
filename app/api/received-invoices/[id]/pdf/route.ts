/**
 * GET /api/received-invoices/[id]/pdf
 *
 * Serves the best available PDF for a received invoice:
 *   1. Supplier's uploaded PDF (from archive) — the real invoice document
 *   2. ERP-generated summary (filesystem-first from pdfPath, then on-the-fly)
 *
 * Protected by NextAuth session (ERP internal use).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateReceivedInvoicePdfBuffer } from '@/lib/documents/serverPdfGenerators'
import { archiveReceivedInvoice, archiveAsync } from '@/lib/documents/DocumentArchiveService'
import { diskAdapter } from '@/lib/documents/LocalDiskAdapter'
import { sanitizeDocNumber } from '@/lib/documents/PathResolver'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invoice = await prisma.receivedInvoice.findUnique({
    where: { id: params.id },
  })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found', code: 'NOT_FOUND' }, { status: 404 })

  const safeNumber = sanitizeDocNumber(invoice.invoiceNumber)
  const filename   = `faktura-prijata-${safeNumber}.pdf`

  // ── Priority 1: supplier's uploaded PDF ──────────────────────────────────
  // If the attachment is a PDF stored in the archive, serve it directly.
  // It's the real invoice document and takes precedence over the ERP summary.
  if (invoice.attachmentUrl && invoice.attachmentUrl.endsWith('.pdf')) {
    try {
      const buffer = await diskAdapter.read(invoice.attachmentUrl)
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type':        'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Content-Length':      String(buffer.byteLength),
          'Cache-Control':       'private, max-age=31536000, immutable',
          'X-PDF-Source':        'supplier-attachment',
        },
      })
    } catch {
      // Archive not available (Vercel) — fall through to ERP summary
    }
  }

  // ── Priority 2: ERP summary — fast path from archive ─────────────────────
  if (invoice.pdfPath) {
    try {
      const exists = await diskAdapter.exists(invoice.pdfPath)
      if (exists) {
        const buffer = await diskAdapter.read(invoice.pdfPath)
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type':        'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length':      String(buffer.byteLength),
            'Cache-Control':       'private, max-age=31536000, immutable',
            'X-PDF-Source':        'archive',
          },
        })
      }
    } catch {
      // Fall through to generation
    }
  }

  // ── Priority 3: generate ERP summary on-the-fly ──────────────────────────
  const settings = await prisma.settings.findUnique({ where: { id: 'default' } })
  if (!settings) {
    return NextResponse.json({ error: 'Company settings not configured', code: 'NO_SETTINGS' }, { status: 500 })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateReceivedInvoicePdfBuffer(
      {
        invoiceNumber:         invoice.invoiceNumber,
        invoiceDate:           invoice.invoiceDate.toISOString(),
        dueDate:               invoice.dueDate?.toISOString(),
        supplierName:          invoice.supplierName   ?? undefined,
        supplierAddress:       invoice.supplierAddress ?? undefined,
        supplierIco:           invoice.supplierIco    ?? undefined,
        supplierDic:           invoice.supplierDic    ?? undefined,
        supplierEmail:         invoice.supplierEmail  ?? undefined,
        supplierPhone:         invoice.supplierPhone  ?? undefined,
        paymentType:           invoice.paymentType,
        totalAmount:           Number(invoice.totalAmount),
        totalAmountWithoutVat: Number(invoice.totalAmountWithoutVat ?? 0),
        totalVatAmount:        Number(invoice.totalVatAmount ?? 0),
        note:                  invoice.note,
        variableSymbol:        invoice.variableSymbol,
        isTemporary:           invoice.isTemporary,
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
    console.error(`[ReceivedInvoicePDF] generation failed for id=${params.id}:`, err?.message)
    return NextResponse.json({ error: 'PDF generation failed', code: 'PDF_ERROR' }, { status: 500 })
  }

  archiveAsync(() => archiveReceivedInvoice(params.id), `ReceivedInvoice ${invoice.invoiceNumber} (on-demand)`)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(pdfBuffer.byteLength),
      'Cache-Control':       'private, max-age=31536000, immutable',
      'X-PDF-Source':        'generated',
    },
  })
}
