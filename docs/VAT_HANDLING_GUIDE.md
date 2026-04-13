# 🛡️ VAT Handling Guide - Jak správně pracovat s DPH

## ⚠️ KRITICKÉ: Rozdíl mezi neplátcem a plátcem s 0% sazbou

V systému existují **DVĚ různé situace**, které na první pohled vypadají stejně:

| Situace | `isVatPayer` | `vatRate` | Význam | VAT Amount |
|---------|-------------|-----------|--------|------------|
| **Neplátce DPH** | `false` | `0` | Firma není plátce DPH, cena = finální cena | `0` |
| **Plátce s 0% sazbou** | `true` | `0` | Firma je plátce, ale produkt má sazbu 0% | `0` |

### 🔥 Proč je to problém?

Obě situace mají `vatRate = 0` a `vatAmount = 0`, ale **sémanticky jsou JINÉ**:

- **Neplátce**: Cena v katalogu je **finální prodejní cena**
- **Plátce s 0%**: Cena v katalogu je **bez DPH**, ale DPH je 0%

## ✅ SPRÁVNÉ postupy

### 1. Rozhodování zda aplikovat DPH

```typescript
// ❌ ŠPATNĚ - rozhodování jen podle vatRate
if (vatRate === 0) {
  // Není jasné: Je to neplátce nebo plátce s 0%?
  vatAmount = 0
}

// ✅ SPRÁVNĚ - rozhodování podle isVatPayer
if (!isVatPayer) {
  // Tohle JE neplátce → žádné DPH
  vatAmount = 0
  priceWithVat = priceWithoutVat
} else {
  // Tohle JE plátce → aplikuj sazbu (i když je 0%)
  vatAmount = priceWithoutVat * vatRate / 100
  priceWithVat = priceWithoutVat + vatAmount
}
```

### 2. Výpočet DPH pro položku transakce

```typescript
// ✅ SPRÁVNĚ - vždy kontroluj isVatPayer PRVNÍ
const catalogVatRate = Number(product.vatRate || 0)
const isNonVatPayer = catalogVatRate === 0  // Pro nás: 0 znamená neplátce

let finalPrice, finalVatAmount, finalPriceWithVat

if (isNonVatPayer) {
  // NEPLATCE: catalogPrice je přímo prodejní cena
  finalPrice = catalogPrice
  finalVatAmount = 0
  finalPriceWithVat = catalogPrice
} else {
  // PLÁTCE: catalogPrice je bez DPH, musíme přidat DPH
  finalPrice = catalogPrice
  finalVatAmount = catalogPrice * catalogVatRate / 100
  finalPriceWithVat = catalogPrice + finalVatAmount
}
```

### 3. Reporting a Export

Když budeš dělat **kontrolní hlášení** nebo **export pro účetní**:

```typescript
// ❌ ŠPATNĚ - účetní nepozná rozdíl
function generateVatReport(items) {
  const vatBreakdown = {
    '0%': { base: 0, vat: 0, total: 0 },  // Tady jsou SMÍCHANÉ neplátci i 0% sazba!
    '12%': { base: 0, vat: 0, total: 0 },
    '21%': { base: 0, vat: 0, total: 0 },
  }
}

// ✅ SPRÁVNĚ - explicitní oddělení neplátce
function generateVatReport(items, isVatPayer) {
  if (!isVatPayer) {
    return {
      type: 'NON_VAT_PAYER',
      totalRevenue: calculateTotal(items),
      vatBreakdown: null  // Neplátce nemá breakdown
    }
  }

  return {
    type: 'VAT_PAYER',
    vatBreakdown: {
      '0%': { base: 0, vat: 0, total: 0 },
      '12%': { base: 0, vat: 0, total: 0 },
      '21%': { base: 0, vat: 0, total: 0 },
    }
  }
}
```

## 📋 Checklist pro KAŽDOU novou funkci s DPH

Když píšeš **JAKÝKOLIV** kód který pracuje s DPH, projdi tento checklist:

