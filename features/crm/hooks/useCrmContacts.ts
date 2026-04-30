'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchContacts, createContact, updateContact, deleteContact } from '../services/crmService'
import type { CrmContact, CrmContactFormData } from '../types'

const emptyForm: CrmContactFormData = {
  firstName: '', lastName: '', role: '', email: '', phone: '', isPrimary: false, note: '',
}

export function useCrmContacts(customerId: string) {
  const [contacts,     setContacts]     = useState<CrmContact[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editing,      setEditing]      = useState<CrmContact | null>(null)
  const [formData,     setFormData]     = useState<CrmContactFormData>({ ...emptyForm })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setContacts(await fetchContacts(customerId))
    } catch {
      setError('Nepodařilo se načíst kontakty')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => { refresh() }, [refresh])

  function openNew() {
    setEditing(null)
    setFormData({ ...emptyForm })
    setError(null)
    setShowForm(true)
  }

  function openEdit(c: CrmContact) {
    setEditing(c)
    setFormData({ firstName: c.firstName, lastName: c.lastName ?? '', role: c.role ?? '',
      email: c.email ?? '', phone: c.phone ?? '', isPrimary: c.isPrimary, note: c.note ?? '' })
    setError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setFormData({ ...emptyForm })
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const res = editing
        ? await updateContact(editing.id, formData)
        : await createContact(customerId, formData)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Nepodařilo se uložit kontakt')
        return
      }
      await refresh()
      closeForm()
    } catch {
      setError('Nepodařilo se uložit kontakt')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(c: CrmContact) {
    if (!confirm(`Smazat kontakt "${c.firstName} ${c.lastName ?? ''}"?`)) return
    const res = await deleteContact(c.id)
    if (!res.ok) { alert('Nepodařilo se smazat kontakt'); return }
    await refresh()
  }

  return { contacts, loading, showForm, editing, formData, setFormData, isSubmitting, error,
    openNew, openEdit, closeForm, handleSubmit, handleDelete, refresh }
}
