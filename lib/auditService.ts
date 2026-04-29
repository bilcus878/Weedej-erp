import { prisma } from '@/lib/prisma'

export type AuditActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT'

export interface AuditLogInput {
  userId?:     string | null
  username?:   string | null
  role?:       string | null
  actionType:  AuditActionType
  entityName?: string | null
  entityId?:   string | null
  fieldName?:  string | null
  oldValue?:   string | null
  newValue?:   string | null
  module?:     string | null
  ipAddress?:  string | null
}

// Fields that must NEVER appear in audit logs regardless of caller intent.
// Includes credential, token, and key fields across all entities.
const ALWAYS_REDACT = new Set([
  'password', 'passwordHash', 'token', 'refreshToken', 'accessToken',
  'secret', 'apiKey', 'key', 'hash', 'resetToken', 'verificationToken',
  'sessionToken', 'csrfToken', 'privateKey',
])

// Redact a single value: returns '[REDACTED]' for sensitive field names,
// otherwise the raw string value. Always strips nulls to null.
function redact(fieldName: string, value: unknown): string | null {
  if (value == null) return null
  if (ALWAYS_REDACT.has(fieldName)) return '[REDACTED]'
  return String(value)
}

// Write a single audit log entry.
// This function is intentionally fault-tolerant: an audit write failure must
// never propagate to the calling business operation.
export async function createAuditLog(data: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({ data })
  } catch (err) {
    console.error('[AuditLog] Write failed:', err)
  }
}

// Diff two entity snapshots and create one UPDATE log row per changed field.
// Sensitive fields are automatically redacted. Fields in skipFields are
// excluded entirely (timestamps, already-captured metadata).
// Returns an array of promises — await Promise.all(diffAndLog(...)) if you
// need to guarantee all writes before the response.
export function diffAndLog(
  base: Omit<AuditLogInput, 'actionType' | 'fieldName' | 'oldValue' | 'newValue'>,
  before: Record<string, unknown>,
  after:  Record<string, unknown>,
  skipFields: string[] = ['updatedAt', 'createdAt'],
): Promise<void>[] {
  return Object.keys(after)
    .filter(key => {
      if (skipFields.includes(key)) return false
      return JSON.stringify(before[key]) !== JSON.stringify(after[key])
    })
    .map(key =>
      createAuditLog({
        ...base,
        actionType: 'UPDATE',
        fieldName:  key,
        oldValue:   redact(key, before[key]),
        newValue:   redact(key, after[key]),
      })
    )
}
