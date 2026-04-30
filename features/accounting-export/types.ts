export type DocType =
  | 'issued_invoice' | 'received_invoice' | 'credit_note'
  | 'payment' | 'customer_order' | 'delivery_note'
  | 'receipt' | 'stock_movement'

export type ExportFormat = 'csv' | 'xlsx' | 'zip' | 'pohoda_xml' | 'money_xml' | 'generic_csv'

export interface JobRecord {
  id:            string
  dateFrom:      string
  dateTo:        string
  documentTypes: string
  exportFormat:  ExportFormat
  status:        'pending' | 'processing' | 'completed' | 'failed'
  fileName:      string | null
  fileSize:      number | null
  rowCount:      number | null
  errorMessage:  string | null
  completedAt:   string | null
  expiresAt:     string | null
  createdAt:     string
}

export interface Preview {
  counts:    Partial<Record<DocType, number>>
  totalRows: number
}

export interface FormatOption {
  id:          ExportFormat
  label:       string
  description: string
  icon:        React.ReactNode
  badge?:      string
  badgeColor?: string
}

export interface DocTypeOption {
  id:          DocType
  label:       string
  description: string
}
