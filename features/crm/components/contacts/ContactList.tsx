'use client'

import { Plus } from 'lucide-react'
import { useCrmContacts } from '../../hooks/useCrmContacts'
import { ContactCard } from './ContactCard'
import { ContactForm } from './ContactForm'

interface Props { customerId: string }

export function ContactList({ customerId }: Props) {
  const crm = useCrmContacts(customerId)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Kontakty <span className="text-gray-400 font-normal">({crm.contacts.length})</span>
        </p>
        <button onClick={crm.openNew}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" />Nový kontakt
        </button>
      </div>

      {crm.loading ? (
        <p className="text-sm text-gray-400 py-4 text-center">Načítám...</p>
      ) : crm.contacts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">Žádné kontaktní osoby</p>
          <p className="text-xs mt-1">Přidejte kontakty na straně zákazníka</p>
        </div>
      ) : (
        <div className="space-y-2">
          {crm.contacts.map(c => (
            <ContactCard key={c.id} contact={c} onEdit={crm.openEdit} onDelete={crm.handleDelete} />
          ))}
        </div>
      )}

      {crm.showForm && (
        <ContactForm
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
