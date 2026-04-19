// lib/apiKeyAuth.ts
// Helper pro ověření API klíče v externích endpointech
// Použití: const result = await verifyApiKey(request)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface ApiKeyAuthResult {
  success: true
  keyId: string
  keyName: string
}

export interface ApiKeyAuthError {
  success: false
  response: NextResponse
}

export type ApiKeyAuth = ApiKeyAuthResult | ApiKeyAuthError

/**
 * Ověří API klíč z hlavičky X-API-Key nebo Authorization: Bearer <key>
 * Aktualizuje lastUsedAt při úspěšném ověření
 */
export async function verifyApiKey(request: NextRequest): Promise<ApiKeyAuth> {
  // Přečti klíč z hlavičky
  let key = request.headers.get('X-API-Key')

  // Fallback na Authorization: Bearer <key>
  if (!key) {
    const auth = request.headers.get('Authorization')
    if (auth?.startsWith('Bearer ')) {
      key = auth.slice(7)
    }
  }

  if (!key) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Chybí API klíč. Použijte hlavičku X-API-Key nebo Authorization: Bearer <key>' },
        { status: 401 }
      ),
    }
  }

  // Najdi klíč v databázi
  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    select: { id: true, name: true, isActive: true },
  })

  if (!apiKey) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Neplatný API klíč' },
        { status: 401 }
      ),
    }
  }

  if (!apiKey.isActive) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'API klíč je deaktivovaný' },
        { status: 403 }
      ),
    }
  }

  // Aktualizuj lastUsedAt (fire-and-forget, nezpomaluje response)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return {
    success: true,
    keyId: apiKey.id,
    keyName: apiKey.name,
  }
}

const ALLOWED_ORIGINS = [
  process.env.ESHOP_URL,
  process.env.NEXTAUTH_URL,
].filter(Boolean) as string[]

/**
 * CORS hlavičky pro externí endpointy
 */
export function corsHeaders(origin?: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] ?? '')
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
  }
}

/**
 * Handler pro OPTIONS preflight request
 */
export function handleOptions(request: NextRequest) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  })
}
