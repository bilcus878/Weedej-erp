'use client'

import { useState } from 'react'
import { createSupplier, updateSupplier, deleteSupplier } from '../services/supplierService'
import { emptySupplierForm } from '../types'
import type { Supplier, SupplierFormData } from '../types'
import type { PartyFormData } from '@/components/erp/PartyFormModal'

export function useSupplierForm(onRefresh: () => Promise<void>) {
  const [showForm,        setShowForm]        = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData,        setFormData]        = useState<SupplierFormData>({ ...emptySupplierForm })
  const [isSubmitting,    setIsSubmitting]    = useState(false)
  const [errorMessage,    setErrorMessage]    = useState<string | null>(null)

  function handleOpenNew() {
    setEditingSupplier(null)
    setFormData({ ...emptySupplierForm })
    setErrorMessage(null)
    setShowForm(true)
  }

  function handleEdit(supplier: Supplier) {
    setEditingSupplier(supplier)
    setFormData({
      name:        supplier.name,
      entityType:  supplier.entityType  || 'company',
      contact:     supplier.contact     || '',
      email:       supplier.email       || '',
      phone:       supplier.phone       || '',
      ico:         supplier.ico         || '',
      dic:         supplier.dic         || '',
      bankAccount: supplier.bankAccount || '',
      website:     supplier.website     || '',
      address:     supplier.address     || '',
      note:        supplier.note        || '',
    })
    setErrorMessage(null)
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditingSupplier(null)
    setFormData({ ...emptySupplierForm })
    setErrorMessage(null)
  }

  function handleFieldChange(field: keyof PartyFormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const res = editingSupplier
        ? await updateSupplier(editingSupplier.id, formData)
        : await createSupplier(formData)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErrorMessage(body.error || (editingSupplier ? 'Nepodařilo se upravit dodavatele' : 'Nepodařilo se přidat dodavatele'))
        return
      }
      await onRefresh()
      handleClose()
    } catch {
      setErrorMessage('Nepodařilo se uložit dodavatele')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(supplier: Supplier) {
    if (!confirm(`Opravdu chceš smazat dodavatele "${supplier.name}"?`)) return
    try {
      const res = await deleteSupplier(supplier.id)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error || 'Nepodařilo se smazat dodavatele')
      } else {
        await onRefresh()
      }
    } catch {
      alert('Nepodařilo se smazat dodavatele')
    }
  }

  return {
    showForm, editingSupplier,
    formData,
    isSubmitting, errorMessage,
    handleOpenNew, handleEdit, handleClose, handleSubmit, handleDelete,
    handleFieldChange,
  }
}
