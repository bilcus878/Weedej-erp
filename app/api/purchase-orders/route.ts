import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentNumbering'
import { calculateVatFromNet, calculateVatFromGross, calculateLineVat, calculateVatSummary, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'
import { archivePurchaseOrder, archiveAsync } from '@/lib/documents/DocumentArchiveService'

export const dynamic = 'force-dynamic'

// GET /api/purchase-orders
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')

    const orders = await prisma.purchaseOrder.findMany({
      where: supplierId ? { supplierId } : undefined,
      include: {
        supplier: true,
        items: { include: { product: true } },
        receipts: {
          include: {
            supplier: true,
            items: { include: { product: true } },
          },
        },
        invoice: true,
      },
      orderBy: { orderNumber: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Chyba při načítání objednávek:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst objednávky' }, { status: 500 })
  }
}

// POST /api/purchase-orders
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      supplierId,
      isManualSupplier,
      isAnonymousSupplier,
      saveSupplierToDatabase,
      manualSupplierData,
      orderDate,
      expectedDate,
      note,
      items,
      pricesIncludeVat,
      // Payment
      dueDate,
      paymentType,
      variableSymbol,
      constantSymbol,
      specificSymbol,
      // Discount
      discountType,
      discountValue,
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Musíte přidat alespoň jednu položku' }, { status: 400 })
    }

    for (const item of items) {
      if (!item.isManual && !item.productId) {
        return NextResponse.json({ error: 'Každá položka musí být ze seznamu nebo zadaná ručně' }, { status: 400 })
      }
      if (item.isManual && !item.productName?.trim()) {
        return NextResponse.json({ error: 'Ručně zadaná položka musí mít název' }, { status: 400 })
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const actualOrderDate = orderDate ? new Date(orderDate) : new Date()

      // 1. Generate order number based on order date
      const orderNumber = await getNextDocumentNumber('purchase-order', tx, actualOrderDate)

      // 2. Resolve supplier snapshot
      let supplierData: Record<string, unknown> = {}
      let createdSupplierId: string | null = null

      if (isManualSupplier && saveSupplierToDatabase && manualSupplierData) {
        const newSupplier = await tx.supplier.create({
          data: {
            name:        manualSupplierData.name,
            entityType:  manualSupplierData.entityType || 'company',
            contact:     manualSupplierData.contactPerson || null,
            email:       manualSupplierData.email       || null,
            phone:       manualSupplierData.phone       || null,
            ico:         manualSupplierData.ico         || null,
            dic:         manualSupplierData.dic         || null,
            bankAccount: manualSupplierData.bankAccount || null,
            address:     manualSupplierData.address     || null,
            note:        manualSupplierData.note        || null,
          },
        })
        createdSupplierId = newSupplier.id
      }

      if (isAnonymousSupplier) {
        supplierData = {
          supplierId:            null,
          supplierName:          'Anonymní dodavatel',
          supplierEntityType:    null,
          supplierICO:           null,
          supplierDIC:           null,
          supplierAddress:       null,
          supplierContactPerson: null,
          supplierEmail:         null,
          supplierPhone:         null,
          supplierBankAccount:   null,
          supplierWebsite:       null,
        }
      } else if (isManualSupplier && manualSupplierData) {
        if (createdSupplierId) {
          // Saved to DB — link by ID, no snapshot fields needed
          supplierData = {
            supplierId:            createdSupplierId,
            supplierName:          null,
            supplierEntityType:    null,
            supplierICO:           null,
            supplierDIC:           null,
            supplierAddress:       null,
            supplierContactPerson: null,
            supplierEmail:         null,
            supplierPhone:         null,
            supplierBankAccount:   null,
            supplierWebsite:       null,
          }
        } else {
          // Not saved — store full snapshot
          supplierData = {
            supplierId:            null,
            supplierName:          manualSupplierData.name          || null,
            supplierEntityType:    manualSupplierData.entityType    || 'company',
            supplierICO:           manualSupplierData.ico           || null,
            supplierDIC:           manualSupplierData.dic           || null,
            supplierAddress:       manualSupplierData.address       || null,
            supplierContactPerson: manualSupplierData.contactPerson || null,
            supplierEmail:         manualSupplierData.email         || null,
            supplierPhone:         manualSupplierData.phone         || null,
            supplierBankAccount:   manualSupplierData.bankAccount   || null,
            supplierWebsite:       manualSupplierData.website       || null,
          }
        }
      } else {
        // Existing DB supplier — link by ID
        supplierData = {
          supplierId:            supplierId || null,
          supplierName:          null,
          supplierEntityType:    null,
          supplierICO:           null,
          supplierDIC:           null,
          supplierAddress:       null,
          supplierContactPerson: null,
          supplierEmail:         null,
          supplierPhone:         null,
          supplierBankAccount:   null,
          supplierWebsite:       null,
        }
      }

      // 3. Calculate VAT for each item
      const itemsWithVat = items.map((item: {
        isManual: boolean; productId?: string; productName?: string;
        quantity: number; unit: string; expectedPrice: number; vatRate?: number
      }) => {
        const qty          = Number(item.quantity)
        const vatRate      = item.vatRate != null ? Number(item.vatRate) : DEFAULT_VAT_RATE
        const enteredPrice = Number(item.expectedPrice) || 0

        let unitPriceWithoutVat: number
        let unitVatAmount: number
        let unitPriceWithVat: number

        if (pricesIncludeVat) {
          const calc      = calculateVatFromGross(enteredPrice, vatRate)
          unitPriceWithoutVat = calc.priceWithoutVat
          unitVatAmount       = calc.vatAmount
          unitPriceWithVat    = calc.priceWithVat
        } else {
          const calc      = calculateVatFromNet(enteredPrice, vatRate)
          unitPriceWithoutVat = calc.priceWithoutVat
          unitVatAmount       = calc.vatAmount
          unitPriceWithVat    = calc.priceWithVat
        }

        return {
          productId:   item.isManual ? null : item.productId,
          productName: item.isManual ? item.productName : null,
          quantity:    qty,
          unit:        item.unit,
          expectedPrice: unitPriceWithoutVat,
          vatRate,
          vatAmount:   unitVatAmount,
          priceWithVat: unitPriceWithVat,
        }
      })

      // 4. Calculate VAT summary (pre-discount)
      const vatLineItems = itemsWithVat.map((item: {
        quantity: number; expectedPrice: number; vatRate: number
      }) => calculateLineVat(item.quantity, item.expectedPrice, item.vatRate))
      const vatSummary = calculateVatSummary(vatLineItems)

      // 5. Apply discount
      let computedDiscountAmount = 0
      if (discountType === 'percentage' && discountValue != null && discountValue > 0) {
        computedDiscountAmount = vatSummary.totalWithVat * (Number(discountValue) / 100)
      } else if (discountType === 'fixed' && discountValue != null && discountValue > 0) {
        computedDiscountAmount = Number(discountValue)
      }

      const finalTotal           = vatSummary.totalWithVat - computedDiscountAmount
      const discountRatio        = vatSummary.totalWithVat > 0
        ? (vatSummary.totalWithVat - computedDiscountAmount) / vatSummary.totalWithVat
        : 1
      const finalWithoutVat      = vatSummary.totalWithoutVat * discountRatio
      const finalVatAmount       = vatSummary.totalVat * discountRatio

      // 6. Create order
      const createdOrder = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          ...supplierData,
          orderDate:            actualOrderDate,
          expectedDate:         expectedDate ? new Date(expectedDate) : null,
          note:                 note || null,
          status:               'pending',
          discountType:         discountType  || null,
          discountValue:        discountValue != null ? discountValue : null,
          discountAmount:       computedDiscountAmount > 0 ? computedDiscountAmount : null,
          totalAmount:          finalTotal,
          totalAmountWithoutVat: finalWithoutVat,
          totalVatAmount:       finalVatAmount,
          items: {
            create: itemsWithVat.map((item: {
              productId: string | null; productName: string | null;
              quantity: number; unit: string; expectedPrice: number;
              vatRate: number; vatAmount: number; priceWithVat: number
            }) => ({
              productId:    item.productId,
              productName:  item.productName,
              quantity:     item.quantity,
              unit:         item.unit,
              expectedPrice: item.expectedPrice,
              vatRate:      item.vatRate,
              vatAmount:    item.vatAmount,
              priceWithVat: item.priceWithVat,
            })),
          },
        },
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      })

      // 7. Create provisional received-invoice (financial liability record)
      await tx.receivedInvoice.create({
        data: {
          invoiceNumber:         `FA-OBJ-${orderNumber}`,
          isTemporary:           true,
          purchaseOrder:         { connect: { id: createdOrder.id } },
          invoiceDate:           actualOrderDate,
          dueDate:               dueDate ? new Date(dueDate) : null,
          totalAmount:           finalTotal,
          paymentType:           paymentType || 'bank_transfer',
          supplierName:          isManualSupplier ? manualSupplierData.name           : (isAnonymousSupplier ? 'Anonymní dodavatel' : null),
          supplierContactPerson: isManualSupplier ? manualSupplierData.contactPerson  : null,
          supplierEmail:         isManualSupplier ? manualSupplierData.email          : null,
          supplierPhone:         isManualSupplier ? manualSupplierData.phone          : null,
          supplierIco:           isManualSupplier ? manualSupplierData.ico            : null,
          supplierDic:           isManualSupplier ? manualSupplierData.dic            : null,
          supplierBankAccount:   isManualSupplier ? manualSupplierData.bankAccount    : null,
          supplierWebsite:       isManualSupplier ? manualSupplierData.website        : null,
          supplierAddress:       isManualSupplier ? manualSupplierData.address        : null,
          note:                  null,
        },
      })

      console.log(`✅ Purchase order ${orderNumber} created — total ${finalTotal} Kč${computedDiscountAmount > 0 ? ` (discount ${computedDiscountAmount} Kč)` : ''}`)

      return createdOrder
    })

    archiveAsync(() => archivePurchaseOrder(order.id), `PurchaseOrder ${order.orderNumber}`)
    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření objednávky:', error)
    return NextResponse.json({ error: 'Nepodařilo se vytvořit objednávku' }, { status: 500 })
  }
}
