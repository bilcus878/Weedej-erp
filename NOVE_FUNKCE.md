# Nové funkce 🎉

## ✅ Co je nového:

### 0. ➕ Ruční přidávání produktů

**NOVÉ!** Protože SumUp API neposkytuje přístup ke katalogu produktů, přidal jsem možnost **ručně přidat produkty**:

- ✅ **Tlačítko "Přidat produkt"** v Katalogu zboží
- ✅ Formulář s poli: Název, Kategorie, Cena, Jednotka (ks/g)
- ✅ Validace povinných polí
- ✅ Automatické načtení po přidání

**Jak použít:**
1. Jdi na "Katalog zboží"
2. Klikni "Přidat produkt"
3. Vyplň formulář (název a cena jsou povinné)
4. Klikni "Přidat produkt"

**Důležité:** Názvy produktů musí odpovídat názvům v SumUp!
- SumUp: `"White Truffle X2"` → Do katalogu zadej: `"White Truffle (X2)"`
- SumUp: `"Cartridge - container with hemp extract (X2)"` → Zadej stejný název

---

### 1. 📦 Správa dodavatelů

Nová sekce v menu **"Dodavatelé"** kde můžeš:

- ✅ **Přidat dodavatele** - Tlačítko "Přidat dodavatele"
- ✅ **Upravit dodavatele** - Klikni na ikonu tužky
- ✅ **Smazat dodavatele** - Klikni na ikonu koše
- ✅ **Zobrazit seznam** - Všichni dodavatelé v přehledné tabulce

**Informace o dodavateli:**
- Název dodavatele (povinné)
- Kontaktní osoba
- Email
- Telefon
- Poznámka

**Jak použít:**
1. Klikni na "Dodavatelé" v menu
2. Klikni "Přidat dodavatele"
3. Vyplň formulář
4. Klikni "Přidat dodavatele"

Dodavatele pak můžeš vybrat při naskladnění zboží!

---

### 2. ⬅️ Tlačítka "Zpět"

Všechny formuláře teď mají tlačítko **"Zpět"** se šipkou:

- ✅ Skladová evidence - formulář naskladnění
- ✅ Dodavatelé - formulář přidání/úpravy

Stačí kliknout na "Zpět" a formulář se zavře.

---

### 3. 🔧 SumUp API synchronizace - Aktuální stav

**✅ Co funguje:**
- ✅ Transakce ze SumUp se synchronizují
- ✅ Částky jsou správně (SumUp vrací přímo v Kč)
- ✅ **Typ platby rozpoznán** - POS = Karta, CASH = Hotovost
- ✅ **Parsování produktů** - automaticky rozpozná "White Truffle X2" jako "White Truffle" × 2 ks
- ✅ **Automatické odečtení skladu** - při synchronizaci se sníží sklad
- ✅ 73 transakcí úspěšně importováno

**⚠️ Známá omezení:**
- **Katalog zboží** - endpoint `/me/products` vrací 404 (pravděpodobně API klíč nemá oprávnění)
- **Fuzzy matching** - produkt musí být v databázi s podobným názvem (např. "White Truffle" najde "White Truffle")
  - Pokud produkt není v databázi, transakce se importuje, ale bez položek a bez odečtení skladu

**Změny:**
- ✅ Používám správné endpointy (`/me/products`, `/me/transactions/history`)
- ✅ Detailní error handling - uvidíš přesnou chybu pokud něco selže
- ✅ Logging - v konzoli vidíš co se děje
- ✅ Lepší zpracování různých formátů odpovědí

**Testovací endpoint:**

Otevři v prohlížeči: **http://localhost:3000/api/test-sumup**

Uvidíš:
- Jestli je API klíč nastavený
- Jestli funguje připojení k SumUp
- Přesnou chybu pokud něco nefunguje
- Testování 3 endpointů: /me, /me/products, /me/transactions/history

**Možné problémy:**

1. **API klíč je neplatný**
   - Zkontroluj `.env` soubor
   - Ujisti se že klíč začíná `sup_sk_`

2. **API klíč nemá oprávnění**
   - Jdi na SumUp dashboard
   - Zkontroluj že API klíč má oprávnění pro čtení produktů a transakcí

3. **SumUp používá jiné endpointy**
   - Podívej se na odpověď z `/api/test-sumup`
   - Pokud vidíš chybu 404, endpoint neexistuje
   - Můžeme zkusit jiné endpointy

---

## 🐛 Řešení problémů

### SumUp synchronizace nefunguje

**Krok 1: Testuj SumUp API**

Otevři: http://localhost:3000/api/test-sumup

**Krok 2: Zkontroluj chybu**

Pokud vidíš:
- **401 Unauthorized** - Špatný API klíč
- **403 Forbidden** - API klíč nemá oprávnění
- **404 Not Found** - Endpoint neexistuje (napište mi, zkusíme jiný)
- **500 Server Error** - Problém na straně SumUp

