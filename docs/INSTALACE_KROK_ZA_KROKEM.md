# Instalace krok za krokem 🚀

Kompletní průvodce instalací pro úplné začátečníky.

## Předpoklady

Budeš potřebovat:
- Windows 10/11
- Přístup na internet
- Cca 30 minut času

---

## Krok 1: Nainstaluj Node.js

Node.js je potřeba pro běh aplikace.

1. **Stáhni Node.js:**
   - Jdi na: https://nodejs.org/
   - Stáhni **LTS verzi** (doporučená)
   - Spusť instalátor

2. **Ověř instalaci:**
   - Otevři **Příkazový řádek** (Win+R → `cmd`)
   - Napiš: `node --version`
   - Mělo by to vypsat něco jako: `v20.11.0`

✅ **Hotovo!** Node.js je nainstalovaný.

---

## Krok 2: Nainstaluj PostgreSQL

PostgreSQL je databáze kde se ukládají data.

### Varianta A: Docker (doporučeno - jednodušší)

1. **Nainstaluj Docker Desktop:**
   - Stáhni z: https://www.docker.com/products/docker-desktop
   - Spusť instalátor
   - Restart počítače

2. **Spusť PostgreSQL:**
   - Otevři **Příkazový řádek**
   - Zkopíruj a spusť:
   ```bash
   docker run --name ucetni-db -e POSTGRES_PASSWORD=heslo123 -p 5432:5432 -d postgres:14
   ```

3. **Hotovo!** PostgreSQL běží.

### Varianta B: Klasická instalace

1. **Stáhni PostgreSQL:**
   - Jdi na: https://www.postgresql.org/download/windows/
   - Stáhni instalátor

2. **Nainstaluj:**
   - Spusť instalátor
   - **DŮLEŽITÉ:** Při instalaci si **zapamatuj heslo** které zadáš!
   - Nech zaškrtnuté všechny komponenty
   - Port nech: `5432`

3. **Vytvoř databázi:**
   - Otevři **SQL Shell (psql)** z Start menu
   - Stiskni Enter 4x (ponech defaulty)
   - Zadej heslo které jsi zvolil
   - Napiš: `CREATE DATABASE ucetni_db;`
   - Napiš: `\q` pro ukončení

✅ **Hotovo!** PostgreSQL je nainstalovaný.

---

## Krok 3: Nastav projekt

1. **Otevři projekt:**
   - Otevři **Průzkumník souborů**
   - Jdi do: `C:\Users\bilcu\Dropbox\Krámek\UcetniP`

2. **Uprav `.env` soubor:**
   - Otevři soubor `.env` v Notepadu
   - Změň řádek s `DATABASE_URL`:
   ```env
   DATABASE_URL="postgresql://postgres:TVOJEHESLO@localhost:5432/ucetni_db"
   ```
   - Nahraď `TVOJEHESLO` za heslo z Kroku 2
   - **Docker:** Pokud jsi použil Docker, heslo je `heslo123`
   - Ulož soubor (Ctrl+S)

✅ **Hotovo!** Projekt je nakonfigurovaný.

---

## Krok 4: Spusť instalační skript

1. **Otevři složku projektu:**
   - Jdi do: `C:\Users\bilcu\Dropbox\Krámek\UcetniP`

2. **Spusť instalaci:**
   - Najdi složku `scripts`
   - Dvakrát klikni na: `setup.bat`
   - Počkej až se vše nainstaluje (cca 2-5 minut)

Skript udělá:
- ✅ Nainstaluje závislosti (`npm install`)
- ✅ Vygeneruje Prisma Client
- ✅ Vytvoří tabulky v databázi

✅ **Hotovo!** Aplikace je nainstalovaná.

---

## Krok 5: (Volitelné) Naplň testovacími daty

Pokud chceš vyzkoušet aplikaci s ukázkovými daty:

1. **Jdi do složky:** `C:\Users\bilcu\Dropbox\Krámek\UcetniP\scripts`
2. **Dvakrát klikni na:** `seed.bat`
3. **Napiš:** `ano` a stiskni Enter

Tohle vytvoří:
- 2 dodavatele
- 6 produktů (káva, pečivo)
- 3 skladové položky
- 2 testovací transakce

✅ **Hotovo!** Máš testovací data.

---

## Krok 6: Spusť aplikaci

