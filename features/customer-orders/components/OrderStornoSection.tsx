import { XCircle } from 'lucide-react'
import { ERPSectionCard, ERPDetailRow } from '@/components/erp/detail'
import type { OrderDetailData } from '@/components/erp'

interface Props { order: OrderDetailData }

export function OrderStornoSection({ order }: Props) {
  return (
    <ERPSectionCard
      title="Storno"
      icon={<XCircle className="text-red-500" />}
    >
      <dl>
        <ERPDetailRow
          label="Datum storna"
          value={order.stornoAt ? new Date(order.stornoAt).toLocaleDateString('cs-CZ') : null}
        />
        <ERPDetailRow label="Stornoval" value={order.stornoBy} />
        {order.stornoReason && (
          <ERPDetailRow label="Důvod" value={order.stornoReason} />
        )}
      </dl>
    </ERPSectionCard>
  )
}
