/**
 * Domain event bus for return request lifecycle events.
 *
 * DESIGN: Synchronous, fire-and-forget. Handlers are called AFTER the DB
 * transaction commits so they never block the critical path and never cause
 * financial state to roll back. Failures are logged but do not propagate —
 * a failed notification should not un-do a completed refund.
 *
 * HOW TO USE:
 *   // Register once at application startup (or in a module initializer):
 *   ReturnEventBus.on('return.resolved', async e => sendCustomerEmail(e))
 *
 *   // Emit after a successful transaction:
 *   await ReturnEventBus.emit({ type: 'return.resolved', payload: { ... } })
 */

// ── Event types ───────────────────────────────────────────────────────────────

export interface ReturnCreatedEvent {
  type:      'return.created'
  returnRequestId: string
  returnNumber:    string
  actorId:         string | null
  actorName:       string | null
}

export interface ReturnStatusChangedEvent {
  type:      'return.status_changed'
  returnRequestId: string
  returnNumber:    string
  fromStatus:      string
  toStatus:        string
  actorId:         string | null
  actorName:       string | null
}

export interface ReturnResolvedEvent {
  type:      'return.resolved'
  returnRequestId:  string
  returnNumber:     string
  refundAmount:     number
  currency:         string
  creditNoteId:     string | null
  creditNoteNumber: string | null
  refundStatus:     string
  actorId:          string | null
  actorName:        string | null
}

export interface ReturnGoodsReceivedEvent {
  type:      'return.goods_received'
  returnRequestId: string
  returnNumber:    string
  restocked:       boolean
  actorId:         string | null
  actorName:       string | null
}

export type ReturnDomainEvent =
  | ReturnCreatedEvent
  | ReturnStatusChangedEvent
  | ReturnResolvedEvent
  | ReturnGoodsReceivedEvent

// ── Bus implementation ────────────────────────────────────────────────────────

type Handler<T extends ReturnDomainEvent> = (event: T) => Promise<void>
type AnyHandler = (event: ReturnDomainEvent) => Promise<void>

const handlers = new Map<string, AnyHandler[]>()

function on<T extends ReturnDomainEvent>(eventType: T['type'], handler: Handler<T>): void {
  const list = handlers.get(eventType) ?? []
  list.push(handler as AnyHandler)
  handlers.set(eventType, list)
}

async function emit(event: ReturnDomainEvent): Promise<void> {
  const list = handlers.get(event.type) ?? []
  for (const handler of list) {
    try {
      await handler(event)
    } catch (err) {
      // Handlers must not break the caller — log and continue
      console.error(`[ReturnEventBus] Handler error for "${event.type}":`, err)
    }
  }
}

function off(eventType: string): void {
  handlers.delete(eventType)
}

export const ReturnEventBus = { on, emit, off }
