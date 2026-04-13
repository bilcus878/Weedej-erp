# 🔢 Setup Nového Systému Číslování

## Co to řeší?

Nový systém zajišťuje, že **čísla dokumentů nikdy nepřeskakují**, i když:
- Uživatel začne vytvářet dokument, ale ho nevytvoří
- Nastane chyba při ukládání
- Uživatel otevře formulář a pak ho zavře

## Jak to funguje?

### Před (ŠPATNĚ):
```
1. Uživatel otevře formulář → Získá číslo OBJ-20250001
2. Uživatel klikne "Zrušit" → Číslo se nepoužije
3. Další uživatel vytvoří objednávku → Dostane OBJ-20250002
❌ Číslo 00000001 chybí! (mezera v číslování)
```

### Nyní (SPRÁVNĚ):
```
1. Uživatel otevře formulář → REZERVUJE OBJ-20250001
2. Uživatel klikne "Zrušit" → Rezervace se označí jako cancelled
3. Další uživatel vytvoří objednávku → REZERVUJE OBJ-20250002
✅ Máme záznam o OBJ-20250001 (cancelled) i OBJ-20250002 (used)
```

## Instalace

### 1. Spusť migraci databáze

Dvojklik na:
```
migrate.bat
```

Nebo ručně:
```bash
npx prisma migrate dev
```

### 2. Naplň tabulku existujícími dokumenty

```bash
npx tsx scripts/migrate-document-numbers.ts
```

To projde všechny existující:
- Objednávky (OBJ-*)
- Příjemky (PR-*)
- Výdejky (VYD-*)
- Objednávky zákazníků (ZAK-*)
- Přijaté faktury (FP-*)

A zaznamená je do `DocumentNumber` tabulky jako `used`.

## Použití v Kódu

### ❌ STARÉ (nefunkční):

```typescript
// NIKDY NETVOŘ ČÍSLA TAKTO!
const nextNumber = await getNextDocumentNumber('purchase_order')
// ← Pokud se vytvoření nepodaří, číslo se přeskočí!
```

### ✅ NOVÉ (správné):

```typescript
import {
  reserveDocumentNumber,
  markDocumentNumberUsed,
  cancelDocumentNumberReservation,
  previewNextDocumentNumber
} from '@/lib/documentNumber'

// 1. Zobraz náhled čísla v formuláři (NEREZERVUJE!)
const preview = await previewNextDocumentNumber('purchase_order')
// např. "OBJ-20250001"

// 2. Při kliknutí na "Vytvořit" → REZERVUJ číslo
const { fullNumber, reservationId } = await reserveDocumentNumber('purchase_order')

try {
  // 3. Vytvoř dokument
  const document = await prisma.purchaseOrder.create({
    data: {
      orderNumber: fullNumber,
      // ... další data
    }
  })

  // 4. Označ číslo jako použité
  await markDocumentNumberUsed(reservationId, document.id)

} catch (error) {
  // 5. Pokud se něco pokazí → zruš rezervaci
  await cancelDocumentNumberReservation(reservationId)
  throw error
}
```

## Typy Dokumentů

| Typ | Prefix | Příklad |
|-----|--------|---------|
| `purchase_order` | OBJ | OBJ-20250001 |
| `receipt` | PR | PR-20250001 |
| `delivery_note` | VYD | VYD-20250001 |
| `customer_order` | ZAK | ZAK-20250001 |
| `received_invoice` | FP | FP-20250001 |
| `transaction` | FAK | FAK-20250001 |

## Stavy Rezervace

- **`reserved`** - Číslo je zarezervované, čeká na použití
- **`used`** - Číslo bylo použito pro vytvoření dokumentu
- **`cancelled`** - Rezervace byla zrušena (dokument se nevytvořil)

## Monitoring

Pokud chceš vidět všechny rezervace:

```sql
SELECT
  documentType,
  fullNumber,
  status,
  createdAt,
  usedAt,
  cancelledAt
FROM "DocumentNumber"
ORDER BY createdAt DESC;
```

Najít nepoužité rezervace starší než 1 hodina:

```sql
SELECT *
FROM "DocumentNumber"
WHERE status = 'reserved'
  AND createdAt < NOW() - INTERVAL '1 hour';
```

(Tyto rezervace můžeš automaticky rušit cronem, pokud chceš)

## Reset Databáze

Pro testování můžeš resetovat databázi (zachová produkty):

```
reset-db.bat
```

Po resetu znovu spusť migraci čísel:

```bash
npx tsx scripts/migrate-document-numbers.ts
```
