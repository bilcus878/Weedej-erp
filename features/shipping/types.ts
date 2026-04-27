export type ShippingProvider = 'dpd' | 'zasilkovna' | 'personal' | 'courier' | 'custom'

export interface ShippingMethod {
  id:            string
  name:          string
  provider:      ShippingProvider
  description:   string | null
  price:         number
  freeThreshold: number | null
  codFee:        number
  isActive:      boolean
  sortOrder:     number
  estimatedDays: string
  note:          string | null
}

export interface ShippingMethodDraft {
  name:          string
  provider:      ShippingProvider
  description:   string
  price:         string
  freeThreshold: string
  codFee:        string
  estimatedDays: string
  note:          string
}

export const PROVIDER_LABELS: Record<ShippingProvider, string> = {
  dpd:        'DPD',
  zasilkovna: 'Zásilkovna',
  personal:   'Osobní odběr',
  courier:    'Kurýr',
  custom:     'Vlastní',
}

export const PROVIDER_COLORS: Record<ShippingProvider, string> = {
  dpd:        'bg-red-100 text-red-700',
  zasilkovna: 'bg-orange-100 text-orange-700',
  personal:   'bg-green-100 text-green-700',
  courier:    'bg-blue-100 text-blue-700',
  custom:     'bg-gray-100 text-gray-600',
}
