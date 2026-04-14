// SumUp API Client - komunikace se SumUp API
// Tady jsou všechny funkce pro stahování dat ze SumUp

import axios from 'axios'
import * as cheerio from 'cheerio'

const SUMUP_API_URL = process.env.SUMUP_API_URL || 'https://api.sumup.com/v0.1'
const SUMUP_API_KEY = process.env.SUMUP_API_KEY

// Axios instance s automatickým API klíčem
const sumupClient = axios.create({
  baseURL: SUMUP_API_URL,
  headers: {
    'Authorization': `Bearer ${SUMUP_API_KEY}`,
    'Content-Type': 'application/json',
  },
})

// TypeScript typy pro SumUp data (aby věděl TypeScript co očekávat)
export interface SumUpProduct {
  id: string
  name: string
  price: number
  category?: string
  // SumUp může mít i další fieldy, přidáme podle potřeby
}

export interface SumUpTransaction {
  id: string
  transaction_code?: string  // Číslo účtenky (např. MS9WFW0Y-65)
  transaction_id?: string    // Alternativní název pro ID
  client_transaction_id?: string  // ID pro načtení HTML účtenky
  receipt_number?: string    // Číslo účtenky
  tx_code?: string          // Zkrácený kód transakce
  internal_id?: string      // Interní ID
  amount: number
  currency?: string
  status: string
  timestamp?: string
  date?: string             // Alternativní název pro timestamp
  payment_type?: string
  type?: string             // Typ transakce (PAYMENT, CASH_PAYMENT, atd.)
  product_summary?: string  // SumUp vrací text jako "White Truffle X2", ne strukturovaná data
  products?: Array<{        // Toto pole zatím SumUp nevrací, ale necháme pro budoucnost
    name: string
    quantity: number
    price: number
  }>
  line_items?: Array<{      // Sales API může vracet položky jako line_items
    name: string
    quantity: number
    price: number
    price_per_unit?: number
    total_price?: number
  }>
  items?: Array<{           // Další možný název pro položky
    name: string
    quantity: number
    price: number
  }>
}

// Funkce pro získání katalogu zboží ze SumUp
export async function fetchProducts(): Promise<SumUpProduct[]> {
  try {
    // SumUp používá endpoint /me/products
    const response = await sumupClient.get('/me/products')
    console.log('SumUp Products Response:', response.data)

    // SumUp vrací data jako pole nebo jako objekt s items?
    const products = Array.isArray(response.data) ? response.data : response.data.items || []
    return products
  } catch (error: any) {
    console.error('Chyba při načítání produktů ze SumUp:', error.response?.data || error.message)
    throw new Error(`SumUp API chyba: ${error.response?.data?.message || error.message}`)
  }
}

