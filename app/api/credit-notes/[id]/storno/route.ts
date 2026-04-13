// API Endpoint pro stornování dobropisu
// URL: /api/credit-notes/[id]/storno

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface StornoRequest {
  reason?: string
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body: StornoRequest = await request.json()
    const { reason } = body

    // Načti dobropis
    const creditNote = await prisma.creditNote.findUnique({
      where: { id }
    })

    if (!creditNote) {
      return NextResponse.json(
        { error: 'Dobropis nenalezen' },
        { status: 404 }
      )
    }

    if (creditNote.status === 'storno') {
      return NextResponse.json(
        { error: 'Dobropis je již stornován' },
        { status: 400 }
      )
    }

    const stornoReason = reason || 'Stornováno uživatelem'

    const result = await prisma.creditNote.update({
      where: { id },
      data: {
        status: 'storno',
        stornoReason,
        stornoAt: new Date(),
        stornoBy: 'system'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Dobropis ${creditNote.creditNoteNumber} byl stornován`,
      creditNote: result
    })
  } catch (error) {
    console.error('Chyba při stornování dobropisu:', error)
    return NextResponse.json(
      {
        error: 'Nepodařilo se stornovat dobropis',
        details: error instanceof Error ? error.message : 'Neznámá chyba'
      },
      { status: 500 }
    )
  }
}
