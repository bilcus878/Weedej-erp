// API Endpoint pro stornování vystavené faktury
// URL: /api/invoices/issued/[id]/storno
// CASCADE STORNO: Stornuje fakturu + objednávku zákazníka (nebo SumUp transakci)
// NEŘEŠÍ sklad ani výdejky - to se stornuje samostatně

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

    console.log(`🔄 Storno vystavené faktury - ID: ${id}, Důvod: ${reason || 'nezadán'}`)

    // Načti fakturu
    const invoice = await prisma.issuedInvoice.findUnique({
      where: { id },
      include: {
        transaction: true,
        customerOrder: true,
        deliveryNote: true
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
      const stornoedInvoice = await tx.issuedInvoice.update({
        where: { id },
        data: {
          status: 'storno',
          stornoReason,
          stornoAt: new Date(),
          stornoBy: 'system'
        }
      })

      // 2. CASCADE: Pokud je propojena s objednávkou zákazníka → STORNUJ I OBJEDNÁVKU
      if (invoice.customerOrderId) {
        await tx.customerOrder.update({
          where: { id: invoice.customerOrderId },
          data: {
            status: 'storno',
            stornoReason: `Storno faktury ${invoice.invoiceNumber}: ${stornoReason}`,
            stornoAt: new Date(),
            stornoBy: 'system'
          }
        })

        console.log(`✓ CASCADE: Objednávka zákazníka stornována společně s fakturou`)
      }

      // 3. CASCADE: Pokud je propojena s SumUp transakcí → STORNUJ I TRANSAKCI
      if (invoice.transactionId) {
        await tx.transaction.update({
          where: { id: invoice.transactionId },
          data: {
            status: 'storno'
          }
        })

        console.log(`✓ CASCADE: SumUp transakce ${invoice.transaction?.transactionCode} stornována`)
      }

      console.log(`✓ Vystavená faktura ${invoice.invoiceNumber} byla stornována (CASCADE)`)

      return stornoedInvoice
    })

    return NextResponse.json({
      success: true,
      message: 'Faktura a navázané doklady byly stornovány (CASCADE)',
      warning: 'Pokud chceš vrátit zboží do skladu, stornuj výdejku samostatně',
      invoice: result
    })
  } catch (error) {
    console.error('Chyba při stornování vystavené faktury:', error)

    // Detailní error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return NextResponse.json(
      {
        error: 'Nepodařilo se stornovat fakturu',
        details: error instanceof Error ? error.message : 'Neznámá chyba',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