// Funkce pro získání transakcí ze SumUp
// Používáme Sales API místo Transactions API pro lepší dostupnost položek
// PODPORUJE PAGINACI - stahuje všechny transakce, ne jen prvních 100!
export async function fetchTransactions(
  startDate?: Date,
  endDate?: Date
): Promise<SumUpTransaction[]> {
  try {
    // POUŽÍVÁME JEN Transactions API - Sales API má problémy s filtrováním
    // Transactions API má lepší early exit a správně filtruje během stahování
    console.log('Používám Transactions API endpoint: /me/transactions/history')

    // OPRAVA TIMEZONE: Normalizuj startDate na začátek dne v UTC
    // DŮLEŽITÉ: Frontend posílá datum v ISO stringu (UTC), ale chceme začátek dne v UTC
    // Musíme použít getUTC* metody, ne get* (které používají lokální čas)
    let normalizedStartDate = startDate
    if (startDate) {
      // Vytvoř datum v UTC (použij UTC metody pro čtení!)
      const year = startDate.getUTCFullYear()
      const month = startDate.getUTCMonth()
      const day = startDate.getUTCDate()
      normalizedStartDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
      console.log(`📅 Start date: ${normalizedStartDate.toLocaleString('cs-CZ')} (${normalizedStartDate.toISOString()})`)
    }

    const allTransactions: any[] = []
    let offset = 0
    const limit = 100
    let hasMore = true

    // DŮLEŽITÉ: SumUp API vrací transakce od nejnovějších po nejstarší
    // Takže když narazíme na transakci starší než startDate, můžeme přestat

    // DŮLEŽITÉ: SumUp API má BUGNUTOU pagination s newest_time/oldest_time parametry!
    // Když je použijeme, vrací POŘÁD TY SAMÉ transakce (offset nefunguje)
    // ŘEŠENÍ: Použít JEN order='descending' a limit/offset, ŽÁDNÉ date filtry!
    // Filtrování podle data uděláme až po stažení všech transakcí

    console.log(`⚠️ SumUp API používá cursor pagination - následujeme links.next`)

    let nextUrl: string | null = null
    let pageCount = 0

    while (true) {
      pageCount++
      let response

      if (!nextUrl) {
        // První stránka
        const params: any = { limit }
        console.log(`📄 Stahuji stránku ${pageCount} (limit: ${limit})...`)
        response = await sumupClient.get('/me/transactions/history', { params })
      } else {
        // Další stránky - použijeme links.next URL
        console.log(`📄 Stahuji stránku ${pageCount} (next URL)...`)
        response = await sumupClient.get(nextUrl)
      }

      const transactionsData = response.data.items || []
      console.log(`✓ Stáženo ${transactionsData.length} transakcí`)

      if (transactionsData.length === 0) {
        console.log('✓ API vrátilo prázdnou odpověď - konec dat')
        break
      }

      // Zobraz rozsah dat
      if (transactionsData.length > 0) {
        const firstDate = new Date(transactionsData[0].timestamp || transactionsData[0].date || 0)
        const lastDate = new Date(transactionsData[transactionsData.length - 1].timestamp || transactionsData[transactionsData.length - 1].date || 0)
        console.log(`📅 Rozsah: ${firstDate.toLocaleDateString('cs-CZ')} - ${lastDate.toLocaleDateString('cs-CZ')}`)
      }

      allTransactions.push(...transactionsData)

      // Zkontroluj, jestli existuje další stránka
      // links je POLE objektů s { href, rel }, ne přímo objekt s .next!
      const links: any = response.data.links
      const nextLink = Array.isArray(links) ? links.find((l: any) => l.rel === 'next') : null

      if (nextLink && nextLink.href) {
        // href je RELATIVNÍ cesta (query string), ne plná URL
        nextUrl = '/me/transactions/history?' + nextLink.href
        console.log(`➡️ Další stránka: ${nextUrl}`)
      } else {
        console.log('✓ Žádná další stránka - konec dat')
        break
      }

      // Bezpečnostní pojistka
      if (pageCount > 50) {
        console.warn(`⚠️ Stáženo ${pageCount} stránek - ukončuji (bezpečnostní limit)`)
        break
      }
    }

    console.log(`✓ Transactions API vrátilo celkem ${allTransactions.length} transakcí (před filtrováním)`)

    // DEBUG: Zobraz rozsah VŠECH stažených transakcí
    if (allTransactions.length > 0) {
      const allDates = allTransactions.map((t: any) => new Date(t.timestamp || t.date || 0))
      const oldestDownloaded = new Date(Math.min(...allDates.map(d => d.getTime())))
      const newestDownloaded = new Date(Math.max(...allDates.map(d => d.getTime())))
      console.log(`🔍 DEBUG: Celkový rozsah stažených dat: ${oldestDownloaded.toLocaleString('cs-CZ')} - ${newestDownloaded.toLocaleString('cs-CZ')}`)
      console.log(`🔍 DEBUG: Požadovaný rozsah: ${normalizedStartDate?.toLocaleString('cs-CZ')} - ${new Date().toLocaleString('cs-CZ')}`)
    }

    // FILTRUJ JEN ÚSPĚŠNÉ TRANSAKCE a podle startDate a endDate
    let filteredCount = 0
    let failedStatusCount = 0
    let tooOldCount = 0
    let tooNewCount = 0

    let successfulTransactions = allTransactions.filter((t: SumUpTransaction) => {
      // Kontrola statusu
      if (t.status !== 'SUCCESSFUL' && t.status !== 'successful') {
        failedStatusCount++
        filteredCount++
        return false
      }

      const txDate = new Date(t.timestamp || t.date || 0)

      // Kontrola startDate - musí být >= normalizedStartDate
      if (normalizedStartDate && txDate < normalizedStartDate) {
        tooOldCount++
        filteredCount++
        return false
      }

      // Kontrola endDate - musí být <= endDate
      if (endDate && txDate > endDate) {
        tooNewCount++
        filteredCount++
        return false
      }

      return true
    })

    console.log(`📊 FILTROVÁNÍ:`)
    console.log(`   - Odfiltrováno (neúspěšné): ${failedStatusCount}`)
    console.log(`   - Odfiltrováno (starší než ${normalizedStartDate?.toLocaleDateString('cs-CZ')}): ${tooOldCount}`)
    console.log(`   - Odfiltrováno (novější než dnes): ${tooNewCount}`)
    console.log(`   - Prošlo filtrem: ${successfulTransactions.length}`)

    console.log(`✓ Úspěšných transakcí po filtrování: ${successfulTransactions.length} (odfiltrováno: ${filteredCount})`)

    return successfulTransactions
  } catch (error: any) {
    console.error('Chyba při načítání transakcí ze SumUp:', error.response?.data || error.message)
    throw new Error(`SumUp API chyba: ${error.response?.data?.message || error.message}`)
  }
}

