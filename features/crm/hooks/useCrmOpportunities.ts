'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity } from '../services/crmService'
import type { CrmOpportunity, CrmOpportunityFormData } from '../types'

const emptyForm: CrmOpportunityFormData = {
  title: '', description: '', value: '', currency: 'CZK',
  probability: '', stage: 'lead', expectedCloseAt: '', ownerId: '',
}

export function useCrmOpportunities(customerId: string) {
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([])
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [editing,       setEditing]       = useState<CrmOpportunity | null>(null)
  const [formData,      setFormData]      = useState<CrmOpportunityFormData>({ ...emptyForm })
  const [isSubmitting,  setIsSubmitting]  = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setOpportunities(await fetchOpportunities(customerId))
    } catch {
      setError('Nepodařilo se načíst příležitosti')
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

  function openEdit(o: CrmOpportunity) {
    setEditing(o)
    setFormData({
      title: o.title, description: o.description ?? '',
      value: o.value?.toString() ?? '', currency: o.currency,
      probability: o.probability?.toString() ?? '',
      stage: o.stage, expectedCloseAt: o.expectedCloseAt?.slice(0, 10) ?? '',
      ownerId: o.ownerId ?? '',
    })
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
        ? await updateOpportunity(editing.id, formData)
        : await createOpportunity(customerId, formData)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Nepodařilo se uložit příležitost')
        return
      }
      await refresh()
      closeForm()
    } catch {
      setError('Nepodařilo se uložit příležitost')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function moveStage(opp: CrmOpportunity, stage: string) {
    await updateOpportunity(opp.id, { stage } as any)
    await refresh()
  }

  async function handleDelete(o: CrmOpportunity) {
    if (!confirm(`Smazat příležitost "${o.title}"?`)) return
    const res = await deleteOpportunity(o.id)
    if (!res.ok) { alert('Nepodařilo se smazat příležitost'); return }
    await refresh()
  }

  return { opportunities, loading, showForm, editing, formData, setFormData, isSubmitting, error,
    openNew, openEdit, closeForm, handleSubmit, moveStage, handleDelete, refresh }
}
