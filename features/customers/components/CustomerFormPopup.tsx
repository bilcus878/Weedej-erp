'use client'

import Button from '@/components/ui/Button'
import Input  from '@/components/ui/Input'
import { CreateOrderPopup } from '@/components/warehouse/create/CreateOrderPopup'
import type { useCustomerForm } from '../hooks/useCustomerForm'

interface Props {
  form: ReturnType<typeof useCustomerForm>
  hideTrigger?: boolean
}

export function CustomerFormPopup({ form, hideTrigger }: Props) {
  const { showForm, editingCustomer, formData, setFormData, handleOpenNew, handleClose, handleSubmit } = form

  return (
    <CreateOrderPopup
      title={editingCustomer ? 'Upravit odběratele' : 'Nový odběratel'}
      open={showForm}
      onOpen={handleOpenNew}
      onClose={handleClose}
      hideTrigger={hideTrigger}
    >
      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-200">
            <h3 className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Základní údaje</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Typ subjektu *</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="entityType" value="company"
                    checked={formData.entityType === 'company'}
                    onChange={e => setFormData({ ...formData, entityType: e.target.value })} className="w-4 h-4" />
                  <span className="text-sm">🏢 Firma</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="entityType" value="individual"
                    checked={formData.entityType === 'individual'}
                    onChange={e => setFormData({ ...formData, entityType: e.target.value })} className="w-4 h-4" />
                  <span className="text-sm">👤 Fyzická osoba</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.entityType === 'individual' ? 'Jméno a příjmení' : 'Název odběratele'} *
              </label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={formData.entityType === 'individual' ? 'Jan Novák' : 'Odběratel s.r.o.'} required />
            </div>
            {formData.entityType === 'company' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kontaktní osoba</label>
                <Input value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} placeholder="Jan Novák" />
              </div>
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-blue-50 px-4 py-2.5 border-b border-blue-200">
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Kontaktní údaje</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="info@odberatel.cz" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <Input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+420 123 456 789" />
            </div>
            {formData.entityType === 'company' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Web</label>
                <Input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://www.odberatel.cz" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresa *</label>
              <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Ulice 123, 110 00 Praha 1" required />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-green-50 px-4 py-2.5 border-b border-green-200">
            <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide">Finanční údaje</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            {formData.entityType === 'company' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IČO</label>
                <Input value={formData.ico} onChange={e => setFormData({ ...formData, ico: e.target.value })} placeholder="12345678" />
              </div>
            )}
            {formData.entityType === 'company' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DIČ</label>
                <Input value={formData.dic} onChange={e => setFormData({ ...formData, dic: e.target.value })} placeholder="CZ12345678" />
              </div>
            )}
            <div className={formData.entityType === 'company' ? '' : 'col-span-2'}>
              <label className="block text-sm font-medium text-gray-700 mb-1">Číslo účtu</label>
              <Input value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} placeholder="123456789/0100" />
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-200">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Poznámka</h3>
          </div>
          <div className="p-4">
            <Input value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder="Volitelná poznámka..." />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Zrušit</Button>
          <Button type="submit">{editingCustomer ? 'Uložit změny' : 'Přidat odběratele'}</Button>
        </div>
      </form>
    </CreateOrderPopup>
  )
}
