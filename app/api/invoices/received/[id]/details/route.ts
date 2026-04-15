// API Endpoint pro doplnění detailů přijaté faktury
// URL: /api/invoices/received/[id]/details

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/invoices/received/[id]/details - Doplnit/upravit detaily faktury
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      invoiceDate,
      dueDate,
      expectedDeliveryDate,
      paymentType,
      variableSymbol,
      constantSymbol,
      specificSymbol,
      note,
      supplierName,
      supplierEntityType,
      supplierContactPerson,
      supplierEmail,
      supplierPhone,
      supplierIco,
      supplierDic,
      supplierBankAccount,
      supplierWebsite,
      supplierAddress,
      supplierNote
    } = body

    console.log('🔴 API /details - Přijatý body:', body)
    console.log('🔴 supplierWebsite:', supplierWebsite)

    // Najdi fakturu včetně objednávky
    const invoice = await prisma.receivedInvoice.findUnique({
      where: { id: params.id },
      include: { purchaseOrder: true }
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Faktura nebyla nalezena' },
        { status: 404 }
      )
    }

    // Aktualizuj fakturu
    const updatedInvoice = await prisma.receivedInvoice.update({
      where: { id: params.id },
      data: {
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        paymentType: paymentType !== undefined ? (paymentType || 'transfer') : undefined,
        variableSymbol: variableSymbol !== undefined ? (variableSymbol || null) : undefined,
        constantSymbol: constantSymbol !== undefined ? (constantSymbol || null) : undefined,
        specificSymbol: specificSymbol !== undefined ? (specificSymbol || null) : undefined,
        note: note !== undefined ? (note || null) : undefined,
        supplierName: supplierName !== undefined ? (supplierName || null) : undefined,
        supplierEntityType: supplierEntityType !== undefined ? (supplierEntityType || 'company') : undefined,
        supplierContactPerson: supplierContactPerson !== undefined ? (supplierContactPerson || null) : undefined,
        supplierEmail: supplierEmail !== undefined ? (supplierEmail || null) : undefined,
        supplierPhone: supplierPhone !== undefined ? (supplierPhone || null) : undefined,
        supplierIco: supplierIco !== undefined ? (supplierIco || null) : undefined,
        supplierDic: supplierDic !== undefined ? (supplierDic || null) : undefined,
        supplierBankAccount: supplierBankAccount !== undefined ? (supplierBankAccount || null) : undefined,
        supplierWebsite: supplierWebsite !== undefined ? (supplierWebsite || null) : undefined,
        supplierAddress: supplierAddress !== undefined ? (supplierAddress || null) : undefined,
        supplierNote: supplierNote !== undefined ? (supplierNote || null) : undefined
      }
    })
    console.log('✅ ReceivedInvoice aktualizována - supplierWebsite:', updatedInvoice.supplierWebsite)

    // Aktualizuj objednávku, pokud existuje
    if (invoice.purchaseOrderId) {
      const updatedOrder = await prisma.purchaseOrder.update({
        where: { id: invoice.purchaseOrderId },
        data: {
          expectedDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          note: note !== undefined ? (note || null) : undefined,
          supplierName: supplierName !== undefined ? (supplierName || null) : undefined,
          supplierEntityType: supplierEntityType !== undefined ? (supplierEntityType || 'company') : undefined,
          supplierAddress: supplierAddress !== undefined ? (supplierAddress || null) : undefined,
          supplierICO: supplierIco !== undefined ? (supplierIco || null) : undefined,
          supplierDIC: supplierDic !== undefined ? (supplierDic || null) : undefined,
          supplierContactPerson: supplierContactPerson !== undefined ? (supplierContactPerson || null) : undefined,
          supplierEmail: supplierEmail !== undefined ? (supplierEmail || null) : undefined,
          supplierPhone: supplierPhone !== undefined ? (supplierPhone || null) : undefined,
          supplierBankAccount: supplierBankAccount !== undefined ? (supplierBankAccount || null) : undefined,
          supplierWebsite: supplierWebsite !== undefined ? (supplierWebsite || null) : undefined
        }
      })
      console.log('✅ PurchaseOrder aktualizována - supplierWebsite:', updatedOrder.supplierWebsite)
    }

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error('Chyba při ukládání detailů faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se uložit detaily faktury' },
      { status: 500 }
    )
  }
}
