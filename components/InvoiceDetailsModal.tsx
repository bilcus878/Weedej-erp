'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { X, FileText, ChevronDown, ChevronRight } from 'lucide-react'

interface InvoiceDetails {
  invoiceDate?: string
  dueDate?: string
  expectedDeliveryDate?: string
  paymentType?: string
  variableSymbol?: string
  constantSymbol?: string
  specificSymbol?: string
  note?: string
  supplierName?: string
  supplierEntityType?: string
  supplierContactPerson?: string
  supplierEmail?: string
  supplierPhone?: string
  supplierIco?: string
  supplierDic?: string
  supplierBankAccount?: string
  supplierWebsite?: string
  supplierAddress?: string
  supplierNote?: string
}

interface InvoiceDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (details: InvoiceDetails) => Promise<void>
  onSaveAsSupplier?: (details: InvoiceDetails) => Promise<void>
  initialData?: InvoiceDetails
  type: 'received' | 'issued'
}

export default function InvoiceDetailsModal({
  isOpen,
  onClose,
  onSave,
  onSaveAsSupplier,
  initialData,
  type
}: InvoiceDetailsModalProps) {
  const [formData, setFormData] = useState<InvoiceDetails>({
    invoiceDate: '',
    dueDate: '',
    expectedDeliveryDate: '',
    paymentType: '',
    variableSymbol: '',
    constantSymbol: '',
    specificSymbol: '',
    note: '',
    supplierName: '',
    supplierEntityType: 'company',
    supplierContactPerson: '',
    supplierEmail: '',
    supplierPhone: '',
    supplierIco: '',
    supplierDic: '',
    supplierBankAccount: '',
    supplierWebsite: '',
    supplierAddress: '',
    supplierNote: ''
  })
  const [saving, setSaving] = useState(false)
  const [isSupplierSectionExpanded, setIsSupplierSectionExpanded] = useState(false)

  // Načti iniciální data když se otevře modal
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        invoiceDate: initialData.invoiceDate || '',
        dueDate: initialData.dueDate || '',
        expectedDeliveryDate: initialData.expectedDeliveryDate || '',
        paymentType: initialData.paymentType || '',
        variableSymbol: initialData.variableSymbol || '',
        constantSymbol: initialData.constantSymbol || '',
        specificSymbol: initialData.specificSymbol || '',
        note: initialData.note || '',
        supplierName: initialData.supplierName || '',
        supplierEntityType: initialData.supplierEntityType || 'company',
        supplierContactPerson: initialData.supplierContactPerson || '',
        supplierEmail: initialData.supplierEmail || '',
        supplierPhone: initialData.supplierPhone || '',
        supplierIco: initialData.supplierIco || '',
        supplierDic: initialData.supplierDic || '',
        supplierBankAccount: initialData.supplierBankAccount || '',
        supplierWebsite: initialData.supplierWebsite || '',
        supplierAddress: initialData.supplierAddress || '',
        supplierNote: initialData.supplierNote || ''
      })
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Chyba při ukládání:', error)
      alert('Nepodařilo se uložit údaje')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAsSupplier = async () => {
    if (!onSaveAsSupplier) return

    if (!formData.supplierName) {
      alert('Vyplňte alespoň název dodavatele')
      return
    }

    setSaving(true)
    try {
      await onSaveAsSupplier(formData)
      alert('Dodavatel byl uložen')
    } catch (error: any) {
      console.error('Chyba při ukládání dodavatele:', error)
      alert(error.message || 'Nepodařilo se uložit dodavatele')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof InvoiceDetails, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header s gradientem */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-5 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-7 h-7" />
              <div>
                <h2 className="text-2xl font-bold">Doplnit fakturu</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Vyplňte platební údaje a informace o {type === 'received' ? 'dodavateli' : 'odběrateli'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white transition-colors"
            >
              <X className="w-7 h-7" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Platební údaje */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border-l-4 border-green-500 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Platební údaje
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Datum vystavení faktury <span className="text-orange-600 text-xs">(datum na fyzické faktuře)</span>
                </label>
                <Input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => updateField('invoiceDate', e.target.value)}
                  className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Datum splatnosti</label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => updateField('dueDate', e.target.value)}
                  className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Očekávané dodání <span className="text-gray-500 text-xs">(kdy zboží dorazí)</span>
                </label>
                <Input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => updateField('expectedDeliveryDate', e.target.value)}
                  className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Forma úhrady</label>
                <select
                  value={formData.paymentType}
                  onChange={(e) => updateField('paymentType', e.target.value)}
                  className="w-full border-2 border-green-200 rounded-lg px-3 py-2 bg-white focus:border-green-400 focus:ring-2 focus:ring-green-200 transition-all"
                >
                  <option value="">Vyberte</option>
                  <option value="cash">Hotově</option>
                  <option value="card">Kartou</option>
                  <option value="transfer">Bankovní převod</option>
                </select>
              </div>

              {formData.paymentType === 'transfer' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Variabilní symbol</label>
                    <Input
                      value={formData.variableSymbol}
                      onChange={(e) => updateField('variableSymbol', e.target.value)}
                      placeholder="VS"
                      className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Konstantní symbol</label>
                    <Input
                      value={formData.constantSymbol}
                      onChange={(e) => updateField('constantSymbol', e.target.value)}
                      placeholder="KS"
                      className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Specifický symbol</label>
                    <Input
                      value={formData.specificSymbol}
                      onChange={(e) => updateField('specificSymbol', e.target.value)}
                      placeholder="SS"
                      className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                    />
                  </div>
                </>
              )}

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Poznámka k faktuře</label>
                <Input
                  value={formData.note}
                  onChange={(e) => updateField('note', e.target.value)}
                  placeholder="Volitelná poznámka k faktuře..."
                  className="bg-white border-green-200 focus:border-green-400 focus:ring-green-400"
                />
              </div>
            </div>
          </div>

          {/* Údaje o dodavateli/odběrateli */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-l-4 border-purple-500 shadow-sm">
            <button
              type="button"
              onClick={() => setIsSupplierSectionExpanded(!isSupplierSectionExpanded)}
              className="w-full p-5 flex items-center justify-between hover:bg-purple-100 transition-colors rounded-lg"
            >
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Údaje o {type === 'received' ? 'dodavateli' : 'odběrateli'}
              </h3>
              {isSupplierSectionExpanded ? (
                <ChevronDown className="w-6 h-6 text-purple-600" />
              ) : (
                <ChevronRight className="w-6 h-6 text-purple-600" />
              )}
            </button>

            {isSupplierSectionExpanded && (
              <div className="px-5 pb-5">
                <div className="grid grid-cols-2 gap-4">
              {/* Typ entity */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Typ subjektu</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="company"
                      checked={formData.supplierEntityType === 'company'}
                      onChange={(e) => updateField('supplierEntityType', e.target.value)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm">🏢 Firma</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="individual"
                      checked={formData.supplierEntityType === 'individual'}
                      onChange={(e) => updateField('supplierEntityType', e.target.value)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm">👤 Fyzická osoba</span>
                  </label>
                </div>
              </div>

              {/* Název */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Název {formData.supplierEntityType === 'individual' ? '(Jméno a příjmení)' : ''}
                </label>
                <Input
                  value={formData.supplierName}
                  onChange={(e) => updateField('supplierName', e.target.value)}
                  placeholder={formData.supplierEntityType === 'individual' ? 'Jan Novák' : 'Název firmy'}
                  className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                />
              </div>

              {/* Kontaktní osoba (jen pro firmy) */}
              {formData.supplierEntityType === 'company' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kontaktní osoba</label>
                  <Input
                    value={formData.supplierContactPerson}
                    onChange={(e) => updateField('supplierContactPerson', e.target.value)}
                    placeholder="Jméno"
                    className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                  />
                </div>
              )}

              {/* Email (pro FO na prvním řádku, pro firmu později) */}
              {formData.supplierEntityType === 'individual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <Input
                    type="email"
                    value={formData.supplierEmail}
                    onChange={(e) => updateField('supplierEmail', e.target.value)}
                    placeholder="email@example.com"
                    className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                  />
                </div>
              )}

              {/* Adresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresa</label>
                <Input
                  value={formData.supplierAddress}
                  onChange={(e) => updateField('supplierAddress', e.target.value)}
                  placeholder="Ulice, Město, PSČ"
                  className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                />
              </div>

              {/* Telefon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                <Input
                  value={formData.supplierPhone}
                  onChange={(e) => updateField('supplierPhone', e.target.value)}
                  placeholder="+420 123 456 789"
                  className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                />
              </div>

              {/* IČO a Email (jen pro firmy) */}
              {formData.supplierEntityType === 'company' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IČO</label>
                    <Input
                      value={formData.supplierIco}
                      onChange={(e) => updateField('supplierIco', e.target.value)}
                      placeholder="12345678"
                      className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <Input
                      type="email"
                      value={formData.supplierEmail}
                      onChange={(e) => updateField('supplierEmail', e.target.value)}
                      placeholder="email@example.com"
                      className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">DIČ</label>
                    <Input
                      value={formData.supplierDic}
                      onChange={(e) => updateField('supplierDic', e.target.value)}
                      placeholder="CZ12345678"
                      className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Web</label>
                    <Input
                      value={formData.supplierWebsite}
                      onChange={(e) => updateField('supplierWebsite', e.target.value)}
                      placeholder="https://example.com"
                      className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    />
                  </div>
                </>
              )}

              {/* Bankovní účet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Číslo účtu</label>
                <Input
                  value={formData.supplierBankAccount}
                  onChange={(e) => updateField('supplierBankAccount', e.target.value)}
                  placeholder="123456789/0100"
                  className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                />
              </div>

              {/* Poznámka k dodavateli */}
              <div className={formData.supplierEntityType === 'company' ? '' : 'col-span-1'}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Poznámka k dodavateli</label>
                <Input
                  value={formData.supplierNote}
                  onChange={(e) => updateField('supplierNote', e.target.value)}
                  placeholder="Volitelná poznámka k dodavateli..."
                  className="bg-white border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                />
              </div>
                </div>
              </div>
            )}
          </div>

          {/* Tlačítka */}
          <div className="flex gap-3 justify-between pt-4 border-t-2 border-gray-200">
            <div>
              {type === 'received' && onSaveAsSupplier && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveAsSupplier}
                  disabled={saving}
                  className="px-6 py-2.5"
                >
                  Uložit dodavatele
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={saving}
                className="px-6 py-2.5"
              >
                Zrušit
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {saving ? 'Ukládám...' : 'Uložit'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
