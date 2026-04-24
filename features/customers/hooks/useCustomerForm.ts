'use client'

import { useState } from 'react'
import { createCustomer, updateCustomer, deleteCustomer } from '../services/customerService'
import { emptyCustomerForm } from '../types'
import type { Customer, CustomerFormData } from '../types'

export function useCustomerForm(onRefresh: () => Promise<void>) {
  const [showForm,        setShowForm]        = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData,        setFormData]        = useState<CustomerFormData>({ ...emptyCustomerForm })

  function handleOpenNew() {
    setEditingCustomer(null)
    setFormData({ ...emptyCustomerForm })
    setShowForm(true)
  }

  function handleEdit(customer: Customer) {
    setEditingCustomer(customer)
    setFormData({
      name:        customer.name,
      entityType:  customer.entityType  || 'company',
      contact:     customer.contact     || '',
      email:       customer.email       || '',
      phone:       customer.phone       || '',
      ico:         customer.ico         || '',
      dic:         customer.dic         || '',
      bankAccount: customer.bankAccount || '',
      website:     customer.website     || '',
      address:     customer.address     || '',
      note:        customer.note        || '',
    })
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditingCustomer(null)
    setFormData({ ...emptyCustomerForm })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = editingCustomer
        ? await updateCustomer(editingCustomer.id, formData)
        : await createCustomer(formData)
      if (!res.ok) { alert(editingCustomer ? 'Nepodařilo se upravit odběratele' : 'Nepodařilo se přidat odběratele'); return }
      await onRefresh()
      handleClose()
    } catch {
      alert('Nepodařilo se uložit odběratele')
    }
  }

  async function handleDelete(customer: Customer) {
    if (!confirm(`Opravdu chceš smazat odběratele "${customer.name}"?`)) return
    try {
      const res = await deleteCustomer(customer.id)
      if (res.ok) await onRefresh()
      else alert('Nepodařilo se smazat odběratele')
    } catch {
      alert('Nepodařilo se smazat odběratele')
    }
  }

  return {
    showForm, editingCustomer,
    formData, setFormData,
    handleOpenNew, handleEdit, handleClose, handleSubmit, handleDelete,
  }
}
