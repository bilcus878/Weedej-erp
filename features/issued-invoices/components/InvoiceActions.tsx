'use client'

import { FileOutput } from 'lucide-react'
import { DetailActionFooter } from '@/components/erp'
import type { IssuedInvoice } from '../types'

interface Props {
  invoice:      IssuedInvoice
  onPrint:      () => void
  onCreditNote: () => void
  onStorno:     () => void
}

export function InvoiceActions({ invoice, onPrint, onCreditNote, onStorno }: Props) {
  return (
    <DetailActionFooter
      flow="outgoing"
      onPrintPdf={onPrint}
      printLabel="Zobrazit fakturu"
      showStorno={invoice.status !== 'storno'}
      onStorno={onStorno}
      stornoLabel="Stornovat"
      extraLeft={invoice.status !== 'storno' ? (
        <button
          onClick={onCreditNote}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <FileOutput className="w-3.5 h-3.5" />Vystavit dobropis
        </button>
      ) : undefined}
    />
  )
}
