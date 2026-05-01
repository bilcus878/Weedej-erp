/**
 * responseWrapper — standard API response envelope for the ERP system.
 *
 * Every API route that uses apiPipeline.ts returns one of two shapes:
 *
 *   Success: { data: T, meta?: PaginationMeta, correlationId: string }
 *   Failure: { error: { code, message, details? }, correlationId: string }
 *
 * This keeps the frontend contract stable regardless of which module is called.
 */

import { NextResponse }            from 'next/server'
import type { AppError }           from './apiError'
import type { RateLimitError }     from './apiError'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page:       number
  limit:      number
  total:      number
  totalPages: number
}

export interface SuccessEnvelope<T> {
  data:           T
  meta?:          PaginationMeta | Record<string, unknown>
  correlationId:  string
}

export interface ErrorEnvelope {
  error:         { code: string; message: string; details?: unknown }
  correlationId: string
}

export type ApiEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope

// ── Correlation ID ────────────────────────────────────────────────────────────

export function generateCorrelationId(): string {
  return `erp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

// ── Response builders ─────────────────────────────────────────────────────────

export function ok<T>(
  data:          T,
  correlationId: string,
  options?: {
    status?: number
    meta?:   PaginationMeta | Record<string, unknown>
    headers?: Record<string, string>
  }
): NextResponse<SuccessEnvelope<T>> {
  const envelope: SuccessEnvelope<T> = {
    data,
    correlationId,
    ...(options?.meta ? { meta: options.meta } : {}),
  }
  return NextResponse.json(envelope, {
    status:  options?.status ?? 200,
    headers: options?.headers,
  })
}

export function fail(
  error:         AppError,
  correlationId: string,
): NextResponse<ErrorEnvelope> {
  const envelope: ErrorEnvelope = {
    error:         error.toBody(),
    correlationId,
  }

  const headers: Record<string, string> = {}

  // Propagate Retry-After for 429 responses
  if (error.statusCode === 429) {
    const rl = error as RateLimitError
    headers['Retry-After'] = String((rl as any).retryAfter ?? 60)
  }

  return NextResponse.json(envelope, {
    status: error.statusCode,
    headers,
  })
}

// ── Pagination helpers ────────────────────────────────────────────────────────

export function paginationMeta(
  total: number,
  page:  number,
  limit: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export function parsePaginationQuery(searchParams: URLSearchParams): {
  page:  number
  limit: number
  skip:  number
} {
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10) || 1)
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50))
  return { page, limit, skip: (page - 1) * limit }
}
