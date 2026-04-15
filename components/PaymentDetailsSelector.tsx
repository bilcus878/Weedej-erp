'use client'

import { useEffect } from 'react'
import Input from '@/components/ui/Input'

interface PaymentDetailsSelectorProps {
  dueDate: string
  onDueDateChange: (date: string) => void
  paymentType: string
  onPaymentTypeChange: (type: string) => void
  variableSymbol: string
  onVariableSymbolChange: (value: string) => void
  constantSymbol: string
  onConstantSymbolChange: (value: string) => void
  specificSymbol: string
  onSpecificSymbolChange: (value: string) => void
  required?: boolean
  autoGenerateNumber?: string // Číslo faktury/objednávky pro automatické nastavení VS
}

export default function PaymentDetailsSelector({
  dueDate,
  onDueDateChange,
  paymentType,
  onPaymentTypeChange,
  variableSymbol,
  onVariableSymbolChange,
  constantSymbol,
  onConstantSymbolChange,
  specificSymbol,
  onSpecificSymbolChange,
  required = false,
  autoGenerateNumber
}: PaymentDetailsSelectorProps) {

  // Automaticky nastav VS na číslo faktury/objednávky když se změní
  useEffect(() => {
    if (autoGenerateNumber && paymentType === 'transfer' && !variableSymbol) {
      onVariableSymbolChange(autoGenerateNumber)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerateNumber, paymentType])

  // Výchozí datum splatnosti = dnes + 14 dní
  useEffect(() => {
    if (!dueDate && required) {
      const defaultDueDate = new Date()
      defaultDueDate.setDate(defaultDueDate.getDate() + 14)
      onDueDateChange(defaultDueDate.toISOString().split('T')[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      {/* Datum splatnosti a Forma úhrady - ve 2 sloupcích */}
      <div className="grid grid-cols-2 gap-4">
        {/* Datum splatnosti */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Datum splatnosti {required && '*'}
          </label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => onDueDateChange(e.target.value)}
            required={required}
          />
          {!dueDate && !required && (
            <p className="text-xs text-gray-500 mt-1">Výchozí: dnešní datum + 14 dní</p>
          )}
        </div>

        {/* Forma úhrady */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Forma úhrady {required && '*'}
          </label>
          <select
            value={paymentType}
            onChange={(e) => onPaymentTypeChange(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required={required}
          >
            <option value="">Vyberte formu úhrady</option>
            <option value="cash">Hotově</option>
            <option value="card">Kartou</option>
            <option value="transfer">Bankovní převod</option>
          </select>
        </div>
      </div>

      {/* Bankovní údaje - zobrazí se jen když je vybrán bankovní převod */}
      {paymentType === 'transfer' && (
        <div className="p-4 border rounded bg-gray-50 space-y-3">
          <h4 className="font-medium text-sm">Údaje pro bankovní převod</h4>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Variabilní symbol</label>
              <Input
                value={variableSymbol}
                onChange={(e) => onVariableSymbolChange(e.target.value)}
                placeholder="VS"
              />
              {autoGenerateNumber && !variableSymbol && (
                <p className="text-xs text-gray-500 mt-1">Automaticky: {autoGenerateNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Konstantní symbol</label>
              <Input
                value={constantSymbol}
                onChange={(e) => onConstantSymbolChange(e.target.value)}
                placeholder="KS"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Specifický symbol</label>
              <Input
                value={specificSymbol}
                onChange={(e) => onSpecificSymbolChange(e.target.value)}
                placeholder="SS"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