1. **Jdi do složky:** `C:\Users\bilcu\Dropbox\Krámek\UcetniP\scripts`
2. **Dvakrát klikni na:** `start.bat`
3. **Počkej** až se aplikace spustí (cca 10 sekund)
4. **Otevři prohlížeč** a jdi na: http://localhost:3000

🎉 **Aplikace běží!**

---

## Co vidíš?

### Dashboard (/)
- Přehled tržeb (dnes / měsíc)
- Hodnota skladu
- Upozornění na nízké stavy

### Katalog zboží (/products)
- Seznam všech produktů
- Tlačítko "Synchronizovat ze SumUp"

### Skladová evidence (/inventory)
- Přehled skladu
- Formulář pro naskladnění
- Tlačítko "Naskladnit zboží"

### Transakce (/transactions)
- Seznam transakcí
- Tlačítko "Synchronizovat ze SumUp"
- Klikni na transakci pro detail položek

---

## První kroky v aplikaci

### 1. Synchronizuj produkty ze SumUp

1. Klikni na **"Katalog zboží"** v menu vlevo
2. Klikni na tlačítko **"Synchronizovat ze SumUp"**
3. Počkej pár sekund
4. Produkty se stáhnou a zobrazí v tabulce

**Poznámka:** Jednotky (ks/g) se nastaví automaticky na "ks". Pokud máš produkty na gramy, uprav to ručně:
- Otevři Prisma Studio: `npx prisma studio`
- Jdi na tabulku `Product`
- Změň `unit` na `g` u příslušných produktů

### 2. Naskladni zboží

1. Klikni na **"Skladová evidence"** v menu
2. Klikni na **"Naskladnit zboží"**
3. Vyplň formulář:
   - **Produkt:** Vyber ze seznamu
   - **Množství:** Např. 100
   - **Jednotka:** ks nebo g
   - **Dodavatel:** (volitelné) Vyber nebo nech prázdné
   - **Nákupní cena:** Např. 50.00
   - **Datum:** Dnešní datum (předvyplněno)
4. Klikni **"Naskladnit"**

### 3. Synchronizuj transakce

1. Klikni na **"Transakce"** v menu
2. Klikni na **"Synchronizovat ze SumUp"**
3. Počkej pár sekund
4. Transakce se stáhnou (z posledních 7 dní)
5. Klikni na transakci pro zobrazení položek

**Automaticky se:**
- Vytvoří transakce s FA číslem
- Rozepíšou položky
- Odečte zboží ze skladu

---

## Řešení problémů

### "Can't reach database server"

**Problém:** PostgreSQL neběží.

**Řešení:**
- **Docker:** Otevři Příkazový řádek a napiš: `docker start ucetni-db`
- **Klasická instalace:** Otevři Services (Win+R → `services.msc`) → Najdi "postgresql" → Klikni Start

### "Port 3000 is already in use"

**Problém:** Port 3000 je obsazený jinou aplikací.

**Řešení:**
- Otevři Příkazový řádek v projektu
- Spusť: `npm run dev -- -p 3001`
- Otevři: http://localhost:3001

### "Module not found"

**Problém:** Závislosti nejsou nainstalovány.

**Řešení:**
- Otevři Příkazový řádek v projektu
- Spusť: `npm install`

### SumUp API nefunguje

**Problém:** API klíč je neplatný nebo nemáš internet.

**Řešení:**
- Zkontroluj `.env` soubor - `SUMUP_API_KEY` musí být správně
- Zkontroluj připojení k internetu
- Zkus později (SumUp API může být dočasně nedostupné)

---

## Užitečné příkazy

### Otevřít Prisma Studio (GUI pro databázi)
```bash
npx prisma studio
```
→ Otevře http://localhost:5555

### Resetovat databázi (SMAŽE VŠECHNA DATA!)
```bash
scripts\reset-db.bat
```

### Zastavit aplikaci
- Stiskni `Ctrl+C` v příkazovém řádku kde běží `npm run dev`

---

## Další kroky

1. **Přečti si README.md** - Kompletní dokumentace
2. **Přečti si TUTORIAL.md** - Jak funguje Next.js a React
3. **Přečti si FAQ.md** - Odpovědi na časté otázky

---

## Potřebuješ pomoc?

1. Zkontroluj **FAQ.md**
2. Hledej chybu na Google (zkopíruj error message)
3. Zkus ChatGPT nebo Claude

Většina problémů má řešení na Stack Overflow! 🔍

---

**Hodně štěstí a ať ti to šlape!** 🚀
