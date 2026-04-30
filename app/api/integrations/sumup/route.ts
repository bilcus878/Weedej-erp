import { NextResponse }      from 'next/server'
import { getServerSession }  from 'next-auth'
import { authOptions }       from '@/lib/auth'
import { prisma }            from '@/lib/prisma'
import { encrypt, maskKey }  from '@/lib/integrationCrypto'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const config = await prisma.integrationConfig.findUnique({ where: { provider: 'sumup' } })
    if (!config) return NextResponse.json({ isConfigured: false, maskedKey: null, updatedAt: null, updatedBy: null })

    return NextResponse.json({
      isConfigured: true,
      maskedKey:    config.maskedKey,
      updatedAt:    config.updatedAt,
      updatedBy:    config.updatedBy,
    })
  } catch (err) {
    console.error('[GET /api/integrations/sumup]', err)
    return NextResponse.json({ error: 'Interní chyba serveru' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const raw  = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''

    if (raw.length < 10) {
      return NextResponse.json({ error: 'Neplatný API klíč — musí mít alespoň 10 znaků' }, { status: 400 })
    }

    if (!process.env.SETTINGS_ENCRYPTION_KEY) {
      return NextResponse.json(
        { error: 'SETTINGS_ENCRYPTION_KEY není nastavena na serveru. Přidejte ji do proměnných prostředí a restartujte server.' },
        { status: 500 },
      )
    }

    const encKey    = encrypt(raw)
    const maskedKey = maskKey(raw)
    const updatedBy = session.user?.email ?? null

    await prisma.integrationConfig.upsert({
      where:  { provider: 'sumup' },
      update: { encKey, maskedKey, updatedBy },
      create: { provider: 'sumup', encKey, maskedKey, updatedBy },
    })

    await prisma.auditLog.create({
      data: {
        userId:     (session.user as any)?.id ?? null,
        username:   session.user?.email       ?? null,
        actionType: 'UPDATE',
        entityName: 'IntegrationConfig',
        entityId:   'sumup',
        fieldName:  'apiKey',
        newValue:   maskedKey,
        module:     'settings',
      },
    })

    return NextResponse.json({ ok: true, maskedKey })
  } catch (err) {
    console.error('[PUT /api/integrations/sumup]', err)
    const message = err instanceof Error ? err.message : 'Interní chyba serveru'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
