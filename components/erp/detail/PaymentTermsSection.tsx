'use client'

import { CreditCard } from 'lucide-react'
import { ERPSectionCard, ERPDetailRow } from './ERPSectionCard'

const PAYMENT_LABELS: Record<string, string> = {
  cash:          'Hotovost',
  card:          'Platební karta',
  transfer:      'Bankovní převod',
  bank_transfer: 'Bankovní převod',
}

export interface PaymentTermsSectionProps {
  paymentType?:      string | null
  dueDate?:          string | null
  variableSymbol?:   string | null
  constantSymbol?:   string | null
  specificSymbol?:   string | null
  expectedDate?:     string | null
  firstReceiptDate?: string | null
  title?:            string
}

export function PaymentTermsSection({
  paymentType, dueDate, variableSymbol, constantSymbol, specificSymbol,
  expectedDate, firstReceiptDate,
  title = 'Platba a dodání',
}: PaymentTermsSectionProps) {
  const hasPayment  = !!(paymentType || dueDate || variableSymbol || constantSymbol || specificSymbol)
  const hasDelivery = !!(expectedDate || firstReceiptDate)

  if (!hasPayment && !hasDelivery) return null

  return (
    <ERPSectionCard title={title} icon={<CreditCard />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {hasPayment && (
          <dl>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Platba</p>
            {paymentType    && <ERPDetailRow label="Způsob" value={PAYMENT_LABELS[paymentType] ?? paymentType} />}
            {dueDate        && <ERPDetailRow label="Splatnost" value={new Date(dueDate).toLocaleDateString('cs-CZ')} />}
            {variableSymbol && <ERPDetailRow label="Variabilní symbol" value={<code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{variableSymbol}</code>} />}
            {constantSymbol && <ERPDetailRow label="Konstantní symbol" value={<code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{constantSymbol}</code>} />}
            {specificSymbol && <ERPDetailRow label="Specifický symbol"  value={<code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{specificSymbol}</code>} />}
          </dl>
        )}

        {hasDelivery && (
          <dl>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Stav dodání</p>
            {expectedDate     && <ERPDetailRow label="Očekáváno" value={new Date(expectedDate).toLocaleDateString('cs-CZ')} />}
            {firstReceiptDate
              ? <ERPDetailRow label="Přijato" value={<span className="text-green-700 font-medium">{new Date(firstReceiptDate).toLocaleDateString('cs-CZ')}</span>} />
              : <ERPDetailRow label="Přijato" value={<span className="text-gray-400 text-xs italic">Čeká na příjemku</span>} />
            }
          </dl>
        )}
      </div>
    </ERPSectionCard>
  )
}
