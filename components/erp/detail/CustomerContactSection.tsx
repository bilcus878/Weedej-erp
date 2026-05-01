'use client'

import { User, FileText } from 'lucide-react'
import { ERPSectionCard } from './ERPSectionCard'
import { ERPDetailRow }   from './ERPSectionCard'

export interface CustomerContactProps {
  name?:           string | null
  email?:          string | null
  phone?:          string | null
  company?:        string | null
  ico?:            string | null
  /** Billing address — shown when at least street or city is present */
  billingName?:    string | null
  billingCompany?: string | null
  billingStreet?:  string | null
  billingCity?:    string | null
  billingZip?:     string | null
  billingCountry?: string | null
  /** Override section title */
  title?: string
}

export function CustomerContactSection({
  name, email, phone, company, ico,
  billingName, billingCompany, billingStreet, billingCity, billingZip, billingCountry,
  title = 'Zákazník',
}: CustomerContactProps) {
  const displayName = name || 'Zákazník'
  const hasBilling  = !!(billingStreet || billingCity)

  return (
    <ERPSectionCard title={title} icon={<User />}>
      <dl>
        <ERPDetailRow label="Jméno"  value={displayName} />
        <ERPDetailRow label="E-mail" value={
          email
            ? <a href={`mailto:${email}`} className="text-indigo-600 hover:underline">{email}</a>
            : null
        } />
        <ERPDetailRow label="Telefon" value={phone} />
        {company && <ERPDetailRow label="Firma" value={company} />}
        {ico && (
          <ERPDetailRow label="IČO" value={
            <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{ico}</code>
          } />
        )}
      </dl>

      {hasBilling && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <FileText className="w-3 h-3" />
            Fakturační adresa
          </p>
          <dl>
            <ERPDetailRow
              label="Příjemce"
              value={billingCompany || billingName || displayName}
            />
            {billingStreet && <ERPDetailRow label="Ulice"      value={billingStreet} />}
            <ERPDetailRow
              label="Město / PSČ"
              value={[billingZip, billingCity].filter(Boolean).join(' ') || null}
            />
            <ERPDetailRow label="Země" value={billingCountry || 'CZ'} />
          </dl>
        </div>
      )}
    </ERPSectionCard>
  )
}
