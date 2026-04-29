/**
 * GET /api/receipts/[id]/pdf
 *
 * Serves a stock receipt as application/pdf.
 * Protected by NextAuth session (ERP internal use).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateReceiptPdfBuffer } from '@/lib/documents/serverPdfGenerators'
import { archiveReceipt, archiveAsync } from '@/lib/documents/DocumentArchiveService'
import { diskAdapter } from '@/lib/documents/LocalDiskAdapter'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const receipt = await prisma.receipt.findUnique({
    where:   { id: params.id },
    include: { items: { include: { product: true } }, supplier: true },
  })
  if (!receipt) return NextResponse.json({ error: 'Receipt not found', code: 'NOT_FOUND' }, { status: 404 })

  const filename = `prijemka-${receipt.receiptNumber.replace(/\//g, '-')}.pdf`

  // ── Fast path: serve from archive ────────────────────────────────────────
  if ((receipt as any).pdfPath) {
    try {
      const exists = await diskAdapter.exists((receipt as any).pdfPath)
      if (exists) {
        const buffer = await diskAdapter.read((receipt as any).pdfPath)
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

  const supplierName    = (receipt as any).supplierName    ?? receipt.supplier?.name    ?? 'Neznámý dodavatel'
  const supplierAddress = (receipt as any).supplierAddress ?? receipt.supplier?.address ?? undefined
  const supplierICO     = (receipt as any).supplierICO     ?? receipt.supplier?.ico     ?? undefined
  const supplierDIC     = (receipt as any).supplierDIC     ?? receipt.supplier?.dic     ?? undefined
  const supplierPhone   = receipt.supplier?.phone ?? undefined
  const supplierEmail   = receipt.supplier?.email ?? undefined

  const items = receipt.items.map(i => ({
    productName: i.productName ?? i.product?.name ?? '(Neznámý produkt)',
    quantity:    Number((i as any).receivedQuantity ?? i.quantity),
    unit:        i.unit,
    price:       Number(i.purchasePrice),
  }))
  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.price, 0)

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateReceiptPdfBuffer(
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
    console.error(`[ReceiptPDF] generation failed for receiptId=${params.id}:`, err?.message)
    return NextResponse.json({ error: 'PDF generation failed', code: 'PDF_ERROR' }, { status: 500 })
  }

  archiveAsync(() => archiveReceipt(params.id), `Receipt ${receipt.receiptNumber} (on-demand)`)

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
