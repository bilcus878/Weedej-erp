// API Endpoint pro uživatelské nastavení
// URL: http://localhost:3000/api/settings

import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/settings - Získat nastavení
export async function GET() {
  try {
    // Settings má jen jeden záznam s ID "default"
    let settings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    // Pokud ještě neexistuje, vytvoř výchozí
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: 'default',
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Chyba při načítání nastavení:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se načíst nastavení' },
      { status: 500 }
    )
  }
}

// PATCH /api/settings - Aktualizovat nastavení
export async function PATCH(request: Request) {
  try {
    const body = await request.json()

    // Ujisti se, že settings existuje
    const existingSettings = await prisma.settings.findUnique({
      where: { id: 'default' },
    })

    // 🔥 KRITICKÉ: Detekuj změnu isVatPayer
    const isVatPayerChanged =
      body.isVatPayer !== undefined &&
      existingSettings &&
      body.isVatPayer !== existingSettings.isVatPayer

    let settings
    if (existingSettings) {
      // Aktualizuj existující
      settings = await prisma.settings.update({
        where: { id: 'default' },
        data: body,
      })
    } else {
      // Vytvoř nový (pokud ještě neexistuje)
      settings = await prisma.settings.create({
        data: {
          id: 'default',
          ...body,
        },
      })
    }

    // ✅ AUTOMATICKÁ AKTUALIZACE PRODUKTŮ při změně isVatPayer
    if (isVatPayerChanged) {
      const newIsVatPayer = body.isVatPayer

      console.log('='.repeat(80))
      console.log(`🔄 Změna statusu plátce DPH: ${existingSettings.isVatPayer} → ${newIsVatPayer}`)
      console.log('='.repeat(80))

      if (newIsVatPayer === false) {
        // 🚫 PŘEPNUTÍ NA NEPLÁTCE → Nastav všechny produkty na vatRate = 0
        console.log('📦 Aktualizuji všechny produkty na vatRate = 0 (neplátce DPH)...')

        const result = await prisma.product.updateMany({
          data: { vatRate: 0 }
        })

        console.log(`✅ Aktualizováno ${result.count} produktů na vatRate = 0`)
      } else {
        // ✅ PŘEPNUTÍ NA PLÁTCE → Nastav všechny produkty na vatRate = 21% (výchozí)
        console.log('📦 Aktualizuji všechny produkty na vatRate = 21% (plátce DPH)...')

        const result = await prisma.product.updateMany({
          data: { vatRate: 21 }
        })

        console.log(`✅ Aktualizováno ${result.count} produktů na vatRate = 21%`)
      }

      console.log('='.repeat(80))
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Chyba při aktualizaci nastavení:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se aktualizovat nastavení' },
      { status: 500 }
    )
  }
}
