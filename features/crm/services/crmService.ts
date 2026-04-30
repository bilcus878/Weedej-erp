import type {
  CrmContact, CrmContactFormData,
  CrmInteraction, CrmInteractionFormData,
  CrmTask, CrmTaskFormData,
  CrmOpportunity, CrmOpportunityFormData,
  CrmRelationshipStatus, TimelineEvent,
} from '../types'

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function fetchContacts(customerId: string): Promise<CrmContact[]> {
  const res = await fetch(`/api/crm/contacts?customerId=${customerId}`)
  if (!res.ok) throw new Error('Failed to fetch contacts')
  return res.json()
}

export async function createContact(customerId: string, data: CrmContactFormData): Promise<Response> {
  return fetch('/api/crm/contacts', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...data, customerId }),
  })
}

export async function updateContact(id: string, data: Partial<CrmContactFormData>): Promise<Response> {
  return fetch(`/api/crm/contacts/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
}

export async function deleteContact(id: string): Promise<Response> {
  return fetch(`/api/crm/contacts/${id}`, { method: 'DELETE' })
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export async function fetchInteractions(customerId: string): Promise<CrmInteraction[]> {
  const res = await fetch(`/api/crm/interactions?customerId=${customerId}`)
  if (!res.ok) throw new Error('Failed to fetch interactions')
  return res.json()
}

export async function createInteraction(customerId: string, data: CrmInteractionFormData): Promise<Response> {
  return fetch('/api/crm/interactions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...data, customerId }),
  })
}

export async function updateInteraction(id: string, data: Partial<CrmInteractionFormData>): Promise<Response> {
  return fetch(`/api/crm/interactions/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
}

export async function deleteInteraction(id: string): Promise<Response> {
  return fetch(`/api/crm/interactions/${id}`, { method: 'DELETE' })
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function fetchTasks(customerId: string): Promise<CrmTask[]> {
  const res = await fetch(`/api/crm/tasks?customerId=${customerId}`)
  if (!res.ok) throw new Error('Failed to fetch tasks')
  return res.json()
}

export async function createTask(customerId: string, data: CrmTaskFormData): Promise<Response> {
  return fetch('/api/crm/tasks', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...data, customerId }),
  })
}

export async function updateTask(id: string, data: Partial<CrmTaskFormData & { status: string }>): Promise<Response> {
  return fetch(`/api/crm/tasks/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
}

export async function deleteTask(id: string): Promise<Response> {
  return fetch(`/api/crm/tasks/${id}`, { method: 'DELETE' })
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function fetchOpportunities(customerId: string): Promise<CrmOpportunity[]> {
  const res = await fetch(`/api/crm/opportunities?customerId=${customerId}`)
  if (!res.ok) throw new Error('Failed to fetch opportunities')
  return res.json()
}

export async function createOpportunity(customerId: string, data: CrmOpportunityFormData): Promise<Response> {
  return fetch('/api/crm/opportunities', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ...data, customerId }),
  })
}

export async function updateOpportunity(id: string, data: Partial<CrmOpportunityFormData>): Promise<Response> {
  return fetch(`/api/crm/opportunities/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
}

export async function deleteOpportunity(id: string): Promise<Response> {
  return fetch(`/api/crm/opportunities/${id}`, { method: 'DELETE' })
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export async function fetchTimeline(customerId: string, limit = 50): Promise<TimelineEvent[]> {
  const res = await fetch(`/api/crm/timeline?customerId=${customerId}&limit=${limit}`)
  if (!res.ok) throw new Error('Failed to fetch timeline')
  return res.json()
}

// ─── Relationship Status ──────────────────────────────────────────────────────

export async function fetchRelationshipStatus(customerId: string): Promise<CrmRelationshipStatus | null> {
  const res = await fetch(`/api/crm/relationship-status/${customerId}`)
  if (!res.ok) return null
  return res.json()
}

export async function updateRelationshipStatus(customerId: string, data: Partial<CrmRelationshipStatus>): Promise<Response> {
  return fetch(`/api/crm/relationship-status/${customerId}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  })
}
