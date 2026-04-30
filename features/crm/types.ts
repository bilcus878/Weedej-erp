// ─── CRM Domain Types ─────────────────────────────────────────────────────────

export interface CrmContact {
  id:          string
  customerId:  string
  firstName:   string
  lastName?:   string | null
  role?:       string | null
  email?:      string | null
  phone?:      string | null
  isPrimary:   boolean
  note?:       string | null
  isActive:    boolean
  createdAt:   string
  updatedAt:   string
  createdById?: string | null
}

export interface CrmRelationshipStatus {
  id:              string
  customerId:      string
  stage:           RelationshipStage
  healthScore?:    number | null
  ownerId?:        string | null
  owner?:          { id: string; name: string } | null
  lastContactedAt?: string | null
  nextFollowUpAt?:  string | null
  updatedAt:       string
}

export type RelationshipStage = 'lead' | 'prospect' | 'active' | 'at_risk' | 'churned' | 'inactive'

export interface CrmInteraction {
  id:            string
  customerId:    string
  contactId?:    string | null
  contact?:      { id: string; firstName: string; lastName?: string | null } | null
  type:          InteractionType
  direction?:    'inbound' | 'outbound' | null
  subject:       string
  body?:         string | null
  outcome?:      string | null
  occurredAt:    string
  durationMin?:  number | null
  opportunityId?: string | null
  createdAt:     string
  updatedAt:     string
  createdById?:  string | null
  createdBy?:    { id: string; name: string } | null
}

export type InteractionType = 'call' | 'email' | 'meeting' | 'note' | 'visit' | 'demo' | 'other'

export interface CrmTask {
  id:            string
  customerId:    string
  contactId?:    string | null
  contact?:      { id: string; firstName: string; lastName?: string | null } | null
  title:         string
  description?:  string | null
  type:          TaskType
  status:        TaskStatus
  priority:      TaskPriority
  dueAt?:        string | null
  completedAt?:  string | null
  assignedToId?: string | null
  assignedTo?:   { id: string; name: string } | null
  createdById?:  string | null
  createdBy?:    { id: string; name: string } | null
  opportunityId?: string | null
  createdAt:     string
  updatedAt:     string
}

export type TaskType     = 'call_back' | 'send_email' | 'follow_up' | 'demo' | 'send_quote' | 'other'
export type TaskStatus   = 'open' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface CrmOpportunity {
  id:               string
  customerId:       string
  title:            string
  description?:     string | null
  value?:           number | null
  currency:         string
  probability?:     number | null
  stage:            OpportunityStage
  lostReason?:      string | null
  expectedCloseAt?: string | null
  closedAt?:        string | null
  ownerId?:         string | null
  owner?:           { id: string; name: string } | null
  createdById?:     string | null
  createdAt:        string
  updatedAt:        string
}

export type OpportunityStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

export interface TimelineEvent {
  id:          string
  type:        'interaction' | 'task' | 'order' | 'invoice' | 'opportunity'
  occurredAt:  string
  title:       string
  subtitle?:   string
  actor?:      string
  entityId:    string
  entityType:  string
  meta:        Record<string, unknown>
}

// ─── Form data types ───────────────────────────────────────────────────────────

export interface CrmContactFormData {
  firstName:  string
  lastName:   string
  role:       string
  email:      string
  phone:      string
  isPrimary:  boolean
  note:       string
}

export interface CrmInteractionFormData {
  type:        InteractionType
  direction:   string
  subject:     string
  body:        string
  outcome:     string
  occurredAt:  string
  durationMin: string
  contactId:   string
}

export interface CrmTaskFormData {
  title:       string
  description: string
  type:        TaskType
  priority:    TaskPriority
  dueAt:       string
  assignedToId: string
  contactId:   string
}

export interface CrmOpportunityFormData {
  title:            string
  description:      string
  value:            string
  currency:         string
  probability:      string
  stage:            OpportunityStage
  expectedCloseAt:  string
  ownerId:          string
}

// ─── Label helpers ─────────────────────────────────────────────────────────────

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call:    'Telefonní hovor',
  email:   'Email',
  meeting: 'Schůzka',
  note:    'Poznámka',
  visit:   'Návštěva',
  demo:    'Demo / Prezentace',
  other:   'Jiné',
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  call_back:  'Zavolat zpět',
  send_email: 'Odeslat email',
  follow_up:  'Následný kontakt',
  demo:       'Připravit demo',
  send_quote: 'Odeslat nabídku',
  other:      'Jiné',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open:        'Otevřený',
  in_progress: 'Probíhá',
  done:        'Hotový',
  cancelled:   'Zrušený',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low:    'Nízká',
  normal: 'Normální',
  high:   'Vysoká',
  urgent: 'Urgentní',
}

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  lead:        'Lead',
  qualified:   'Kvalifikovaný',
  proposal:    'Nabídka',
  negotiation: 'Jednání',
  won:         'Vyhráno',
  lost:        'Prohráno',
}

export const RELATIONSHIP_STAGE_LABELS: Record<RelationshipStage, string> = {
  lead:     'Lead',
  prospect: 'Prospect',
  active:   'Aktivní',
  at_risk:  'Rizikový',
  churned:  'Ztracený',
  inactive: 'Neaktivní',
}
