import { NextResponse } from 'next/server'
import { prisma } from '@/lib/platform/db/prisma'
import { resolveInvoiceStatus } from '@/features/issued-invoices/domain/invoiceStatus'
import { calcPackCount } from '@/lib/shared/inventory/packQuantity'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoice = await prisma.issuedInvoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        deliveryNote: { include: { items: { include: { product: true } } } },
        transaction:  { include: { items: { include: { product: true } } } },
        customerOrder: {
          include: {
            items: true,
            deliveryNotes: {
              include: { items: { include: { product: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        items: { include: { product: true } },
      },
    })

    if (!invoice) return NextResponse.json({ error: 'Faktura nenalezena' }, { status: 404 })

    const finalStatus = resolveInvoiceStatus({
      status:        invoice.status,
      customerOrder: invoice.customerOrder,
      transactionId: invoice.transactionId,
    })

    const mapped = {
      id:              invoice.id,
      transactionCode: invoice.invoiceNumber,
      totalAmount:     invoice.totalAmount,
      paymentType:     invoice.paymentType,
      paymentStatus:   invoice.paymentStatus,
      variableSymbol:  invoice.variableSymbol,
      constantSymbol:  invoice.constantSymbol,
      specificSymbol:  invoice.specificSymbol,
      status:          finalStatus,
      transactionDate: invoice.invoiceDate,
      dueDate:         invoice.dueDate,
      customer:        invoice.customer,
      customerName:    invoice.customerName,
      customerEntityType:    invoice.customerEntityType,
      customerContactPerson: invoice.customerContactPerson,
      customerAddress:       invoice.customerAddress,
      customerPhone:         invoice.customerPhone,
      customerEmail:         invoice.customerEmail,
      customerIco:           invoice.customerIco,
      customerDic:           invoice.customerDic,
      customerWebsite:       invoice.customerWebsite,
      customerBankAccount:   invoice.customerBankAccount,
      note:                  invoice.note,
      customerOrderId:        invoice.customerOrderId,
      customerOrderNumber:    invoice.customerOrder?.orderNumber,
      customerOrderSource:    invoice.customerOrder?.source,
      paymentReference:       invoice.customerOrder?.paymentReference ?? null,
      transactionId:          invoice.transaction?.id,
      transactionCode_sumup:  invoice.transaction?.transactionCode,
      receiptId:              invoice.transaction?.receiptId,
      trackingNumber:         invoice.customerOrder?.trackingNumber ?? null,
      carrier:                invoice.customerOrder?.carrier ?? null,
      shippedAt:              invoice.customerOrder?.shippedAt ?? null,
      items: invoice.items.length > 0
        ? invoice.items
        : (invoice.deliveryNote?.items || invoice.transaction?.items || []),
      deliveryNotes: (
        invoice.customerOrder?.deliveryNotes ||
        (invoice.deliveryNote ? [invoice.deliveryNote] : [])
      ).map(dn => ({
        ...dn,
        totalAmount: dn.items?.reduce((sum: number, item: any) => {
          const hasSaved     = item.price != null && item.priceWithVat != null
          const unitPrice    = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
          const vatRate      = hasSaved ? Number(item.vatRate ?? 21) : Number(item.product?.vatRate || 21)
          const priceWithVat = hasSaved
            ? Number(item.priceWithVat)
            : (unitPrice * (1 + vatRate / 100))
          const packs = calcPackCount(
            Number(item.quantity),
            item.productName ?? null,
            item.unit ?? 'ks',
          )
          return sum + packs * priceWithVat
        }, 0) || 0,
      })),
      shippingMethod:     invoice.customerOrder?.shippingMethod     ?? null,
      pickupPointId:      invoice.customerOrder?.pickupPointId      ?? null,
      pickupPointName:    invoice.customerOrder?.pickupPointName    ?? null,
      pickupPointAddress: invoice.customerOrder?.pickupPointAddress ?? null,
      pickupPointCarrier: invoice.customerOrder?.pickupPointCarrier ?? null,
      billingName:        invoice.customerOrder?.billingName        ?? null,
      billingCompany:     invoice.customerOrder?.billingCompany     ?? null,
      billingIco:         invoice.customerOrder?.billingIco         ?? null,
      billingStreet:      invoice.customerOrder?.billingStreet      ?? null,
      billingCity:        invoice.customerOrder?.billingCity        ?? null,
      billingZip:         invoice.customerOrder?.billingZip         ?? null,
      billingCountry:     invoice.customerOrder?.billingCountry     ?? null,
      _original: {
        customerOrder: invoice.customerOrder,
      },
    }

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('Chyba při načítání faktury:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst fakturu' }, { status: 500 })
  }
}
