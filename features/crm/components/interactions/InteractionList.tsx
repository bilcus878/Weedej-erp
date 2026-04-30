'use client'

import { Plus } from 'lucide-react'
import { useCrmInteractions } from '../../hooks/useCrmInteractions'
import { InteractionCard } from './InteractionCard'
import { InteractionForm } from './InteractionForm'

interface Props { customerId: string }

export function InteractionList({ customerId }: Props) {
  const crm = useCrmInteractions(customerId)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Interakce <span className="text-gray-400 font-normal">({crm.interactions.length})</span>
        </p>
        <button
          onClick={() => crm.openNew()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />Přidat interakci
        </button>
      </div>

      {crm.loading ? (
        <p className="text-sm text-gray-400 py-4 text-center">Načítám...</p>
      ) : crm.interactions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">Zatím žádné interakce</p>
          <p className="text-xs mt-1">Zaznamenejte hovor, email nebo schůzku</p>
        </div>
      ) : (
        <div className="space-y-2">
          {crm.interactions.map(i => (
            <InteractionCard key={i.id} interaction={i} onEdit={crm.openEdit} onDelete={crm.handleDelete} />
          ))}
        </div>
      )}

      {crm.showForm && (
        <InteractionForm
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
