/**
 * AppError — typed error hierarchy for the ERP API layer.
 *
 * Rules:
 *  - All API handlers throw AppError subclasses (never raw Error).
 *  - apiPipeline.ts catches AppError and converts to the standard response envelope.
 *  - Use fromUnknown() in catch blocks when the thrown type is unknown.
 */

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'UNPROCESSABLE'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'

export interface ApiErrorBody {
  code:    ErrorCode
  message: string
  details?: unknown
}

export class AppError extends Error {
  readonly statusCode: number
  readonly code:       ErrorCode
  readonly details?:   unknown

  constructor(message: string, statusCode: number, code: ErrorCode, details?: unknown) {
    super(message)
    this.name       = this.constructor.name
    this.statusCode = statusCode
    this.code       = code
    this.details    = details
  }

  toBody(): ApiErrorBody {
    return {
      code:    this.code,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
    }
  }
}

// ── Concrete error classes ────────────────────────────────────────────────────

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super(id ? `${entity} '${id}' not found` : `${entity} not found`, 404, 'NOT_FOUND')
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details)
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, 'UNPROCESSABLE', details)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT')
  }
}

export class RateLimitError extends AppError {
  readonly retryAfter: number

  constructor(retryAfter: number) {
    super('Too many requests', 429, 'RATE_LIMITED')
    this.retryAfter = retryAfter
  }
}

export class IdempotencyConflictError extends AppError {
  constructor() {
    super('A request with this Idempotency-Key is already in flight', 409, 'IDEMPOTENCY_CONFLICT')
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details)
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR')
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Wrap any caught value into an AppError without leaking internals.
 * Safe to use in top-level catch blocks.
 */
export function fromUnknown(err: unknown): AppError {
  if (err instanceof AppError) return err
  if (err instanceof Error) {
    // Prisma unique constraint violation
    if ((err as any).code === 'P2002') {
      return new ConflictError('Záznam s těmito údaji již existuje')
    }
    // Prisma record not found
    if ((err as any).code === 'P2025') {
      return new NotFoundError('Záznam')
    }
    return new InternalError(err.message)
  }
  return new InternalError('Unknown error')
}
