/**
 * Financial consistency verification for return refunds.
 *
 * Called INSIDE the refund transaction, AFTER the CreditNote is created and
 * BEFORE the transaction commits. If this check fails, the entire transaction
 * rolls back — no CreditNote is stored, no status changes, no partial state.
 *
 * This is the last line of defence against calculation bugs. It recomputes the
 * credit note totals from its own line items and compares them to the stored
 * amounts. Any discrepancy greater than TOLERANCE_CZK halts the refund.
 *
 * TOLERANCE: 0.01 CZK (1 haléř) — the minimum representable amount in CZK.
 * This accounts for unavoidable rounding in per-line VAT calculations while
 * still catching any meaningful financial error.
 */

import { Prisma }          from '@prisma/client'
import { calculateLineVat, calculateVatSummary, round2 } from '@/lib/vatCalculation'
import { ReturnValidationError } from './ReturnValidationService'

const TOLERANCE_CZK = 0.01

export async function assertFinancialConsistency(
  tx:           Prisma.TransactionClient,
  creditNoteId: string,
): Promise<void> {
  const creditNote = await tx.creditNote.findUniqueOrThrow({
    where:   { id: creditNoteId },
    include: { items: true },
  })

  if (creditNote.items.length === 0) {
    throw new ReturnValidationError(
      'Dobropis neobsahuje žádné položky — finanční konzistance nelze ověřit.',
      500,
    )
  }

  // Recompute document totals from stored line items using the canonical VAT functions.
  // Each item's `price` field is the net unit price (already rounded and stored).
  const lineResults = creditNote.items.map(item =>
    calculateLineVat(
      Number(item.quantity),
      Number(item.price),      // net unit price — stored on CreditNoteItem
      Number(item.vatRate),
    )
  )
  const computed = calculateVatSummary(lineResults)

  // CreditNote stores negative amounts (it reduces the original invoice).
  // We compare absolute values.
  const storedGross    = Math.abs(Number(creditNote.totalAmount))
  const storedNet      = Math.abs(Number(creditNote.totalAmountWithoutVat))
  const storedVat      = Math.abs(Number(creditNote.totalVatAmount))
  const computedGross  = round2(computed.totalWithVat)
  const computedNet    = round2(computed.totalWithoutVat)
  const computedVat    = round2(computed.totalVat)

  const grossDiff = Math.abs(storedGross - computedGross)
  const netDiff   = Math.abs(storedNet   - computedNet)
  const vatDiff   = Math.abs(storedVat   - computedVat)

  if (grossDiff > TOLERANCE_CZK || netDiff > TOLERANCE_CZK || vatDiff > TOLERANCE_CZK) {
    // Log full detail for debugging — this should never happen in production
    console.error('[ReturnFinancialConsistency] MISMATCH detected', {
      creditNoteId,
      stored:   { gross: storedGross,   net: storedNet,   vat: storedVat },
      computed: { gross: computedGross, net: computedNet, vat: computedVat },
      diff:     { gross: grossDiff,     net: netDiff,     vat: vatDiff   },
    })

    throw new ReturnValidationError(
      `Finanční nesoulad dobropisu ${creditNote.creditNoteNumber}: ` +
      `celková částka ${storedGross.toFixed(2)} CZK nesouhlasí ` +
      `se součtem položek ${computedGross.toFixed(2)} CZK ` +
      `(rozdíl ${grossDiff.toFixed(2)} CZK). ` +
      `Refundace nebyla zpracována. Kontaktujte administrátora.`,
      500,
    )
  }
}
