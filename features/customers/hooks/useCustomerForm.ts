'use client'

import { useState } from 'react'
import { createCustomer, updateCustomer, deleteCustomer } from '../services/customerService'
import { emptyCustomerForm } from '../types'
import type { Customer, CustomerFormData } from '../types'
import type { PartyFormData } from '@/components/erp/PartyFormModal'

export function useCustomerForm(onRefresh: () => Promise<void>) {
  const [showForm,        setShowForm]        = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData,        setFormData]        = useState<CustomerFormData>({ ...emptyCustomerForm })
  const [isSubmitting,    setIsSubmitting]    = useState(false)
  const [errorMessage,    setErrorMessage]    = useState<string | null>(null)

  function handleOpenNew() {
    setEditingCustomer(null)
    setFormData({ ...emptyCustomerForm })
    setErrorMessage(null)
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
    setErrorMessage(null)
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditingCustomer(null)
    setFormData({ ...emptyCustomerForm })
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
      const res = editingCustomer
        ? await updateCustomer(editingCustomer.id, formData)
        : await createCustomer(formData)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErrorMessage(body.error || (editingCustomer ? 'Nepodařilo se upravit odběratele' : 'Nepodařilo se přidat odběratele'))
        return
      }
      await onRefresh()
      handleClose()
    } catch {
      setErrorMessage('Nepodařilo se uložit odběratele')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(customer: Customer) {
    if (!confirm(`Opravdu chceš smazat odběratele "${customer.name}"?`)) return
    try {
      const res = await deleteCustomer(customer.id)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert(body.error || 'Nepodařilo se smazat odběratele')
      } else {
        await onRefresh()
      }
    } catch {
      alert('Nepodařilo se smazat odběratele')
    }
  }

  return {
    showForm, editingCustomer,
    formData,
    isSubmitting, errorMessage,
    handleOpenNew, handleEdit, handleClose, handleSubmit, handleDelete,
    handleFieldChange,
  }
}
