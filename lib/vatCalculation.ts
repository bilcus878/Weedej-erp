// Výpočty DPH (DPH = Daň z přidané hodnoty / VAT)
// České sazby DPH od 1.1.2024: 21%, 12%, 0%
// Pro neplátce DPH se používá vatRate = 0 (cena = cena, žádné DPH)
// ⚠️ DŮLEŽITÉ: vatRate = 0 může znamenat DVĚ věci:
//   1. Neplátce DPH (isVatPayer = false, vatRate = 0)
//   2. Plátce DPH se sazbou 0% (isVatPayer = true, vatRate = 0)
// VŽDY rozhoduj podle isVatPayer flagu, NE jen podle vatRate!

export const CZECH_VAT_RATES = [21, 12, 0] as const
export type CzechVatRate = typeof CZECH_VAT_RATES[number]
export const DEFAULT_VAT_RATE = 21

// ⚠️ DEPRECATED: Speciální hodnota -1 už se nepoužívá!
// Místo toho používej vatRate = 0 + kontrolu isVatPayer flagu
export const NON_VAT_PAYER_RATE = -1

// Všechny možnosti sazeb (už bez -1)
export const ALL_VAT_OPTIONS = [21, 12, 0] as const

// Popisky pro sazby DPH
export const VAT_RATE_LABELS: Record<number, string> = {
  21: '21%',
  12: '12%',
  0: '0%',
  // Deprecated, ale necháváme kvůli zpětné kompatibilitě
  [NON_VAT_PAYER_RATE]: 'Neplátce DPH',
}

// ⚠️ DEPRECATED: Používej místo toho vatRate === 0 (pro neplátce) nebo shouldApplyVat()
// Tato funkce zůstává jen kvůli zpětné kompatibilitě se starým kódem
// Kontroluje jestli je to starý formát s -1
export function isNonVatPayer(vatRate: number): boolean {
  return vatRate === NON_VAT_PAYER_RATE || vatRate < 0
}

// ✅ NOVÁ BEZPEČNÁ FUNKCE: Má se aplikovat DPH?
// Vrací false pro neplátce (vatRate = 0) a true pro plátce (i když má sazbu 0%)
// ⚠️ POZOR: Tuto funkci nelze použít, pokud nemáš kontext zda je firma plátce!
// Pro neplátce: vatRate = 0 → neaplikuj DPH
// Pro plátce s 0% sazbou: musíš explicitně zkontrolovat isVatPayer flag!
export function shouldApplyVat(vatRate: number): boolean {
  // Pokud je vatRate záporné (deprecated -1), neaplikuj DPH
  if (vatRate < 0) return false

  // Pokud je vatRate = 0, NELZE rozhodnout bez isVatPayer flagu!
  // Tato funkce předpokládá že vatRate = 0 znamená neplátce (legacy behavior)
  // Pro nové kódy MUSÍŠ použít isVatPayerEntity() s explicitním flagem
  return vatRate > 0
}

// ✅ NOVÁ BEZPEČNÁ FUNKCE: Je entita neplátce DPH?
// Toto je SPRÁVNÝ způsob jak rozhodnout zda aplikovat DPH
// Parametry:
//  - isVatPayer: Flag z settings (nebo produktu/transakce) zda je firma plátce
//  - vatRate: Sazba DPH (0, 12, 21)
export function isVatPayerEntity(isVatPayer: boolean, vatRate: number): boolean {
  // Pokud firma není plátce → nikdy neaplikuj DPH
  if (!isVatPayer) return false

  // Pokud firma je plátce → aplikuj DPH (i když je sazba 0%)
  return true
}

// ✅ NOVÁ BEZPEČNÁ FUNKCE: Vypočítej VAT amount
// Toto je SPRÁVNÝ způsob jak vypočítat DPH částku
export function calculateVatAmountSafe(
  baseAmount: number,
  isVatPayer: boolean,
  vatRate: number
): number {
  // Neplátce → žádné DPH
  if (!isVatPayer) return 0

  // Plátce → aplikuj sazbu (i když je 0%)
  return round2(baseAmount * vatRate / 100)
}

// Zaokrouhlení na 2 desetinná místa (haléře)
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Výpočet DPH z ceny BEZ DPH (dopředný výpočet)
// Pro neplátce DPH (vatRate < 0): cena s DPH = cena bez DPH, DPH = 0
export function calculateVatFromNet(priceWithoutVat: number, vatRate: number) {
  const net = round2(priceWithoutVat)

  // Neplátce DPH - žádná daň
  if (isNonVatPayer(vatRate)) {
    return { priceWithoutVat: net, vatAmount: 0, priceWithVat: net, vatRate }
  }

  const vatAmount = round2(net * vatRate / 100)
  const priceWithVat = round2(net + vatAmount)
  return { priceWithoutVat: net, vatAmount, priceWithVat, vatRate }
}

