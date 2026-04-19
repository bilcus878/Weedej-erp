import { type LucideIcon } from 'lucide-react'
import { DetailSection } from './DetailSection'
import { DetailRow } from './DetailRow'

interface Party {
  name: string
  entityType?: string | null
  contact?: string | null
  address?: string | null
  phone?: string | null
  ico?: string | null
  dic?: string | null
  email?: string | null
  website?: string | null
  bankAccount?: string | null
  note?: string | null
}

interface Props {
  party: Party
  title: string
  icon?: LucideIcon
  colSpan?: string
}

export function PartySection({ party, title, icon, colSpan }: Props) {
  const isCompany = (party.entityType || 'company') === 'company'

  const entityBadge = party.entityType ? (
    <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-normal normal-case tracking-normal">
      {party.entityType === 'company' ? '🏢 Firma' : '👤 FO'}
    </span>
  ) : null

  return (
    <DetailSection title={title} icon={icon} colSpan={colSpan}>
      <div className="space-y-1.5">
        <DetailRow label="Název" value={<>{party.name}{entityBadge}</>} />
        {isCompany && party.contact && (
          <DetailRow label="Kontakt" value={party.contact} muted />
        )}
        {party.address && (
          <DetailRow label="Adresa" value={party.address} muted />
        )}
        {party.phone && (
          <DetailRow label="Telefon" value={party.phone} muted />
        )}
        {isCompany && party.ico && (
          <DetailRow label="IČO" value={party.ico} mono muted />
        )}
        {isCompany && party.dic && (
          <DetailRow label="DIČ" value={party.dic} mono muted />
        )}
        {party.email && (
          <DetailRow
            label="E-mail"
            value={
              <a href={`mailto:${party.email}`} className="text-blue-600 hover:underline font-semibold">
                {party.email}
              </a>
            }
          />
        )}
        {party.website && (
          <DetailRow label="Web" value={party.website} muted />
        )}
        {party.bankAccount && (
          <DetailRow label="Účet" value={party.bankAccount} mono muted />
        )}
        {party.note && (
          <DetailRow label="Poznámka" value={party.note} muted />
        )}
      </div>
    </DetailSection>
  )
}
