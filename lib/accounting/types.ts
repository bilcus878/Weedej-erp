// ─── Accounting Export — Shared Types ────────────────────────────────────────

export type DocType =
  | 'issued_invoice'
  | 'received_invoice'
  | 'credit_note'
  | 'payment'
  | 'customer_order'
  | 'delivery_note'
  | 'receipt'
  | 'stock_movement'

export type ExportFormat =
  | 'csv'
  | 'xlsx'
  | 'zip'
  | 'pohoda_xml'
  | 'money_xml'
  | 'generic_csv'

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  issued_invoice:   'Vydané faktury',
  received_invoice: 'Přijaté faktury',
  credit_note:      'Dobropisy',
  payment:          'Platby / transakce',
  customer_order:   'Objednávky zákazníků',
  delivery_note:    'Výdejky',
  receipt:          'Příjemky',
  stock_movement:   'Pohyby skladu',
}

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  csv:         'CSV',
  xlsx:        'Excel (XLSX)',
  zip:         'ZIP balíček (CSV + PDF originály)',
  pohoda_xml:  'Pohoda XML',
  money_xml:   'Money S3 XML',
  generic_csv: 'Obecné CSV (pro jiné SW)',
}

// ─── Normalized document DTO — every doc type resolves to this ────────────────

export interface AccountingVatLine {
  vatRate:    number  // 0 | 12 | 21
  taxBase:    number
  vatAmount:  number
  grossAmount: number
}

export interface AccountingDocument {
  docType:   DocType
  docNumber: string
  sourceId:  string

  docDate:     string        // ISO 8601 — primary date (invoiceDate, orderDate, …)
  dueDate:     string | null
  taxPointDate: string       // DUZP — date for VAT period assignment (= docDate if unknown)

  partyName:    string | null
  partyIco:     string | null
  partyDic:     string | null
  partyAddress: string | null
  partyType:    'customer' | 'supplier' | 'internal' | null

  currency: string   // ISO 4217 — always CZK for now

  vatLines: AccountingVatLine[]  // breakdown by VAT rate

  totalTaxBase: number
  totalVat:     number
  totalAmount:  number

  paymentStatus: string | null   // paid | unpaid | partial | cancelled | null
  paidAmount:    number | null
  paymentType:   string | null   // transfer | card | cash | null
  variableSymbol: string | null
  constantSymbol: string | null

  note:    string | null
  status:  string        // active | storno | draft | completed | …
  pdfPath: string | null // for ZIP export — relative path under storage/documents
}

// ─── Export job params ────────────────────────────────────────────────────────

export interface ExportParams {
  dateFrom:      Date
  dateTo:        Date
  documentTypes: DocType[]
  format:        ExportFormat
  includePdfs:   boolean         // for ZIP: whether to include PDF originals
}

export interface ExportPreview {
  counts:    Partial<Record<DocType, number>>
  totalRows: number
}

// ─── VAT summary row ──────────────────────────────────────────────────────────

export interface VatSummaryRow {
  period:         string  // YYYY-MM
  vatRate:        number
  docType:        DocType
  docCount:       number
  totalTaxBase:   number
  totalVat:       number
  totalGross:     number
}

// ─── Company settings (passed into XML adapters) ─────────────────────────────

export interface CompanyInfo {
  name:        string
  ico:         string
  dic:         string
  address:     string
  bankAccount: string
}