- [ ] Má funkce přístup k `isVatPayer` flagu? Pokud ne, MUSÍ ho dostat jako parametr
- [ ] Rozhoduji se primárně podle `isVatPayer`, NE podle `vatRate === 0`?
- [ ] Je jasné z kódu co se stane pro neplátce vs plátce s 0%?
- [ ] Mám unit testy pro OBA případy (neplátce i plátce s 0%)?
- [ ] Logování explicitně říká "NEPLATCE" nebo "PLÁTCE s 0%"?

## 🧪 Test Cases

Každá funkce s DPH výpočtem **MUSÍ** mít tyto test cases:

```typescript
describe('calculateVat', () => {
  it('neplátce: cena 100 Kč → 100 Kč, DPH 0 Kč', () => {
    const result = calculateVat(100, false, 0)
    expect(result.priceWithVat).toBe(100)
    expect(result.vatAmount).toBe(0)
  })

  it('plátce s 0% sazbou: cena 100 Kč → 100 Kč, DPH 0 Kč', () => {
    const result = calculateVat(100, true, 0)
    expect(result.priceWithVat).toBe(100)
    expect(result.vatAmount).toBe(0)  // Stejný výsledek, ale JINÝ důvod!
  })

  it('plátce s 21% sazbou: cena 100 Kč → 121 Kč, DPH 21 Kč', () => {
    const result = calculateVat(100, true, 21)
    expect(result.priceWithVat).toBe(121)
    expect(result.vatAmount).toBe(21)
  })
})
```

## 🚨 Red Flags - Varování před problémovým kódem

Pokud vidíš TENHLE pattern v kódu, **ZASTAV SE** a refaktoruj:

```typescript
// 🚨 RED FLAG #1: Rozhodování jen podle vatRate
if (vatRate === 0) { ... }

// 🚨 RED FLAG #2: Absence isVatPayer v parametrech funkce
function calculateInvoiceTotal(items: Item[]) {
  // Kde je isVatPayer?!
}

// 🚨 RED FLAG #3: Magické hodnoty
if (vatRate === -1) { ... }  // Deprecated!

// 🚨 RED FLAG #4: Předpoklad že 0 = neplátce
const isNonPayer = (rate === 0)  // NE! Může být plátce s 0%!
```

## 📚 Použití nových bezpečných funkcí

V `lib/vatCalculation.ts` jsou nové bezpečné funkce:

```typescript
// ✅ Použij tohle pro nový kód
import { calculateVatAmountSafe, isVatPayerEntity } from '@/lib/vatCalculation'

// Zjisti zda aplikovat DPH
const shouldCalculateVat = isVatPayerEntity(isVatPayer, vatRate)

// Vypočítej DPH částku
const vatAmount = calculateVatAmountSafe(basePrice, isVatPayer, vatRate)
```

## 🔧 Migration Guide - Přechod ze starého kódu

Pokud máš **starý kód** s `-1` sentinelem:

```typescript
// ❌ STARÝ KÓD (deprecated)
if (vatRate === -1) {
  // neplátce
}

// ✅ NOVÝ KÓD (správně)
if (!isVatPayer) {
  // neplátce
  vatRate = 0  // Nastav na 0
}
```

## 📊 Database Schema

V databázi **VŽDY** ukládej:

```prisma
model Product {
  vatRate  Float  @default(0)  // 0 pro neplátce, 0/12/21 pro plátce
}

model Settings {
  isVatPayer  Boolean @default(true)  // Tohle je ZDROJ PRAVDY!
}
```

## 🎯 Summary - TL;DR

1. **NIKDY** nerozhoduj jen podle `vatRate === 0`
2. **VŽDY** kontroluj `isVatPayer` flag PRVNÍ
3. **Loguj explicitně** zda je to neplátce nebo plátce s 0%
4. **Předávej `isVatPayer`** do všech funkcí co počítají DPH
5. **Testuj OBA** případy: neplátce i plátce s 0%

---

**Naposledy aktualizováno:** 2026-02-06
**Autor:** Senior Developer protecting against future bugs 🛡️
