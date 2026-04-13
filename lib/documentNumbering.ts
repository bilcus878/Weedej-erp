/**
 * DEPRECATED: Tento soubor je zachován pro zpětnou kompatibilitu
 * Používej místo toho: @/lib/documentSeries (nový ON-COMMIT systém)
 */

import {
  previewNextDocumentNumber as preview,
  getNextDocumentNumber as getNext,
  type DocumentType as DocType,
} from './documentSeries'

export type DocumentType = DocType

/**
 * NÁHLED dalšího čísla dokladu (BEZ rezervace)
 */
export async function previewNextDocumentNumber(type: DocumentType): Promise<string> {
  return preview(type)
}

/**
 * REZERVUJE další číslo dokladu (S inkrementací)
 * DŮLEŽITÉ: Voláno UVNITŘ Prisma.$transaction()!
 */
export async function getNextDocumentNumber(
  type: DocumentType,
  tx?: any,
  documentDate?: Date
): Promise<string> {
  if (!tx) {
    throw new Error(
      'getNextDocumentNumber MUSÍ být voláno uvnitř Prisma transakce!\n' +
      'Použití:\n' +
      '  await prisma.$transaction(async (tx) => {\n' +
      '    const number = await getNextDocumentNumber("receipt", tx)\n' +
      '    ...\n' +
      '  })'
    )
  }
  return getNext(type, tx, documentDate)
}

/**
 * Parsuje číslo dokladu a vrátí prefix, rok a pořadové číslo
 */
export function parseDocumentNumber(documentNumber: string): {
  prefix: string
  year: number
  sequence: number
} | null {
  // Format: PREFIX-YYYYXXXX (např. OB-20250001 nebo OBJ-20250001)
  const match = documentNumber.match(/^([A-Z]{2,3})-(\d{4})(\d{4})$/)

  if (!match) return null

  return {
    prefix: match[1],
    year: parseInt(match[2]),
    sequence: parseInt(match[3])
  }
}
