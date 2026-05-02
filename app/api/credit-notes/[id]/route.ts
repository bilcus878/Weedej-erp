import { NextResponse } from 'next/server'
import { prisma } from '@/lib/platform/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cn = await prisma.creditNote.findUnique({
      where: { id: params.id },
      include: {
        issuedInvoice: {
          include: {
            customer: true,
            customerOrder: true,
            transaction: true,
          },
        },
        items: true,
      },
    })

    if (!cn) return NextResponse.json({ error: 'Dobropis nenalezen' }, { status: 404 })

    const mapped = {
      id:                    cn.id,
      creditNoteNumber:      cn.creditNoteNumber,
      issuedInvoiceId:       cn.issuedInvoiceId,
      invoiceNumber:         cn.issuedInvoice.invoiceNumber,
      creditNoteDate:        cn.creditNoteDate,
      totalAmount:           cn.totalAmount,
      totalAmountWithoutVat: cn.totalAmountWithoutVat,
      totalVatAmount:        cn.totalVatAmount,
      reason:                cn.reason,
      note:                  cn.note,
      status:                cn.status,
      stornoReason:          cn.stornoReason,
      stornoAt:              cn.stornoAt,
      stornoBy:              (cn as any).stornoBy,
      customer:              cn.issuedInvoice.customer,
      customerName:          cn.customerName || cn.issuedInvoice.customerName,
      customerEntityType:    cn.customerEntityType,
      customerEmail:         cn.customerEmail,
      customerPhone:         cn.customerPhone,
      customerAddress:       cn.customerAddress,
      customerIco:           cn.customerIco,
      customerDic:           cn.customerDic,
      items:                 cn.items,
      customerOrderId:       cn.issuedInvoice.customerOrderId,
      customerOrderNumber:   cn.issuedInvoice.customerOrder?.orderNumber,
      transactionId:         cn.issuedInvoice.transactionId,
      transactionCode:       cn.issuedInvoice.transaction?.transactionCode,
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Chyba při načítání dobropisu:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst dobropis' }, { status: 500 })
  }
}
