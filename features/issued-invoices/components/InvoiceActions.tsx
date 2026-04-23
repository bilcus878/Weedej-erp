'use client'

import { FileText, FileOutput, XCircle } from 'lucide-react'
import { ActionToolbar } from '@/components/erp'
import type { IssuedInvoice } from '../types'

interface Props {
  invoice:     IssuedInvoice
  onPrint:     () => void
  onCreditNote: () => void
  onStorno:    () => void
}

export function InvoiceActions({ invoice, onPrint, onCreditNote, onStorno }: Props) {
  return (
    <ActionToolbar
      left={
        <>
          <button onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors">
            <FileText className="w-3.5 h-3.5" />Zobrazit fakturu
          </button>
          {invoice.status !== 'storno' && (
            <button onClick={onCreditNote}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors">
              <FileOutput className="w-3.5 h-3.5" />Vystavit dobropis
            </button>
          )}
        </>
      }
      right={invoice.status !== 'storno' ? (
        <button onClick={onStorno}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors">
          <XCircle className="w-3.5 h-3.5" />Stornovat
        </button>
      ) : undefined}
    />
  )
}
