'use client'

import { Phone, Mail, Users, FileText, MapPin, Monitor, CheckSquare, ShoppingCart, Receipt, TrendingUp } from 'lucide-react'
import type { TimelineEvent as TEvent } from '../../types'

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call:        Phone,
  email:       Mail,
  meeting:     Users,
  note:        FileText,
  visit:       MapPin,
  demo:        Monitor,
  other:       FileText,
  task:        CheckSquare,
  order:       ShoppingCart,
  invoice:     Receipt,
  opportunity: TrendingUp,
  interaction: FileText,
}

const EVENT_BG: Record<string, string> = {
  interaction: 'bg-blue-100 text-blue-600',
  task:        'bg-amber-100 text-amber-600',
  order:       'bg-emerald-100 text-emerald-600',
  invoice:     'bg-purple-100 text-purple-600',
  opportunity: 'bg-violet-100 text-violet-600',
}

interface Props { event: TEvent }

export function TimelineEventRow({ event: e }: Props) {
  const iconType  = e.meta?.interactionType as string ?? e.type
  const Icon      = EVENT_ICONS[iconType] ?? EVENT_ICONS[e.type] ?? FileText
  const bgClass   = EVENT_BG[e.type] ?? 'bg-gray-100 text-gray-600'

  const date = new Date(e.occurredAt).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = new Date(e.occurredAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex gap-3 py-2.5 group">
      {/* Icon + vertical line */}
      <div className="flex flex-col items-center">
        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${bgClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="w-px flex-1 bg-gray-100 mt-1" />
      </div>

      <div className="flex-1 min-w-0 pb-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-gray-900 leading-snug">{e.title}</p>
          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{date} {time}</span>
        </div>
        {e.subtitle && <p className="text-xs text-gray-500 mt-0.5">{e.subtitle}</p>}
        {e.actor    && <p className="text-xs text-gray-400 mt-0.5">{e.actor}</p>}
      </div>
    </div>
  )
}
