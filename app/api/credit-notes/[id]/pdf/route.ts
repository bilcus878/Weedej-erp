/**
 * GET /api/credit-notes/[id]/pdf
 *
 * Serves a credit note as application/pdf.
 * Protected by NextAuth session (ERP internal use).
 *
 * Credit notes are immutable legal documents — once archived they are never regenerated.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateCreditNotePdfBuffer } from '@/lib/documents/serverPdfGenerators'
import { archiveCreditNote, archiveAsync } from '@/lib/documents/DocumentArchiveService'
import { diskAdapter } from '@/lib/documents/LocalDiskAdapter'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cn = await prisma.creditNote.findUnique({
    where:   { id: params.id },
    include: { items: true, issuedInvoice: true },
  })
  if (!cn) return NextResponse.json({ error: 'Credit note not found', code: 'NOT_FOUND' }, { status: 404 })

  const filename = `dobropis-${cn.creditNoteNumber.replace(/\//g, '-')}.pdf`

  // ── Fast path: serve from archive ────────────────────────────────────────
  if ((cn as any).pdfPath) {
    try {
      const exists = await diskAdapter.exists((cn as any).pdfPath)
      if (exists) {
        const buffer = await diskAdapter.read((cn as any).pdfPath)
        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type':        'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length':      String(buffer.byteLength),
            'Cache-Control':       'private, max-age=31536000, immutable',
            'ETag':                `"${cn.creditNoteNumber}"`,
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

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateCreditNotePdfBuffer(
      {
        creditNoteNumber:      cn.creditNoteNumber,
        creditNoteDate:        cn.creditNoteDate.toISOString(),
        originalInvoiceNumber: cn.issuedInvoice.invoiceNumber,
        customerName:          cn.customerName    ?? undefined,
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
          productName:  i.productName  ?? undefined,
          quantity:     Number(i.quantity),
          unit:         i.unit,
          price:        Number(i.price),
          vatRate:      Number(i.vatRate),
          priceWithVat: Number(i.priceWithVat),
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
    console.error(`[CreditNotePDF] generation failed for cnId=${params.id}:`, err?.message)
    return NextResponse.json({ error: 'PDF generation failed', code: 'PDF_ERROR' }, { status: 500 })
  }

  archiveAsync(() => archiveCreditNote(params.id), `CreditNote ${cn.creditNoteNumber} (on-demand)`)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(pdfBuffer.byteLength),
      'Cache-Control':       'private, max-age=31536000, immutable',
      'ETag':                `"${cn.creditNoteNumber}"`,
      'X-PDF-Source':        'generated',
    },
  })
}
