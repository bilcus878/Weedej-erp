'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, ExternalLink } from 'lucide-react'
import { ERPSectionCard, ERPDetailRow } from '@/components/erp/detail'
import { formatPrice } from '@/lib/shared/finance/money'
import type { OrderDetailData } from '@/components/erp'

const PAYMENT_LABELS: Record<string, string> = {
  card:          'Platební karta',
  cash:          'Hotovost',
  bank_transfer: 'Bankovní převod',
  transfer:      'Bankovní převod',
  online:        'Online platba',
  stripe:        'Stripe',
}

interface Props {
  order:      OrderDetailData
  isVatPayer: boolean
}

export function OrderSummarySection({ order, isVatPayer }: Props) {
  const [showAllDns, setShowAllDns] = useState(false)
  const inv       = order.issuedInvoice
  const activeDns = order.deliveryNotes?.filter(dn => dn.status === 'active') ?? []
  const visibleDns = showAllDns ? activeDns : activeDns.slice(0, 3)

  return (
    <ERPSectionCard title="Shrnutí objednávky" icon={<CreditCard />}>
      <dl>
        {/* Faktura */}
        <ERPDetailRow label="Faktura" value={
          inv ? (
            <div className="flex items-center gap-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                inv.paymentStatus === 'paid'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {inv.paymentStatus === 'paid' ? 'Zap.' : 'Nezap.'}
              </span>
              <Link
                href={`/invoices/issued?highlight=${inv.id}`}
                className="text-indigo-600 hover:underline font-mono text-xs flex items-center gap-0.5"
              >
                {inv.invoiceNumber}<ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <span className="text-gray-400 text-xs italic">nevystavena</span>
          )
        } />

        {/* Datumy */}
        <ERPDetailRow label="Objednáno" value={new Date(order.orderDate).toLocaleDateString('cs-CZ')} />
        <ERPDetailRow label="Zaplaceno" value={order.paidAt ? new Date(order.paidAt).toLocaleDateString('cs-CZ') : null} />
        <ERPDetailRow label="Odesláno"  value={order.shippedAt ? new Date(order.shippedAt).toLocaleDateString('cs-CZ') : null} />

        {/* Platba */}
        {inv?.paymentType && (
          <ERPDetailRow label="Způsob platby" value={PAYMENT_LABELS[inv.paymentType] ?? inv.paymentType} />
        )}
        {inv?.dueDate && (
          <ERPDetailRow label="Splatnost" value={new Date(inv.dueDate).toLocaleDateString('cs-CZ')} />
        )}
        {inv?.variableSymbol && (
          <ERPDetailRow label="Var. symbol" value={<code className="font-mono text-xs">{inv.variableSymbol}</code>} />
        )}
        {inv?.constantSymbol && (
          <ERPDetailRow label="Kon. symbol" value={<code className="font-mono text-xs">{inv.constantSymbol}</code>} />
        )}
        {order.note && !order.note.startsWith('Platba:') && (
          <ERPDetailRow label="Poznámka" value={order.note} />
        )}

        {/* Výdejky */}
        {activeDns.length > 0 && (
          <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
            <dt className="text-sm text-gray-500 shrink-0 w-40">Výdejky</dt>
            <dd className="flex flex-wrap gap-1.5 justify-end">
              {visibleDns.map(dn => {
                const dnTotal = dn.items.reduce((sum, item) => {
                  const hasSaved      = item.price != null && item.priceWithVat != null
                  const unitPrice     = hasSaved ? Number(item.price) : Number(item.product?.price || 0)
                  const vatPerUnit    = hasSaved ? Number(item.vatAmount ?? 0) : unitPrice * 0.21
                  const priceWithVatU = hasSaved ? Number(item.priceWithVat) : unitPrice + vatPerUnit
                  return sum + Number(item.quantity) * (isVatPayer ? priceWithVatU : unitPrice)
                }, 0)
                return (
                  <Link
                    key={dn.id}
                    href={`/delivery-notes?highlight=${dn.id}`}
                    className="inline-flex items-center px-2 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200 transition-colors whitespace-nowrap"
                  >
                    {dn.deliveryNumber} · {new Date(dn.deliveryDate).toLocaleDateString('cs-CZ')} · {Math.round(dnTotal).toLocaleString('cs-CZ')} Kč
                  </Link>
                )
              })}
              {!showAllDns && activeDns.length > 3 && (
                <button
                  onClick={() => setShowAllDns(true)}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  a {activeDns.length - 3} dalších →
                </button>
              )}
            </dd>
          </div>
        )}

        {/* Celkem */}
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-200">
          <span className="text-sm font-bold text-gray-700">Celkem</span>
          <span className="text-lg font-bold text-gray-900">{formatPrice(Number(order.totalAmount))}</span>
        </div>
      </dl>
    </ERPSectionCard>
  )
}
