import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { ERPSectionCard, ERPDetailRow } from '@/components/erp/detail'
import { formatPrice } from '@/lib/shared/finance/money'
import type { OrderDetailData } from '@/components/erp'

interface Props { order: OrderDetailData }

export function OrderOverviewCard({ order }: Props) {
  const catalogItems = order.items.filter(i => i.productId !== null)
  const activeDns    = order.deliveryNotes?.filter(dn => dn.status === 'active') ?? []
  const inv          = order.issuedInvoice

  return (
    <ERPSectionCard title="Přehled" icon={<BarChart3 />}>
      <dl>
        <ERPDetailRow
          label="Celkem"
          value={<span className="text-base font-bold text-gray-900">{formatPrice(Number(order.totalAmount))}</span>}
        />
        <ERPDetailRow label="Položek"  value={catalogItems.length} />
        <ERPDetailRow label="Výdejky"  value={activeDns.length || null} />
        {inv && (
          <ERPDetailRow label="Faktura" value={
            <Link
              href={`/invoices/issued?highlight=${inv.id}`}
              className="text-indigo-600 hover:underline font-mono text-xs"
            >
              {inv.invoiceNumber}
            </Link>
          } />
        )}
      </dl>
    </ERPSectionCard>
  )
}
