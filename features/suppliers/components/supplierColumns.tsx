'use client'

import type { ColumnDef, FiltersResult } from '@/components/erp'
import { FilterInput } from '@/components/erp'
import type { Supplier } from '../types'

export function createSupplierColumns(filters: FiltersResult<Supplier>): ColumnDef<Supplier>[] {
  const v = filters.values
  const s = filters.set

  return [
    {
      key: 'name', header: 'Název',
      filterNode: <FilterInput className="w-full text-center" value={v['name'] ?? ''} onChange={val => s('name', val)} placeholder="Název..." />,
      render: r => <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>,
    },
    {
      key: 'contact', header: 'Kontaktní osoba',
      filterNode: <FilterInput className="w-full text-center" value={v['contact'] ?? ''} onChange={val => s('contact', val)} placeholder="Kontakt..." />,
      render: r => <p className="text-sm text-gray-600 truncate">{r.contact || '–'}</p>,
    },
    {
      key: 'email', header: 'Email',
      filterNode: <FilterInput className="w-full text-center" value={v['email'] ?? ''} onChange={val => s('email', val)} placeholder="Email..." />,
      render: r => <p className="text-sm text-gray-600 truncate">{r.email || '–'}</p>,
    },
    {
      key: 'phone', header: 'Telefon',
      filterNode: <FilterInput className="w-full text-center" value={v['phone'] ?? ''} onChange={val => s('phone', val)} placeholder="Telefon..." />,
      render: r => <p className="text-sm text-gray-600 truncate">{r.phone || '–'}</p>,
    },
    {
      key: 'website', header: 'Web',
      filterNode: <FilterInput className="w-full text-center" value={v['website'] ?? ''} onChange={val => s('website', val)} placeholder="Web..." />,
      render: r => <p className="text-sm text-gray-600 truncate">{r.website || '–'}</p>,
    },
  ]
}
