export interface Supplier {
  id: string
  name: string
  entityType?: string
  contact?: string
  email?: string
  phone?: string
  ico?: string
  dic?: string
  bankAccount?: string
  website?: string
  address?: string
  note?: string
}

export interface SupplierFormData {
  name:        string
  entityType:  string
  contact:     string
  email:       string
  phone:       string
  ico:         string
  dic:         string
  bankAccount: string
  website:     string
  address:     string
  note:        string
}

export const emptySupplierForm: SupplierFormData = {
  name: '', entityType: 'company', contact: '', email: '', phone: '',
  ico: '', dic: '', bankAccount: '', website: '', address: '', note: '',
}
