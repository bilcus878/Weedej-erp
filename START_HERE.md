# 👋 Začni tady!

Vítej v účetním programu s SumUp integrací!

## 🚀 Rychlý start (5 minut)

1. **Nainstaluj PostgreSQL** (Docker nebo klasicky)
2. **Spusť:** `scripts\setup.bat`
3. **Spusť:** `scripts\start.bat`
4. **Otevři:** http://localhost:3000

Detaily v **QUICK_START.md**

---

## 📚 Dokumentace - Co číst jako první?

### Úplný začátečník?
👉 **INSTALACE_KROK_ZA_KROKEM.md** - Detailní průvodce krok za krokem

### Chci rychle začít?
👉 **QUICK_START.md** - 5minutová instalace

### Znám React, chci rozumět projektu?
👉 **TUTORIAL.md** - Jak funguje Next.js, Prisma, TypeScript

### Mám problém?
👉 **FAQ.md** - Často kladené otázky a řešení problémů

### Chci kompletní přehled?
👉 **README.md** - Hlavní dokumentace se vším

### Chci vědět co je kde?
👉 **STRUKTURA_PROJEKTU.md** - Přehled všech souborů a složek

---

## 🎯 Co program umí?

✅ **Katalog zboží** - Sync ze SumUp API
✅ **Skladová evidence** - Naskladnění, přehled zásob
✅ **Transakce** - Import ze SumUp, automatické vyskladnění
✅ **Dashboard** - Přehled tržeb a skladu
✅ **Multi-item transakce** - Rozepsání pod jednu FA
✅ **FIFO vyskladnění** - První dovnitř, první ven
✅ **Dodavatelé** - Evidence dodavatelů

---

## 🛠️ Technologie

- **Frontend:** Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes
- **Databáze:** PostgreSQL + Prisma ORM
- **API:** SumUp integrace

Znáš React? Budeš doma! Next.js je skoro stejný.

---

## 📁 Přehled souborů

```
📂 UcetniP/
│
├── 📂 app/                    # Stránky a API
│   ├── page.tsx               # Dashboard (/)
│   ├── products/              # Katalog zboží (/products)
│   ├── inventory/             # Sklad (/inventory)
│   ├── transactions/          # Transakce (/transactions)
│   └── api/                   # Backend API endpointy
│
├── 📂 components/             # React komponenty
│   ├── Sidebar.tsx            # Navigace
│   └── ui/                    # UI komponenty (Button, Card...)
│
├── 📂 lib/                    # Knihovny
│   ├── prisma.ts              # Databáze
│   ├── sumup.ts               # SumUp API
│   └── utils.ts               # Pomocné funkce
│
├── 📂 prisma/                 # Databáze
│   ├── schema.prisma          # Databázové schéma
│   └── seed.ts                # Testovací data
│
├── 📂 scripts/                # Pomocné skripty
│   ├── setup.bat              # Instalace
│   ├── start.bat              # Spuštění
│   ├── db-studio.bat          # Prisma Studio
│   └── seed.bat               # Naplnění testovacími daty
│
└── 📚 Dokumentace
    ├── README.md              # Hlavní dokumentace
    ├── QUICK_START.md         # Rychlý start
    ├── TUTORIAL.md            # Tutorial
    ├── FAQ.md                 # Často kladené otázky
    ├── INSTALACE_KROK_ZA_KROKEM.md
    ├── STRUKTURA_PROJEKTU.md
    └── START_HERE.md          # Tento soubor
```

---

## 💡 První kroky v aplikaci

### 1️⃣ Synchronizuj produkty

- Jdi na **"Katalog zboží"**
- Klikni **"Synchronizovat ze SumUp"**
- Produkty se stáhnou z SumUp API

### 2️⃣ Naskladni zboží

- Jdi na **"Skladová evidence"**
- Klikni **"Naskladnit zboží"**
- Vyplň formulář (produkt, množství, cena...)

### 3️⃣ Synchronizuj transakce

- Jdi na **"Transakce"**
- Klikni **"Synchronizovat ze SumUp"**
- Transakce se stáhnou (posledních 7 dní)
- Automaticky se odečte ze skladu

---

## 🔧 Užitečné příkazy

```bash
# Spuštění
npm run dev                 # Spustí dev server

# Databáze
npx prisma studio           # GUI pro databázi
npx prisma db push          # Aplikuj změny schématu

# Nebo použij .bat skripty ve složce scripts/
```

---

## ❓ Potřebuješ pomoc?

1. **Zkontroluj FAQ.md** - Odpovědi na časté problémy
2. **Google** - Zkopíruj error message a hledej
3. **ChatGPT/Claude** - Zeptej se AI

Většina chyb má řešení na Stack Overflow! 🔍

---

## 🎨 Přizpůsobení

### Změna barvy UI
→ `app/globals.css` - CSS proměnné

### Změna limitu "nízký stav"
→ `app/api/stats/route.ts` - změň `< 10` na jinou hodnotu

### Přidání pole do databáze
1. Uprav `prisma/schema.prisma`
2. Spusť `npx prisma db push`
3. Uprav formuláře v UI

---

## 🚀 Co dál?

- [ ] Přečti si **TUTORIAL.md** pokud jsi začátečník v Next.js
- [ ] Prozkoumej kód v `app/` a `components/`
- [ ] Zkus přidat novou funkci (např. kategorie produktů)
- [ ] Nasaď do produkce (Vercel/Railway)

---

## 📞 Kontakt

Máš-li otázky nebo potřebuješ pomoc, neváhej se zeptat!

---

**Užij si coding!** 💻✨

Created with ❤️ by Claude Code
