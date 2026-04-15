// API Endpoint pro objednávky (Purchase Orders)
// URL: /api/purchase-orders

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentNumbering'
import { calculateVatFromNet, calculateVatFromGross, calculateLineVat, calculateVatSummary, DEFAULT_VAT_RATE } from '@/lib/vatCalculation'

export const dynamic = 'force-dynamic'

// GET /api/purchase-orders - Získat všechny objednávky
export async function GET() {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        },
        receipts: {
          include: {
            supplier: true,
            items: {
              include: {
                product: true
              }
            }
          }
        }, // Příjemky vytvořené z této objednávky
        invoice: true // Faktura spojená s objednávkou
      },
      orderBy: {
        orderNumber: 'desc' // Nejvyšší číslo nahoře
      }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Chyba při načítání objednávek:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst objednávky' },
      { status: 500 }
    )
  }
}

// POST /api/purchase-orders - Vytvořit novou objednávku
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
      // Platební údaje
      dueDate,
      paymentType,
      variableSymbol,
      constantSymbol,
      specificSymbol
    } = body

    // Validace
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Musíte přidat produkt pro vytvoření objednávky' },
        { status: 400 }
      )
    }

    // Validace položek - každá musí mít buď productId (produkt z DB) nebo být manuální
    for (const item of items) {
      if (!item.isManual && !item.productId) {
        return NextResponse.json(
          { error: 'Musíte přidat produkt pro vytvoření objednávky' },
          { status: 400 }
        )
      }
    }

    // Objednávka může být bez dodavatele (anonymní), nebo s ručním, nebo s vybraným
    // Validace je pouze na frontend - backend vše přijme

    // Vytvoř objednávku v transakci (atomické) + FAKTURA IHNED
    const order = await prisma.$transaction(async (tx) => {
      // Určíme datum objednávky
      const actualOrderDate = orderDate ? new Date(orderDate) : new Date()

      // 1. Vygeneruj číslo objednávky (ON-COMMIT) podle data objednávky
      const orderNumber = await getNextDocumentNumber('purchase-order', tx, actualOrderDate)

      // 2. Vytvoř objednávku
      // Pokud je manuální dodavatel, použij data z manualSupplierData
      let supplierData: any = {}
      let createdSupplierId = null

      // Pokud je zaškrtnuté "Uložit do databáze" a je to manuální dodavatel, vytvoř ho
      if (isManualSupplier && saveSupplierToDatabase && manualSupplierData) {
        const newSupplier = await tx.supplier.create({
          data: {
            name: manualSupplierData.name,
            entityType: manualSupplierData.entityType || 'company',
            contact: manualSupplierData.contactPerson || null, // Supplier má pole "contact", ne "contactPerson"
            email: manualSupplierData.email || null,
            phone: manualSupplierData.phone || null,
            ico: manualSupplierData.ico || null,
            dic: manualSupplierData.dic || null,
            bankAccount: manualSupplierData.bankAccount || null,
            // website není v Supplier modelu
            address: manualSupplierData.address || null,
            note: manualSupplierData.note || null
          }
        })
        createdSupplierId = newSupplier.id
      }

      if (isAnonymousSupplier) {
        // Anonymní dodavatel
        supplierData = {
          supplierId: null,
          supplierName: 'Anonymní dodavatel',
          supplierICO: null,
          supplierDIC: null,
          supplierAddress: null
        }
      } else if (isManualSupplier && manualSupplierData) {
        // Ruční zadání dodavatele
        supplierData = {
          supplierId: createdSupplierId, // použij ID pokud byl vytvořen
          supplierName: createdSupplierId ? null : (manualSupplierData.name || null),
          supplierEntityType: createdSupplierId ? null : (manualSupplierData.entityType || 'company'),
          supplierICO: createdSupplierId ? null : (manualSupplierData.ico || null),
          supplierDIC: createdSupplierId ? null : (manualSupplierData.dic || null),
          supplierAddress: createdSupplierId ? null : (manualSupplierData.address || null)
        }
      } else {
        // Vybraný dodavatel z databáze
        supplierData = {
          supplierId: supplierId || null,
          supplierName: null,
          supplierICO: null,
          supplierDIC: null,
          supplierAddress: null
        }
      }

      // 2b. Výpočet DPH pro každou položku
      const itemsWithVat = items.map((item: any) => {
        const qty = Number(item.quantity)
        const vatRate = item.vatRate != null ? Number(item.vatRate) : DEFAULT_VAT_RATE
        const enteredPrice = item.expectedPrice ? Number(item.expectedPrice) : 0

        let unitPriceWithoutVat: number
        let unitVatAmount: number
        let unitPriceWithVat: number

        if (pricesIncludeVat) {
          // Cena zadaná S DPH - zpětný výpočet
          const calc = calculateVatFromGross(enteredPrice, vatRate)
          unitPriceWithoutVat = calc.priceWithoutVat
          unitVatAmount = calc.vatAmount
          unitPriceWithVat = calc.priceWithVat
        } else {
          // Cena zadaná BEZ DPH - dopředný výpočet
          const calc = calculateVatFromNet(enteredPrice, vatRate)
          unitPriceWithoutVat = calc.priceWithoutVat
          unitVatAmount = calc.vatAmount
          unitPriceWithVat = calc.priceWithVat
        }

        return {
          productId: item.isManual ? null : item.productId,
          productName: item.isManual ? item.productName : null,
          quantity: qty,
          unit: item.unit,
          expectedPrice: unitPriceWithoutVat,
          vatRate,
          vatAmount: unitVatAmount,
          priceWithVat: unitPriceWithVat
        }
      })

      // Výpočet souhrnů DPH pro celou objednávku
      const vatLineItems = itemsWithVat.map((item: any) => {
        const lineCalc = calculateLineVat(item.quantity, item.expectedPrice, item.vatRate)
        return lineCalc
      })
      const vatSummary = calculateVatSummary(vatLineItems)

      const createdOrder = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          ...supplierData,
          orderDate: actualOrderDate,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          note: note || null,
          status: 'pending',
          totalAmount: vatSummary.totalWithVat,
          totalAmountWithoutVat: vatSummary.totalWithoutVat,
          totalVatAmount: vatSummary.totalVat,
          items: {
            create: itemsWithVat.map((item: any) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
              expectedPrice: item.expectedPrice,
              vatRate: item.vatRate,
              vatAmount: item.vatAmount,
              priceWithVat: item.priceWithVat
            }))
          }
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true
            }
          }
        }
      })

      // 3. IHNED vytvoř fakturu (FINANČNÍ ZÁVAZEK)
      const totalAmount = vatSummary.totalWithVat

      // Vytvoř fakturu s platobnými údaji a údaji dodavatele
      // POZNÁMKA: ReceivedInvoice nemá pole variableSymbol, constantSymbol, specificSymbol
      // Tyto údaje jsou jen u IssuedInvoice (vystavenych faktur)
      await tx.receivedInvoice.create({
        data: {
          invoiceNumber: `FA-OBJ-${orderNumber}`, // Dočasné číslo podle objednávky
          isTemporary: true,
          purchaseOrder: {
            connect: { id: createdOrder.id } // ✅ Správná Prisma syntax pro propojení
          },
          invoiceDate: actualOrderDate,
          dueDate: dueDate ? new Date(dueDate) : null, // Datum splatnosti z formuláře
          totalAmount,
          paymentType: paymentType || 'transfer', // Forma úhrady z formuláře
          // Údaje dodavatele (pokud je manuální nebo anonymní)
          supplierName: isManualSupplier ? manualSupplierData.name : (isAnonymousSupplier ? 'Anonymní dodavatel' : null),
          supplierContactPerson: isManualSupplier ? manualSupplierData.contactPerson : null,
          supplierEmail: isManualSupplier ? manualSupplierData.email : null,
          supplierPhone: isManualSupplier ? manualSupplierData.phone : null,
          supplierIco: isManualSupplier ? manualSupplierData.ico : null,
          supplierDic: isManualSupplier ? manualSupplierData.dic : null,
          supplierBankAccount: isManualSupplier ? manualSupplierData.bankAccount : null,
          supplierWebsite: isManualSupplier ? manualSupplierData.website : null,
          supplierAddress: isManualSupplier ? manualSupplierData.address : null,
          note: null
        }
      })

      console.log(`✅ Vytvořena objednávka ${orderNumber} + faktura FA-OBJ-${orderNumber} (závazek ${totalAmount} Kč)`)

      return createdOrder
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Chyba při vytváření objednávky:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit objednávku' },
      { status: 500 }
    )
  }
}
