'use client'

import { Building2, Hash, Phone, Mail, MapPin, CreditCard, Image, Landmark, Info, Save } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { AppSettings, CompanyFormData } from '../types'

interface Props {
  formData:      CompanyFormData
  settings:      AppSettings | null
  hasChanges:    boolean
  saving:        boolean
  originalFD:    CompanyFormData
  setFormData:   (data: CompanyFormData) => void
  onSubmit:      (e: React.FormEvent) => void
}

export function CompanyTab({ formData, settings, hasChanges, saving, originalFD, setFormData, onSubmit }: Props) {
  const patch = (field: keyof CompanyFormData, value: string) => setFormData({ ...formData, [field]: value })

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-100">
          <h2 className="text-base font-semibold text-blue-900 flex items-center gap-2">
            <Building2 className="h-4.5 w-4.5 text-blue-600" />Identifikace firmy
          </h2>
          <p className="text-xs text-blue-600 mt-0.5">Základní údaje, které se tisknou na fakturách</p>
        </div>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <Building2 className="h-3.5 w-3.5 text-gray-400" />Název společnosti
              </label>
              <Input value={formData.companyName} onChange={e => patch('companyName', e.target.value)} placeholder="Moje firma s.r.o." className="text-base" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5"><Hash className="h-3.5 w-3.5 text-gray-400" />IČ</label>
                <Input value={formData.ico} onChange={e => patch('ico', e.target.value)} placeholder="12345678" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5"><Hash className="h-3.5 w-3.5 text-gray-400" />DIČ</label>
                <Input value={formData.dic} onChange={e => patch('dic', e.target.value)} placeholder="CZ12345678"
                  disabled={!(settings?.isVatPayer ?? true)}
                  className={!(settings?.isVatPayer ?? true) ? 'bg-gray-50' : ''} />
                {!(settings?.isVatPayer ?? true) && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Info className="h-3 w-3" />Nejste plátce DPH – DIČ se nevyplňuje</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-emerald-100">
          <h2 className="text-base font-semibold text-emerald-900 flex items-center gap-2">
            <Phone className="h-4.5 w-4.5 text-emerald-600" />Kontaktní údaje
          </h2>
          <p className="text-xs text-emerald-600 mt-0.5">Adresa, telefon a email</p>
        </div>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5"><MapPin className="h-3.5 w-3.5 text-gray-400" />Adresa</label>
              <Input value={formData.address} onChange={e => patch('address', e.target.value)} placeholder="Ulice 123, 110 00 Praha 1" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" />Telefon</label>
                <Input type="tel" value={formData.phone} onChange={e => patch('phone', e.target.value)} placeholder="+420 123 456 789" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5"><Mail className="h-3.5 w-3.5 text-gray-400" />Email</label>
                <Input type="email" value={formData.email} onChange={e => patch('email', e.target.value)} placeholder="info@firma.cz" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-100">
          <h2 className="text-base font-semibold text-amber-900 flex items-center gap-2">
            <Landmark className="h-4.5 w-4.5 text-amber-600" />Platební údaje
          </h2>
          <p className="text-xs text-amber-600 mt-0.5">Bankovní spojení a logo</p>
        </div>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5"><CreditCard className="h-3.5 w-3.5 text-gray-400" />Číslo účtu</label>
              <Input value={formData.bankAccount} onChange={e => patch('bankAccount', e.target.value)} placeholder="123456789/0100" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5">
                <Image className="h-3.5 w-3.5 text-gray-400" />Logo
                <span className="text-xs font-normal text-gray-400">(volitelné)</span>
              </label>
              <Input value={formData.logo} onChange={e => patch('logo', e.target.value)} placeholder="URL adresa nebo base64 string" />
              {formData.logo && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Náhled:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={formData.logo} alt="Logo náhled" className="max-h-16 object-contain"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <div>
          {hasChanges && (
            <button type="button" onClick={() => setFormData(originalFD)} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Zahodit změny
            </button>
          )}
        </div>
        <Button type="submit" disabled={saving || !hasChanges} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Ukládám...' : 'Uložit nastavení'}
        </Button>
      </div>
    </form>
  )
}
