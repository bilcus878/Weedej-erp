'use client'

import { Receipt, FileText, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import type { AppSettings } from '../types'

interface Props {
  settings:            AppSettings | null
  onToggleVatPayer:    () => void
}

export function InvoicingTab({ settings, onToggleVatPayer }: Props) {
  const currentYear = new Date().getFullYear()
  const nextNumber  = settings
    ? (settings.lastIssuedInvoiceYear === currentYear ? settings.lastIssuedInvoiceNumber + 1 : 1)
    : 1

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
          <h2 className="text-base font-semibold text-blue-900 flex items-center gap-2">
            <Receipt className="h-4.5 w-4.5 text-blue-600" />Plátce DPH
          </h2>
          <p className="text-xs text-blue-600 mt-0.5">Nastavení ovlivňuje sazby DPH u všech produktů</p>
        </div>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {settings?.isVatPayer ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                    <CheckCircle className="h-3.5 w-3.5" />Plátce DPH
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                    <XCircle className="h-3.5 w-3.5" />Neplátce DPH
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {settings?.isVatPayer
                  ? 'U produktů můžete nastavovat sazby DPH (21%, 12%, 0%)'
                  : 'U všech produktů je automaticky nastaveno "Neplátce DPH"'}
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleVatPayer}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings?.isVatPayer ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${settings?.isVatPayer ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {settings && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-6 py-4 border-b border-purple-100">
            <h2 className="text-base font-semibold text-purple-900 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-purple-600" />Číslovací řada faktur
            </h2>
            <p className="text-xs text-purple-600 mt-0.5">Automatické číslování vydaných faktur</p>
          </div>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Poslední faktura</p>
                <p className="text-3xl font-bold text-gray-900 font-mono">
                  {settings.lastIssuedInvoiceYear || currentYear}{String(settings.lastIssuedInvoiceNumber).padStart(3, '0')}
                </p>
                <p className="text-xs text-gray-400 mt-1">Rok {settings.lastIssuedInvoiceYear || currentYear}, pořadové č. {settings.lastIssuedInvoiceNumber}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                <p className="text-xs font-medium text-blue-500 uppercase tracking-wide mb-2">Další faktura</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-blue-700 font-mono">{currentYear}{String(nextNumber).padStart(3, '0')}</p>
                  <ChevronRight className="h-5 w-5 text-blue-400" />
                </div>
                <p className="text-xs text-blue-400 mt-1">
                  {settings.lastIssuedInvoiceYear !== currentYear ? 'Nový rok – číslování od 1' : 'Automaticky přiřazeno'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
