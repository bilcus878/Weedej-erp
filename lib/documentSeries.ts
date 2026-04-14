/**
 * ON-COMMIT Číslování Dokument

ů - České Účetní Standardy
 *
 * Číslo se generuje AŽ při úspěšném uložení do databáze (ne při otevření formuláře).
 * Používá atomický inkrement v databázi, aby nedocházelo k duplicitám.
 *
 * Formát: {Prefix}{Rok}{Pořadí}
 * Příklad: PR20250001, VYD20250042
 */

import { prisma } from './prisma'
import { Prisma } from '@prisma/client'

// Typy dokumentů a jejich prefixy
const DOCUMENT_PREFIXES: Record<string, string> = {
  'receipt': 'PR',           // Příjemky
  'delivery-note': 'VYD',    // Výdejky (kebab-case)
  'delivery_note': 'VYD',    // Výdejky (snake_case)
  'purchase-order': 'OBJ',   // Objednávky dodavatelům (kebab-case)
  'purchase_order': 'OBJ',   // Objednávky dodavatelům (snake_case)
  'customer-order': 'ZAK',   // Objednávky od zákazníků (kebab-case)
  'customer_order': 'ZAK',   // Objednávky od zákazníků (snake_case)
  'eshop-order': 'ESHY',     // Objednávky z e-shopu (kebab-case)
  'eshop_order': 'ESHY',     // Objednávky z e-shopu (snake_case)
  'received-invoice': 'FP',  // Přijaté faktury (kebab-case)
  'received_invoice': 'FP',  // Přijaté faktury (snake_case)
  'issued-invoice': 'VF',    // Vystavené faktury (kebab-case)
  'issued_invoice': 'VF',    // Vystavené faktury (snake_case)
  'credit-note': 'DOB',      // Dobropisy (kebab-case)
  'credit_note': 'DOB',      // Dobropisy (snake_case)
  'transaction': 'FAK',      // Vystavené faktury (DEPRECATED - používej issued-invoice)
  'inventura': 'INV',        // Inventury
}

export type DocumentType =
  | 'receipt'
  | 'delivery-note'
  | 'delivery_note'
  | 'purchase-order'
  | 'purchase_order'
  | 'customer-order'
  | 'customer_order'
  | 'eshop-order'
  | 'eshop_order'
  | 'received-invoice'
  | 'received_invoice'
  | 'issued-invoice'
  | 'issued_invoice'
  | 'credit-note'
  | 'credit_note'
  | 'transaction'
  | 'inventura'

/**
 * Atomicky získá další číslo dokumentu a zvýší počítadlo
 * DŮLEŽITÉ: Volej toto AŽ uvnitř transakce při vytváření dokumentu!
 *
 * @param documentType - Typ dokumentu
 * @param tx - Prisma transakce (povinné!)
 * @param documentDate - Datum dokumentu (volitelné, default = dnes). ROK z tohoto data určuje číselnou řadu!
 * @returns Vygenerované číslo dokumentu (např. "PR20250001")
 */
export async function getNextDocumentNumber(
  documentType: DocumentType,
  tx: Prisma.TransactionClient,
  documentDate?: Date
): Promise<string> {
  const currentYear = documentDate ? documentDate.getFullYear() : new Date().getFullYear()
  const prefix = DOCUMENT_PREFIXES[documentType]

  // Atomický UPDATE + INSERT pomocí upsert
  // Postgres zajistí, že při současném požadavku dvou uživatelů
  // dostane každý unikátní číslo
  const series = await tx.documentSeries.upsert({
    where: {
      documentType_year: {
        documentType,
        year: currentYear,
      },
    },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
    create: {
      documentType,
      year: currentYear,
      lastNumber: 1,
    },
  })

  // Formát: PREFIX + ROK + číslo s paddingem na 4 místa
  // Příklad: PR20250001
  const paddedNumber = String(series.lastNumber).padStart(4, '0')
  return `${prefix}${currentYear}${paddedNumber}`
}

/**
 * POUZE pro náhled - nezvyšuje počítadlo!
 * Použij pro zobrazení "dalšího čísla" uživateli před vytvořením dokumentu
 *
 * @param documentType - Typ dokumentu
 * @param documentDate - Datum dokumentu (volitelné, default = dnes). ROK z tohoto data určuje číselnou řadu!
 */
export async function previewNextDocumentNumber(
  documentType: DocumentType,
  documentDate?: Date
): Promise<string> {
  const currentYear = documentDate ? documentDate.getFullYear() : new Date().getFullYear()
  const prefix = DOCUMENT_PREFIXES[documentType]

  const series = await prisma.documentSeries.findUnique({
    where: {
      documentType_year: {
        documentType,
        year: currentYear,
      },
    },
  })

  const nextNumber = series ? series.lastNumber + 1 : 1
  const paddedNumber = String(nextNumber).padStart(4, '0')

  return `${prefix}${currentYear}${paddedNumber}`
}

/**
 * Získej aktuální stav číslování pro daný typ a rok
 */
export async function getCurrentSeriesInfo(
  documentType: DocumentType,
  year?: number
): Promise<{
  year: number
  lastNumber: number
  nextNumber: string
} | null> {
  const targetYear = year || new Date().getFullYear()
  const prefix = DOCUMENT_PREFIXES[documentType]

  const series = await prisma.documentSeries.findUnique({
    where: {
      documentType_year: {
        documentType,
        year: targetYear,
      },
    },
  })

  if (!series) {
    return null
  }

  const nextNumber = series.lastNumber + 1
  const paddedNumber = String(nextNumber).padStart(4, '0')

  return {
    year: targetYear,
    lastNumber: series.lastNumber,
    nextNumber: `${prefix}${targetYear}${paddedNumber}`,
  }
}
