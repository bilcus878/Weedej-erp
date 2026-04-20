// API Endpoint pro vystavené faktury (Issued Invoices)
// URL: /api/issued-invoices

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/issued-invoices - Získat všechny vystavené faktury
export async function GET() {
  try {
    const invoices = await prisma.issuedInvoice.findMany({
      include: {
        customer: true,
        deliveryNote: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        transaction: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        customerOrder: {
          include: {
            items: true,
            deliveryNotes: {
              include: {
                items: {
                  include: {
                    product: true
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        },
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Nejnovější vytvořená nahoře
      }
    })

    // Mapuj data tak, aby frontend měl správnou strukturu (kompatibilní s Transaction)
    const mappedInvoices = invoices.map(invoice => {
      // Zjisti správný status:
      // PRIORITA 1: Pokud je faktura storno → status = storno (VŽDY!)
      // PRIORITA 2: Pokud má customerOrder, použij status z něj
      // PRIORITA 3: Pokud je to SumUp transakce (má transactionId), status = delivered (Předáno)
      // PRIORITA 4: Jinak použij status z faktury
      let finalStatus = invoice.status

      if (invoice.status === 'storno') {
        finalStatus = 'storno' // STORNO má nejvyšší prioritu!
      } else if (invoice.customerOrder) {
        finalStatus = invoice.customerOrder.status
      } else if (invoice.transactionId) {
        finalStatus = 'delivered' // SumUp transakce = Předáno (na pobočce)
      }

      return {
        id: invoice.id,
        transactionCode: invoice.invoiceNumber, // Číslo faktury
        totalAmount: invoice.totalAmount,
        paymentType: invoice.paymentType,
        paymentStatus: invoice.paymentStatus,
        status: finalStatus,
        transactionDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        customer: invoice.customer,
        customerName: invoice.customerName,
        customerEntityType: invoice.customerEntityType,
        customerContactPerson: invoice.customerContactPerson,
        customerAddress: invoice.customerAddress,
        customerPhone: invoice.customerPhone,
        customerEmail: invoice.customerEmail,
        customerIco: invoice.customerIco,
        customerDic: invoice.customerDic,
        customerWebsite: invoice.customerWebsite,
        customerBankAccount: invoice.customerBankAccount,
        // ID a číslo objednávky zákazníka pro proklik
        customerOrderId: invoice.customerOrderId,
        customerOrderNumber: invoice.customerOrder?.orderNumber,
        customerOrderSource: invoice.customerOrder?.source,
        // ID transakce (SumUp) pro proklik
        transactionId: invoice.transaction?.id,
        transactionCode_sumup: invoice.transaction?.transactionCode,
        receiptId: invoice.transaction?.receiptId, // SumUp účtenka
        // Použij položky z items (priorita), pak deliveryNote, nebo transaction
        items: invoice.items.length > 0 ? invoice.items : (invoice.deliveryNote?.items || invoice.transaction?.items || []),
        // Všechny výdejky pro tuto fakturu (přes customerOrder) - s vypočítaným totalAmount
        deliveryNotes: (invoice.customerOrder?.deliveryNotes || (invoice.deliveryNote ? [invoice.deliveryNote] : [])).map(dn => ({
          ...dn,
          totalAmount: dn.items?.reduce((sum, item) => {
            const hasSaved = (item as any).price != null && (item as any).priceWithVat != null
            const unitPrice = hasSaved ? Number((item as any).price) : Number((item as any).product?.price || 0)
            const vatRate = hasSaved ? Number((item as any).vatRate ?? 21) : Number((item as any).product?.vatRate || 21)
            const priceWithVat = hasSaved
              ? Number((item as any).priceWithVat)
              : (unitPrice * (1 + vatRate / 100))
            let packs = Number(item.quantity)
            const productName: string | null = (item as any).productName ?? null
            const unit: string = (item as any).unit ?? 'ks'
            if (productName?.includes(' — ') && unit !== 'ks') {
              const variantLabel = productName.split(' — ').slice(-1)[0]
              const match = variantLabel.match(/^([\d.]+)/)
              if (match) {
                const packSize = parseFloat(match[1])
                if (packSize > 0) packs = Math.round((packs / packSize) * 1000) / 1000
              }
            }
            return sum + (packs * priceWithVat)
          }, 0) || 0
        })),
        // Shipping snapshot (from customerOrder — eshop orders only)
        shippingMethod:     invoice.customerOrder?.shippingMethod     ?? null,
        pickupPointId:      invoice.customerOrder?.pickupPointId      ?? null,
        pickupPointName:    invoice.customerOrder?.pickupPointName    ?? null,
        pickupPointAddress: invoice.customerOrder?.pickupPointAddress ?? null,
        pickupPointCarrier: invoice.customerOrder?.pickupPointCarrier ?? null,
        // Billing address snapshot (from customerOrder — eshop orders only)
        billingName:        invoice.customerOrder?.billingName        ?? null,
        billingCompany:     invoice.customerOrder?.billingCompany     ?? null,
        billingIco:         invoice.customerOrder?.billingIco         ?? null,
        billingStreet:      invoice.customerOrder?.billingStreet      ?? null,
        billingCity:        invoice.customerOrder?.billingCity        ?? null,
        billingZip:         invoice.customerOrder?.billingZip         ?? null,
        billingCountry:     invoice.customerOrder?.billingCountry     ?? null,
        // Původní data pro debugging
        _original: {
          deliveryNote: invoice.deliveryNote,
          transaction: invoice.transaction,
          customerOrder: invoice.customerOrder
        }
      }
    })

    return NextResponse.json(mappedInvoices)
  } catch (error) {
    console.error('Chyba při načítání vystavených faktur:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst vystavené faktury' },
      { status: 500 }
    )
  }
}

// POST /api/issued-invoices - Vytvořit novou vystavenou fakturu (manuálně)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      customerId,
      customerName,
      deliveryNoteId,
      customerOrderId,
      invoiceDate,
      dueDate,
      totalAmount,
      paymentType,
      paymentStatus,
      note
    } = body

    // Validace
    if (!totalAmount) {
      return NextResponse.json(
        { error: 'Chybí povinná pole (totalAmount)' },
        { status: 400 }
      )
    }

    // Vytvoř fakturu v transakci (ON-COMMIT číslování)
    const { getNextDocumentNumber } = await import('@/lib/documentNumbering')

    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await getNextDocumentNumber('issued-invoice', tx)

      return await tx.issuedInvoice.create({
        data: {
          invoiceNumber,
          customerId: customerId || null,
          customerName: customerName || null,
          deliveryNoteId: deliveryNoteId || null,
          customerOrderId: customerOrderId || null,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          totalAmount: Number(totalAmount),
          paymentType: paymentType || 'transfer',
          paymentStatus: paymentStatus || 'unpaid',
          note: note || null
        },
        include: {
          customer: true,
          deliveryNote: {
            include: {
              items: {
                include: {
                  product: true
                }
              }
            }
          },
          customerOrder: true
        }
      })
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření vystavené faktury:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit vystavenou fakturu' },
      { status: 500 }
    )
  }
}
