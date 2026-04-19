# Testing Workflow - Výdejky a Synchronizace

Tento dokument popisuje, jak testovat systém výdejek při opakovaném mazání a synchronizaci transakcí.

## 🔄 Typický testovací workflow

### 1. **Smažeš transakce ze SumUp a synchronizuješ znovu**
```
Transakce se smažou → Synchronizace vytvoří nové transakce → Automaticky vytvoří výdejky
```

### 2. **Automatické vytváření výdejek**
Výdejky se vytváří automaticky při synchronizaci transakcí:
- ✅ **HOTOVOSTNÍ transakce** (s line_items) → vytvoří výdejku
- ✅ **KARETNÍ transakce** (z Receipts API) → vytvoří výdejku
- ✅ **Všechny transakce** (i bez položek) → vytvoří výdejku s poznámkou

### 3. **Ochrana proti duplicitám**
Díky checku v `createDeliveryNoteFromTransaction`:
- ✅ Pokud transakce UŽ MÁ výdejku → nepřidá se nová
- ✅ Pokud transakce NEMÁ výdejku → vytvoří se nová

## 🗑️ Jak smazat všechny výdejky a resetovat číslování

### Metoda 1: Skript (DOPORUČENO)
```bash
npx tsx scripts/reset-delivery-notes.ts
```

**Co udělá:**
- Smaže VŠECHNY výdejky
- Smaže všechny položky výdejek
- Resetuje číslování na 0
- Další výdejka bude VY-20250001

### Metoda 2: UI (hromadné mazání)
1. Otevři **Výdejky** v menu
2. Označ výdejky pomocí checkboxů (nebo "Select All" pro všechny)
3. Klikni **Smazat vybrané (X)**
4. Potvrdí

**Tip:** Číslo transakce je proklikatelné - kliknutím přejdeš na detail transakce

## 🔁 Kompletní reset workflow

### Scénář: Resetovat vše a znovu vytvořit výdejky

```bash
# 1. Smaž všechny výdejky a resetuj číslování
npx tsx scripts/reset-delivery-notes.ts

# 2. Vytvoř výdejky pro všechny transakce
npx tsx scripts/migrate-delivery-notes.ts

# Výsledek:
# - Všechny transakce mají nové výdejky
# - Číslování začíná od VY-20250001
```

## 📊 Kontrolní skripty

### Zkontrolovat, které transakce NEMAJÍ výdejku
```bash
npx tsx scripts/check-missing-delivery-notes.ts
```

**Ukáže:**
- Počet transakcí bez výdejky
- Seznam transakcí S položkami (vytvoří výdejku)
- Seznam transakcí BEZ položek (přeskoč)

## ⚙️ Jak funguje automatická synchronizace

### Při úpravě transakce (doplnění položek)
```
Transakce → Upravit položky → Uložit
                                  ↓
                    Automaticky synchronizuje položky do výdejky
```

**Implementace:** `app/api/transactions/[id]/route.ts` (PATCH endpoint)

### Při vytvoření nové transakce
```
Nová transakce → Uložit → Automaticky vytvoří výdejku
```

**Implementace:** `app/api/transactions/route.ts` (POST endpoint)

## 🛡️ Ochrana proti duplicitám

### Check v `lib/createDeliveryNote.ts`
```typescript
// Kontrola, že transakce ještě nemá výdejku
const existingDeliveryNote = await prisma.deliveryNote.findUnique({
  where: { transactionId: transaction.id }
})

if (existingDeliveryNote) {
  console.warn(`Transaction ${transactionId} already has a delivery note`)
  return existingDeliveryNote // Vrátí existující, nevytvoří novou
}
```

## 📝 Poznámky pro testování

### ✅ Bezpečné operace (neduplikují se)
- Synchronizace transakcí ze SumUp (check je v `createDeliveryNoteFromTransaction`)
- Opakované vytvoření transakce s existujícím ID

### ⚠️ Pozor na
- Manuální vytváření výdejek v UI (může vytvořit duplicitu)
- Ruční SQL dotazy (obejdou checky)

## 🚀 Quick commands

```bash
# Smazat všechny výdejky + reset
npx tsx scripts/reset-delivery-notes.ts

# Vytvořit výdejky pro všechny transakce
npx tsx scripts/migrate-delivery-notes.ts

# Zkontrolovat chybějící výdejky
npx tsx scripts/check-missing-delivery-notes.ts
```

## 💡 Pro produkci

Až budeš hotový s testováním, **ZMĚŇ** v `app/api/delivery-notes/[id]/route.ts`:

```typescript
// DELETE endpoint - změň z:
// DOČASNĚ: Povolit mazání všech výdejek (pro testování)

// Na:
if (deliveryNote.status !== 'draft') {
  return NextResponse.json(
    { error: 'Lze smazat pouze výdejky ve stavu "draft"' },
    { status: 400 }
  )
}
```

Tím ochráníš již zpracované výdejky před náhodným smazáním.
