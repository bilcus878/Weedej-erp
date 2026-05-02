'use client'

import { Building2, FileText } from 'lucide-react'
import { ERPSectionCard, ERPDetailRow } from './ERPSectionCard'

export interface SupplierContactProps {
  name?:          string | null
  email?:         string | null
  phone?:         string | null
  address?:       string | null
  contactPerson?: string | null
  entityType?:    string | null
  ico?:           string | null
  dic?:           string | null
  bankAccount?:   string | null
  website?:       string | null
  title?:         string
}

export function SupplierContactSection({
  name, email, phone, address, contactPerson, entityType,
  ico, dic, bankAccount, website,
  title,
}: SupplierContactProps) {
  const displayName = name || 'Dodavatel'
  const isIndividual = entityType === 'individual'
  const hasCompanyData = !!(ico || dic || bankAccount || website)

  return (
    <ERPSectionCard title={title ?? (isIndividual ? 'Fyzická osoba' : 'Dodavatel')} icon={<Building2 />}>
      <dl>
        <ERPDetailRow label="Název"   value={displayName} />
        {address       && <ERPDetailRow label="Adresa"   value={address} />}
        {contactPerson && <ERPDetailRow label="Kontakt"  value={contactPerson} />}
        <ERPDetailRow label="E-mail" value={
          email
            ? <a href={`mailto:${email}`} className="text-indigo-600 hover:underline">{email}</a>
            : null
        } />
        <ERPDetailRow label="Telefon" value={phone} />
      </dl>

      {hasCompanyData && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <FileText className="w-3 h-3" />
            Firemní údaje
          </p>
          <dl>
            {ico        && <ERPDetailRow label="IČO"         value={<code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{ico}</code>} />}
            {dic        && <ERPDetailRow label="DIČ"         value={<code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{dic}</code>} />}
            {bankAccount && <ERPDetailRow label="Číslo účtu" value={<code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{bankAccount}</code>} />}
            {website    && <ERPDetailRow label="Web"         value={<a href={website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs">{website}</a>} />}
          </dl>
        </div>
      )}
    </ERPSectionCard>
  )
}
