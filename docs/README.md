# 📚 Documentation - Účetní Aplikace

Tato složka obsahuje **důležitou dokumentaci** pro vývojáře a maintainery projektu.

## 📋 Obsah

### 🛡️ [VAT_HANDLING_GUIDE.md](./VAT_HANDLING_GUIDE.md)
**POVINNÉ ČTENÍ** pro každého kdo píše kód s DPH výpočty!

Vysvětluje:
- Kritický rozdíl mezi neplátcem DPH a plátcem s 0% sazbou
- Správné postupy při práci s `isVatPayer` a `vatRate`
- Red flags v kódu které indikují potenciální bugy
- Best practices pro reporting a exporty
- Test cases které MUSÍ být pokryty

**Kdy to číst:**
- ✅ Před začátkem práce na čemkoliv co počítá DPH
- ✅ Když vidíš `vatRate` nebo `isVatPayer` v kódu
- ✅ Před code review PR s VAT logikou

### 🔍 [CODE_REVIEW_VAT_CHECKLIST.md](./CODE_REVIEW_VAT_CHECKLIST.md)
**Checklist pro code review** všech PR které se dotýkají DPH.

Obsahuje:
- Red flags které vedou k okamžitému zamítnutí PR
- Step-by-step review process
- Manual testing checklist
- Final approval kritéria

**Kdy to použít:**
- ✅ Při review KAŽDÉHO PR s VAT logikou
- ✅ Před merge do main branch
- ✅ Po nalezení bugu v production (post-mortem)

## 🎯 Quick Start

### Pro nové vývojáře

1. **PŘEČTI SI** [VAT_HANDLING_GUIDE.md](./VAT_HANDLING_GUIDE.md) - zabere 15 minut, ušetří hodiny debuggingu
2. **PROSTUDUJ** [unit testy](../tests/vatCalculation.test.ts) - ukáží ti jak správně psát VAT logiku
3. **POUŽÍVEJ** [CODE_REVIEW_VAT_CHECKLIST.md](./CODE_REVIEW_VAT_CHECKLIST.md) při review

### Pro reviewery

1. **ZKONTROLUJ** že autor přečetl [VAT_HANDLING_GUIDE.md](./VAT_HANDLING_GUIDE.md)
2. **POUŽIJ** [CODE_REVIEW_VAT_CHECKLIST.md](./CODE_REVIEW_VAT_CHECKLIST.md) pro review
3. **ZAMÍTNI** PR pokud obsahuje red flags z checklistu

## 🚨 Proč je to důležité?

V roce 2026 jsme měli **kritický bug**:
- Produkt v katalogu: 500 Kč
- Po synchronizaci: 605 Kč (protože systém přidal 21% DPH)
- Správná cena: 500 Kč (firma je neplátce)

**Root cause:** Systém rozhodoval podle `vatRate` místo podle `isVatPayer`.

Tato dokumentace **zabraňuje opakování** tohoto bugu.

## 📊 VAT/DPH - Rychlý přehled

| Situace | `isVatPayer` | `vatRate` | Výpočet |
|---------|--------------|-----------|---------|
| **Neplátce DPH** | `false` | `0` | `priceWithVat = catalogPrice` |
| **Plátce, sazba 0%** | `true` | `0` | `priceWithVat = catalogPrice + 0` |
| **Plátce, sazba 12%** | `true` | `12` | `priceWithVat = catalogPrice * 1.12` |
| **Plátce, sazba 21%** | `true` | `21` | `priceWithVat = catalogPrice * 1.21` |

**⚠️ POZOR:** Řádek 1 a 2 mají STEJNÝ výsledek, ale **JINÝ sémantický význam**!

## 🔧 Maintenance

### Kdy aktualizovat dokumentaci

- ✅ Když změníš VAT logiku v kódu
- ✅ Když najdeš nový edge case
- ✅ Když přidáš novou funkci do `vatCalculation.ts`
- ✅ Když se změní legislativa (nové sazby DPH)

### Jak aktualizovat

1. Uprav příslušný `.md` soubor
2. Přidej **datum poslední aktualizace** na konec dokumentu
3. Commitni se zprávou: `docs: update VAT guide - [důvod změny]`
4. Informuj tým v Slack/Discord

## 📞 Kontakt

Máš otázku nebo jsi našel problém v dokumentaci?

- 💬 Slack: `#dev-vat-questions`
- 📧 Email: senior-dev@company.com
- 🐛 GitHub Issues: použij label `documentation`

---

**Naposledy aktualizováno:** 2026-02-06
**Autor:** Senior Developer protecting against future bugs 🛡️
**Status:** ✅ Production-ready
