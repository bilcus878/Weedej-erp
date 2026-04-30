// GET /api/crm/timeline?customerId=&limit=
// Returns a unified, sorted activity feed for a customer.
// Merges: CrmInteractions, CrmTasks, CustomerOrders, IssuedInvoices

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/routeGuard'
import { Permission } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const guard = await requirePermission(Permission.CRM_VIEW_INTERACTIONS, req)
  if (!guard.ok) return guard.error

  const { searchParams } = req.nextUrl
  const customerId = searchParams.get('customerId')
  if (!customerId) return NextResponse.json({ error: 'customerId required' }, { status: 400 })

  const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100)

  try {
    const [interactions, tasks, orders, invoices, opportunities] = await Promise.all([
      prisma.crmInteraction.findMany({
        where:   { customerId },
        include: { createdBy: { select: { id: true, name: true } }, contact: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { occurredAt: 'desc' },
        take:    limit,
      }),
      prisma.crmTask.findMany({
        where:   { customerId },
        include: { assignedTo: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take:    limit,
      }),
      prisma.customerOrder.findMany({
        where:   { customerId },
        orderBy: { orderDate: 'desc' },
        take:    limit,
        select:  { id: true, orderNumber: true, orderDate: true, status: true, totalAmount: true },
      }),
      prisma.issuedInvoice.findMany({
        where:   { customerId },
        orderBy: { invoiceDate: 'desc' },
        take:    limit,
        select:  { id: true, invoiceNumber: true, invoiceDate: true, status: true, totalAmount: true, paymentStatus: true },
      }),
      prisma.crmOpportunity.findMany({
        where:   { customerId },
        orderBy: { createdAt: 'desc' },
        take:    limit,
        select:  { id: true, title: true, stage: true, value: true, currency: true, createdAt: true, updatedAt: true },
      }),
    ])

    type Event = { id: string; type: string; occurredAt: string; title: string; subtitle?: string; actor?: string; entityId: string; entityType: string; meta: Record<string, unknown> }

    const events: Event[] = [
      ...interactions.map(i => ({
        id: i.id, type: 'interaction', occurredAt: i.occurredAt.toISOString(),
        title: `${typeLabel(i.type)}: ${i.subject}`,
        subtitle: i.outcome ?? undefined,
        actor: i.createdBy?.name ?? undefined,
        entityId: i.id, entityType: 'CrmInteraction',
        meta: { interactionType: i.type, direction: i.direction, durationMin: i.durationMin, contact: i.contact },
      })),
      ...tasks.map(t => ({
        id: t.id, type: 'task', occurredAt: t.completedAt?.toISOString() ?? t.createdAt.toISOString(),
        title: `Úkol: ${t.title}`,
        subtitle: `${statusLabel(t.status)} · ${priorityLabel(t.priority)}`,
        actor: t.createdBy?.name ?? undefined,
        entityId: t.id, entityType: 'CrmTask',
        meta: { taskStatus: t.status, priority: t.priority, dueAt: t.dueAt, assignedTo: t.assignedTo },
      })),
      ...orders.map(o => ({
        id: o.id, type: 'order', occurredAt: o.orderDate.toISOString(),
        title: `Objednávka ${o.orderNumber}`,
        subtitle: `${o.totalAmount} Kč`,
        entityId: o.id, entityType: 'CustomerOrder',
        meta: { orderNumber: o.orderNumber, status: o.status, totalAmount: o.totalAmount },
      })),
      ...invoices.map(i => ({
        id: i.id, type: 'invoice', occurredAt: i.invoiceDate.toISOString(),
        title: `Faktura ${i.invoiceNumber}`,
        subtitle: `${i.totalAmount} Kč · ${i.paymentStatus === 'paid' ? 'Uhrazena' : 'Neuhrazena'}`,
        entityId: i.id, entityType: 'IssuedInvoice',
        meta: { invoiceNumber: i.invoiceNumber, paymentStatus: i.paymentStatus, totalAmount: i.totalAmount },
      })),
      ...opportunities.map(o => ({
        id: o.id, type: 'opportunity', occurredAt: o.createdAt.toISOString(),
        title: `Příležitost: ${o.title}`,
        subtitle: `${stageLabel(o.stage)}${o.value ? ` · ${o.value} ${o.currency}` : ''}`,
        entityId: o.id, entityType: 'CrmOpportunity',
        meta: { stage: o.stage, value: o.value, currency: o.currency },
      })),
    ]

    events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())

    return NextResponse.json(events.slice(0, limit))
  } catch (error) {
    console.error('[CRM] timeline GET error:', error)
    return NextResponse.json({ error: 'Failed to load timeline' }, { status: 500 })
  }
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { call: 'Hovor', email: 'Email', meeting: 'Schůzka', note: 'Poznámka', visit: 'Návštěva', demo: 'Demo', other: 'Jiné' }
  return map[type] ?? type
}

function statusLabel(s: string): string {
  const map: Record<string, string> = { open: 'Otevřený', in_progress: 'Probíhá', done: 'Hotový', cancelled: 'Zrušený' }
  return map[s] ?? s
}

function priorityLabel(p: string): string {
  const map: Record<string, string> = { low: 'Nízká', normal: 'Normální', high: 'Vysoká', urgent: 'Urgentní' }
  return map[p] ?? p
}

function stageLabel(s: string): string {
  const map: Record<string, string> = { lead: 'Lead', qualified: 'Kvalifikovaný', proposal: 'Nabídka', negotiation: 'Jednání', won: 'Vyhráno', lost: 'Prohráno' }
  return map[s] ?? s
}
