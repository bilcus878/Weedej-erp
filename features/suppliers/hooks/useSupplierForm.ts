'use client'

import { useState } from 'react'
import { createSupplier, updateSupplier, deleteSupplier } from '../services/supplierService'
import { emptySupplierForm } from '../types'
import type { Supplier, SupplierFormData } from '../types'

export function useSupplierForm(onRefresh: () => Promise<void>) {
  const [showForm,        setShowForm]        = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [formData,        setFormData]        = useState<SupplierFormData>({ ...emptySupplierForm })

  function handleOpenNew() {
    setEditingSupplier(null)
    setFormData({ ...emptySupplierForm })
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
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditingSupplier(null)
    setFormData({ ...emptySupplierForm })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = editingSupplier
        ? await updateSupplier(editingSupplier.id, formData)
        : await createSupplier(formData)
      if (!res.ok) { alert(editingSupplier ? 'Nepodařilo se upravit dodavatele' : 'Nepodařilo se přidat dodavatele'); return }
      await onRefresh()
      handleClose()
    } catch {
      alert('Nepodařilo se uložit dodavatele')
    }
  }

  async function handleDelete(supplier: Supplier) {
    if (!confirm(`Opravdu chceš smazat dodavatele "${supplier.name}"?`)) return
    try {
      const res = await deleteSupplier(supplier.id)
      if (res.ok) await onRefresh()
      else alert('Nepodařilo se smazat dodavatele')
    } catch {
      alert('Nepodařilo se smazat dodavatele')
    }
  }

  return {
    showForm, editingSupplier,
    formData, setFormData,
    handleOpenNew, handleEdit, handleClose, handleSubmit, handleDelete,
  }
}
