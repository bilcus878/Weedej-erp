import { Clock } from 'lucide-react'
import { ERPSectionCard, ERPStatusTimeline } from '@/components/erp/detail'
import type { TimelineEntry } from '@/components/erp/detail'
import type { OrderDetailData } from '@/components/erp'

const STATUS_CONFIG: Record<string, { label: string; color: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange' }> = {
  new:        { label: 'Vytvořena',   color: 'gray'   },
  paid:       { label: 'Zaplacena',   color: 'blue'   },
  processing: { label: 'Výdejka',     color: 'orange' },
  shipped:    { label: 'Odesláno',    color: 'purple' },
  delivered:  { label: 'Doručeno',    color: 'green'  },
  storno:     { label: 'Stornováno',  color: 'red'    },
  cancelled:  { label: 'Zrušeno',     color: 'red'    },
}

function buildTimeline(order: OrderDetailData): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  entries.push({ toStatus: 'new', changedAt: order.orderDate })

  if (order.paidAt) {
    entries.push({ toStatus: 'paid', changedAt: order.paidAt })
  }

  // If there's a delivery note but no shippedAt, show processing step
  const firstDn = order.deliveryNotes?.find(dn => dn.status === 'active')
  if (firstDn && !order.shippedAt) {
    entries.push({ toStatus: 'processing', changedAt: firstDn.deliveryDate })
  }

  if (order.shippedAt) {
    entries.push({ toStatus: 'shipped', changedAt: order.shippedAt })
  }

  if (['cancelled', 'storno'].includes(order.status) && order.stornoAt) {
    entries.push({
      toStatus:       order.status,
      changedAt:      order.stornoAt,
      changedByName:  order.stornoBy ?? undefined,
      note:           order.stornoReason ?? undefined,
    })
  }

  return entries.sort((a, b) =>
    new Date(a.changedAt as string).getTime() - new Date(b.changedAt as string).getTime()
  )
}

interface Props { order: OrderDetailData }

export function OrderTimelineCard({ order }: Props) {
  return (
    <ERPSectionCard
      title="Historie stavu"
      icon={<Clock />}
      collapsible
      defaultCollapsed={false}
    >
      <ERPStatusTimeline
        entries={buildTimeline(order)}
        statusConfig={STATUS_CONFIG}
        compact
      />
    </ERPSectionCard>
  )
}
