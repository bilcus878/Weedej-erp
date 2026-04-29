export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT'

export interface AuditLog {
  id:         string
  userId:     string | null
  username:   string | null
  role:       string | null
  actionType: AuditActionType
  entityName: string | null
  entityId:   string | null
  fieldName:  string | null
  oldValue:   string | null
  newValue:   string | null
  module:     string | null
  ipAddress:  string | null
  createdAt:  string
}

export interface AuditLogFilters {
  userId:     string
  module:     string
  actionType: string
  entityName: string
  dateFrom:   string
  dateTo:     string
}

export interface AuditLogPage {
  data:       AuditLog[]
  total:      number
  page:       number
  pageSize:   number
  totalPages: number
}

export const emptyFilters: AuditLogFilters = {
  userId:     '',
  module:     '',
  actionType: '',
  entityName: '',
  dateFrom:   '',
  dateTo:     '',
}

export const ACTION_TYPE_LABELS: Record<AuditActionType, string> = {
  CREATE: 'Vytvoření',
  UPDATE: 'Úprava',
  DELETE: 'Smazání',
  LOGIN:  'Přihlášení',
  LOGOUT: 'Odhlášení',
  EXPORT: 'Export',
}

export const ACTION_TYPE_COLORS: Record<AuditActionType, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN:  'bg-violet-100 text-violet-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  EXPORT: 'bg-amber-100 text-amber-700',
}
