'use client'

import React     from 'react'
import Link      from 'next/link'
import { CreditCard, ExternalLink } from 'lucide-react'
import { formatPrice } from '@/lib/shared/finance/money'
import { ERPSectionCard, ERPDetailRow } from './ERPSectionCard'
import type { OrderDetailData } from './OrderDetailTypes'

// ── Payment helpers ───────────────────────────────────────────────────────────

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  card:          'Platební karta',
  cash:          'Hotovost',
  bank_transfer: 'Bankovní převod',
  transfer:      'Bankovní převod',
  online:        'Online platba',
  stripe:        'Stripe',
}

function paymentTypeLabel(type: string): string {
  return PAYMENT_TYPE_LABELS[type] ?? type
}

function PaymentBadge({ type, paymentStatus }: { type: string; paymentStatus?: string }) {
  const isPaid = paymentStatus === 'paid'
  const map: Record<string, { bg: string; text: string }> = {
    card:          { bg: isPaid ? 'bg-blue-600'   : 'bg-blue-50',   text: isPaid ? 'text-white' : 'text-blue-700'   },
    cash:          { bg: isPaid ? 'bg-green-600'  : 'bg-green-50',  text: isPaid ? 'text-white' : 'text-green-700'  },
    bank_transfer: { bg: isPaid ? 'bg-purple-600' : 'bg-purple-50', text: isPaid ? 'text-white' : 'text-purple-700' },
    transfer:      { bg: isPaid ? 'bg-purple-600' : 'bg-purple-50', text: isPaid ? 'text-white' : 'text-purple-700' },
    online:        { bg: isPaid ? 'bg-blue-600'   : 'bg-blue-50',   text: isPaid ? 'text-white' : 'text-blue-700'   },
    stripe:        { bg: isPaid ? 'bg-indigo-600' : 'bg-indigo-50', text: isPaid ? 'text-white' : 'text-indigo-700' },
  }
  const s = map[type] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      {paymentTypeLabel(type)}{isPaid ? ' — zaplaceno' : ''}
    </span>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface OrderSummarySectionProps {
  order:      OrderDetailData
  isVatPayer: boolean
  title?:     string
}

export function OrderSummarySection({ order, isVatPayer, title = 'Shrnutí objednávky' }: OrderSummarySectionProps) {
  const activeDeliveryNotes = (order.deliveryNotes ?? []).filter(dn => dn.status === 'active')

  return (
    <ERPSectionCard title={title} icon={<CreditCard />}>
      <dl>
        {/* Invoice */}
        <ERPDetailRow
          label="Faktura"
          value={
            order.issuedInvoice ? (
              <span className="flex items-center gap-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  order.issuedInvoice.paymentStatus === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {order.issuedInvoice.paymentStatus === 'paid' ? 'Zap.' : 'Nezap.'}
                </span>
                <Link
                  href={`/invoices/issued?highlight=${order.issuedInvoice.id}`}
                  className="font-mono text-indigo-600 hover:underline flex items-center gap-0.5"
                >
                  {order.issuedInvoice.invoiceNumber}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </span>
            ) : (
              <span className="text-xs text-gray-400 italic">nevystavena</span>
            )
          }
        />

        {/* Dates */}
        <ERPDetailRow
          label="Datum objednávky"
          value={new Date(order.orderDate).toLocaleDateString('cs-CZ')}
        />
        <ERPDetailRow
          label="Zaplaceno"
          value={order.paidAt ? new Date(order.paidAt).toLocaleDateString('cs-CZ') : null}
        />
        <ERPDetailRow
          label="Odesláno"
          value={
            order.shippedAt
              ? new Date(order.shippedAt).toLocaleDateString('cs-CZ')
              : activeDeliveryNotes[0]
                ? new Date(activeDeliveryNotes[0].deliveryDate).toLocaleDateString('cs-CZ')
                : null
          }
        />

        {/* Payment details */}
        {order.issuedInvoice?.paymentType && (
          <ERPDetailRow
            label="Způsob platby"
            value={
              <PaymentBadge
                type={order.issuedInvoice.paymentType}
                paymentStatus={order.issuedInvoice.paymentStatus}
              />
            }
          />
        )}
        {order.issuedInvoice?.dueDate && (
          <ERPDetailRow
            label="Splatnost"
            value={new Date(order.issuedInvoice.dueDate).toLocaleDateString('cs-CZ')}
          />
        )}
        {order.issuedInvoice?.variableSymbol && (
          <ERPDetailRow
            label="Var. symbol"
            value={<code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{order.issuedInvoice.variableSymbol}</code>}
          />
        )}
        {order.issuedInvoice?.constantSymbol && (
          <ERPDetailRow
            label="Kon. symbol"
            value={<code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{order.issuedInvoice.constantSymbol}</code>}
          />
        )}
        {order.issuedInvoice?.specificSymbol && (
          <ERPDetailRow
            label="Spec. symbol"
            value={<code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{order.issuedInvoice.specificSymbol}</code>}
          />
        )}
        {order.note && !order.note.startsWith('Platba:') && (
          <ERPDetailRow label="Poznámka" value={order.note} />
        )}
        {order.discountAmount != null && order.discountAmount !== 0 && (
          <ERPDetailRow label="Sleva" value={formatPrice(Number(order.discountAmount))} />
        )}

        {/* Total */}
        <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100">
          <dt className="text-sm font-semibold text-gray-700">
            {isVatPayer ? 'Celkem s DPH' : 'Celkem'}
          </dt>
          <dd className="text-base font-bold text-gray-900">
            {formatPrice(Number(order.totalAmount))}
          </dd>
        </div>
      </dl>

      {/* Delivery notes */}
      {activeDeliveryNotes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Výdejky</p>
          <div className="flex flex-wrap gap-1.5">
            {activeDeliveryNotes.map(dn => (
              <Link
                key={dn.id}
                href={`/delivery-notes?highlight=${dn.id}`}
                className="inline-flex items-center px-2 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200 transition-colors"
              >
                {dn.deliveryNumber} · {new Date(dn.deliveryDate).toLocaleDateString('cs-CZ')}
              </Link>
            ))}
          </div>
        </div>
      )}
    </ERPSectionCard>
  )
}
