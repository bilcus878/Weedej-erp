# 🔍 Code Review Checklist - VAT/DPH Calculations

Použij tento checklist při review JAKÉHOKOLIV pull requestu který se dotýká DPH výpočtů.

## ⚠️ Red Flags - Okamžitě zamítni PR pokud obsahuje:

- [ ] **Rozhodování JEN podle `vatRate === 0`** bez kontroly `isVatPayer`
  ```typescript
  // ❌ REJECT PR
  if (vatRate === 0) {
    // Aplikuj neplátce logiku
  }
  ```

- [ ] **Magické hodnoty `-1` pro neplátce**
  ```typescript
  // ❌ REJECT PR (deprecated!)
  if (vatRate === -1) { ... }
  ```

- [ ] **Absence `isVatPayer` parametru** ve funkci která počítá DPH
  ```typescript
  // ❌ REJECT PR
  function calculateInvoiceTotal(items: Item[]) {
    // Kde je isVatPayer flag?!
  }
  ```

- [ ] **Předpoklad že 0 = neplátce**
  ```typescript
  // ❌ REJECT PR
  const isNonPayer = (vatRate === 0)
  ```

## ✅ Must Have - PR musí obsahovat:

- [ ] **Explicitní kontrola `isVatPayer` PŘED `vatRate`**
  ```typescript
  // ✅ CORRECT
  if (!isVatPayer) {
    vatAmount = 0
  } else {
    vatAmount = basePrice * vatRate / 100
  }
  ```

- [ ] **Jasné komentáře** vysvětlující rozdíl mezi neplátcem a plátcem s 0%
  ```typescript
  // ✅ CORRECT
  // 🛡️ KRITICKÉ: vatRate = 0 znamená NEPLÁTCE v našem systému
  // (Pokud bychom byli plátci s 0%, museli bychom kontrolovat isVatPayer flag)
  const isNonVatPayer = catalogVatRate === 0
  ```

- [ ] **Unit testy pokrývající OBA případy**: neplátce i plátce s 0%
  ```typescript
  // ✅ CORRECT
  it('neplátce s vatRate=0 → DPH = 0', () => { ... })
  it('plátce s vatRate=0 → DPH = 0', () => { ... })
  ```

- [ ] **Logování explicitně říká "NEPLATCE" nebo "PLÁTCE"**
  ```typescript
  // ✅ CORRECT
  console.log(`→ NEPLATCE DPH: prodejní cena ${price} Kč`)
  console.log(`→ PLÁTCE DPH ${vatRate}%: bez DPH ${priceNet} Kč, s DPH ${priceGross} Kč`)
  ```

## 📋 Step-by-Step Review Process

### 1. Identifikuj VAT-related kód

Hledej tyto klíčové slová v PR:
- `vatRate`
- `vatAmount`
- `priceWithVat` / `priceWithoutVat`
- `calculateVat`
- `isVatPayer` / `isNonVatPayer`
- `DPH` / `VAT`

### 2. Pro KAŽDOU funkci s VAT výpočtem

- [ ] Má funkce přístup k `isVatPayer` flagu?
  - Pokud ANO: ✅ Pokračuj
  - Pokud NE: ❌ Požaduj přidání parametru

- [ ] Rozhoduje se PRIMÁRNĚ podle `isVatPayer`?
  - Pokud ANO: ✅ Pokračuj
  - Pokud NE: ❌ Požaduj refaktor

- [ ] Jsou tam unit testy?
  - Pokud ANO: ✅ Pokračuj na krok 3
  - Pokud NE: ❌ Požaduj testy

### 3. Zkontroluj unit testy

- [ ] Test pro **neplátce** (`isVatPayer=false, vatRate=0`)
- [ ] Test pro **plátce s 0%** (`isVatPayer=true, vatRate=0`)
- [ ] Test pro **plátce s 12%** (`isVatPayer=true, vatRate=12`)
- [ ] Test pro **plátce s 21%** (`isVatPayer=true, vatRate=21`)
- [ ] Test pro **edge case** (neplátce s vatRate=21 - nemělo by nastat)

### 4. Zkontroluj dokumentaci

