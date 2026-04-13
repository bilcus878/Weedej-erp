# 📝 Příklad Implementace - Správné Číslování

## Příklad: Upravíme příjemky aby používaly nový systém

### 1. API Endpoint pro náhled čísla

`app/api/receipts/next-number/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { previewNextDocumentNumber } from '@/lib/documentNumber'

// GET /api/receipts/next-number - POUZE náhled, NEREZERVUJE!
export async function GET() {
  try {
    const nextNumber = await previewNextDocumentNumber('receipt')

    return NextResponse.json({
      nextNumber // např. "PR-20250001"
    })
  } catch (error) {
    console.error('Chyba při načítání náhledu čísla:', error)
    return NextResponse.json(
      { error: 'Nepodařilo se získat náhled čísla' },
      { status: 500 }
    )
  }
}
```

### 2. API Endpoint pro vytvoření příjemky

`app/api/receipts/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  reserveDocumentNumber,
  markDocumentNumberUsed,
  cancelDocumentNumberReservation
} from '@/lib/documentNumber'

// POST /api/receipts - Vytvoř příjemku
export async function POST(request: Request) {
  let reservationId: string | undefined

  try {
    const body = await request.json()

    // 1. REZERVUJ číslo (nikdo jiný ho nemůže dostat)
    const { fullNumber, reservationId: resId } = await reserveDocumentNumber('receipt')
    reservationId = resId

    // 2. Vytvoř příjemku s rezervovaným číslem
    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber: fullNumber,
        supplierId: body.supplierId,
        receiptDate: new Date(body.receiptDate),
        note: body.note || null,
        items: {
          create: body.items || []
        }
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    // 3. Označ číslo jako použité
    await markDocumentNumberUsed(reservationId, receipt.id)

    return NextResponse.json(receipt, { status: 201 })

  } catch (error) {
    console.error('Chyba při vytváření příjemky:', error)

    // 4. DŮLEŽITÉ: Pokud se něco pokazí → zruš rezervaci!
    if (reservationId) {
      await cancelDocumentNumberReservation(reservationId)
    }

    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit příjemku' },
      { status: 500 }
    )
  }
}
```

### 3. Frontend (React Component)

`app/receipts/page.tsx`

```typescript
'use client'

import { useState } from 'react'

export default function ReceiptsPage() {
  const [receiptNumber, setReceiptNumber] = useState('')
  const [loading, setLoading] = useState(false)

  // Načti náhled čísla když se otevře formulář
  async function handleOpenForm() {
    try {
      const res = await fetch('/api/receipts/next-number')
      const data = await res.json()
      setReceiptNumber(data.nextNumber) // např. "PR-20250001"
      setShowForm(true)
    } catch (error) {
      console.error('Chyba při načítání čísla:', error)
      alert('Nepodařilo se načíst číslo příjemky')
    }
  }

  // Vytvoř příjemku (rezervuje číslo automaticky v backendu)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          receiptDate,
          note,
          items
        })
      })

      if (!res.ok) throw new Error('Chyba při vytváření příjemky')

      const receipt = await res.json()
      alert(`Příjemka ${receipt.receiptNumber} vytvořena!`)
      setShowForm(false)
      loadData()

    } catch (error) {
      console.error('Chyba:', error)
      alert('Nepodařilo se vytvořit příjemku')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={handleOpenForm}>
        Nová příjemka
      </button>

      {showForm && (
        <form onSubmit={handleSubmit}>
          <div>
            <label>Číslo příjemky</label>
            <input
              value={receiptNumber}
              disabled // Číslo nelze měnit!
            />
          </div>

          {/* ... další pole ... */}

          <button type="submit" disabled={loading}>
            {loading ? 'Vytvářím...' : 'Vytvořit příjemku'}
          </button>
        </form>
      )}
    </div>
  )
}
```

## Klíčové body:

1. **Frontend** volá `/next-number` pro NÁHLED (nerezervuje)
2. **Backend** při POST automaticky REZERVUJE číslo
3. Pokud vytvoření selže → Backend automaticky ZRUŠÍ rezervaci
4. Číslo dokumentu v UI je **disabled** (uživatel ho nemůže měnit)

## Co TO dá?

✅ Žádné mezery v číslování
✅ Audit trail - vidíš všechny rezervace (i zrušené)
✅ Bezpečnost - dva uživatelé nikdy nedostanou stejné číslo
✅ Compliance - splníš požadavky účetních standardů
