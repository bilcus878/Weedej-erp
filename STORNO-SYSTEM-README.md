# 🇨🇿 STORNO Systém + ON-COMMIT Číslování

## ✅ Co tento systém řeší?

### 1. **Spojitá číselná řada** (požadavek účetních standardů)
- Čísla dokumentů **NIKDY** nepřeskakují
- Číslo se přidělí **až při úspěšném uložení** (ON-COMMIT)
- Atomický inkrement v databázi zabraňuje duplicitám

### 2. **STORNO místo mazání**
- Doklady se **nikdy nemažou** z databáze
- Místo toho se označí jako "storno" s důvodem
- Stornovaný doklad zůstává v seznamu (přeškrtnutý)

### 3. **Automatický přepočet skladu**
- **Storno příjemky** → Zboží se odečte ze skladu
- **Storno výdejky** → Zboží se vrátí na sklad
- Vše automaticky, žádné ruční úpravy

---

## 🚀 Instalace

### Krok 1: Spusť setup

Dvojklik na:
```
setup-storno.bat
```

Zadáš heslo pro PostgreSQL a systém se nainstaluje.

### Krok 2: Aktualizuj Prisma schema

```bash
npx prisma generate
```

---

## 📊 Jak to funguje?

### ON-COMMIT Číslování

#### ❌ ŠPATNĚ (starý systém):
```
1. Uživatel otevře formulář → Dostane PR20250001
2. Uživatel nevytvoří příjemku (zavře formulář)
3. Další příjemka → PR20250002
❌ Číslo 001 chybí! (mezera v číslování)
```

#### ✅ SPRÁVNĚ (nový systém):
```
1. Uživatel otevře formulář → Vidí NÁHLED "PR20250001"
2. Uživatel klikne "Vytvořit" → Číslo se PŘIDĚLÍ atomicky v databázi
3. Pokud vytvoření selže → Číslo se NEPŘIDĚLÍ (rollback transakce)
4. Další příjemka → PR20250001 (nebo 002 pokud předchozí uspěla)
✅ Žádné mezery!
```

### STORNO Systém

#### ❌ ŠPATNĚ (mazání):
```
Příjemky: 001, 002, 004, 005
         Kde je 003? Byla smazána? Nebo chyba v číslování?
         ❌ Účetní kontrola selže!
```

#### ✅ SPRÁVNĚ (storno):
```
Příjemky:
001 - Aktivní
002 - Aktivní
003 - STORNO (Důvod: Chybně naskladněno)
004 - Aktivní
005 - Aktivní

✅ Všechna čísla viditelná, audit trail kompletní!
```

---

## 💻 Použití v Kódu

### Vytvoření příjemky s ON-COMMIT číslováním

```typescript
import { prisma } from '@/lib/prisma'
import { getNextDocumentNumber } from '@/lib/documentSeries'

// POST /api/receipts
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // ✅ Vše v transakci!
    const receipt = await prisma.$transaction(async (tx) => {
      // 1. Atomicky získej DALŠÍ číslo (uvnitř transakce!)
      const receiptNumber = await getNextDocumentNumber('receipt', tx)

      // 2. Vytvoř příjemku
      const receipt = await tx.receipt.create({
        data: {
          receiptNumber, // např. "PR20250001"
          supplierId: body.supplierId,
          receiptDate: new Date(body.receiptDate),
          items: {
            create: body.items
          }
        },
        include: {
          supplier: true,
          items: { include: { product: true } }
        }
      })

      // 3. Pokud vše proběhlo OK, commit transakce
      return receipt
    })

    // Pokud došlo k chybě, Prisma automaticky rollbackne
    // a číslo se NEPŘIDĚLÍ (zůstane 0)

    return NextResponse.json(receipt, { status: 201 })

  } catch (error) {
    // Chyba → číslo se nezvýšilo
    return NextResponse.json(
      { error: 'Nepodařilo se vytvořit příjemku' },
      { status: 500 }
    )
  }
}
```

### STORNO příjemky

```typescript
import { stornoReceipt } from '@/lib/storno'

// POST /api/receipts/[id]/storno
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { reason, userId } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Důvod storna je povinný' },
        { status: 400 }
      )
    }

    // Stornuj příjemku
    await stornoReceipt(params.id, reason, userId)

    return NextResponse.json({
      message: 'Příjemka stornována',
      reason
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}
```

