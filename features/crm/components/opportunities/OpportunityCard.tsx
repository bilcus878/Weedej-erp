'use client'

import { TrendingUp, Edit2, Trash2, ChevronRight } from 'lucide-react'
import type { CrmOpportunity, OpportunityStage } from '../../types'
import { OPPORTUNITY_STAGE_LABELS } from '../../types'

const STAGE_COLORS: Record<OpportunityStage, string> = {
  lead:        'bg-gray-100 text-gray-600',
  qualified:   'bg-blue-100 text-blue-700',
  proposal:    'bg-indigo-100 text-indigo-700',
  negotiation: 'bg-purple-100 text-purple-700',
  won:         'bg-emerald-100 text-emerald-700',
  lost:        'bg-red-100 text-red-600',
}

const STAGES: OpportunityStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

interface Props {
  opportunity: CrmOpportunity
  onEdit:      (o: CrmOpportunity) => void
  onDelete:    (o: CrmOpportunity) => void
  onMoveStage: (o: CrmOpportunity, stage: string) => void
}

export function OpportunityCard({ opportunity: o, onEdit, onDelete, onMoveStage }: Props) {
  const stageCl = STAGE_COLORS[o.stage] ?? STAGE_COLORS.lead
  const isWon   = o.stage === 'won'
  const isLost  = o.stage === 'lost'
  const isClosed = isWon || isLost

  const closeDate = o.expectedCloseAt
    ? new Date(o.expectedCloseAt).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const nextStage = STAGES[STAGES.indexOf(o.stage) + 1]

  return (
    <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2.5 min-w-0">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{o.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {o.value ? `${Number(o.value).toLocaleString('cs-CZ')} ${o.currency}` : 'Hodnota neuvedena'}
              {o.probability != null ? ` · ${o.probability} %` : ''}
              {closeDate ? ` · Do ${closeDate}` : ''}
              {o.owner ? ` · ${o.owner.name}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageCl}`}>
            {OPPORTUNITY_STAGE_LABELS[o.stage]}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(o)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(o)} className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {!isClosed && nextStage && (
        <div className="mt-2 pl-10">
          <button
            onClick={() => onMoveStage(o, nextStage)}
            className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            Přesunout na: {OPPORTUNITY_STAGE_LABELS[nextStage]}
          </button>
        </div>
      )}
    </div>
  )
}
