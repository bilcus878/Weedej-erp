import type { SelectOption } from '@/components/erp'

export const PAYMENT_OPTIONS: SelectOption[] = [
  { value: 'all',      label: 'Vše'      },
  { value: 'none',     label: '-'        },
  { value: 'cash',     label: 'Hotovost' },
  { value: 'card',     label: 'Karta'    },
  { value: 'transfer', label: 'Převod'   },
]