### STORNO výdejky

```typescript
import { stornoDeliveryNote } from '@/lib/storno'

// POST /api/delivery-notes/[id]/storno
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { reason, userId } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Důvod storna je povinný' },
        { status: 400 }
      )
    }

    // Stornuj výdejku
    await stornoDeliveryNote(params.id, reason, userId)

    return NextResponse.json({
      message: 'Výdejka stornována',
      reason
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}
```

---

## 🎨 Frontend Změny

### Zobrazení stornovaných dokladů

```typescript
function ReceiptRow({ receipt }: { receipt: Receipt }) {
  const isStorno = receipt.status === 'storno'

  return (
    <div className={isStorno ? 'opacity-50 line-through' : ''}>
      <span>{receipt.receiptNumber}</span>
      {isStorno && (
        <span className="text-red-600 ml-2">
          STORNO: {receipt.stornoReason}
        </span>
      )}
    </div>
  )
}
```

### Tlačítko STORNO (místo DELETE)

```typescript
{receipt.status === 'active' && (
  <button
    onClick={() => handleStorno(receipt.id)}
    className="text-red-600"
  >
    Stornovat
  </button>
)}

{receipt.status === 'storno' && (
  <span className="text-gray-400">Stornováno</span>
)}
```

### Modal pro zadání důvodu storna

```typescript
function StornoModal({ receiptId, onClose }: StornoModalProps) {
  const [reason, setReason] = useState('')

  async function handleSubmit() {
    if (!reason.trim()) {
      alert('Zadejte důvod storna')
      return
    }

    await fetch(`/api/receipts/${receiptId}/storno`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    })

    onClose()
  }

  return (
    <div className="modal">
      <h2>Stornovat příjemku</h2>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Zadejte důvod storna (povinné)..."
        rows={3}
      />
      <button onClick={handleSubmit}>Stornovat</button>
      <button onClick={onClose}>Zrušit</button>
    </div>
  )
}
```

---

## 📋 Status Hodnoty

| Status | Význam | Lze stornovat? | Lze smazat? |
|--------|--------|----------------|-------------|
| `draft` | Koncept | ❌ Ne | ✅ Ano |
| `active` | Aktivní doklad | ✅ Ano | ❌ Ne |
| `storno` | Stornovaný | ❌ Ne | ❌ Ne |

---

## 🔍 Audit Trail

### SQL dotaz pro kontrolu číselné řady

```sql
SELECT
  "receiptNumber",
  "status",
  "stornoReason",
  "createdAt",
  "stornoAt"
FROM "Receipt"
ORDER BY "receiptNumber";
```

Výsledek:
```
PR20250001 | active | NULL           | 2025-01-20 | NULL
PR20250002 | storno | Chybné zboží   | 2025-01-21 | 2025-01-22
PR20250003 | active | NULL           | 2025-01-22 | NULL
PR20250004 | active | NULL           | 2025-01-23 | NULL
```

✅ Všechna čísla v řadě, žádné mezery!

---

## 🎯 Co tento systém přináší?

### Pro účetní:
- ✅ Splňuje české účetní standardy
- ✅ Kompletní audit trail
- ✅ Žádné mezery v číslování
- ✅ Viditelné storna s důvody

### Pro správce skladu:
- ✅ Automatický přepočet stavu při stornu
- ✅ Žádné ruční úpravy skladu
- ✅ Historie všech pohybů

### Pro vývojáře:
- ✅ Jednoduchá implementace
- ✅ Atomické operace (žádné race conditions)
- ✅ Transak

ční bezpečnost
- ✅ Snadné testování

---

## 🧪 Testování

1. Vytvoř příjemku → Zkontroluj číslo (PR20250001)
2. Vytvoř další příjemku → Zkontroluj číslo (PR20250002)
3. Stornuj první příjemku → Zkontroluj stav skladu
4. Vytvoř třetí příjemku → Zkontroluj číslo (PR20250003)
5. Zkontroluj, že všechna čísla 001-003 existují v databázi

✅ Žádné mezery, všechno sedí!