// Funkce pro získání jedné transakce
export async function fetchTransaction(transactionId: string): Promise<SumUpTransaction> {
  try {
    const response = await sumupClient.get(`/me/transactions/${transactionId}`)
    return response.data
  } catch (error) {
    console.error('Chyba při načítání transakce ze SumUp:', error)
    throw new Error('Nepodařilo se načíst transakci ze SumUp API')
  }
}

// Funkce pro získání detailu účtenky z veřejného Receipts endpointu
// KLÍČOVÁ FUNKCE: Parsuje HTML a vrací line_items s reálnými názvy produktů!
// Používá veřejný endpoint: https://sales-receipt.sumup.com/pos/public/v1/{MERCHANT_CODE}/receipt/{SALE_ID}
export async function fetchReceiptDetail(clientTransactionId: string): Promise<any> {
  try {
    console.log(`Stahuji detail účtenky pro client_transaction_id: ${clientTransactionId}`)

    // Parsuj client_transaction_id ve formátu:
    // urn:sumup:pos:sale:MERCHANT_CODE:SALE_ID:TIMESTAMP (s dvojtečkou)
    // nebo: urn:sumup:pos:sale:MERCHANT_CODE:SALE_ID;TIMESTAMP (se středníkem)
    // Příklady:
    //   urn:sumup:pos:sale:MS9WFW0Y:318c4e3e-f80b-45c8-964c-eed08519a872:1766830590196
    //   urn:sumup:pos:sale:MS9WFW0Y:3564526e-53c9-4738-ad69-aa8f3d8c7adc;1766512053443
    const match = clientTransactionId.match(/urn:sumup:pos:sale:([^:]+):([a-f0-9-]{36})[:;]/)

    if (!match) {
      console.warn(`✗ Nepodařilo se parsovat client_transaction_id: ${clientTransactionId}`)
      return null
    }

    const merchantCode = match[1] // MS9WFW0Y
    const saleId = match[2] // 318c4e3e-f80b-45c8-964c-eed08519a872

    console.log(`  → Merchant Code: ${merchantCode}`)
    console.log(`  → Sale ID: ${saleId}`)

    // Veřejný endpoint - nepotřebuje autorizaci!
    // Přidáme ?format=html pro jistotu (některé účtenky to mohou vyžadovat)
    const url = `https://sales-receipt.sumup.com/pos/public/v1/${merchantCode}/receipt/${saleId}?format=html`
    console.log(`  → Volám: ${url}`)

    const response = await axios.get(url, {
      headers: {
        'Accept': 'text/html',
      }
    })

    console.log(`✓ Účtenka HTML získána (${response.data.length} znaků)`)

    // Parsuj HTML pomocí cheerio
    const $ = cheerio.load(response.data)
    const lineItems: any[] = []

    // Najdi všechny řádky produktů v tabulce
    // HTML struktura: <tr class="product-row"> obsahuje produkty
    // Zkusíme více variant selektorů pro různé formáty účtenek
    $('.product-row').each((index, element) => {
      // ✅ NOVÁ ARCHITEKTURA: Vytáhneme JEN název a množství
      // Ceny a DPH bereme z KATALOGU, ne z účtenky!

      const qtyText = $(element).find('.product-col-qty').text().trim() // "1 x" nebo "2 x"
      const productName = $(element).find('.main-product-name').text().trim() // "Lemon Skunk (X2)"
      const detailContent = $(element).find('.detail-content').last().text().trim() // "1.0 g x 200,00 Kč/g"

      // Přeskoč prázdné řádky
      if (!productName) {
        console.log(`  → Prázdný řádek, přeskakuji`)
        return
      }

      // Parsuj množství (např. "1 x" → 1)
      const qtyMatch = qtyText.match(/(\d+)\s*x/i)
      let quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1

      // EXTRAKCE GRAMÁŽE / MILILITRÁŽE z detail-content
      // Formáty: "0.5 g x 200,00 Kč/g" nebo "30 ml x 150,00 Kč/ml"
      if (detailContent) {
        const mlMatch = detailContent.match(/(\d+\.?\d*)\s*ml\s*x/i)
        const gramMatch = detailContent.match(/(\d+\.?\d*)\s*g\s*x/i)
        if (mlMatch) {
          quantity = parseFloat(mlMatch[1])
          console.log(`  → Nalezena mililitráž v detail-content: ${quantity}ml`)
        } else if (gramMatch) {
          quantity = parseFloat(gramMatch[1])
          console.log(`  → Nalezena gramáž v detail-content: ${quantity}g`)
        }
      }

      // FALLBACK: Zkus extrahovat gramáž / mililitráž z názvu produktu
      // Např. "Lemon Skunk (X2) 0.5g" → 0.5, "CBD Oil 30ml" → 30
      if (quantity === 1 || !detailContent) {
        const mlMatch = productName.match(/(\d+\.?\d*)\s*ml\b/i)
        const gramMatch = productName.match(/(\d+\.?\d*)\s*g\b/i)
        if (mlMatch) {
          quantity = parseFloat(mlMatch[1])
          console.log(`  → Nalezena mililitráž v názvu produktu: ${quantity}ml`)
        } else if (gramMatch) {
          quantity = parseFloat(gramMatch[1])
          console.log(`  → Nalezena gramáž v názvu produktu: ${quantity}g`)
        }
      }

      console.log(`  → Nalezen produkt: "${productName}", množství: ${quantity}`)

      lineItems.push({
        name: productName,
        quantity: quantity,
        description: productName,
      })
    })

    console.log(`✓ Parsováno ${lineItems.length} položek z HTML účtenky`)

    // Pokud jsme nenašli žádné položky pomocí .product-row, zkus jiné selektory
    if (lineItems.length === 0) {
      console.warn('⚠️  Nenalezeny žádné položky pomocí .product-row, zkouším alternativní selektory...')

      // Zkus najít tabulku produktů jiným způsobem
      // Některé účtenky mohou mít jinou strukturu
      $('.products-table tbody tr, table.products tr').each((index, element) => {
        const cells = $(element).find('td')
        if (cells.length >= 2) {
          const qtyText = $(cells[0]).text().trim()
          const productName = $(cells[1]).text().trim()

          if (productName && productName !== 'Popis' && productName !== 'Description') {
            const qtyMatch = qtyText.match(/(\d+)\s*x/i)
            let quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1

            // EXTRAKCE GRAMÁŽE / MILILITRÁŽE z názvu produktu
            const mlMatch = productName.match(/(\d+\.?\d*)\s*ml\b/i)
            const gramMatch = productName.match(/(\d+\.?\d*)\s*g\b/i)
            if (mlMatch) {
              quantity = parseFloat(mlMatch[1])
              console.log(`  → Nalezena mililitráž v názvu: ${quantity}ml`)
            } else if (gramMatch) {
              quantity = parseFloat(gramMatch[1])
              console.log(`  → Nalezena gramáž v názvu: ${quantity}g`)
            }

            console.log(`  → Nalezen produkt (alternativní selektor): "${productName}", množství: ${quantity}`)

            lineItems.push({
              name: productName,
              quantity: quantity,
              description: productName,
            })
          }
        }
      })

      console.log(`✓ Parsováno ${lineItems.length} položek pomocí alternativních selektorů`)
    }

    // Vrať strukturu - JEN názvy a množství!
    return {
      line_items: lineItems,
      items: lineItems,
      products: lineItems,
    }
  } catch (error: any) {
    console.warn(`✗ Receipts API selhalo:`, error.response?.status, error.response?.data?.message || error.message)
    return null
  }
}


// Funkce pro získání katalogu produktů ze SumUp Items API
// POZNÁMKA: Pro Retail účty (Solo/Terminal) Items API nevrací data (404)
// Katalog produktů spravujeme přímo v naší aplikaci
export async function fetchSumUpItems(): Promise<any[]> {
  console.log('⚠️  Items API není dostupné pro Retail účty (Solo/Terminal).')
  console.log('⚠️  Katalog produktů je spravován pouze v aplikaci.')
  return [] // Vrátíme prázdné pole - katalog spravujeme lokálně
}

export default sumupClient
