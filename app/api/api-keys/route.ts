// GET/POST /api/api-keys
// Správa API klíčů pro přístup externích systémů (e-shop) k ERP API

import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// GET /api/api-keys — seznam všech klíčů (bez zobrazení samotného klíče)
export async function GET() {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        // Klíč zobrazíme jen jako preview (poslední 4 znaky)
        key: true,
      },
    })

    // Zamaskuj klíč — zobraz jen prefix a poslední 4 znaky
    const masked = keys.map((k) => ({
      id: k.id,
      name: k.name,
      isActive: k.isActive,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      keyPreview: `erp_live_...${k.key.slice(-4)}`,
    }))

    return NextResponse.json(masked)
  } catch (error) {
    console.error('Chyba při načítání API klíčů:', error)
    return NextResponse.json({ error: 'Nepodařilo se načíst API klíče' }, { status: 500 })
  }
}

// POST /api/api-keys — vytvoří nový API klíč a vrátí ho JEDNOU (pak se nezobrazí)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Chybí název klíče' }, { status: 400 })
    }

    // Vygeneruj kryptograficky bezpečný klíč: erp_live_<32 hex znaků>
    const rawKey = crypto.randomBytes(32).toString('hex')
    const key = `erp_live_${rawKey}`

    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        key,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    })

    // Vrátíme celý klíč POUZE při vytvoření — poté ho nelze získat zpět
    return NextResponse.json(
      { ...apiKey, key, keyPreview: `erp_live_...${rawKey.slice(-4)}` },
      { status: 201 }
    )
  } catch (error) {
    console.error('Chyba při vytváření API klíče:', error)
    return NextResponse.json({ error: 'Nepodařilo se vytvořit API klíč' }, { status: 500 })
  }
}