- [ ] Je v kódu **explicitní komentář** vysvětlující logiku?
- [ ] Je jasné **proč** se rozhoduje určitým způsobem?
- [ ] Je zmíněn rozdíl mezi neplátcem a plátcem s 0%?

### 5. Zkontroluj logování

- [ ] Loguje se **explicitně** "NEPLATCE" nebo "PLÁTCE"?
- [ ] Jsou v logu **konkrétní hodnoty** (ceny, sazby)?
- [ ] Dá se z logu **pochopit** co se stalo?

## 🧪 Manual Testing Checklist

Před merge, **manuálně otestuj** tyto scénáře:

### Scénář A: Neplátce DPH
1. [ ] V Nastavení: `isVatPayer = false`
2. [ ] Vytvoř produkt: cena 500 Kč
3. [ ] Synchronizuj transakci
4. [ ] Zkontroluj: Cena = 500 Kč, DPH = 0 Kč

### Scénář B: Plátce DPH se sazbou 21%
1. [ ] V Nastavení: `isVatPayer = true`
2. [ ] Vytvoř produkt: cena 500 Kč (bez DPH), sazba 21%
3. [ ] Synchronizuj transakci
4. [ ] Zkontroluj: Cena bez DPH = 500 Kč, DPH = 105 Kč, Celkem = 605 Kč

### Scénář C: Plátce DPH se sazbou 0%
1. [ ] V Nastavení: `isVatPayer = true`
2. [ ] Vytvoř produkt: cena 500 Kč (bez DPH), sazba 0%
3. [ ] Synchronizuj transakci
4. [ ] Zkontroluj: Cena bez DPH = 500 Kč, DPH = 0 Kč, Celkem = 500 Kč
5. [ ] **DŮLEŽITÉ**: Zkontroluj že se to **NELIŠÍ** od neplátce v DB (oba mají DPH=0)

### Scénář D: Přepnutí neplátce → plátce
1. [ ] Vytvoř produkt jako neplátce (vatRate=0)
2. [ ] V Nastavení: Přepni na `isVatPayer = true`
3. [ ] Uprav produkt → zkontroluj že můžeš vybrat sazbu 0%, 12%, 21%
4. [ ] Synchronizuj transakci → zkontroluj správný výpočet

## 📊 Reporting & Export Code

Pokud PR obsahuje **reporting** nebo **export** kód:

- [ ] Je explicitně oddělena sekce pro **neplátce** vs **plátce**?
- [ ] Neobsahuje report **mixed** hodnoty (neplátci + 0% sazba)?
- [ ] Exportovaná data obsahují **explicitní flag** `isVatPayer`?

```typescript
// ✅ CORRECT
interface InvoiceExport {
  isVatPayer: boolean  // EXPLICITNÍ FLAG!
  vatBreakdown: VatBreakdown | null  // null pro neplátce
}

// ❌ WRONG
interface InvoiceExport {
  vatBreakdown: {
    '0%': { base: 0, vat: 0 },  // Smíchané neplátci + 0% sazba!
  }
}
```

## 🎯 Final Approval Checklist

Před merge, MUSÍ být splněny **VŠECHNY** tyto podmínky:

- [ ] ✅ Žádné red flags v kódu
- [ ] ✅ Všechny "Must Have" požadavky splněny
- [ ] ✅ Unit testy pokrývají všechny edge cases
- [ ] ✅ Manuální testy prošly
- [ ] ✅ Dokumentace/komentáře jsou jasné
- [ ] ✅ Logování je dostatečné pro debugging

---

## 🚨 Emergency Response

Pokud najdeš **KRITICKÝ bug** v production:

1. **Okamžitě rollback** deployment
2. Vytvoř **hotfix branch**
3. Přidej **unit test** který reprodukuje bug
4. Opravu **důkladně otestuj** podle tohoto checklistu
5. Merge hotfix **co nejdříve**
6. Post-mortem: **Jak se to stalo?** Co můžeme zlepšit?

---

**Pro reviewery:**
- 🟢 Všechno OK? → **APPROVE** PR
- 🟡 Drobné připomínky? → **REQUEST CHANGES** s konkrétním seznamem
- 🔴 Kritické problémy? → **REJECT** s odkazem na tento checklist

**Poslední aktualizace:** 2026-02-06
