import type { AuditLogFilters, AuditLogPage } from '../types'

export async function fetchAuditLogs(
  filters: Partial<AuditLogFilters>,
  page:     number,
  pageSize: number,
  sortDir:  'asc' | 'desc' = 'desc',
): Promise<AuditLogPage> {
  const params = new URLSearchParams()
  params.set('page',     String(page))
  params.set('pageSize', String(pageSize))
  params.set('sortDir',  sortDir)

  const { userId, module, actionType, entityName, dateFrom, dateTo } = filters
  if (userId)     params.set('userId',     userId)
  if (module)     params.set('module',     module)
  if (actionType) params.set('actionType', actionType)
  if (entityName) params.set('entityName', entityName)
  if (dateFrom)   params.set('dateFrom',   dateFrom)
  if (dateTo)     params.set('dateTo',     dateTo)

  const res = await fetch(`/api/audit-logs?${params.toString()}`, { cache: 'no-store' })
  if (!res.ok) {
    if (res.status === 401) throw new Error('Pro zobrazení audit logu musíte být přihlášeni.')
    if (res.status === 403) throw new Error('Nemáte oprávnění zobrazit audit log.')
    throw new Error('Nepodařilo se načíst audit log (chyba serveru).')
  }
  return res.json()
}
