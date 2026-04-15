'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import Input from '@/components/ui/Input'

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  ico?: string
  dic?: string
  bankAccount?: string
  website?: string
  contactPerson?: string
}

interface Supplier {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  ico?: string
  dic?: string
  bankAccount?: string
  website?: string
  contactPerson?: string
}

type Entity = Customer | Supplier

interface ManualData {
  name: string
  entityType: string // "company" nebo "individual"
  contactPerson: string
  email: string
  phone: string
  ico: string
  dic: string
  bankAccount: string
  website: string
  address: string
  note: string
}

interface CustomerSupplierSelectorProps {
  type: 'customer' | 'supplier'
  entities: Entity[]
  selectedId: string
  onSelectedIdChange: (id: string) => void
  manualData: ManualData
  onManualDataChange: (data: ManualData) => void
  isManual: boolean
  onIsManualChange: (isManual: boolean) => void
  isAnonymous: boolean
  onIsAnonymousChange: (isAnonymous: boolean) => void
  saveToDatabase: boolean
  onSaveToDatabaseChange: (save: boolean) => void
  required?: boolean
  label?: string
  /** Compact mode: only renders the select + toggle buttons, no expanded form */
  compact?: boolean
}

export default function CustomerSupplierSelector({
  type,
  entities,
  selectedId,
  onSelectedIdChange,
  manualData,
  onManualDataChange,
  isManual,
  onIsManualChange,
  isAnonymous,
  onIsAnonymousChange,
  saveToDatabase,
  onSaveToDatabaseChange,
  required = false,
  label,
  compact = false,
}: CustomerSupplierSelectorProps) {
  const entityLabel = label || (type === 'customer' ? 'Zákazník / Odběratel' : 'Dodavatel')
  const anonymousLabel = type === 'customer' ? 'Anonymní zákazník/odběratel' : 'Anonymní dodavatel'

  // Když se zaškrtne anonymní, vymaž manuální data a nastav výchozí hodnoty
  useEffect(() => {
    if (isAnonymous) {
      onManualDataChange({
        name: type === 'customer' ? 'Anonymní zákazník' : 'Anonymní dodavatel',
        entityType: 'company',
        contactPerson: '',
        email: '',
        phone: '',
        ico: '',
        dic: '',
        bankAccount: '',
        website: '',
        address: '',
        note: ''
      })
      onSelectedIdChange('')
      onIsManualChange(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnonymous])

  // Když se zaškrtne "Zadat ručně", vymaž select
  useEffect(() => {
    if (isManual && !isAnonymous) {
      onSelectedIdChange('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManual])

  // Když se vybere ze selectu, zruš manuální režim a anonymní
  const handleSelectChange = (id: string) => {
    onSelectedIdChange(id)
    if (id) {
      onIsManualChange(false)
      onIsAnonymousChange(false)
    }
  }

  // Aktualizuj manuální data
  const updateManualData = (field: keyof ManualData, value: string) => {
    onManualDataChange({
      ...manualData,
      [field]: value
    })
  }

  return (
    <div className="space-y-3">
      {/* Select + pill toggle tlačítka */}
      <div>
        {!compact && (
          <label className="block text-xs font-medium text-gray-500 mb-1">
            {entityLabel} {required && <span className="text-red-400">*</span>}
          </label>
        )}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={selectedId}
              onChange={(e) => handleSelectChange(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 pr-9 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isManual || isAnonymous}
              required={required && !isManual && !isAnonymous}
            >
              <option value="">
                {isManual ? '— ruční zadání —' : isAnonymous ? '— anonymní —' : `Vyberte ${type === 'customer' ? 'zákazníka' : 'dodavatele'}...`}
              </option>
              {entities.map(entity => (
                <option key={entity.id} value={entity.id}>{entity.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          {/* Toggle tlačítka — stejná výška jako select (h-10) */}
          <button
            type="button"
            onClick={() => { onIsManualChange(!isManual); if (!isManual) onIsAnonymousChange(false) }}
            disabled={isAnonymous}
            className={`h-10 px-3 text-xs rounded-md border transition-colors whitespace-nowrap font-medium ${
              isManual
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Ručně
          </button>
          <button
            type="button"
            onClick={() => { onIsAnonymousChange(!isAnonymous); if (!isAnonymous) onIsManualChange(false) }}
            disabled={isManual}
            className={`h-10 px-3 text-xs rounded-md border transition-colors whitespace-nowrap font-medium ${
              isAnonymous
                ? 'bg-gray-500 text-white border-gray-500'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Anon.
          </button>
        </div>
      </div>

      {/* Manuální formulář — skrytý v compact módu (parent ho renderuje sám) */}
      {!compact && isManual && !isAnonymous && (
        <div className="p-4 border rounded bg-gray-50 space-y-3">
          <h4 className="font-medium text-sm">Manuální údaje {type === 'customer' ? 'o odběrateli' : 'o dodavateli'}</h4>

          <div className="grid grid-cols-2 gap-3">
            {/* Přepínač Firma / Fyzická osoba */}
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-2">Typ subjektu *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="entityType"
                    value="company"
                    checked={manualData.entityType === 'company'}
                    onChange={(e) => updateManualData('entityType', e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">🏢 Firma</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="entityType"
                    value="individual"
                    checked={manualData.entityType === 'individual'}
                    onChange={(e) => updateManualData('entityType', e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">👤 Fyzická osoba</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                {manualData.entityType === 'individual' ? 'Jméno a příjmení *' : 'Název *'}
              </label>
              <Input
                value={manualData.name}
                onChange={(e) => updateManualData('name', e.target.value)}
                placeholder={manualData.entityType === 'individual' ? 'Jan Novák' : 'Název firmy'}
                required
              />
            </div>

            {manualData.entityType === 'company' && (
              <div>
                <label className="block text-xs font-medium mb-1">Kontaktní osoba</label>
                <Input
                  value={manualData.contactPerson}
                  onChange={(e) => updateManualData('contactPerson', e.target.value)}
                  placeholder="Jméno kontaktní osoby"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1">Email</label>
              <Input
                type="email"
                value={manualData.email}
                onChange={(e) => updateManualData('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Telefon</label>
              <Input
                value={manualData.phone}
                onChange={(e) => updateManualData('phone', e.target.value)}
                placeholder="+420 123 456 789"
              />
            </div>

            {manualData.entityType === 'company' && (
              <div>
                <label className="block text-xs font-medium mb-1">IČO</label>
                <Input
                  value={manualData.ico}
                  onChange={(e) => updateManualData('ico', e.target.value)}
                  placeholder="IČO"
                />
              </div>
            )}

            {manualData.entityType === 'company' && (
              <div>
                <label className="block text-xs font-medium mb-1">DIČ</label>
                <Input
                  value={manualData.dic}
                  onChange={(e) => updateManualData('dic', e.target.value)}
                  placeholder="DIČ"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1">Číslo účtu</label>
              <Input
                value={manualData.bankAccount}
                onChange={(e) => updateManualData('bankAccount', e.target.value)}
                placeholder="123456789/0100"
              />
            </div>

            {manualData.entityType === 'company' && (
              <div>
                <label className="block text-xs font-medium mb-1">Web</label>
                <Input
                  value={manualData.website}
                  onChange={(e) => updateManualData('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Adresa *</label>
              <Input
                value={manualData.address}
                onChange={(e) => updateManualData('address', e.target.value)}
                placeholder="Ulice, Město, PSČ"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Poznámka</label>
              <Input
                value={manualData.note}
                onChange={(e) => updateManualData('note', e.target.value)}
                placeholder="Volitelná poznámka..."
              />
            </div>
          </div>

          {/* Checkbox pro uložení do databáze */}
          <div className="pt-2 border-t">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToDatabase}
                onChange={(e) => onSaveToDatabaseChange(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">
                ✅ Uložit {type === 'customer' ? 'odběratele' : 'dodavatele'} do databáze
              </span>
            </label>
            <p className="text-xs text-gray-600 mt-1 ml-6">
              Po vytvoření objednávky bude {type === 'customer' ? 'odběratel' : 'dodavatel'} automaticky uložen pro budoucí použití
            </p>
          </div>
        </div>
      )}

      {/* Info pro anonymní režim — skrytý v compact módu */}
      {!compact && isAnonymous && (
        <div className="p-3 border rounded bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            ℹ️ {type === 'customer' ? 'Zákazník' : 'Dodavatel'} bude uložen jako "{type === 'customer' ? 'Anonymní zákazník' : 'Anonymní dodavatel'}" bez dalších údajů.
          </p>
        </div>
      )}
    </div>
  )
}
