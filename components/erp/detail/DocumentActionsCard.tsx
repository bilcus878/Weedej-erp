'use client'

import React        from 'react'
import { Zap }      from 'lucide-react'
import { ERPSectionCard } from './ERPSectionCard'

export interface DocumentAction {
  label:      string
  icon?:      React.ReactNode
  onClick:    () => void
  variant?:   'primary' | 'secondary' | 'danger' | 'ghost'
  disabled?:  boolean
  hidden?:    boolean
}

export interface DocumentActionsCardProps {
  actions:    DocumentAction[]
  title?:     string
  isLoading?: boolean
}

const VARIANT_CLASSES: Record<NonNullable<DocumentAction['variant']>, string> = {
  primary:   'bg-indigo-600 hover:bg-indigo-700 text-white',
  secondary: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
  danger:    'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200',
  ghost:     'hover:bg-gray-100 text-gray-600',
}

export function DocumentActionsCard({ actions, title = 'Akce', isLoading = false }: DocumentActionsCardProps) {
  const visible = actions.filter(a => !a.hidden)

  return (
    <ERPSectionCard title={title} icon={<Zap />} isLoading={isLoading}>
      <div className="flex flex-col gap-2">
        {visible.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">Žádné dostupné akce</p>
        ) : (
          visible.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              disabled={action.disabled}
              className={[
                'flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                VARIANT_CLASSES[action.variant ?? 'secondary'],
              ].join(' ')}
            >
              {action.icon && <span className="w-4 h-4 shrink-0" aria-hidden="true">{action.icon}</span>}
              {action.label}
            </button>
          ))
        )}
      </div>
    </ERPSectionCard>
  )
}
