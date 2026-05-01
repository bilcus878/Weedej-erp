'use client'

import { User, FileText } from 'lucide-react'
import { ERPSectionCard, ERPDetailRow } from '@/components/erp/detail'
import type { OrderDetailData } from '@/components/erp'

interface Props { order: OrderDetailData }

export function OrderCustomerSection({ order }: Props) {
  const name       = order.customerName || 'Zákazník'
  const hasBilling = !!(order.billingStreet || order.billingCity)

  return (
    <ERPSectionCard title="Zákazník" icon={<User />}>
      <dl>
        <ERPDetailRow label="Jméno" value={name} />
        <ERPDetailRow label="E-mail" value={
          order.customerEmail
            ? <a href={`mailto:${order.customerEmail}`} className="text-indigo-600 hover:underline">{order.customerEmail}</a>
            : null
        } />
        <ERPDetailRow label="Telefon"  value={order.customerPhone} />
        {order.billingCompany && <ERPDetailRow label="Firma" value={order.billingCompany} />}
        {order.billingIco && (
          <ERPDetailRow label="IČO" value={
            <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{order.billingIco}</code>
          } />
        )}
      </dl>

      {hasBilling && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <FileText className="w-3 h-3" />
            Fakturační adresa
          </p>
          <dl>
            <ERPDetailRow label="Příjemce" value={order.billingCompany || order.billingName || name} />
            {order.billingStreet && <ERPDetailRow label="Ulice" value={order.billingStreet} />}
            <ERPDetailRow
              label="Město / PSČ"
              value={[order.billingZip, order.billingCity].filter(Boolean).join(' ') || null}
            />
            <ERPDetailRow label="Země" value={order.billingCountry || 'CZ'} />
          </dl>
        </div>
      )}
    </ERPSectionCard>
  )
}
