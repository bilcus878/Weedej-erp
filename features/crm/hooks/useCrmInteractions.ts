'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchInteractions, createInteraction, updateInteraction, deleteInteraction } from '../services/crmService'
import type { CrmInteraction, CrmInteractionFormData, InteractionType } from '../types'

function todayIso() {
  return new Date().toISOString().slice(0, 16)
}

const emptyForm: CrmInteractionFormData = {
  type: 'call', direction: 'outbound', subject: '', body: '', outcome: '',
  occurredAt: todayIso(), durationMin: '', contactId: '',
}

export function useCrmInteractions(customerId: string) {
  const [interactions, setInteractions] = useState<CrmInteraction[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editing,      setEditing]      = useState<CrmInteraction | null>(null)
  const [formData,     setFormData]     = useState<CrmInteractionFormData>({ ...emptyForm, occurredAt: todayIso() })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setInteractions(await fetchInteractions(customerId))
    } catch {
      setError('Nepodařilo se načíst interakce')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => { refresh() }, [refresh])

  function openNew(defaultType?: InteractionType) {
    setEditing(null)
    setFormData({ ...emptyForm, occurredAt: todayIso(), type: defaultType ?? 'call' })
    setError(null)
    setShowForm(true)
  }

  function openEdit(i: CrmInteraction) {
    setEditing(i)
    setFormData({
      type: i.type, direction: i.direction ?? 'outbound',
      subject: i.subject, body: i.body ?? '', outcome: i.outcome ?? '',
      occurredAt: i.occurredAt.slice(0, 16), durationMin: i.durationMin?.toString() ?? '',
      contactId: i.contactId ?? '',
    })
    setError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setFormData({ ...emptyForm, occurredAt: todayIso() })
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const res = editing
        ? await updateInteraction(editing.id, formData)
        : await createInteraction(customerId, formData)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Nepodařilo se uložit interakci')
        return
      }
      await refresh()
      closeForm()
    } catch {
      setError('Nepodařilo se uložit interakci')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(i: CrmInteraction) {
    if (!confirm(`Smazat interakci "${i.subject}"?`)) return
    const res = await deleteInteraction(i.id)
    if (!res.ok) { alert('Nepodařilo se smazat interakci'); return }
    await refresh()
  }

  return { interactions, loading, showForm, editing, formData, setFormData, isSubmitting, error,
    openNew, openEdit, closeForm, handleSubmit, handleDelete, refresh }
}
