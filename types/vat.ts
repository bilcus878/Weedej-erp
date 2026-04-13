// TypeScript types pro VAT/DPH výpočty
// Zajišťují type safety a dokumentují strukturu dat

/**
 * České sazby DPH podle legislativy
 * - 21% základní sazba
 * - 12% snížená sazba
 * - 0% osvobozené zboží/služby
 */
export type CzechVatRate = 0 | 12 | 21

/**
 * Status plátce DPH pro firmu
 */
export interface VatPayerStatus {
  /** Je firma plátce DPH? */
  isVatPayer: boolean

  /** DIČ (pokud je plátce) */
  vatId?: string | null

  /** Od kdy je firma plátcem (pokud je plátce) */
  vatPayerSince?: Date | null
}

/**
 * Výpočet DPH pro jednu položku
 *
 * ⚠️ DŮLEŽITÉ: Tato struktura MUSÍ vždy obsahovat isVatPayer flag!
 * Nikdy nerozhoduj jen podle vatRate === 0!
 */
export interface VatCalculation {
  /** Je entita plátce DPH? (ZDROJ PRAVDY!) */
  isVatPayer: boolean

  /** Sazba DPH (0, 12, 21) */
  vatRate: CzechVatRate

  /** Základ daně (cena bez DPH) */
  priceWithoutVat: number

  /** Částka DPH */
  vatAmount: number

  /** Cena s DPH */
  priceWithVat: number
}

/**
 * Rekapitulace DPH podle sazeb
 */
export interface VatBreakdown {
  /** Základ daně (suma bez DPH) */
  base: number

  /** Částka DPH */
  vat: number

  /** Celkem s DPH */
  total: number
}

/**
 * Celkový souhrn DPH pro doklad
 */
export interface VatSummary {
  /** Je entita plátce DPH? */
  isVatPayer: boolean

  /** Rekapitulace po sazbách (pouze pro plátce) */
  byRate: Record<CzechVatRate, VatBreakdown> | null

  /** Celkem bez DPH */
  totalWithoutVat: number

  /** Celkem DPH */
  totalVat: number

  /** Celkem s DPH */
  totalWithVat: number
}

/**
 * Parametry pro výpočet DPH
 *
 * ⚠️ POUŽITÍ:
 * ```typescript
 * const params: VatCalculationParams = {
 *   isVatPayer: false,  // VŽDY specifikuj tento flag!
 *   vatRate: 0,
 *   baseAmount: 500
 * }
 * ```
 */
export interface VatCalculationParams {
  /** Je entita plátce DPH? (POVINNÉ!) */
  isVatPayer: boolean

  /** Sazba DPH */
  vatRate: CzechVatRate

  /** Základní částka (bez DPH) */
  baseAmount: number

  /** Množství (pro výpočet celkové ceny) */
  quantity?: number
}

/**
 * Položka transakce/faktury s DPH
 */
export interface VatLineItem {
  /** ID produktu */
  productId: string

  /** Název produktu */
  productName: string

  /** Množství */
  quantity: number

  /** Jednotka (ks, g, atd.) */
  unit: string

  /** Je firma plátce DPH? */
  isVatPayer: boolean

  /** Sazba DPH pro tento produkt */
  vatRate: CzechVatRate

  /** Cena za jednotku (bez DPH) */
  unitPrice: number

  /** Celkem bez DPH (quantity × unitPrice) */
  totalWithoutVat: number

  /** Částka DPH */
  vatAmount: number

  /** Celkem s DPH */
  totalWithVat: number
}

/**
 * Export dat pro účetní/reporting
 *
 * ⚠️ KRITICKÉ: VŽDY obsahuje isVatPayer flag!
 * Účetní MUSÍ vědět zda firma je plátce nebo ne.
 */
export interface AccountingExport {
  /** Typ dokladu */
  documentType: 'invoice' | 'receipt' | 'transaction'

  /** Číslo dokladu */
  documentNumber: string

  /** Datum vystavení */
  issueDate: Date

  /** Je firma plátce DPH? */
  isVatPayer: boolean

  /** DIČ (pokud je plátce) */
  vatId?: string | null

  /** Položky */
  items: VatLineItem[]

  /** Souhrn DPH */
  summary: VatSummary

  /** Poznámka (pro neplátce: "Neplátce DPH") */
  note?: string
}

/**
 * Type guard: Je entita plátce DPH?
 */
export function isVatPayer(entity: { isVatPayer: boolean }): entity is { isVatPayer: true } {
  return entity.isVatPayer === true
}

/**
 * Type guard: Je entita neplátce DPH?
 */
export function isNonVatPayer(entity: { isVatPayer: boolean }): entity is { isVatPayer: false } {
  return entity.isVatPayer === false
}

/**
 * Validace VAT parametrů
 * Použij před každým VAT výpočtem aby ses ujistil že data jsou správná
 */
export function validateVatParams(params: VatCalculationParams): void {
  if (typeof params.isVatPayer !== 'boolean') {
    throw new Error('❌ VAT ERROR: isVatPayer MUST be a boolean!')
  }

  if (![0, 12, 21].includes(params.vatRate)) {
    throw new Error(`❌ VAT ERROR: Invalid vatRate ${params.vatRate}. Must be 0, 12, or 21.`)
  }

  if (params.baseAmount < 0) {
    throw new Error('❌ VAT ERROR: baseAmount cannot be negative!')
  }

  // ⚠️ WARNING: Pokud firma není plátce, vatRate by měl být 0
  if (!params.isVatPayer && params.vatRate !== 0) {
    console.warn(
      `⚠️ VAT WARNING: Firma není plátce (isVatPayer=false) ale má vatRate=${params.vatRate}. ` +
      `Očekáváme vatRate=0 pro neplátce. DPH bude ignorováno.`
    )
  }
}

// Všechny typy jsou již exportovány výše jako export interface/type
