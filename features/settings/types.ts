export interface AppSettings {
  id: string
  companyName: string
  ico: string
  dic: string
  address: string
  phone: string
  email: string
  bankAccount: string
  logo?: string
  lastIssuedInvoiceNumber: number
  lastIssuedInvoiceYear: number
  allowNegativeStock: boolean
  isVatPayer: boolean
}

export interface ApiKeyItem {
  id: string
  name: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
  keyPreview: string
}

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning'
}

export interface CompanyFormData {
  companyName: string
  ico: string
  dic: string
  address: string
  phone: string
  email: string
  bankAccount: string
  logo: string
}

export type SettingsTab = 'company' | 'invoicing' | 'system' | 'api'
