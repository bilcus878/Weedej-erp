// Analytics event pipeline — store → enrich → dispatch to external providers.
//
// Design guarantees:
//  1. Storage always happens synchronously in the request context.
//  2. Provider dispatch is fire-and-forget — never blocks the HTTP response.
//  3. Failed deliveries are retried by /api/cron/analytics-retry (max 3 attempts).
//  4. A failed provider call never propagates to the caller.

import { prisma } from '@/lib/prisma'
import { ga4Provider }  from './providers/ga4/ga4Provider'
import { metaProvider } from './providers/meta/metaProvider'
import type { IngressAnalyticsEvent, InternalAnalyticsEvent } from './types'
import type { ProviderAdapter } from './providers/types'

function activeProviders(): ProviderAdapter[] {
  return [ga4Provider, metaProvider].filter(p => p.enabled)
}

// ── Step 1: persist the incoming event ───────────────────────────────────────

export async function storeEvent(
  incoming: IngressAnalyticsEvent,
): Promise<InternalAnalyticsEvent | null> {
  // Attempt ERP enrichment: match eshop userId → ERP customer by email is not
  // feasible here (no email in the event). We match erpOrderId from properties.
  const props = incoming.properties as unknown as Record<string, unknown>
  const erpOrderId = (props['erpOrderId'] as string | undefined) ?? undefined

  let erpCustomerId: string | undefined
  if (erpOrderId) {
    const order = await prisma.customerOrder.findUnique({
      where:  { eshopOrderId: erpOrderId },
      select: { id: true, customerId: true },
    }).catch(() => null)
    if (order) {
      erpCustomerId = order.customerId ?? undefined
    }
  }

  try {
    const stored = await prisma.analyticsEvent.create({
      data: {
        eventId:         incoming.eventId,
        eventType:       incoming.eventType,
        entityType:      incoming.entityType ?? null,
        entityId:        incoming.entityId   ?? null,
        userId:          incoming.userId     ?? null,
        sessionId:       incoming.sessionId  ?? null,
        gaClientId:      incoming.gaClientId ?? null,
        fbp:             incoming.fbp        ?? null,
        fbc:             incoming.fbc        ?? null,
        erpCustomerId:   erpCustomerId       ?? null,
        erpOrderId:      erpOrderId          ?? null,
        source:          incoming.source,
        properties:      incoming.properties as object,
        ipAddress:       incoming.ipAddress  ?? null,
        userAgent:       incoming.userAgent  ?? null,
        clientTimestamp: new Date(incoming.clientTimestamp),
      },
    })

    return {
      ...incoming,
      id:           stored.id,
      erpCustomerId,
      erpOrderId,
      createdAt:    stored.createdAt,
    }
  } catch (err: unknown) {
    // Unique constraint violation → duplicate eventId → already processed
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('Unique constraint') || msg.includes('unique')) {
      return null   // caller interprets null as "already exists" → 200
    }
    throw err
  }
}

// ── Step 2: create pending delivery records ───────────────────────────────────

export async function createDeliveryRecords(
  analyticsEventId: string,
  providers: ProviderAdapter[],
): Promise<void> {
  if (!providers.length) return
  await prisma.analyticsEventDelivery.createMany({
    data: providers.map(p => ({
      analyticsEventId,
      provider: p.name,
      status:   'pending',
    })),
    skipDuplicates: true,
  })
}

// ── Step 3: dispatch to all active providers (fire-and-forget) ────────────────

export function dispatchAsync(event: InternalAnalyticsEvent): void {
  const providers = activeProviders()
  if (!providers.length) return

  // Fire-and-forget: create delivery records then dispatch concurrently.
  // Errors are caught at every level — nothing propagates to the caller.
  createDeliveryRecords(event.id, providers)
    .then(() => Promise.allSettled(providers.map(p => dispatchOne(event, p))))
    .catch(err => console.error('[Analytics] Pipeline dispatch error:', err instanceof Error ? err.message : err))
}

