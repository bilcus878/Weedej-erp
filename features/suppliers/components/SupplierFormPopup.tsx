'use client'

import { Truck } from 'lucide-react'
import { PartyFormModal } from '@/components/erp/PartyFormModal'
import type { PartyFormConfig } from '@/components/erp/PartyFormModal'
import type { useSupplierForm } from '../hooks/useSupplierForm'

const SUPPLIER_CONFIG: PartyFormConfig = {
  titleNew:               'Nový dodavatel',
  titleEdit:              'Upravit dodavatele',
  submitNew:              'Přidat dodavatele',
  nameLabelCompany:       'Název dodavatele',
  namePlaceholderCompany: 'Dodavatel s.r.o.',
  emailPlaceholder:       'info@dodavatel.cz',
  headerIcon:             Truck,
  accentColor:            'emerald',
  showWebsite:            true,
}

interface Props {
  form: ReturnType<typeof useSupplierForm>
}

export function SupplierFormPopup({ form }: Props) {
  const {
    showForm, editingSupplier, formData,
    isSubmitting, errorMessage,
    handleClose, handleSubmit, handleFieldChange,
  } = form

  return (
    <PartyFormModal
      open={showForm}
      onClose={handleClose}
      config={SUPPLIER_CONFIG}
      isEditing={!!editingSupplier}
      formData={formData}
      onChange={handleFieldChange}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
    />
  )
}
