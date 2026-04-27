'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ShippingMethod, ShippingMethodDraft, ShippingProvider } from '../types'
import { fetchShippingMethods, updateShippingMethod, createShippingMethod, deleteShippingMethod } from '../services/shippingService'

const EMPTY_DRAFT: ShippingMethodDraft = {
  name: '', provider: 'custom', description: '', price: '0',
  freeThreshold: '', codFee: '0', estimatedDays: '2-3', note: '',
}

export function useShippingSettings() {
  const [methods,      setMethods]      = useState<ShippingMethod[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState<string | null>(null)  // id of row being saved
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [error,        setError]        = useState('')
  const [dirty,        setDirty]        = useState<Record<string, Partial<ShippingMethod>>>({})
  const [showAddForm,  setShowAddForm]  = useState(false)
  const [draft,        setDraft]        = useState<ShippingMethodDraft>({ ...EMPTY_DRAFT })
  const [creating,     setCreating]     = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setMethods(await fetchShippingMethods(false))
      setDirty({})
    } catch {
      setError('Nepodařilo se načíst metody dopravy')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function fieldChange(id: string, field: keyof ShippingMethod, raw: unknown) {
    let value: unknown = raw
    if (field === 'price' || field === 'codFee') value = raw === '' ? 0 : Number(raw)
    if (field === 'freeThreshold') value = raw === '' || raw === null ? null : Number(raw)
    if (field === 'isActive') value = Boolean(raw)
    setDirty(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  function isDirty(id: string) {
    return id in dirty
  }

  function localValue<K extends keyof ShippingMethod>(id: string, field: K, fallback: ShippingMethod[K]): ShippingMethod[K] {
    const d = dirty[id]
    if (!d || !(field in d)) return fallback
    return d[field] as ShippingMethod[K]
  }

  async function saveRow(id: string) {
    const changes = dirty[id]
    if (!changes) return
    setSaving(id)
    try {
      const updated = await updateShippingMethod(id, changes)
      setMethods(prev => prev.map(m => (m.id === id ? updated : m)))
      setDirty(prev => { const n = { ...prev }; delete n[id]; return n })
      showToast('Uloženo', 'ok')
    } catch (e: any) {
      showToast(e.message || 'Chyba při ukládání', 'err')
    } finally {
      setSaving(null)
    }
  }

  function cancelRow(id: string) {
    setDirty(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  async function toggleActive(id: string, current: boolean) {
    const next = !current
    setMethods(prev => prev.map(m => (m.id === id ? { ...m, isActive: next } : m)))
    try {
      await updateShippingMethod(id, { isActive: next })
      showToast(next ? 'Aktivováno' : 'Deaktivováno', 'ok')
    } catch {
      setMethods(prev => prev.map(m => (m.id === id ? { ...m, isActive: current } : m)))
      showToast('Chyba při změně stavu', 'err')
    }
  }

  async function handleCreate() {
    if (!draft.name.trim()) { showToast('Název metody je povinný', 'err'); return }
    const price = Number(draft.price)
    if (isNaN(price) || price < 0) { showToast('Zadejte platnou cenu', 'err'); return }
    setCreating(true)
    try {
      const created = await createShippingMethod({
        name:          draft.name.trim(),
        provider:      draft.provider as ShippingProvider,
        description:   draft.description.trim() || null,
        price,
        freeThreshold: draft.freeThreshold ? Number(draft.freeThreshold) : null,
        codFee:        Number(draft.codFee) || 0,
        isActive:      true,
        sortOrder:     (Math.max(0, ...methods.map(m => m.sortOrder)) + 10),
        estimatedDays: draft.estimatedDays.trim() || '2-3',
        note:          draft.note.trim() || null,
      })
      setMethods(prev => [...prev, created])
      setDraft({ ...EMPTY_DRAFT })
      setShowAddForm(false)
      showToast('Metoda dopravy vytvořena', 'ok')
    } catch (e: any) {
      showToast(e.message || 'Chyba při vytváření', 'err')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Opravdu smazat tuto metodu dopravy?')) return
    setDeleting(id)
    try {
      await deleteShippingMethod(id)
      setMethods(prev => prev.filter(m => m.id !== id))
      setDirty(prev => { const n = { ...prev }; delete n[id]; return n })
      showToast('Smazáno', 'ok')
    } catch (e: any) {
      showToast(e.message || 'Chyba při mazání', 'err')
    } finally {
      setDeleting(null)
    }
  }

  return {
    methods, loading, error, saving, deleting,
    dirty, isDirty, localValue, fieldChange,
    saveRow, cancelRow, toggleActive,
    showAddForm, setShowAddForm,
    draft, setDraft,
    creating, handleCreate, handleDelete,
    toast,
  }
}
