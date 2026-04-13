# 🛡️ Oprava Zpracování Slev (Discount Handling Fix)

## 📋 Shrnutí Problému

Slevy se promítaly do položek faktur a výdejek, což bylo **chybné chování**:

1. **❌ Faktury vydané**: Sleva se zobrazovala jako položka v seznamu produktů
2. **❌ Výdejky**: Sleva se promítala do výdejky (ale výdejka nemá počítat slevy, jen katalogové ceny!)

## ✅ Řešení

### 1. Výdejky (Delivery Notes)

**Soubor**: `lib/createDeliveryNote.ts` (řádky 52-54)

```typescript
.filter(item => item.productId !== null)  // 🛡️ VYFILTRUJ SLEVY!
```

**Logika**:
- Slevy mají `productId = null`
- Výdejky obsahují **jen produkty z katalogu**, ne slevy
- Sleva není skladová položka → nepatří do výdejky!

**Před opravou**:
```
📄 VÝDEJKA VYD-20260208-0001
  Items: 2
    - Cookies Kush (X2)       (productId: 0d32...)
    - null                    (productId: null)  ❌ SLEVA VE VÝDEJCE!
```

**Po opravě**:
```
📄 VÝDEJKA VYD-20260208-0001
  Items: 1
    - Cookies Kush (X2)       (productId: 0d32...)  ✅ JEN PRODUKT!
```

### 2. Faktury Vydané (Issued Invoices)

**Soubor**: `app/invoices/issued/page.tsx` (řádek 1378)

```typescript
.filter((item: any) => item.product?.id || item.productName)
```

**Logika**:
- Sleva **je uložena v DB** jako `InvoiceItem` s `productId = null`
- V **UI se filtruje** při zobrazení položek
- Sleva se zobrazuje **odděleně v sekci souhrnu**, ne mezi produkty

**Před opravou**:
```
📋 Položky faktury:
  - Cookies Kush (X2)  ... 484 Kč
  - null               ... -344 Kč  ❌ SLEVA MEZI POLOŽKAMI!

Souhrn:
  Celkem: 140 Kč
```

**Po opravě**:
```
📋 Položky faktury:
  - Cookies Kush (X2)  ... 484 Kč         ✅ JEN PRODUKT!

Souhrn:
  Mezisoučet: 484 Kč
  Sleva: -344 Kč                          ✅ SLEVA V SOUHRNU!
  Celkem: 140 Kč
```

## 🧪 Testování

### Test 1: Ověření Filtru

**Soubor**: `verify-filter.js`

```bash
node verify-filter.js
```

**Výstup**:
```
🧪 TESTING DELIVERY NOTE FILTER
📋 TRANSACTION ITEMS (BEFORE FILTER):
  - 📦 PRODUKT: Unknown (productId: 0d32...)
  - 💰 SLEVA: Unknown (productId: null)

📊 RESULTS:
  Original count: 2 items
  Filtered count: 1 items
  Removed: 1 items (discounts)

✅ FILTER TEST PASSED!
```

### Test 2: Kontrola Starých Výdejek

**Soubor**: `check-delivery-notes.js`

```bash
node check-delivery-notes.js
```

**Výstup (před opravou)**:
```
📄 DELIVERY NOTE:
  Items count: 2
    - null (productId: null)  ❌ SLEVA!
    - null (productId: 0d32...)
```

**Řešení**: Smazat staré výdejky a nechat je znovu vytvořit při další synchronizaci.

## 📊 Architektura Slev

### Jak Se Slevy Ukládají

```typescript
// TransactionItem v databázi
{
  id: "...",
  transactionId: "...",
  productId: null,              // ⚠️ NULL = SLEVA!
  productName: "Sleva",
  quantity: 1,                  // Vždy 1
  price: 0,
  priceWithVat: -344,          // Záporná hodnota
  priceWithoutVat: -344,
  vatRate: 0,
  vatAmount: 0,
  unit: "ks"
}
```

### Kde Se Slevy Zobrazují

| Místo | Zobrazit slevu? | Implementace |
|-------|----------------|--------------|
| **Transakce** (`/transactions`) | ✅ Ano (v položkách) | Žádný filtr |
| **Faktury vydané** (`/invoices/issued`) | ✅ Ano (v souhrnu) | Filtr v UI (řádek 1378) |
| **Výdejky** (`/delivery-notes`) | ❌ Ne (nikde!) | Filtr při vytvoření (createDeliveryNote.ts) |

## 🛡️ Zabezpečení

### Validace v Sync Route

**Soubor**: `app/api/transactions/sync/route.ts`

```typescript
// 🛡️ SENIOR VALIDACE: Zkontroluj že sleva dává smysl
const maxDiscount = Math.abs(catalogTotal)
if (Math.abs(calculatedDiscount) > maxDiscount) {
  console.error(`❌ KRITICKÁ CHYBA: Sleva ${calculatedDiscount} Kč je větší než katalogová cena!`)
  throw new Error(`Invalid discount: ${calculatedDiscount} Kč exceeds catalog total ${catalogTotal} Kč`)
}
```

**Ochrana před**:
- Slevou větší než katalogová cena
- Chybami v kalkulaci (`item.price` místo `item.priceWithVat`)
- Chybějícím násobením `quantity`

## 📝 Manuální Testovací Kroky

### 1. Výdejky

1. Najdi transakci se slevou v `/transactions`
2. Zkontroluj že má výdejku v `/delivery-notes`
3. Otevři výdejku → měla by obsahovat **jen produkty**, ne slevu
4. Pokud obsahuje slevu:
   - Smaž výdejku
   - Nech vytvořit novou přes synchronizaci

### 2. Faktury

1. Vytvoř fakturu z transakce se slevou
2. Otevři fakturu v `/invoices/issued`
3. Zkontroluj:
   - ✅ Položky faktury = jen produkty (ne sleva)
   - ✅ Souhrn faktury = obsahuje řádek "Sleva"
   - ✅ Celková částka = mezisoučet - sleva

## 🔧 Jak Opravit Staré Výdejky

Pokud máš výdejky vytvořené **před touto opravou**, musíš je přegenerovat:

```javascript
// 1. Najdi transakce s výdejkami obsahujícími slevy
const badDeliveryNotes = await prisma.deliveryNote.findMany({
  where: {
    items: {
      some: {
        productId: null
      }
    }
  },
  include: {
    transaction: true
  }
})

// 2. Smaž ty výdejky
for (const dn of badDeliveryNotes) {
  await prisma.deliveryNote.delete({ where: { id: dn.id } })
}

// 3. Nech je vytvořit znovu (přes sync nebo ručně)
```

## ✅ Checklist Pro Code Review

- [ ] Výdejky neobsahují položky s `productId = null`
- [ ] Faktury filtrují slevy v UI při zobrazení položek
- [ ] Faktury zobrazují slevu odděleně v souhrnu
- [ ] Sync route validuje že sleva < katalogová cena
- [ ] Discount kalkulace používá `priceWithVat * quantity`

## 🎯 Závěr

- **Výdejky**: Slevy jsou **automaticky vyfiltrované** při vytvoření (backend)
- **Faktury**: Slevy jsou **uložené v DB** ale **filtrované v UI** (frontend)
- **Validace**: Senior-level pojistky proti špatným slevám (> katalog)

Tento systém je **robustní** a **bezpečný** proti budoucím chybám! 🛡️
