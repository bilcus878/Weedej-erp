// API Endpoint pro stornování přijaté faktury
// URL: /api/invoices/received/[id]/storno
// CASCADE STORNO: Stornuje fakturu + objednávku vydanou (Purchase Order)
// NEŘEŠÍ sklad ani příjemky - to se stornuje samostatně

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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

    // Načti fakturu
    const invoice = await prisma.receivedInvoice.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            items: true,
            receipts: true
          }
        },
        receipts: true
      }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Faktura nenalezena' },
        { status: 404 }
      )
    }

    // Kontrola - nelze stornovat již stornovanou fakturu
    if (invoice.status === 'storno') {
      return NextResponse.json(
        { error: 'Faktura je již stornována' },
        { status: 400 }
      )
    }

    // Zpracování v transakci
    const result = await prisma.$transaction(async (tx) => {
      const stornoReason = reason || 'Stornováno uživatelem'

      // 1. Nastav fakturu jako storno
      const stornoedInvoice = await tx.receivedInvoice.update({
        where: { id },
        data: {
          status: 'storno',
          stornoReason,
          stornoAt: new Date(),
          stornoBy: 'system'
        }
      })

      // 2. CASCADE: Pokud je propojena s objednávkou → STORNUJ I OBJEDNÁVKU
      if (invoice.purchaseOrderId && invoice.purchaseOrder) {
        await tx.purchaseOrder.update({
          where: { id: invoice.purchaseOrderId },
          data: {
            status: 'storno',
            stornoReason: `Storno faktury ${invoice.invoiceNumber}: ${stornoReason}`,
            stornoAt: new Date(),
            stornoBy: 'system'
          }
        })

        console.log(`✓ CASCADE: Objednávka vydaná ${invoice.purchaseOrder.orderNumber} stornována společně s fakturou`)
      }

      console.log(`✓ Přijatá faktura ${invoice.invoiceNumber} byla stornována (CASCADE)`)

      return stornoedInvoice
    })

    return NextResponse.json({
      success: true,
      message: 'Faktura a navázaná objednávka byly stornovány (CASCADE)',
      warning: 'Pokud chceš vrátit zboží ze skladu, stornuj příjemku samostatně',
      invoice: result
    })
  } catch (error) {
    console.error('Chyba při stornování přijaté faktury:', error)
    return NextResponse.json(
      {
        error: 'Nepodařilo se stornovat fakturu',
        details: error instanceof Error ? error.message : 'Neznámá chyba'
      },
      { status: 500 }
    )
  }
}
