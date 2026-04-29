/**
 * GET /api/purchase-orders/[id]/pdf
 *
 * Serves a purchase order as application/pdf.
 * Protected by NextAuth session (ERP internal use).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePurchaseOrderPdfBuffer } from '@/lib/documents/serverPdfGenerators'
import { archivePurchaseOrder, archiveAsync } from '@/lib/documents/DocumentArchiveService'
import { diskAdapter } from '@/lib/documents/LocalDiskAdapter'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const po = await prisma.purchaseOrder.findUnique({
    where:   { id: params.id },
    include: {
      items:    { include: { product: true } },
      supplier: true,
    },
  })
  if (!po) return NextResponse.json({ error: 'Purchase order not found', code: 'NOT_FOUND' }, { status: 404 })

  const filename = `objednavka-dodavatele-${po.orderNumber.replace(/\//g, '-')}.pdf`

  // ── Fast path: serve from archive ────────────────────────────────────────
  if ((po as any).pdfPath) {
    try {
      const exists = await diskAdapter.exists((po as any).pdfPath)
      if (exists) {
        const buffer = await diskAdapter.read((po as any).pdfPath)
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

  // Prefer snapshot fields; fall back to DB relation for linked suppliers
  const supplierName    = (po as any).supplierName    ?? po.supplier?.name    ?? 'Neznámý dodavatel'
  const supplierAddress = (po as any).supplierAddress ?? po.supplier?.address ?? undefined
  const supplierICO     = (po as any).supplierICO     ?? po.supplier?.ico     ?? undefined
  const supplierDIC     = (po as any).supplierDIC     ?? po.supplier?.dic     ?? undefined
  const supplierPhone   = (po as any).supplierPhone   ?? po.supplier?.phone   ?? undefined
  const supplierEmail   = (po as any).supplierEmail   ?? po.supplier?.email   ?? undefined

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generatePurchaseOrderPdfBuffer(
      {
        orderNumber:   po.orderNumber,
        orderDate:     po.orderDate.toISOString(),
        expectedDate:  po.expectedDate?.toISOString(),
        supplierName,
        supplierAddress,
        supplierICO,
        supplierDIC,
        supplierPhone,
        supplierEmail,
        items: po.items.map(i => ({
          productName: i.productName ?? i.product?.name ?? '(Neznámý produkt)',
          quantity:    Number(i.quantity),
          unit:        i.unit,
          price:       Number((i as any).expectedPrice ?? 0),
        })),
        totalAmount:  Number((po as any).totalAmountWithoutVat ?? (po as any).totalAmount ?? 0),
        note:         po.note,
        status:       po.status,
        stornoReason: po.stornoReason,
        stornoAt:     po.stornoAt?.toISOString(),
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
    console.error(`[PurchaseOrderPDF] generation failed for poId=${params.id}:`, err?.message)
    return NextResponse.json({ error: 'PDF generation failed', code: 'PDF_ERROR' }, { status: 500 })
  }

  archiveAsync(() => archivePurchaseOrder(params.id), `PurchaseOrder ${po.orderNumber} (on-demand)`)

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
