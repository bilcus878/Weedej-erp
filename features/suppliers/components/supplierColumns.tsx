'use client'

import type { ColumnDef } from '@/components/erp'
import type { Supplier } from '../types'

export const supplierColumns: ColumnDef<Supplier>[] = [
  { key: 'name',    header: 'Název',           render: r => <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p> },
  { key: 'contact', header: 'Kontaktní osoba', render: r => <p className="text-sm text-gray-600 truncate">{r.contact || '–'}</p> },
  { key: 'email',   header: 'Email',           render: r => <p className="text-sm text-gray-600 truncate">{r.email   || '–'}</p> },
  { key: 'phone',   header: 'Telefon',         render: r => <p className="text-sm text-gray-600 truncate">{r.phone   || '–'}</p> },
  { key: 'website', header: 'Web',             render: r => <p className="text-sm text-gray-600 truncate">{r.website || '–'}</p> },
]
