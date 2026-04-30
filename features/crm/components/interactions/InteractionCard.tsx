'use client'

import { Phone, Mail, Users, FileText, MapPin, Monitor, Edit2, Trash2 } from 'lucide-react'
import type { CrmInteraction } from '../../types'
import { INTERACTION_TYPE_LABELS } from '../../types'

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call:    Phone,
  email:   Mail,
  meeting: Users,
  note:    FileText,
  visit:   MapPin,
  demo:    Monitor,
  other:   FileText,
}

const TYPE_COLORS: Record<string, string> = {
  call:    'bg-blue-100 text-blue-700',
  email:   'bg-purple-100 text-purple-700',
  meeting: 'bg-green-100 text-green-700',
  note:    'bg-yellow-100 text-yellow-700',
  visit:   'bg-orange-100 text-orange-700',
  demo:    'bg-indigo-100 text-indigo-700',
  other:   'bg-gray-100 text-gray-700',
}

interface Props {
  interaction: CrmInteraction
  onEdit:      (i: CrmInteraction) => void
  onDelete:    (i: CrmInteraction) => void
}

export function InteractionCard({ interaction: i, onEdit, onDelete }: Props) {
  const Icon  = TYPE_ICONS[i.type] ?? FileText
  const color = TYPE_COLORS[i.type] ?? 'bg-gray-100 text-gray-700'

  const date = new Date(i.occurredAt).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = new Date(i.occurredAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors group">
      <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{i.subject}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {INTERACTION_TYPE_LABELS[i.type]}
              {i.direction === 'inbound' ? ' · příchozí' : i.direction === 'outbound' ? ' · odchozí' : ''}
              {i.durationMin ? ` · ${i.durationMin} min` : ''}
              {i.contact ? ` · ${i.contact.firstName} ${i.contact.lastName ?? ''}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs text-gray-400 whitespace-nowrap">{date} {time}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              <button onClick={() => onEdit(i)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(i)} className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {i.body && (
          <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{i.body}</p>
        )}
        {i.outcome && (
          <p className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-0.5 mt-1.5 inline-block">
            {i.outcome}
          </p>
        )}
        {i.createdBy && (
          <p className="text-xs text-gray-400 mt-1">Zaznamenal: {i.createdBy.name}</p>
        )}
      </div>
    </div>
  )
}