async function dispatchOne(
  event: InternalAnalyticsEvent,
  provider: ProviderAdapter,
): Promise<void> {
  const delivery = await prisma.analyticsEventDelivery.findFirst({
    where: { analyticsEventId: event.id, provider: provider.name },
    select: { id: true, attempts: true },
  }).catch(() => null)

  try {
    const result = await provider.send(event)

    const status = result.skipped
      ? 'skipped'
      : result.success
        ? 'delivered'
        : 'failed'

    await prisma.analyticsEventDelivery.updateMany({
      where: { analyticsEventId: event.id, provider: provider.name },
      data: {
        status,
        attempts:     { increment: 1 },
        lastAttemptAt: new Date(),
        httpStatus:    result.httpStatus   ?? null,
        responseBody:  result.responseBody ? (result.responseBody as object) : undefined,
        errorMessage:  result.errorMessage ?? null,
      },
    })
  } catch (err: unknown) {
    await prisma.analyticsEventDelivery.updateMany({
      where: { analyticsEventId: event.id, provider: provider.name },
      data: {
        status:        'failed',
        attempts:      delivery ? { increment: 1 } : 1,
        lastAttemptAt: new Date(),
        errorMessage:  err instanceof Error ? err.message : 'Unknown dispatch error',
      },
    }).catch(() => {})   // swallow — we're already in error path
  }
}

// ── Retry: called from the cron job ──────────────────────────────────────────

const MAX_ATTEMPTS = 3

export async function retryFailedDeliveries(): Promise<{ retried: number; permanentlyFailed: number }> {
  const providers = [ga4Provider, metaProvider]
  const providerMap = new Map(providers.map(p => [p.name, p]))

  // Exponential back-off windows: attempt 1 → 5 min, attempt 2 → 15 min, attempt 3 → 45 min
  const backoffMinutes = [5, 15, 45]

  const due = await prisma.analyticsEventDelivery.findMany({
    where: {
      status:   'failed',
      attempts: { lt: MAX_ATTEMPTS },
    },
    include: { event: true },
    take:    100,
  })

  let retried = 0
  let permanentlyFailed = 0

  for (const delivery of due) {
    const backoff = backoffMinutes[delivery.attempts - 1] ?? 45
    const earliest = delivery.lastAttemptAt
      ? new Date(delivery.lastAttemptAt.getTime() + backoff * 60_000)
      : new Date(0)

    if (earliest > new Date()) continue  // not due yet

    const provider = providerMap.get(delivery.provider)
    if (!provider) continue

    const internalEvent: InternalAnalyticsEvent = {
      id:              delivery.event.id,
      eventId:         delivery.event.eventId,
      eventType:       delivery.event.eventType as InternalAnalyticsEvent['eventType'],
      entityType:      delivery.event.entityType  ?? undefined,
      entityId:        delivery.event.entityId    ?? undefined,
      userId:          delivery.event.userId      ?? undefined,
      sessionId:       delivery.event.sessionId   ?? undefined,
      gaClientId:      delivery.event.gaClientId  ?? undefined,
      fbp:             delivery.event.fbp         ?? undefined,
      fbc:             delivery.event.fbc         ?? undefined,
      erpCustomerId:   delivery.event.erpCustomerId ?? undefined,
      erpOrderId:      delivery.event.erpOrderId  ?? undefined,
      source:          delivery.event.source,
      properties:      delivery.event.properties  as unknown as InternalAnalyticsEvent['properties'],
      ipAddress:       delivery.event.ipAddress   ?? undefined,
      userAgent:       delivery.event.userAgent   ?? undefined,
      clientTimestamp: delivery.event.clientTimestamp.toISOString(),
      createdAt:       delivery.event.createdAt,
    }

    try {
      const result = await provider.send(internalEvent)
      const isLastAttempt = delivery.attempts + 1 >= MAX_ATTEMPTS

      await prisma.analyticsEventDelivery.update({
        where: { id: delivery.id },
        data: {
          status:        result.success || result.skipped ? (result.skipped ? 'skipped' : 'delivered')
                          : isLastAttempt ? 'permanently_failed' : 'failed',
          attempts:      { increment: 1 },
          lastAttemptAt: new Date(),
          httpStatus:    result.httpStatus   ?? null,
          responseBody:  result.responseBody ? (result.responseBody as object) : undefined,
          errorMessage:  result.errorMessage ?? null,
        },
      })

      if (result.success || result.skipped) retried++
      else if (isLastAttempt) permanentlyFailed++
    } catch {
      permanentlyFailed++
    }
  }

  return { retried, permanentlyFailed }
}
