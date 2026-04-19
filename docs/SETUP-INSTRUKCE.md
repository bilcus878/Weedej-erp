# 🚀 SETUP Instrukce - Kompletní Průvodce

## ✅ Co je připraveno?

### 1. **STORNO Systém** 🇨🇿
- Doklady se **NIKDY** nemažou - pouze stornují
- Automatický přepočet skladu při stornu
- Splňuje české účetní standardy

### 2. **ON-COMMIT Číslování** 🔢
- Čísla **NIKDY** nepřeskakují
- Atomické přidělování (bez duplicit)
- Číslo se přidělí až při úspěšném uložení

### 3. **Reset Databáze** 🗑️
- Tlačítko v Nastavení
- Zachová produkty, zákazníky, dodavatele
- Smaže všechny doklady a sklad

---

## 🎯 INSTALACE (Jednoduchá!)

### Jediný krok: Spusť setup

Dvojklik na:
```
scripts\setup.bat
```

**Co to udělá (ALL-IN-ONE):**
- ✅ Nainstaluje závislosti (npm install)
- ✅ Vygeneruje Prisma Client
- ✅ Vytvoří databázové tabulky (prisma db push)
- ✅ Nainstaluje STORNO systém a ON-COMMIT číslování
- ✅ Použije databázi z `.env` (ŽÁDNÉ heslo!)

### Hotovo! ✅

Spusť aplikaci:
```bash
npm run dev
```

Nebo použij:
```
scripts\start.bat
```

---

## 📋 Jak to použít?

### Reset Databáze

1. Jdi do **Nastavení** (menu)
2. Scrolluj dolů do **"Nebezpečná zóna"**
3. Klikni **"Reset databáze"**
4. Potvrď kliknutím na **"ANO, resetovat databázi"**

**Co se zachová:**
- ✅ Nastavení firmy (IČ, DIČ, adresa...)
- ✅ Katalog produktů
- ✅ Kategorie
- ✅ Zákazníci
- ✅ Dodavatelé

**Co se smaže:**
- 🗑️ Objednávky
- 🗑️ Příjemky
- 🗑️ Výdejky
- 🗑️ Faktury
- 🗑️ Skladové pohyby
- 🗑️ Rezervace
- 🗑️ Číselné řady (začnou od 001)

---

## 🔢 Jak funguje číslování?

### Před (špatně):
```
1. Otevřu formulář → Dostanu PR20250001
2. Zavřu formulář (nevytvořím)
3. Další příjemka → PR20250002
❌ Číslo 001 chybí!
```

### Nyní (správně):
```
1. Otevřu formulář → Vidím NÁHLED "PR20250001"
2. Kliknu "Vytvořit" → Číslo se PŘIDĚLÍ
3. Pokud vytvoření selže → Číslo se NEPOUŽIJE
4. Další příjemka → PR20250001 (nebo 002 pokud předchozí uspěla)
✅ Žádné mezery!
```

### Formát čísel:

| Typ dokladu | Prefix | Příklad |
|-------------|--------|---------|
| Příjemka | PR | PR20250001 |
| Výdejka | VYD | VYD20250042 |
| Objednávka dodavateli | OBJ | OBJ20250015 |
| Objednávka zákazníka | ZAK | ZAK20250123 |
| Přijatá faktura | FP | FP20250008 |
| Vystavená faktura | FAK | FAK20250099 |

---

## 🚫 STORNO místo mazání

### Proč?

**Podle českých účetních standardů:**
- Číselná řada MUSÍ být spojitá (bez mezer)
- Doklady se NESMÍ mazat
- Místo toho se **stornují** s uvedením důvodu

### Jak to funguje?

#### Storno příjemky:
1. Příjemka se označí jako **"storno"**
2. Zboží se **odečte** ze skladu (inverzní operace)
3. V seznamu zůstane viditelná (přeškrtnutá)

#### Storno výdejky:
1. Výdejka se označí jako **"storno"**
2. Zboží se **vrátí** na sklad
3. V seznamu zůstane viditelná (přeškrtnutá)

### Příklad:

```
Příjemky:
PR20250001 - Aktivní
PR20250002 - Aktivní
PR20250003 - STORNO (Důvod: Chybně naskladněno)
PR20250004 - Aktivní
PR20250005 - Aktivní

✅ Všechna čísla viditelná!
✅ Audit trail kompletní!
✅ Účetní kontrola projde!
```

---

## 🛠️ Pro vývojáře

### Použití v kódu:

```typescript
import { getNextDocumentNumber } from '@/lib/documentSeries'

// VŽDY v transakci!
const receipt = await prisma.$transaction(async (tx) => {
  // 1. Získej číslo (ON-COMMIT)
  const receiptNumber = await getNextDocumentNumber('receipt', tx)

  // 2. Vytvoř doklad
  return await tx.receipt.create({
    data: {
      receiptNumber, // PR20250001
      // ... další data
    }
  })
})

// Pokud transakce selže → číslo se NEPOUŽIJE
```

### STORNO logika:

```typescript
import { stornoReceipt } from '@/lib/storno'

// Stornuj příjemku
await stornoReceipt(
  receiptId,
  'Chybně naskladněno', // důvod (povinný!)
  'admin' // user (volitelné)
)
```

---

## 📊 Databázové tabulky

### DocumentSeries

```sql
CREATE TABLE "DocumentSeries" (
  "id" TEXT PRIMARY KEY,
  "documentType" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "lastNumber" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),

  UNIQUE("documentType", "year")
);
```

### Storno pole v Receipt a DeliveryNote

```sql
ALTER TABLE "Receipt"
ADD COLUMN "stornoReason" TEXT,
ADD COLUMN "stornoAt" TIMESTAMP,
ADD COLUMN "stornoBy" TEXT;
```

---

## ❓ Řešení problémů

### Aplikace hází errory?

**Nejspíš jsi nespustil setup!**

```bash
# Spusť:
setup-storno.bat

# Pak:
npx prisma generate

# Pak restartuj dev server
```

### Číslování nefunguje?

**Zkontroluj, že DocumentSeries tabulka existuje:**

```sql
SELECT * FROM "DocumentSeries";
```

Pokud neexistuje → spusť `setup-storno.bat`

### Reset DB nefunguje?

**Zkontroluj console v browseru.**

Endpoint: `/api/settings/reset-database`

---

## 🎉 Hotovo!

Teď máš:
- ✅ Profesionální ERP systém
- ✅ České účetní standardy
- ✅ STORNO místo mazání
- ✅ ON-COMMIT číslování
- ✅ Reset databáze v Nastavení

**Enjoy! 🚀**
