/**
 * POST /api/received-invoices/[id]/attachment
 *   Upload the supplier's invoice file. Stored in the document archive
 *   (same /storage/documents/ tree as all other business documents).
 *   Updates `attachmentUrl` on the DB record with the relative archive path.
 *
 * GET  /api/received-invoices/[id]/attachment
 *   Serve the stored file back to the browser.
 *   Handles both new archive paths and legacy /uploads/invoices/... URLs.
 */

import path from 'path'
import { readFile } from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { diskAdapter } from '@/lib/documents/LocalDiskAdapter'
import { sanitizeDocNumber, resolveDocumentDir } from '@/lib/documents/PathResolver'

export const dynamic = 'force-dynamic'

const MIME: Record<string, string> = {
  pdf:  'application/pdf',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  gif:  'image/gif',
}

// ── GET — serve the stored attachment ────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invoice = await prisma.receivedInvoice.findUnique({
    where:  { id: params.id },
    select: { attachmentUrl: true, invoiceNumber: true },
  })
  if (!invoice?.attachmentUrl) {
    return NextResponse.json({ error: 'No attachment found' }, { status: 404 })
  }

  const attachmentUrl = invoice.attachmentUrl
  const ext = attachmentUrl.split('.').pop()?.toLowerCase() ?? ''
  const contentType = MIME[ext] ?? 'application/octet-stream'

  // Legacy path: was stored under /public/uploads/ and served as a static URL
  if (attachmentUrl.startsWith('/')) {
    try {
      const buffer = await readFile(path.join(process.cwd(), 'public', attachmentUrl))
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: { 'Content-Type': contentType, 'Cache-Control': 'private, max-age=3600' },
      })
    } catch {
      return NextResponse.json({ error: 'Legacy attachment not found on disk' }, { status: 404 })
    }
  }

  // New path: stored in document archive via diskAdapter
  try {
    const buffer = await diskAdapter.read(attachmentUrl)
    const safeNumber = sanitizeDocNumber(invoice.invoiceNumber)
    const filename   = `faktura-${safeNumber}.${ext}`
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':        contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control':       'private, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Attachment not found in archive' }, { status: 404 })
  }
}

// ── POST — upload and archive a new attachment ────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const invoice = await prisma.receivedInvoice.findUnique({
    where:  { id: params.id },
    select: { invoiceNumber: true, invoiceDate: true },
  })
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowedTypes = ['image/', 'application/pdf']
  if (!allowedTypes.some(t => file.type.startsWith(t))) {
    return NextResponse.json({ error: 'Only images and PDFs are allowed' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  // Determine archive path
  const ext    = file.name.split('.').pop()?.toLowerCase() || (file.type === 'application/pdf' ? 'pdf' : 'jpg')
  const dir    = resolveDocumentDir('received-invoices', invoice.invoiceNumber, invoice.invoiceDate)
  const archivePath = `${dir}/supplier.${ext}`

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  try {
    await diskAdapter.write(archivePath, buffer)
  } catch (err: any) {
    console.error(`[ReceivedInvoice] attachment write failed for id=${params.id}:`, err?.message)
    // On Vercel (ephemeral FS) write fails — still save the path so server deploy works
  }

  await prisma.receivedInvoice.update({
    where: { id: params.id },
    data:  { attachmentUrl: archivePath },
  })

  return NextResponse.json({ path: archivePath }, { status: 201 })
}
