'use client'

import { CheckCircle, Circle, Edit2, Trash2, AlertCircle, Clock } from 'lucide-react'
import type { CrmTask } from '../../types'
import { TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '../../types'

const PRIORITY_COLORS: Record<string, string> = {
  low:    'text-gray-500 bg-gray-100',
  normal: 'text-blue-600 bg-blue-50',
  high:   'text-orange-600 bg-orange-50',
  urgent: 'text-red-600 bg-red-50',
}

interface Props {
  task:         CrmTask
  onEdit:       (t: CrmTask) => void
  onDelete:     (t: CrmTask) => void
  onToggle:     (t: CrmTask) => void
}

export function TaskCard({ task: t, onEdit, onDelete, onToggle }: Props) {
  const isDone     = t.status === 'done'
  const isOverdue  = !isDone && t.dueAt && new Date(t.dueAt) < new Date()
  const dueDate    = t.dueAt ? new Date(t.dueAt).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' }) : null
  const priorityCl = PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.normal

  return (
    <div className={`flex gap-3 p-3 rounded-lg border transition-colors group ${isDone ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
      <button
        onClick={() => onToggle(t)}
        className={`mt-0.5 flex-shrink-0 transition-colors ${isDone ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-500'}`}
      >
        {isDone ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-sm font-medium truncate ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {t.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {TASK_TYPE_LABELS[t.type]}
              {t.assignedTo ? ` · ${t.assignedTo.name}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {dueDate && (
              <span className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${isOverdue ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-100'}`}>
                {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {dueDate}
              </span>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityCl}`}>
              {TASK_PRIORITY_LABELS[t.priority]}
            </span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              <button onClick={() => onEdit(t)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onDelete(t)} className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        {t.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{t.description}</p>}
      </div>
    </div>
  )
}
