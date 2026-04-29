/**
 * GET /api/delivery-notes/[id]/pdf
 *
 * Serves a delivery note as application/pdf.
 * Protected by NextAuth session (ERP internal use).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateDeliveryNotePdfBuffer } from '@/lib/documents/serverPdfGenerators'
import { archiveDeliveryNote, archiveAsync } from '@/lib/documents/DocumentArchiveService'
import { diskAdapter } from '@/lib/documents/LocalDiskAdapter'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dn = await prisma.deliveryNote.findUnique({
    where:   { id: params.id },
    include: {
      items:   { include: { product: true } },
      customer: true,
      customerOrder: {
        include: { customer: true },
      },
    },
  })
  if (!dn) return NextResponse.json({ error: 'Delivery note not found', code: 'NOT_FOUND' }, { status: 404 })

  const filename = `vydejka-${dn.deliveryNumber.replace(/\//g, '-')}.pdf`

  // ── Fast path: serve from archive ────────────────────────────────────────
  if ((dn as any).pdfPath) {
    try {
      const exists = await diskAdapter.exists((dn as any).pdfPath)
      if (exists) {
        const buffer = await diskAdapter.read((dn as any).pdfPath)
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

  // Resolve customer from direct relation or linked order
  const co = (dn as any).customerOrder
  const customerName    = (dn as any).customerName
    ?? co?.customerName ?? co?.customer?.name
    ?? 'Anonymní odběratel'
  const customerAddress = co?.customerAddress ?? dn.customer?.address ?? undefined
  const customerEmail   = co?.customerEmail   ?? dn.customer?.email   ?? undefined
  const customerPhone   = co?.customerPhone   ?? dn.customer?.phone   ?? undefined
  const customerICO     = co?.customer?.ico   ?? dn.customer?.ico     ?? undefined
  const customerDIC     = co?.customer?.dic   ?? dn.customer?.dic     ?? undefined

  const items = dn.items.map(i => ({
    productName: i.productName ?? i.product?.name ?? '(Neznámý produkt)',
    quantity:    Number(i.quantity),
    unit:        i.unit,
    price:       Number((i as any).price ?? (i as any).priceWithVat ?? 0),
  }))
  const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.price, 0)

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateDeliveryNotePdfBuffer(
      {
        noteNumber:   dn.deliveryNumber,
        noteDate:     dn.deliveryDate.toISOString(),
        customerName,
        customerAddress,
        customerEmail,
        customerPhone,
        customerICO,
        customerDIC,
        items,
        totalAmount,
        note:         dn.note,
        status:       dn.status,
        stornoReason: dn.stornoReason,
        stornoAt:     dn.stornoAt?.toISOString(),
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
    console.error(`[DeliveryNotePDF] generation failed for dnId=${params.id}:`, err?.message)
    return NextResponse.json({ error: 'PDF generation failed', code: 'PDF_ERROR' }, { status: 500 })
  }

  archiveAsync(() => archiveDeliveryNote(params.id), `DeliveryNote ${dn.deliveryNumber} (on-demand)`)

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
