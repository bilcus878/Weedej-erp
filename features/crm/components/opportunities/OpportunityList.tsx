'use client'

import { Plus } from 'lucide-react'
import { useCrmOpportunities } from '../../hooks/useCrmOpportunities'
import { OpportunityCard } from './OpportunityCard'
import { OpportunityForm } from './OpportunityForm'

interface Props { customerId: string }

export function OpportunityList({ customerId }: Props) {
  const crm = useCrmOpportunities(customerId)

  const active = crm.opportunities.filter(o => !['won', 'lost'].includes(o.stage))
  const closed = crm.opportunities.filter(o => ['won', 'lost'].includes(o.stage))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Příležitosti <span className="text-gray-400 font-normal">({crm.opportunities.length})</span>
        </p>
        <button onClick={crm.openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
          <Plus className="w-3.5 h-3.5" />Nová příležitost
        </button>
      </div>

      {crm.loading ? (
        <p className="text-sm text-gray-400 py-4 text-center">Načítám...</p>
      ) : crm.opportunities.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">Žádné obchodní příležitosti</p>
          <p className="text-xs mt-1">Sledujte potenciální obchody a jejich postup</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(o => (
            <OpportunityCard key={o.id} opportunity={o} onEdit={crm.openEdit} onDelete={crm.handleDelete} onMoveStage={crm.moveStage} />
          ))}
          {closed.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-2">Uzavřeno</p>
              {closed.map(o => (
                <OpportunityCard key={o.id} opportunity={o} onEdit={crm.openEdit} onDelete={crm.handleDelete} onMoveStage={crm.moveStage} />
              ))}
            </>
          )}
        </div>
      )}

      {crm.showForm && (
        <OpportunityForm
          formData={crm.formData}
          setFormData={crm.setFormData}
          onSubmit={crm.handleSubmit}
          onClose={crm.closeForm}
          isEditing={!!crm.editing}
          isSubmitting={crm.isSubmitting}
          error={crm.error}
        />
      )}
    </div>
  )
}
