'use client'

import { Users } from 'lucide-react'
import { PartyFormModal } from '@/components/erp/PartyFormModal'
import type { PartyFormConfig } from '@/components/erp/PartyFormModal'
import type { useCustomerForm } from '../hooks/useCustomerForm'

const CUSTOMER_CONFIG: PartyFormConfig = {
  titleNew:               'Nový odběratel',
  titleEdit:              'Upravit odběratele',
  submitNew:              'Přidat odběratele',
  nameLabelCompany:       'Název odběratele',
  namePlaceholderCompany: 'Odběratel s.r.o.',
  emailPlaceholder:       'info@odberatel.cz',
  headerIcon:             Users,
  accentColor:            'blue',
  showWebsite:            false,
}

interface Props {
  form: ReturnType<typeof useCustomerForm>
}

export function CustomerFormPopup({ form }: Props) {
  const {
    showForm, editingCustomer, formData,
    isSubmitting, errorMessage,
    handleClose, handleSubmit, handleFieldChange,
  } = form

  return (
    <PartyFormModal
      open={showForm}
      onClose={handleClose}
      config={CUSTOMER_CONFIG}
      isEditing={!!editingCustomer}
      formData={formData}
      onChange={handleFieldChange}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
    />
  )
}