// Výpočet DPH z ceny S DPH (zpětný výpočet)
// Pro neplátce DPH: cena bez DPH = cena s DPH, DPH = 0
export function calculateVatFromGross(priceWithVat: number, vatRate: number) {
  const gross = round2(priceWithVat)

  // Neplátce DPH - žádná daň
  if (isNonVatPayer(vatRate)) {
    return { priceWithoutVat: gross, vatAmount: 0, priceWithVat: gross, vatRate }
  }

  const priceWithoutVat = round2(gross / (1 + vatRate / 100))
  const vatAmount = round2(gross - priceWithoutVat)
  return { priceWithoutVat, vatAmount, priceWithVat: gross, vatRate }
}

// Výpočet DPH pro řádek dokladu (quantity × unitPrice)
// Pro neplátce DPH: celkem s DPH = celkem bez DPH, DPH = 0
export function calculateLineVat(
  quantity: number,
  unitPriceWithoutVat: number,
  vatRate: number
) {
  const totalWithoutVat = round2(quantity * unitPriceWithoutVat)

  // Neplátce DPH - žádná daň
  if (isNonVatPayer(vatRate)) {
    return { totalWithoutVat, vatAmount: 0, totalWithVat: totalWithoutVat, vatRate }
  }

  const vatAmount = round2(totalWithoutVat * vatRate / 100)
  const totalWithVat = round2(totalWithoutVat + vatAmount)
  return { totalWithoutVat, vatAmount, totalWithVat, vatRate }
}

// Typ pro položku ve VAT souhrnu
export interface VatLineItem {
  totalWithoutVat: number
  vatAmount: number
  totalWithVat: number
  vatRate: number
}

// Typ pro rekapitulaci DPH podle sazeb
export interface VatBreakdown {
  base: number  // Základ daně
  vat: number   // Částka DPH
  total: number // Celkem s DPH
}

// Typ pro celkový souhrn DPH
export interface VatSummaryResult {
  byRate: Record<number, VatBreakdown>
  totalWithoutVat: number
  totalVat: number
  totalWithVat: number
}

// Souhrn DPH pro celý doklad - seskupení podle sazeb
export function calculateVatSummary(items: VatLineItem[]): VatSummaryResult {
  const byRate: Record<number, VatBreakdown> = {}

  for (const item of items) {
    if (!byRate[item.vatRate]) {
      byRate[item.vatRate] = { base: 0, vat: 0, total: 0 }
    }
    byRate[item.vatRate].base += item.totalWithoutVat
    byRate[item.vatRate].vat += item.vatAmount
    byRate[item.vatRate].total += item.totalWithVat
  }

  // Zaokrouhlení souhrnů
  for (const rate of Object.keys(byRate)) {
    const r = Number(rate)
    byRate[r].base = round2(byRate[r].base)
    byRate[r].vat = round2(byRate[r].vat)
    byRate[r].total = round2(byRate[r].total)
  }

  const totalWithoutVat = round2(
    Object.values(byRate).reduce((s, r) => s + r.base, 0)
  )
  const totalVat = round2(
    Object.values(byRate).reduce((s, r) => s + r.vat, 0)
  )
  const totalWithVat = round2(
    Object.values(byRate).reduce((s, r) => s + r.total, 0)
  )

  return { byRate, totalWithoutVat, totalVat, totalWithVat }
}

// Aplikace slevy na základ bez DPH, pak přepočet DPH
export function applyDiscountAndCalculateVat(
  items: Array<{ quantity: number; unitPriceWithoutVat: number; vatRate: number }>,
  discountType?: string | null,
  discountValue?: number | null
): {
  lineItems: VatLineItem[]
  discountAmount: number
  summary: VatSummaryResult
} {
  // 1. Spočítat subtotal bez DPH
  const subtotalWithoutVat = items.reduce(
    (sum, item) => sum + round2(item.quantity * item.unitPriceWithoutVat),
    0
  )

  // 2. Spočítat slevu
  let discountAmount = 0
  if (discountType && discountValue && discountValue > 0) {
    if (discountType === 'percentage') {
      discountAmount = round2(subtotalWithoutVat * discountValue / 100)
    } else if (discountType === 'fixed') {
      discountAmount = round2(discountValue)
    }
  }

  // 3. Poměr slevy (pro proporcionální rozložení na položky)
  const discountRatio = subtotalWithoutVat > 0
    ? (subtotalWithoutVat - discountAmount) / subtotalWithoutVat
    : 1

  // 4. Spočítat DPH pro každou položku po slevě
  const lineItems: VatLineItem[] = items.map(item => {
    const lineTotal = round2(item.quantity * item.unitPriceWithoutVat)
    const discountedTotal = round2(lineTotal * discountRatio)
    // Pro neplátce DPH (vatRate < 0) je DPH = 0
    const vatAmount = isNonVatPayer(item.vatRate) ? 0 : round2(discountedTotal * item.vatRate / 100)
    const totalWithVat = round2(discountedTotal + vatAmount)
    return {
      totalWithoutVat: discountedTotal,
      vatAmount,
      totalWithVat,
      vatRate: item.vatRate,
    }
  })

  // 5. Souhrn
  const summary = calculateVatSummary(lineItems)

  return { lineItems, discountAmount: round2(discountAmount), summary }
}
