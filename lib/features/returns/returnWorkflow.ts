/**
 * Return request workflow — state machine and transition rules.
 *
 * Every allowed transition is explicitly listed here. Callers must call
 * `validateTransition` before changing status — the API routes enforce this.
 */

export type ReturnStatus =
  | 'submitted'
  | 'under_review'
  | 'waiting_for_goods'
  | 'goods_received'
  | 'inspecting'
  | 'approved'
  | 'partially_approved'
  | 'rejected'
  | 'resolved'
  | 'closed'
  | 'cancelled'

export type ReturnType = 'return' | 'warranty_claim' | 'complaint' | 'exchange'

export type ReturnReason =
  | 'wrong_product'
  | 'damaged_on_arrival'
  | 'defective'
  | 'not_as_described'
  | 'changed_mind'
  | 'other'

export type ReturnResolutionType = 'refund' | 'store_credit' | 'exchange' | 'repair' | 'rejected'

export type ReturnRefundMethod = 'original_payment' | 'store_credit' | 'bank_transfer'

export type ReturnItemCondition = 'good' | 'damaged' | 'defective' | 'opened' | 'wrong_item'

export type ReturnItemStatus = 'pending' | 'approved' | 'rejected' | 'partial'

// Valid transitions: from → Set<to>
const ALLOWED_TRANSITIONS: Record<ReturnStatus, Set<ReturnStatus>> = {
  submitted:          new Set(['under_review', 'cancelled']),
  under_review:       new Set(['waiting_for_goods', 'inspecting', 'cancelled']),
  waiting_for_goods:  new Set(['goods_received', 'cancelled']),
  goods_received:     new Set(['inspecting']),
  inspecting:         new Set(['approved', 'partially_approved', 'rejected']),
  approved:           new Set(['resolved']),
  partially_approved: new Set(['resolved']),
  rejected:           new Set(['closed']),
  resolved:           new Set(['closed']),
  closed:             new Set(),
  cancelled:          new Set(),
}

export function validateTransition(from: ReturnStatus, to: ReturnStatus): void {
  if (!ALLOWED_TRANSITIONS[from]?.has(to)) {
    throw new Error(
      `Neplatný přechod stavu: ${from} → ${to}. Povolené přechody: ${
        [...(ALLOWED_TRANSITIONS[from] ?? [])].join(', ') || 'žádné'
      }`
    )
  }
}

export function isTerminalStatus(status: ReturnStatus): boolean {
  return status === 'closed' || status === 'cancelled'
}

export function canBeApproved(status: ReturnStatus): boolean {
  return status === 'inspecting'
}

export function canReceiveGoods(status: ReturnStatus): boolean {
  return status === 'waiting_for_goods'
}

export function canProcessRefund(status: ReturnStatus): boolean {
  return status === 'approved' || status === 'partially_approved'
}

// Czech labels for display
export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  submitted:          'Podáno',
  under_review:       'Ve zpracování',
  waiting_for_goods:  'Čeká na zboží',
  goods_received:     'Zboží přijato',
  inspecting:         'Kontrola',
  approved:           'Schváleno',
  partially_approved: 'Částečně schváleno',
  rejected:           'Zamítnuto',
  resolved:           'Vyřešeno',
  closed:             'Uzavřeno',
  cancelled:          'Zrušeno',
}

export const RETURN_TYPE_LABELS: Record<ReturnType, string> = {
  return:          'Vrácení',
  warranty_claim:  'Záruční reklamace',
  complaint:       'Stížnost',
  exchange:        'Výměna',
}

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  wrong_product:       'Špatný produkt',
  damaged_on_arrival:  'Poškozeno při doručení',
  defective:           'Vadné zboží',
  not_as_described:    'Neodpovídá popisu',
  changed_mind:        'Změna rozhodnutí',
  other:               'Jiné',
}

export const RETURN_RESOLUTION_LABELS: Record<ReturnResolutionType, string> = {
  refund:       'Vrácení peněz',
  store_credit: 'Kredit',
  exchange:     'Výměna',
  repair:       'Oprava',
  rejected:     'Zamítnuto',
}

export const RETURN_REFUND_METHOD_LABELS: Record<ReturnRefundMethod, string> = {
  original_payment: 'Původní způsob platby',
  store_credit:     'Kredit v e-shopu',
  bank_transfer:    'Bankovní převod',
}

export const RETURN_CONDITION_LABELS: Record<ReturnItemCondition, string> = {
  good:       'Nepoškozené',
  damaged:    'Poškozené',
  defective:  'Vadné',
  opened:     'Otevřené',
  wrong_item: 'Špatné zboží',
}

// Return deadline policy: 14 days from order date (EU B2C minimum)
export const STANDARD_RETURN_DAYS = 14
// Warranty period: 24 months (Czech consumer law for B2C)
export const WARRANTY_MONTHS = 24
