'use client'

import { User, Mail, Phone, Star, Edit2, Trash2 } from 'lucide-react'
import type { CrmContact } from '../../types'

interface Props {
  contact:  CrmContact
  onEdit:   (c: CrmContact) => void
  onDelete: (c: CrmContact) => void
}

export function ContactCard({ contact: c, onEdit, onDelete }: Props) {
  const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ')

  return (
    <div className="flex gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors group">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
        <User className="w-4 h-4 text-indigo-600" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
              {fullName}
              {c.isPrimary && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
            </p>
            {c.role && <p className="text-xs text-gray-500">{c.role}</p>}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(c)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(c)} className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          {c.email && (
            <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Mail className="w-3 h-3" />{c.email}
            </a>
          )}
          {c.phone && (
            <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Phone className="w-3 h-3" />{c.phone}
            </a>
          )}
        </div>
        {c.note && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{c.note}</p>}
      </div>
    </div>
  )
}
