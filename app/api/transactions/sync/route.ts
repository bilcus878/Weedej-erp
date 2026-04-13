// API Endpoint pro synchronizaci transakcí ze SumUp
// URL: http://localhost:3000/api/transactions/sync

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchTransactions, fetchReceiptDetail } from '@/lib/sumup'
import { calculateVatFromGross, DEFAULT_VAT_RATE, round2 } from '@/lib/vatCalculation'

// POST /api/transactions/sync - Synchronizovat transakce ze SumUp
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { startDate, endDate } = body

    // Stáhnout transakce ze SumUp
    const sumupTransactions = await fetchTransactions(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    )

    const syncedTransactions = []

    for (const sumupTx of sumupTransactions) {
      console.log('='.repeat(80))
      console.log('ZPRACOVÁVÁM TRANSAKCI:', JSON.stringify(sumupTx, null, 2))
      console.log('='.repeat(80))

      // Zkontroluj jestli už transakce není v databázi
      const existing = await prisma.transaction.findUnique({
        where: { sumupId: sumupTx.id },
      })

      if (existing) {
        console.log(`Transakce ${sumupTx.id} už existuje, přeskakuji`)
        continue
      }

      // ✅ NOVÉ: Vygeneruj číslování SUP20250001 (stejný systém jako faktury)
      // DŮLEŽITÉ: Používáme ROK Z TRANSAKCE, ne aktuální rok!
      const transactionDate = sumupTx.timestamp || sumupTx.date || new Date().toISOString()
      const transactionYear = new Date(transactionDate).getFullYear()

      const settings = await prisma.settings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
          id: 'default',
          lastTransactionNumber: 0,
          lastTransactionYear: transactionYear,
        },
      })

      let transactionNumber = settings.lastTransactionNumber
      let storedYear = settings.lastTransactionYear

      // Pokud je jiný rok než uložený, resetuj na 1
      if (transactionYear !== storedYear) {
        transactionNumber = 0
        storedYear = transactionYear
      }

      transactionNumber++

      // Format: SUP20250001 (naše číslování)
      const transactionCode = `SUP${transactionYear}${String(transactionNumber).padStart(4, '0')}`

      // Původní SumUp kód (např. MS9WFW0Y-65)
      const sumupTransactionCode =
        sumupTx.transaction_code ||
        (sumupTx as any).transaction_id ||
        (sumupTx as any).receipt_number ||
        (sumupTx as any).tx_code ||
        null

      // Aktualizuj settings
      await prisma.settings.update({
        where: { id: 'default' },
        data: {
          lastTransactionNumber: transactionNumber,
          lastTransactionYear: storedYear,
        },
      })

      console.log(`Naše číslo: ${transactionCode} (rok z transakce: ${transactionYear}), SumUp kód: ${sumupTransactionCode}`)
      console.log('Dostupné fieldy v sumupTx:', Object.keys(sumupTx))

      // ✅ NOVÁ LOGIKA: Typ platby určíme podle toho, zda máme line_items nebo potřebujeme Receipts API
      // - Pokud máme line_items přímo v transakci → HOTOVOST
      // - Pokud musíme volat Receipts API → KARTA (terminál)
      let paymentType: 'cash' | 'card' = 'cash' // výchozí hodnota, přepíšeme podle skutečnosti

      // Vytvoř transakci (typ platby aktualizujeme později podle použité metody zpracování)
      const clientTxId = (sumupTx as any).client_transaction_id || null

      // SumUp ceny jsou VŽDY s DPH - zpětný výpočet pro celkovou částku
      const txVat = calculateVatFromGross(sumupTx.amount, DEFAULT_VAT_RATE)

      const transaction = await prisma.transaction.create({
        data: {
          sumupId: sumupTx.id,
          receiptId: clientTxId, // Pro odkaz na SumUp účtenku
          transactionCode, // SUP20250001
          sumupTransactionCode, // MS9WFW0Y-65 (původní SumUp kód)
          invoiceType: 'sumup', // SumUp transakce
          totalAmount: sumupTx.amount, // SumUp vrací částku přímo v Kč (s DPH)
          totalAmountWithoutVat: txVat.priceWithoutVat, // Celkem bez DPH
          totalVatAmount: txVat.vatAmount, // Celkem DPH
          paymentType, // Prozatím výchozí, aktualizujeme později
          status: sumupTx.status,
          transactionDate: new Date(transactionDate),
        },
      })

      // POKUD JIŽ MÁME LINE_ITEMS v transakci (HOTOVOSTNÍ PLATBA)
      // Stáhneme HTML účtenku pro přesné ceny, gramáže a DPH (stejně jako u kartových transakcí)
      if (sumupTx.line_items && sumupTx.line_items.length > 0) {
        console.log(`Zpracovávám ${sumupTx.line_items.length} line_items z transakce (HOTOVOST)`)

        // ✅ Máme line_items přímo → JE TO HOTOVOST
        paymentType = 'cash'
        console.log(`✓ Detekován typ platby: HOTOVOST (line_items jsou přímo v transakci)`)

        // ✅ STÁHNEME HTML ÚČTENKU PRO PŘESNÉ DATA
        const receiptId = sumupTx.client_transaction_id || null

        if (!receiptId) {
          console.warn(`✗ Transakce nemá receiptId - nelze získat HTML účtenku`)
          syncedTransactions.push(transaction)
          continue
        }

        try {
          const receipt = await fetchReceiptDetail(receiptId)

          if (!receipt || !receipt.line_items || receipt.line_items.length === 0) {
            console.warn(`✗ HTML účtenka nevrátila položky`)
            syncedTransactions.push(transaction)
            continue
          }

          const lineItems = receipt.line_items
          const receiptDiscount = receipt.discount || 0

          console.log(`✓ HTML účtenka načtena: ${lineItems.length} položek, sleva: ${receiptDiscount} Kč`)

          // ✅ NOVÁ ARCHITEKTURA: Z účtenky jen názvy a množství
          // Ceny a DPH bereme z KATALOGU!

          // Zpracuj každou položku z HTML účtenky
          for (const lineItem of lineItems) {
            const itemName = lineItem.name || null
            let itemQuantity = lineItem.quantity || 1

            console.log(`  → Line item z účtenky: "${itemName}", množství: ${itemQuantity}`)

            // POUZE přesná shoda podle jména - zkusíme více variant normalizace
            let product = null

            if (itemName) {
            // Odstraň gramáž z názvu pro hledání produktu (např. "Lemon Skunk (X2) 0.5g" → "Lemon Skunk (X2)")
            const itemNameWithoutGrams = itemName.replace(/\s*\d+\.?\d*\s*g\b/i, '').trim()

            console.log(`    → Hledám produkt: "${itemNameWithoutGrams}" (délka: ${itemNameWithoutGrams.length}, char codes: ${Array.from<string>(itemNameWithoutGrams).map(c => c.charCodeAt(0)).join(',')})`)

            // Varianta 1a: Přesná shoda názvu bez gramáže (např. "Lemon Skunk (X2)")
            product = await prisma.product.findFirst({
              where: {
                name: { equals: itemNameWithoutGrams, mode: 'insensitive' },
              },
            })

            if (product) {
              console.log(`    ✓ Nalezeno přesnou shodou: "${product.name}"`)
            }

            // Varianta 1b: Pokud přesná shoda neuspěla, zkus "contains"
            if (!product) {
              product = await prisma.product.findFirst({
                where: {
                  name: { contains: itemNameWithoutGrams, mode: 'insensitive' },
                },
              })

              if (product) {
                console.log(`    ✓ Nalezeno pomocí contains: "${product.name}"`)
              }
            }

            // Varianta 2: Přidej závorky kolem variantního označení (např. "Blue Zushi X2" → "Blue Zushi (X2)")
            if (!product && /\s+X\d+\s*$/i.test(itemNameWithoutGrams)) {
              const normalized = itemNameWithoutGrams.replace(/(\s+)(X\d+)\s*$/i, '$1($2)')
              console.log(`    → Zkouším s normalizací: "${normalized}"`)

              product = await prisma.product.findFirst({
                where: {
                  OR: [
                    { name: { equals: normalized, mode: 'insensitive' } },
                    { name: { contains: normalized, mode: 'insensitive' } },
                  ],
                },
              })
            }

            // Varianta 3: Odstraň závorky z variantního označení (např. "Lemon Skunk (X2)" → "Lemon Skunk X2")
            if (!product && /\(X\d+\)/i.test(itemNameWithoutGrams)) {
              const withoutBrackets = itemNameWithoutGrams.replace(/\(X(\d+)\)/i, 'X$1')
              console.log(`    → Zkouším bez závorek: "${withoutBrackets}"`)

              product = await prisma.product.findFirst({
                where: {
                  OR: [
                    { name: { equals: withoutBrackets, mode: 'insensitive' } },
                    { name: { contains: withoutBrackets, mode: 'insensitive' } },
                  ],
                },
              })
            }

            // Varianta 4: Odstraň variantní označení úplně (např. "Blue Zushi X2" → "Blue Zushi")
            if (!product) {
              const baseName = itemNameWithoutGrams.replace(/\s+[\(\[]?X\d+[\)\]]?\s*$/i, '').trim()
              if (baseName !== itemNameWithoutGrams) {
                console.log(`    → Zkouším bez variantního označení: "${baseName}"`)

                product = await prisma.product.findFirst({
                  where: {
                    name: { contains: baseName, mode: 'insensitive' },
                  },
                })
              }
            }

              if (product) {
                console.log(`    ✓ Produkt nalezen v katalogu: ${product.name}`)

                // ✅ NOVÁ ARCHITEKTURA: Použij cenu a DPH Z KATALOGU!
                const catalogPrice = Number(product.price) // Prodejní cena z katalogu
                const catalogVatRate = Number(product.vatRate || 0)

                // Pro NEPLATCE (vatRate = 0): price = prodejní cena, priceWithVat = prodejní cena
                // Pro PLÁTCE (vatRate > 0): price = bez DPH, priceWithVat = s DPH
                const isNonVatPayer = catalogVatRate === 0

                let finalPrice, finalVatAmount, finalPriceWithVat

                if (isNonVatPayer) {
                  // NEPLATCE: catalogPrice je přímo prodejní cena
                  finalPrice = catalogPrice
                  finalVatAmount = 0
                  finalPriceWithVat = catalogPrice
                  console.log(`    → NEPLATCE DPH: prodejní cena ${catalogPrice} Kč/jednotku`)
                } else {
                  // PLÁTCE: catalogPrice je bez DPH, musíme přidat DPH
                  finalPrice = catalogPrice
                  finalVatAmount = catalogPrice * catalogVatRate / 100
                  finalPriceWithVat = catalogPrice + finalVatAmount
                  console.log(`    → PLÁTCE DPH ${catalogVatRate}%: bez DPH ${catalogPrice} Kč, s DPH ${finalPriceWithVat} Kč`)
                }

                await prisma.transactionItem.create({
                  data: {
                    transactionId: transaction.id,
                    productId: product.id,
                    quantity: itemQuantity,
                    unit: product.unit,
                    price: finalPrice,
                    vatRate: catalogVatRate,
                    vatAmount: finalVatAmount,
                    priceWithVat: finalPriceWithVat,
                  },
                })

                console.log(`    ✓ TransactionItem vytvořen (${itemQuantity} ${product.unit} × ${finalPriceWithVat} Kč = ${round2(itemQuantity * finalPriceWithVat)} Kč)`)
              } else {
                console.warn(`    ✗ Produkt "${itemName}" nenalezen v DB - transakce zůstane bez položek`)
              }
            } else {
              console.warn(`    ✗ Line item nemá jméno - přeskakuji`)
            }
          }

          // ✅ AUTOMATICKÝ VÝPOČET SLEVY
          // Sleva = Celková zaplacená částka - Suma katalogových cen
          const cashLineItems = await prisma.transactionItem.findMany({
            where: { transactionId: transaction.id },
          })

          const catalogTotal = round2(cashLineItems.reduce((sum, item) =>
            sum + Number(item.priceWithVat || 0) * Number(item.quantity), 0
          ))
          const paidTotal = Number(sumupTx.amount)
          const calculatedDiscount = round2(paidTotal - catalogTotal)

          console.log(`  → Výpočet slevy: zaplaceno ${paidTotal} Kč - katalog ${catalogTotal} Kč = ${calculatedDiscount} Kč`)

          // 🛡️ SENIOR VALIDACE: Pokud není žádný produkt v katalogu, nemůžeme vypočítat slevu
          if (catalogTotal === 0) {
            console.warn(`  ⚠️ VAROVÁNÍ: Žádný produkt nenalezen v katalogu → sleva nebude vypočtena`)
            console.warn(`     Transakce uložena bez položek. Doplň produkty ručně nebo oprав názvy v SumUp.`)
          }

          // Přidej slevu jako samostatný řádek (pokud je nenulová A máme katalogové položky)
          if (calculatedDiscount !== 0 && catalogTotal !== 0) {
            console.log(`  → Přidávám automaticky vypočtenou slevu: ${calculatedDiscount} Kč`)

            // 🛡️ SENIOR VALIDACE: Zkontroluj že sleva dává smysl
            const maxDiscount = Math.abs(catalogTotal)
            if (Math.abs(calculatedDiscount) > maxDiscount) {
              console.error(`❌ KRITICKÁ CHYBA: Sleva ${calculatedDiscount} Kč je větší než katalogová cena ${catalogTotal} Kč!`)
              console.error(`   Zaplaceno: ${paidTotal} Kč, Katalog: ${catalogTotal} Kč`)
              throw new Error(`Invalid discount: ${calculatedDiscount} Kč exceeds catalog total ${catalogTotal} Kč`)
            }

            await prisma.transactionItem.create({
              data: {
                transactionId: transaction.id,
                productId: null, // Sleva nemá produkt
                quantity: 1, // 🛡️ VŽDY 1 (sleva je celková částka, ne jednotková)
                unit: 'ks',
                price: calculatedDiscount,
                vatRate: 0,
                vatAmount: 0,
                priceWithVat: calculatedDiscount,
              },
            })

            console.log(`    ✓ Sleva přidána jako samostatný řádek (quantity=1, priceWithVat=${calculatedDiscount})`)
          }

          // ✅ Přepočítej celkové sumy z vytvořených položek (včetně slevy)
          // Reload items po přidání slevy
          const allCashLineItems = await prisma.transactionItem.findMany({
            where: { transactionId: transaction.id },
          })

          const cashTotalWithoutVat = round2(allCashLineItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity), 0))
          const cashTotalVat = round2(allCashLineItems.reduce((sum, item) => sum + Number(item.vatAmount || 0) * Number(item.quantity), 0))
          const cashTotalWithVat = round2(allCashLineItems.reduce((sum, item) => sum + Number(item.priceWithVat || 0) * Number(item.quantity), 0))

          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              paymentType: 'cash',
              totalAmount: cashTotalWithVat, // Celkem S DPH
              totalAmountWithoutVat: cashTotalWithoutVat, // Celkem BEZ DPH
              totalVatAmount: cashTotalVat, // Celkem DPH
            },
          })

          console.log(`  ✓ Transakce aktualizována (HOTOVOST): totalAmount=${cashTotalWithVat} Kč, bez DPH=${cashTotalWithoutVat} Kč, DPH=${cashTotalVat} Kč`)

          // ✅ Automaticky vytvoř výdejku pro tuto HOTOVOSTNÍ transakci
          let deliveryNote
          try {
            const { createDeliveryNoteFromTransaction } = await import('@/lib/createDeliveryNote')
            deliveryNote = await createDeliveryNoteFromTransaction(transaction.id)
          } catch (error) {
            console.error('Chyba při vytváření automatické výdejky:', error)
            // Nepřerušuj sync, jen loguj chybu
          }

          // ✅ Automaticky vytvoř vystavenou fakturu pro tuto transakci
          try {
            const { createIssuedInvoiceFromTransaction } = await import('@/lib/createIssuedInvoice')
            await createIssuedInvoiceFromTransaction(transaction.id, deliveryNote?.id)
          } catch (error) {
            console.error('Chyba při vytváření automatické faktury:', error)
            // Nepřerušuj sync, jen loguj chybu
          }

          // Úspěch - položky zpracovány
          syncedTransactions.push(transaction)
          continue

        } catch (receiptError) {
          console.error('Chyba při načítání HTML účtenky pro HOTOVOST:', receiptError)
          syncedTransactions.push(transaction)
          continue
        }
      }

      // POKUD MÁME PRODUCT_SUMMARY, zpracuj ho (formát: "1,00 g Lemon Skunk (X2)")
      if (sumupTx.product_summary && (!sumupTx.line_items || sumupTx.line_items.length === 0)) {
        console.log(`Zpracovávám product_summary: "${sumupTx.product_summary}"`)

        // ✅ HOTOVOST (product_summary se objevuje u hotovostních transakcí)
        paymentType = 'cash'
        console.log(`✓ Detekován typ platby: HOTOVOST (product_summary je k dispozici)`)

        // Parsuj product_summary (např. "1,00 g Lemon Skunk (X2)" nebo "2x Blue Zushi (X2)")
        const summary = sumupTx.product_summary

        // Extrakce gramáže a názvu produktu
        // Formát 1: "1,00 g Produkt" nebo "0.5 g Produkt"
        // Formát 2: "2x Produkt"
        let itemQuantity = 1
        let itemName = summary

        // Zkus najít gramáž
        const gramMatch = summary.match(/^([\d,\.]+)\s*g\s+(.+)$/i)
        if (gramMatch) {
          itemQuantity = parseFloat(gramMatch[1].replace(',', '.'))
          itemName = gramMatch[2].trim()
          console.log(`  → Parsováno: ${itemQuantity}g "${itemName}"`)
        } else {
          // Zkus najít "Nx produkt" nebo "N x produkt" (s mezerou před x)
          const countMatch = summary.match(/^(\d+)\s*x\s+(.+)$/i)
          if (countMatch) {
            itemQuantity = parseInt(countMatch[1])
            itemName = countMatch[2].trim()
            console.log(`  → Parsováno: ${itemQuantity}x "${itemName}"`)
          }
        }

        // Hledej produkt v databázi
        let product = null

        console.log(`    → Hledám produkt: "${itemName}" (délka: ${itemName.length}, char codes: ${Array.from(itemName).map(c => c.charCodeAt(0)).join(',')})`)

        // Varianta 1a: Přesná shoda názvu
        product = await prisma.product.findFirst({
          where: {
            name: { equals: itemName, mode: 'insensitive' },
          },
        })

        if (product) {
          console.log(`    ✓ Nalezeno přesnou shodou: "${product.name}"`)
        }

        // Varianta 1b: Pokud přesná shoda neuspěla, zkus "contains"
        if (!product) {
          product = await prisma.product.findFirst({
            where: {
              name: { contains: itemName, mode: 'insensitive' },
            },
          })

          if (product) {
            console.log(`    ✓ Nalezeno pomocí contains: "${product.name}"`)
          }
        }

        // Varianta 2: Přidej závorky kolem variantního označení (např. "Blue Zushi X2" → "Blue Zushi (X2)")
        if (!product && /\s+X\d+\s*$/i.test(itemName)) {
          const normalized = itemName.replace(/(\s+)(X\d+)\s*$/i, '$1($2)')
          console.log(`    → Zkouším s normalizací: "${normalized}"`)

          product = await prisma.product.findFirst({
            where: {
              OR: [
                { name: { equals: normalized, mode: 'insensitive' } },
                { name: { contains: normalized, mode: 'insensitive' } },
              ],
            },
          })
        }

        // Varianta 3: Odstraň závorky z variantního označení (např. "Lemon Skunk (X2)" → "Lemon Skunk X2")
        if (!product && /\(X\d+\)/i.test(itemName)) {
          const withoutBrackets = itemName.replace(/\(X(\d+)\)/i, 'X$1')
          console.log(`    → Zkouším bez závorek: "${withoutBrackets}"`)

          product = await prisma.product.findFirst({
            where: {
              OR: [
                { name: { equals: withoutBrackets, mode: 'insensitive' } },
                { name: { contains: withoutBrackets, mode: 'insensitive' } },
              ],
            },
          })
        }

        // Varianta 4: Odstraň variantní označení úplně (např. "Blue Zushi X2" → "Blue Zushi")
        if (!product) {
          const baseName = itemName.replace(/\s+[\(\[]?X\d+[\)\]]?\s*$/i, '').trim()
          if (baseName !== itemName) {
            console.log(`    → Zkouším bez variantního označení: "${baseName}"`)

            product = await prisma.product.findFirst({
              where: {
                name: { contains: baseName, mode: 'insensitive' },
              },
            })
          }
        }

        if (product) {
          console.log(`    ✓ Produkt nalezen v katalogu: ${product.name}`)

          // ✅ NOVÁ ARCHITEKTURA: Použij cenu a DPH Z KATALOGU!
          const catalogPrice = Number(product.price) // Prodejní cena z katalogu
          const catalogVatRate = Number(product.vatRate || 0)

          // 🛡️ KRITICKÉ: Rozhodování podle vatRate
          // V našem systému: vatRate = 0 VŽDY znamená NEPLÁTCE
          // (Pokud bychom byli plátci, měli bychom vatRate = 12 nebo 21)
          // ⚠️ POZOR: Pokud by firma mohla být plátce s 0% sazbou, museli bychom
          // předat isVatPayer flag ze settings a rozhodovat podle něj!
          // Pro nás: catalogVatRate === 0 → firma je neplátce
          const isNonVatPayer = catalogVatRate === 0

          let finalPrice, finalVatAmount, finalPriceWithVat

          if (isNonVatPayer) {
            // NEPLATCE: catalogPrice je přímo prodejní cena (finální cena pro zákazníka)
            // Příklad: catalogPrice = 500 Kč → zákazník platí 500 Kč
            finalPrice = catalogPrice
            finalVatAmount = 0
            finalPriceWithVat = catalogPrice
            console.log(`    → NEPLATCE DPH: prodejní cena ${catalogPrice} Kč/jednotku`)
          } else {
            // PLÁTCE: catalogPrice je cena BEZ DPH, musíme přidat DPH
            // Příklad: catalogPrice = 500 Kč, vatRate = 21% → zákazník platí 605 Kč
            finalPrice = catalogPrice
            finalVatAmount = catalogPrice * catalogVatRate / 100
            finalPriceWithVat = catalogPrice + finalVatAmount
            console.log(`    → PLÁTCE DPH ${catalogVatRate}%: bez DPH ${catalogPrice} Kč, s DPH ${finalPriceWithVat} Kč`)
          }

          await prisma.transactionItem.create({
            data: {
              transactionId: transaction.id,
              productId: product.id,
              quantity: itemQuantity,
              unit: product.unit,
              price: finalPrice,
              vatRate: catalogVatRate,
              vatAmount: finalVatAmount,
              priceWithVat: finalPriceWithVat,
            },
          })

          console.log(`    ✓ TransactionItem vytvořen (${itemQuantity} ${product.unit} × ${finalPriceWithVat} Kč = ${round2(itemQuantity * finalPriceWithVat)} Kč)`)
        } else {
          console.warn(`    ✗ Produkt "${itemName}" nenalezen v DB - transakce zůstane bez položek`)
        }

        // ✅ AUTOMATICKÝ VÝPOČET SLEVY
        // Sleva = Celková zaplacená částka - Suma katalogových cen
        const summaryLineItems = await prisma.transactionItem.findMany({
          where: { transactionId: transaction.id },
        })

        const catalogTotal = round2(summaryLineItems.reduce((sum, item) =>
          sum + Number(item.priceWithVat || 0) * Number(item.quantity), 0
        ))
        const paidTotal = Number(sumupTx.amount)
        const calculatedDiscount = round2(paidTotal - catalogTotal)

        console.log(`  → Výpočet slevy: zaplaceno ${paidTotal} Kč - katalog ${catalogTotal} Kč = ${calculatedDiscount} Kč`)

        // 🛡️ SENIOR VALIDACE: Pokud není žádný produkt v katalogu, nemůžeme vypočítat slevu
        if (catalogTotal === 0) {
          console.warn(`  ⚠️ VAROVÁNÍ: Žádný produkt nenalezen v katalogu → sleva nebude vypočtena`)
          console.warn(`     Transakce uložena bez položek. Doplň produkty ručně nebo oprав názvy v SumUp.`)
        }

        // Přidej slevu jako samostatný řádek (pokud je nenulová A máme katalogové položky)
        if (calculatedDiscount !== 0 && catalogTotal !== 0) {
          console.log(`  → Přidávám automaticky vypočtenou slevu: ${calculatedDiscount} Kč`)

          // 🛡️ SENIOR VALIDACE: Zkontroluj že sleva dává smysl
          const maxDiscount = Math.abs(catalogTotal)
          if (Math.abs(calculatedDiscount) > maxDiscount) {
            console.error(`❌ KRITICKÁ CHYBA: Sleva ${calculatedDiscount} Kč je větší než katalogová cena ${catalogTotal} Kč!`)
            console.error(`   Zaplaceno: ${paidTotal} Kč, Katalog: ${catalogTotal} Kč`)
            throw new Error(`Invalid discount: ${calculatedDiscount} Kč exceeds catalog total ${catalogTotal} Kč`)
          }

          await prisma.transactionItem.create({
            data: {
              transactionId: transaction.id,
              productId: null, // Sleva nemá produkt
              quantity: 1, // 🛡️ VŽDY 1 (sleva je celková částka, ne jednotková)
              unit: 'ks',
              price: calculatedDiscount,
              vatRate: 0,
              vatAmount: 0,
              priceWithVat: calculatedDiscount,
            },
          })

          console.log(`    ✓ Sleva přidána jako samostatný řádek (quantity=1, priceWithVat=${calculatedDiscount})`)
        }

        // ✅ Přepočítej celkové sumy z vytvořených položek (včetně slevy)
        // Reload items po přidání slevy
        const allSummaryLineItems = await prisma.transactionItem.findMany({
          where: { transactionId: transaction.id },
        })

        const summaryTotalWithoutVat = round2(allSummaryLineItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity), 0))
        const summaryTotalVat = round2(allSummaryLineItems.reduce((sum, item) => sum + Number(item.vatAmount || 0) * Number(item.quantity), 0))
        const summaryTotalWithVat = round2(allSummaryLineItems.reduce((sum, item) => sum + Number(item.priceWithVat || 0) * Number(item.quantity), 0))

        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            paymentType: 'cash',
            totalAmount: summaryTotalWithVat, // Celkem S DPH
            totalAmountWithoutVat: summaryTotalWithoutVat, // Celkem BEZ DPH
            totalVatAmount: summaryTotalVat, // Celkem DPH
          },
        })

        console.log(`  ✓ Transakce aktualizována (HOTOVOST): totalAmount=${summaryTotalWithVat} Kč, bez DPH=${summaryTotalWithoutVat} Kč, DPH=${summaryTotalVat} Kč`)

        // ✅ Automaticky vytvoř výdejku pro tuto HOTOVOSTNÍ transakci
        let deliveryNote
        try {
          const { createDeliveryNoteFromTransaction } = await import('@/lib/createDeliveryNote')
          deliveryNote = await createDeliveryNoteFromTransaction(transaction.id)
        } catch (error) {
          console.error('Chyba při vytváření automatické výdejky:', error)
          // Nepřerušuj sync, jen loguj chybu
        }

        // ✅ Automaticky vytvoř vystavenou fakturu pro tuto transakci
        try {
          const { createIssuedInvoiceFromTransaction } = await import('@/lib/createIssuedInvoice')
          await createIssuedInvoiceFromTransaction(transaction.id, deliveryNote?.id)
        } catch (error) {
          console.error('Chyba při vytváření automatické faktury:', error)
          // Nepřerušuj sync, jen loguj chybu
        }

        syncedTransactions.push(transaction)
        continue
      }

      // ZKUS ZÍSKAT DETAIL ÚČTENKY pokud nemáme line_items ani product_summary
      // KLÍČOVÉ: Veřejný Receipts endpoint vrací reálné názvy produktů!
      if (!sumupTx.product_summary && (!sumupTx.line_items || sumupTx.line_items.length === 0)) {
        console.log(`Transakce ${transactionCode} nemá položky, volám Receipts API...`)

        // ✅ Musíme volat Receipts API → JE TO KARTA (terminál)
        paymentType = 'card'
        console.log(`✓ Detekován typ platby: KARTA (potřebujeme Receipts API)`)

        try {
          // Zavolej veřejný Receipts endpoint - potřebujeme client_transaction_id
          const clientTxId = (sumupTx as any).client_transaction_id

          if (!clientTxId) {
            console.warn(`✗ Transakce nemá client_transaction_id, nelze získat účtenku`)
            syncedTransactions.push(transaction)
            continue
          }

          const receipt = await fetchReceiptDetail(clientTxId)

          if (receipt) {
            console.log(`✓ Účtenka ${transactionCode} získána z Receipts API`)

            // ✅ NOVÁ ARCHITEKTURA: Z účtenky jen názvy a množství
            const lineItems = receipt.line_items || receipt.products || receipt.items || []

            if (lineItems.length > 0) {
              console.log(`✓ Účtenka obsahuje ${lineItems.length} položek s názvy`)

              // Zpracuj každou položku z účtenky
              for (const lineItem of lineItems) {
                const itemName = lineItem.name || lineItem.description || null
                let itemQuantity = lineItem.quantity || 1

                console.log(`  → Položka z účtenky: "${itemName}", množství: ${itemQuantity}`)

                // POUZE přesná shoda podle jména - zkusíme více variant normalizace
                let product = null

                if (itemName) {
                  // Odstraň gramáž z názvu pro hledání produktu (např. "Lemon Skunk (X2) 0.5g" → "Lemon Skunk (X2)")
                  const itemNameWithoutGrams = itemName.replace(/\s*\d+\.?\d*\s*g\b/i, '').trim()

                  console.log(`    → Hledám produkt: "${itemNameWithoutGrams}" (délka: ${itemNameWithoutGrams.length}, char codes: ${(Array.from(itemNameWithoutGrams) as string[]).map(c => c.charCodeAt(0)).join(',')})`)

                  // Varianta 1a: Přesná shoda názvu bez gramáže (např. "Lemon Skunk (X2)")
                  product = await prisma.product.findFirst({
                    where: {
                      name: { equals: itemNameWithoutGrams, mode: 'insensitive' },
                    },
                  })

                  if (product) {
                    console.log(`    ✓ Nalezeno přesnou shodou: "${product.name}"`)
                  }

                  // Varianta 1b: Pokud přesná shoda neuspěla, zkus "contains"
                  if (!product) {
                    product = await prisma.product.findFirst({
                      where: {
                        name: { contains: itemNameWithoutGrams, mode: 'insensitive' },
                      },
                    })

                    if (product) {
                      console.log(`    ✓ Nalezeno pomocí contains: "${product.name}"`)
                    }
                  }

                  // Varianta 2: Přidej závorky kolem variantního označení (např. "Blue Zushi X2" → "Blue Zushi (X2)")
                  if (!product && /\s+X\d+\s*$/i.test(itemNameWithoutGrams)) {
                    const normalized = itemNameWithoutGrams.replace(/(\s+)(X\d+)\s*$/i, '$1($2)')
                    console.log(`    → Zkouším s normalizací: "${normalized}"`)

                    product = await prisma.product.findFirst({
                      where: {
                        OR: [
                          { name: { equals: normalized, mode: 'insensitive' } },
                          { name: { contains: normalized, mode: 'insensitive' } },
                        ],
                      },
                    })
                  }

                  // Varianta 3: Odstraň závorky z variantního označení (např. "Lemon Skunk (X2)" → "Lemon Skunk X2")
                  if (!product && /\(X\d+\)/i.test(itemNameWithoutGrams)) {
                    const withoutBrackets = itemNameWithoutGrams.replace(/\(X(\d+)\)/i, 'X$1')
                    console.log(`    → Zkouším bez závorek: "${withoutBrackets}"`)

                    product = await prisma.product.findFirst({
                      where: {
                        OR: [
                          { name: { equals: withoutBrackets, mode: 'insensitive' } },
                          { name: { contains: withoutBrackets, mode: 'insensitive' } },
                        ],
                      },
                    })
                  }

                  // Varianta 4: Odstraň variantní označení úplně (např. "Blue Zushi X2" → "Blue Zushi")
                  if (!product) {
                    const baseName = itemNameWithoutGrams.replace(/\s+[\(\[]?X\d+[\)\]]?\s*$/i, '').trim()
                    if (baseName !== itemNameWithoutGrams) {
                      console.log(`    → Zkouším bez variantního označení: "${baseName}"`)

                      product = await prisma.product.findFirst({
                        where: {
                          name: { contains: baseName, mode: 'insensitive' },
                        },
                      })
                    }
                  }

                  if (product) {
                    console.log(`    ✓ Produkt nalezen v katalogu: ${product.name}`)

                    // ✅ NOVÁ ARCHITEKTURA: Použij cenu a DPH Z KATALOGU!
                    const catalogPrice = Number(product.price) // Prodejní cena z katalogu
                    const catalogVatRate = Number(product.vatRate || 0)

                    // Pro NEPLATCE (vatRate = 0): price = prodejní cena, priceWithVat = prodejní cena
                    // Pro PLÁTCE (vatRate > 0): price = bez DPH, priceWithVat = s DPH
                    const isNonVatPayer = catalogVatRate === 0

                    let finalPrice, finalVatAmount, finalPriceWithVat

                    if (isNonVatPayer) {
                      // NEPLATCE: catalogPrice je přímo prodejní cena
                      finalPrice = catalogPrice
                      finalVatAmount = 0
                      finalPriceWithVat = catalogPrice
                      console.log(`    → NEPLATCE DPH: prodejní cena ${catalogPrice} Kč/jednotku`)
                    } else {
                      // PLÁTCE: catalogPrice je bez DPH, musíme přidat DPH
                      finalPrice = catalogPrice
                      finalVatAmount = catalogPrice * catalogVatRate / 100
                      finalPriceWithVat = catalogPrice + finalVatAmount
                      console.log(`    → PLÁTCE DPH ${catalogVatRate}%: bez DPH ${catalogPrice} Kč, s DPH ${finalPriceWithVat} Kč`)
                    }

                    await prisma.transactionItem.create({
                      data: {
                        transactionId: transaction.id,
                        productId: product.id,
                        quantity: itemQuantity,
                        unit: product.unit,
                        price: finalPrice,
                        vatRate: catalogVatRate,
                        vatAmount: finalVatAmount,
                        priceWithVat: finalPriceWithVat,
                      },
                    })

                    console.log(`    ✓ TransactionItem vytvořen (${itemQuantity} ${product.unit} × ${finalPriceWithVat} Kč = ${round2(itemQuantity * finalPriceWithVat)} Kč)`)
                  } else {
                    console.warn(`    ✗ Produkt "${itemName}" nenalezen v DB - transakce zůstane bez položek`)
                  }
                } else {
                  console.warn(`    ✗ Položka z účtenky nemá jméno - přeskakuji`)
                }
              }

              // ✅ AUTOMATICKÝ VÝPOČET SLEVY
              // Sleva = Celková zaplacená částka - Suma katalogových cen
              const cardLineItems = await prisma.transactionItem.findMany({
                where: { transactionId: transaction.id },
              })

              const catalogTotal = round2(cardLineItems.reduce((sum, item) =>
                sum + Number(item.priceWithVat || 0) * Number(item.quantity), 0
              ))
              const paidTotal = Number(sumupTx.amount)
              const calculatedDiscount = round2(paidTotal - catalogTotal)

              console.log(`  → Výpočet slevy: zaplaceno ${paidTotal} Kč - katalog ${catalogTotal} Kč = ${calculatedDiscount} Kč`)

              // 🛡️ SENIOR VALIDACE: Pokud není žádný produkt v katalogu, nemůžeme vypočítat slevu
              if (catalogTotal === 0) {
                console.warn(`  ⚠️ VAROVÁNÍ: Žádný produkt nenalezen v katalogu → sleva nebude vypočtena`)
                console.warn(`     Transakce uložena bez položek. Doplň produkty ručně nebo oprav názvy v SumUp.`)
              }

              // Přidej slevu jako samostatný řádek (pokud je nenulová A máme katalogové položky)
              if (calculatedDiscount !== 0 && catalogTotal !== 0) {
                console.log(`  → Přidávám automaticky vypočtenou slevu: ${calculatedDiscount} Kč`)

                // 🛡️ SENIOR VALIDACE: Zkontroluj že sleva dává smysl
                const maxDiscount = Math.abs(catalogTotal)
                if (Math.abs(calculatedDiscount) > maxDiscount) {
                  console.error(`❌ KRITICKÁ CHYBA: Sleva ${calculatedDiscount} Kč je větší než katalogová cena ${catalogTotal} Kč!`)
                  console.error(`   Zaplaceno: ${paidTotal} Kč, Katalog: ${catalogTotal} Kč`)
                  throw new Error(`Invalid discount: ${calculatedDiscount} Kč exceeds catalog total ${catalogTotal} Kč`)
                }

                await prisma.transactionItem.create({
                  data: {
                    transactionId: transaction.id,
                    productId: null, // Sleva nemá produkt
                    quantity: 1, // 🛡️ VŽDY 1 (sleva je celková částka, ne jednotková)
                    unit: 'ks',
                    price: calculatedDiscount,
                    vatRate: 0,
                    vatAmount: 0,
                    priceWithVat: calculatedDiscount,
                  },
                })

                console.log(`    ✓ Sleva přidána jako samostatný řádek (quantity=1, priceWithVat=${calculatedDiscount})`)
              }

              // ✅ Přepočítej celkové sumy z vytvořených položek (včetně slevy)
              // Reload items po přidání slevy
              const allCardLineItems = await prisma.transactionItem.findMany({
                where: { transactionId: transaction.id },
              })

              const cardTotalWithoutVat = round2(allCardLineItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity), 0))
              const cardTotalVat = round2(allCardLineItems.reduce((sum, item) => sum + Number(item.vatAmount || 0) * Number(item.quantity), 0))
              const cardTotalWithVat = round2(allCardLineItems.reduce((sum, item) => sum + Number(item.priceWithVat || 0) * Number(item.quantity), 0))

              await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                  paymentType: 'card',
                  totalAmount: cardTotalWithVat, // Celkem S DPH
                  totalAmountWithoutVat: cardTotalWithoutVat, // Celkem BEZ DPH
                  totalVatAmount: cardTotalVat, // Celkem DPH
                },
              })

              console.log(`  ✓ Transakce aktualizována (KARTA): totalAmount=${cardTotalWithVat} Kč, bez DPH=${cardTotalWithoutVat} Kč, DPH=${cardTotalVat} Kč`)

              // ✅ Automaticky vytvoř výdejku pro tuto KARETNÍ transakci
              let deliveryNote
              try {
                const { createDeliveryNoteFromTransaction } = await import('@/lib/createDeliveryNote')
                deliveryNote = await createDeliveryNoteFromTransaction(transaction.id)
              } catch (error) {
                console.error('Chyba při vytváření automatické výdejky:', error)
                // Nepřerušuj sync, jen loguj chybu
              }

              // ✅ Automaticky vytvoř vystavenou fakturu pro tuto transakci
              try {
                const { createIssuedInvoiceFromTransaction } = await import('@/lib/createIssuedInvoice')
                await createIssuedInvoiceFromTransaction(transaction.id, deliveryNote?.id)
              } catch (error) {
                console.error('Chyba při vytváření automatické faktury:', error)
                // Nepřerušuj sync, jen loguj chybu
              }

              // Úspěch - položky zpracovány, pokračuj na další transakci
              syncedTransactions.push(transaction)
              continue
            } else {
              console.warn(`✗ Účtenka ${transactionCode} neobsahuje položky`)
            }
          } else {
            console.warn(`✗ Receipts API nevrátilo data pro ${transactionCode}`)
          }
        } catch (receiptError) {
          console.error('Chyba při volání Receipts API:', receiptError)
        }

        // ✅ I když se nepodařilo zpracovat položky, aktualizuj typ platby na KARTA
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { paymentType: 'card' },
        })
      }

      // FALLBACK: Parsování product_summary (např. "White Truffle X2" nebo "Lemon Skunk 0.5g")
      // Použije se jen pokud nebyly line_items
      if (sumupTx.product_summary) {
        console.log(`Parsování product_summary: "${sumupTx.product_summary}"`)

        // KROK 1: Zjisti jestli je na začátku uvedeno množství (např. "2x White Truffle X2")
        let quantity = 1
        let productNameToSearch = sumupTx.product_summary

        const quantityMatch = sumupTx.product_summary.match(/^(\d+)\s*[xX×]\s*(.+)$/i)
        if (quantityMatch) {
          quantity = parseInt(quantityMatch[1])
          productNameToSearch = quantityMatch[2].trim()
          console.log(`  → Množství na začátku: ${quantity}x "${productNameToSearch}"`)
        } else {
          console.log(`  → Množství neuvedeno, používám 1`)
        }

        // KROK 1.5: Zkus extrahovat gramáž z názvu (např. "Lemon Skunk 0.5g" → 0.5)
        const gramMatch = productNameToSearch.match(/(\d+\.?\d*)\s*g\b/i)
        if (gramMatch) {
          const gramsInName = parseFloat(gramMatch[1])
          console.log(`  → Nalezena gramáž v názvu: ${gramsInName}g`)
          quantity = gramsInName
          // Odstraň gramáž z názvu pro hledání produktu
          productNameToSearch = productNameToSearch.replace(/\s*\d+\.?\d*\s*g\b/i, '').trim()
        }

        // KROK 2: Hledej produkt v databázi - zkusíme více variant normalizace
        let product = null

        // Varianta 1: Přesný název z product_summary (např. "Blue Zushi X2")
        product = await prisma.product.findFirst({
          where: {
            name: { contains: productNameToSearch, mode: 'insensitive' },
          },
        })

        // Varianta 2: Přidej závorky kolem variantního označení (např. "Blue Zushi X2" → "Blue Zushi (X2)")
        if (!product && /\s+X\d+\s*$/i.test(productNameToSearch)) {
          const normalized = productNameToSearch.replace(/(\s+)(X\d+)\s*$/i, '$1($2)')
          console.log(`  → Zkouším s normalizací: "${normalized}"`)

          product = await prisma.product.findFirst({
            where: {
              OR: [
                { name: { equals: normalized, mode: 'insensitive' } },
                { name: { contains: normalized, mode: 'insensitive' } },
              ],
            },
          })
        }

        // Varianta 3: Odstraň závorky z variantního označení (např. "Lemon Skunk (X2)" → "Lemon Skunk X2")
        if (!product && /\(X\d+\)/i.test(productNameToSearch)) {
          const withoutBrackets = productNameToSearch.replace(/\(X(\d+)\)/i, 'X$1')
          console.log(`  → Zkouším bez závorek: "${withoutBrackets}"`)

          product = await prisma.product.findFirst({
            where: {
              OR: [
                { name: { equals: withoutBrackets, mode: 'insensitive' } },
                { name: { contains: withoutBrackets, mode: 'insensitive' } },
              ],
            },
          })
        }

        // Varianta 4: Odstraň variantní označení úplně (např. "Blue Zushi X2" → "Blue Zushi")
        if (!product) {
          const baseName = productNameToSearch.replace(/\s+[\(\[]?X\d+[\)\]]?\s*$/i, '').trim()
          if (baseName !== productNameToSearch) {
            console.log(`  → Zkouším bez variantního označení: "${baseName}"`)

            product = await prisma.product.findFirst({
              where: {
                name: { contains: baseName, mode: 'insensitive' },
              },
            })
          }
        }

        if (product) {
          console.log(`  ✓ Produkt nalezen: ${product.name} (ID: ${product.id})`)

          // Vytvoř položku transakce
          await prisma.transactionItem.create({
            data: {
              transactionId: transaction.id,
              productId: product.id,
              quantity,
              unit: product.unit,
              price: sumupTx.amount, // Celková cena transakce
            },
          })

          console.log(`  ✓ TransactionItem vytvořen (quantity: ${quantity} ${product.unit})`)
        } else {
          console.warn(`  ✗ Produkt "${productNameToSearch}" nenalezen v databázi`)
          console.warn(`  Tip: Zkontroluj jestli máš produkt s názvem obsahujícím: "${productNameToSearch}"`)
        }
      } else {
        console.warn(`⚠️  VAROVÁNÍ: Transakce ${sumupTx.id} (${transactionCode}) nemá žádné položky!`)
        console.warn(`     Částka: ${sumupTx.amount} Kč, Typ platby: ${paymentType}`)
        console.warn(`     Transakce byla uložena, ale bez produktů - nebude odečtena ze skladu.`)
      }

      // Automaticky vytvoř výdejku pro tuto SumUp transakci
      let deliveryNote
      try {
        const { createDeliveryNoteFromTransaction } = await import('@/lib/createDeliveryNote')
        deliveryNote = await createDeliveryNoteFromTransaction(transaction.id)
      } catch (error) {
        console.error('Chyba při vytváření automatické výdejky:', error)
        // Nepřerušuj sync, jen loguj chybu
      }

      // ✅ Automaticky vytvoř vystavenou fakturu pro tuto transakci
      try {
        const { createIssuedInvoiceFromTransaction } = await import('@/lib/createIssuedInvoice')
        await createIssuedInvoiceFromTransaction(transaction.id, deliveryNote?.id)
      } catch (error) {
        console.error('Chyba při vytváření automatické faktury:', error)
        // Nepřerušuj sync, jen loguj chybu
      }

      syncedTransactions.push(transaction)
    }

    return NextResponse.json({
      message: `Synchronizováno ${syncedTransactions.length} transakcí`,
      transactions: syncedTransactions,
    })
  } catch (error) {
    console.error('Chyba při synchronizaci transakcí:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se synchronizovat transakce ze SumUp' },
      { status: 500 }
    )
  }
}

