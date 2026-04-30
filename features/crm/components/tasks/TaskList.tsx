'use client'

import { Plus } from 'lucide-react'
import { useCrmTasks } from '../../hooks/useCrmTasks'
import { TaskCard } from './TaskCard'
import { TaskForm } from './TaskForm'

interface Props { customerId: string }

export function TaskList({ customerId }: Props) {
  const crm = useCrmTasks(customerId)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Úkoly
          <span className="text-gray-400 font-normal ml-1">
            ({crm.openTasks.length} otevřených{crm.doneTasks.length > 0 ? `, ${crm.doneTasks.length} hotových` : ''})
          </span>
        </p>
        <button
          onClick={crm.openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />Nový úkol
        </button>
      </div>

      {crm.loading ? (
        <p className="text-sm text-gray-400 py-4 text-center">Načítám...</p>
      ) : crm.tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">Žádné úkoly</p>
          <p className="text-xs mt-1">Přidejte úkol pro sledování následných kroků</p>
        </div>
      ) : (
        <div className="space-y-2">
          {crm.openTasks.map(t => (
            <TaskCard key={t.id} task={t} onEdit={crm.openEdit} onDelete={crm.handleDelete} onToggle={crm.toggleStatus} />
          ))}
          {crm.doneTasks.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-2">Dokončeno</p>
              {crm.doneTasks.map(t => (
                <TaskCard key={t.id} task={t} onEdit={crm.openEdit} onDelete={crm.handleDelete} onToggle={crm.toggleStatus} />
              ))}
            </>
          )}
        </div>
      )}

      {crm.showForm && (
        <TaskForm
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