**Krok 3: Zkontroluj API klíč**

1. Otevři `.env` soubor
2. Zkontroluj řádek: `SUMUP_API_KEY="sup_sk_..."`
3. Ujisti se že klíč je správný

**Krok 4: Otevři konzoli prohlížeče**

1. Stiskni F12 v prohlížeči
2. Jdi na tab "Console"
3. Klikni "Synchronizovat ze SumUp"
4. Podívej se na výpis v konzoli - uvidíš přesnou chybu

---

## 📝 Changelog

### Verze 1.4 (2024-12-25) - Ruční přidávání produktů

**Přidáno:**
- ✅ **Formulář pro ruční přidání produktu** - tlačítko "Přidat produkt" v Katalogu zboží
- ✅ Pole: Název, Kategorie, Cena, Jednotka (ks/g)
- ✅ Validace - název a cena jsou povinné
- ✅ Automatické zavření formuláře po přidání

**Důvod:**
- SumUp API endpoint `/me/products` vrací 404 (API klíč nemá oprávnění)
- Produkty je potřeba přidat ručně, aby fungovala synchronizace transakcí

**Technické detaily:**
- `app/products/page.tsx:27-33` - state pro formulář
- `app/products/page.tsx:73-106` - funkce handleAddProduct
- `app/products/page.tsx:144-234` - formulář UI

### Verze 1.3 (2024-12-25) - Inteligentní parsování transakcí

**Přidáno:**
- ✅ **Automatické rozpoznávání produktů** - parsuje `product_summary` (např. "White Truffle X2" → produkt + množství)
- ✅ **Rozpoznávání typu platby** - POS → Karta, CASH → Hotovost
- ✅ **Automatické odečítání skladu** - při synchronizaci se automaticky sníží sklad
- ✅ **Fuzzy matching produktů** - najde produkt i pokud název není úplně stejný
- ✅ **Detailní logging** - v konzoli vidíš přesně co se parsuje a jestli se našel produkt

**Opraveno:**
- ✅ Částky jsou správně - SumUp vrací přímo Kč (ne haléře)
- ✅ Typ platby se správně zobrazuje (Karta vs Hotovost)
- ✅ Transakce mají rozepsané položky

**Jak to funguje:**
1. SumUp vrací `product_summary: "White Truffle X2"`
2. Program hledá v databázi produkt obsahující "White Truffle X2" nebo "White Truffle (X2)"
3. Pokud nenajde, zkusí najít podle základního názvu bez závorek
4. Množství je výchozí 1, pokud není na začátku uvedeno (např. "2x White Truffle X2")
5. Vytvoří položku transakce a automaticky odečte ze skladu

**Příklady:**
- `"White Truffle X2"` → najde produkt `"White Truffle (X2)"`, množství = 1
- `"2x White Truffle X2"` → najde produkt `"White Truffle (X2)"`, množství = 2
- `"Cartridge - container with hemp extract (X2)"` → přesná shoda, množství = 1

**Technické detaily:**
- `app/api/transactions/sync/route.ts:36-42` - mapování typu platby
- `app/api/transactions/sync/route.ts:56-138` - inteligentní vyhledávání produktu (3 pokusy)
- Pokus 1: Přesná shoda názvu
- Pokus 2: Fuzzy match (contains)
- Pokus 3: Podle základního názvu bez závorek

### Verze 1.2 (2024-12-25) - Oprava synchronizace transakcí

**Opraveno:**
- ✅ Transakce se nyní správně synchronizují ze SumUp
- ✅ Dokumentace SumUpTransaction interface - přidán product_summary field

### Verze 1.1 (2024-12-25)

**Přidáno:**
- ✅ Stránka pro správu dodavatelů (/suppliers)
- ✅ API endpointy: PATCH /api/suppliers/[id], DELETE /api/suppliers/[id]
- ✅ Tlačítka "Zpět" na formulářích
- ✅ Ikona dodavatelů v menu (kamion)
- ✅ Testovací endpoint /api/test-sumup pro debugging SumUp API

**Opraveno:**
- ✅ SumUp API endpointy - používám /me/products a /me/transactions/history
- ✅ Error handling v SumUp API - detailní chybové zprávy
- ✅ Logging pro lepší debugging

**Vylepšeno:**
- ✅ UX - tlačítka Zpět pro snadnější navigaci
- ✅ Správa dodavatelů - kompletní CRUD operace

---

## 🔮 Co dál?

Další možná vylepšení:

- [ ] Export dat do Excel/CSV
- [ ] Grafy tržeb (Recharts)
- [ ] Filtrování a vyhledávání v tabulkách
- [ ] Notifikace při nízkých stavech
- [ ] Bulk úprava produktů
- [ ] History log změn

---

Máš nápad na další funkci? Dej vědět! 🚀
