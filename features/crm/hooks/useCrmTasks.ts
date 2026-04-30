'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/crmService'
import type { CrmTask, CrmTaskFormData } from '../types'

const emptyForm: CrmTaskFormData = {
  title: '', description: '', type: 'follow_up', priority: 'normal',
  dueAt: '', assignedToId: '', contactId: '',
}

export function useCrmTasks(customerId: string) {
  const [tasks,        setTasks]        = useState<CrmTask[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editing,      setEditing]      = useState<CrmTask | null>(null)
  const [formData,     setFormData]     = useState<CrmTaskFormData>({ ...emptyForm })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setTasks(await fetchTasks(customerId))
    } catch {
      setError('Nepodařilo se načíst úkoly')
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

  function openEdit(t: CrmTask) {
    setEditing(t)
    setFormData({
      title: t.title, description: t.description ?? '',
      type: t.type, priority: t.priority,
      dueAt: t.dueAt ? t.dueAt.slice(0, 10) : '',
      assignedToId: t.assignedToId ?? '', contactId: t.contactId ?? '',
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
        ? await updateTask(editing.id, formData)
        : await createTask(customerId, formData)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Nepodařilo se uložit úkol')
        return
      }
      await refresh()
      closeForm()
    } catch {
      setError('Nepodařilo se uložit úkol')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function toggleStatus(task: CrmTask) {
    const next = task.status === 'done' ? 'open' : 'done'
    await updateTask(task.id, { status: next })
    await refresh()
  }

  async function handleDelete(t: CrmTask) {
    if (!confirm(`Smazat úkol "${t.title}"?`)) return
    const res = await deleteTask(t.id)
    if (!res.ok) { alert('Nepodařilo se smazat úkol'); return }
    await refresh()
  }

  const openTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const doneTasks = tasks.filter(t => t.status === 'done' || t.status === 'cancelled')

  return { tasks, openTasks, doneTasks, loading, showForm, editing, formData, setFormData,
    isSubmitting, error, openNew, openEdit, closeForm, handleSubmit, toggleStatus, handleDelete, refresh }
}
