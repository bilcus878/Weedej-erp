# Struktura projektu 📁

Přehled všech souborů a složek v projektu s vysvětlením co dělají.

## 📂 Kořenová složka

```
UcetniP/
├── app/                    # Next.js aplikace (stránky + API)
├── components/             # React komponenty
├── lib/                    # Knihovny a utility funkce
├── prisma/                 # Databázové schéma a migrace
├── scripts/                # Pomocné skripty (.bat soubory)
├── .env                    # Konfigurace (hesla, API klíče)
├── .env.example            # Vzorová konfigurace
├── .gitignore              # Co ignorovat v Gitu
├── package.json            # NPM závislosti a skripty
├── tsconfig.json           # TypeScript konfigurace
├── next.config.js          # Next.js konfigurace
├── tailwind.config.ts      # Tailwind CSS konfigurace
├── postcss.config.js       # PostCSS konfigurace
└── README.md               # Hlavní dokumentace
```

---

## 📁 /app - Next.js aplikace

### Stránky (Pages)

| Soubor | URL | Popis |
|--------|-----|-------|
| `app/page.tsx` | `/` | Dashboard - hlavní stránka |
| `app/products/page.tsx` | `/products` | Katalog zboží |
| `app/inventory/page.tsx` | `/inventory` | Skladová evidence |
| `app/transactions/page.tsx` | `/transactions` | Transakce |

### API Endpointy

| Endpoint | Metoda | Popis |
|----------|--------|-------|
| `/api/products` | GET | Získat všechny produkty |
| `/api/products` | POST | Vytvořit nový produkt |
| `/api/products/sync` | POST | Synchronizovat ze SumUp |
| `/api/products/[id]` | GET | Získat jeden produkt |
| `/api/products/[id]` | PATCH | Aktualizovat produkt |
| `/api/products/[id]` | DELETE | Smazat produkt |
| `/api/inventory` | GET | Získat skladové položky |
| `/api/inventory` | POST | Naskladnit zboží |
| `/api/inventory/[id]` | PATCH | Opravit naskladnění |
| `/api/inventory/[id]` | DELETE | Smazat skladovou položku |
| `/api/inventory/summary` | GET | Souhrn skladu |
| `/api/transactions` | GET | Získat transakce |
| `/api/transactions` | POST | Vytvořit transakci |
| `/api/transactions/sync` | POST | Synchronizovat ze SumUp |
| `/api/suppliers` | GET | Získat dodavatele |
| `/api/suppliers` | POST | Vytvořit dodavatele |
| `/api/stats` | GET | Statistiky pro dashboard |

### Layout a styly

| Soubor | Popis |
|--------|-------|
| `app/layout.tsx` | Root layout - obaluje všechny stránky |
| `app/globals.css` | Globální CSS styly |

---

## 📁 /components - React komponenty

### UI komponenty (`components/ui/`)

| Komponenta | Popis | Použití |
|------------|-------|---------|
| `Button.tsx` | Tlačítko | `<Button onClick={}>Text</Button>` |
| `Card.tsx` | Karta/box | `<Card><CardHeader>...</CardHeader></Card>` |
| `Input.tsx` | Textové pole | `<Input value={} onChange={} />` |
| `Table.tsx` | Tabulka | `<Table><TableBody>...</TableBody></Table>` |
| `Modal.tsx` | Dialog/Modal | `<Modal isOpen={true}>Obsah</Modal>` |
| `Badge.tsx` | Status indikátor | `<Badge variant="success">OK</Badge>` |

### Ostatní komponenty

| Komponenta | Popis |
|------------|-------|
| `Sidebar.tsx` | Navigační menu (vlevo) |

---

## 📁 /lib - Knihovny a utility

| Soubor | Popis |
|--------|-------|
| `prisma.ts` | Prisma Client - připojení k databázi |
| `sumup.ts` | SumUp API client - funkce pro volání SumUp API |
| `utils.ts` | Pomocné funkce (formatPrice, formatDate...) |

### Funkce v `utils.ts`

```typescript
formatPrice(1234.5)           // → "1 234,50 Kč"
formatDate(new Date())        // → "25. 12. 2024"
formatDateTime(new Date())    // → "25. 12. 2024 14:30"
formatQuantity(1500, 'g')     // → "1,5 kg"
cn('class1', 'class2')        // Sloučí Tailwind třídy
```

### Funkce v `sumup.ts`

```typescript
await fetchProducts()                        // Stáhne produkty ze SumUp
await fetchTransactions(startDate, endDate)  // Stáhne transakce
await fetchTransaction(id)                   // Stáhne jednu transakci
```

---

## 📁 /prisma - Databáze

| Soubor | Popis |
|--------|-------|
| `schema.prisma` | Databázové schéma (definice tabulek) |
| `seed.ts` | Seed skript - naplní DB testovacími daty |

### Databázové tabulky

| Tabulka | Popis |
|---------|-------|
| `Product` | Katalog zboží |
| `InventoryItem` | Skladové zásoby |
| `Supplier` | Dodavatelé |
| `Transaction` | Transakce/faktury |
| `TransactionItem` | Položky transakcí |

---

## 📁 /scripts - Pomocné skripty

| Skript | Popis | Použití |
|--------|-------|---------|
| `setup.bat` | Instalace projektu | Dvakrát klikni pro instalaci |
| `start.bat` | Spuštění aplikace | Dvakrát klikni pro spuštění |
| `db-studio.bat` | Otevře Prisma Studio | Spustí GUI pro databázi |
| `reset-db.bat` | Resetuje databázi | SMAŽE všechna data! |
| `seed.bat` | Naplní DB testovacími daty | Vytvoří ukázková data |

---

## 📄 Konfigurační soubory

### package.json
Obsahuje:
- Závislosti (React, Next.js, Prisma...)
- NPM skripty (`dev`, `build`, `start`...)

### tsconfig.json
TypeScript konfigurace:
- Nastavení kompileru
- Path aliasy (`@/` = root složka)

### next.config.js
Next.js konfigurace:
- React Strict Mode
- (Zde můžeš přidat další nastavení)

### tailwind.config.ts
Tailwind CSS konfigurace:
- Barvy
- Breakpointy
- Zaoblení rohů (`--radius`)

### .env
Environment variables (citlivé údaje):
- `DATABASE_URL` - připojení k PostgreSQL
- `SUMUP_API_KEY` - SumUp API klíč
- `SUMUP_API_URL` - SumUp API endpoint

**NIKDY nesdílej tento soubor!**

### .gitignore
Co ignorovat v Gitu:
- `node_modules/` (závislosti)
- `.env` (citlivé údaje)
- `.next/` (build cache)

---

## 📚 Dokumentace

| Soubor | Popis |
|--------|-------|
| `README.md` | Hlavní dokumentace |
| `QUICK_START.md` | Rychlý start (5 minut) |
| `TUTORIAL.md` | Tutorial pro začátečníky |
| `FAQ.md` | Často kladené otázky |
| `INSTALACE_KROK_ZA_KROKEM.md` | Detailní instalační průvodce |
| `STRUKTURA_PROJEKTU.md` | Tento soubor |
| `CHANGELOG.md` | Historie změn |

---

## 🗂️ Datový tok

### Načtení produktů

```
1. User klikne "Synchronizovat ze SumUp"
   ↓
2. Frontend zavolá: POST /api/products/sync
   ↓
3. API zavolá: fetchProducts() (lib/sumup.ts)
   ↓
4. SumUp API vrátí produkty
   ↓
5. Uložení do DB (Prisma)
   ↓
6. Vrácení odpovědi do frontendu
   ↓
7. Frontend aktualizuje seznam
```

### Naskladnění

```
1. User vyplní formulář a klikne "Naskladnit"
   ↓
2. Frontend zavolá: POST /api/inventory
   ↓
3. API vytvoří InventoryItem v DB
   ↓
4. Vrácení odpovědi
   ↓
5. Frontend reload dat a zobrazí aktualizovaný sklad
```

### Synchronizace transakcí

```
1. User klikne "Synchronizovat ze SumUp"
   ↓
2. Frontend zavolá: POST /api/transactions/sync
   ↓
3. API zavolá: fetchTransactions() (lib/sumup.ts)
   ↓
4. SumUp API vrátí transakce
   ↓
5. Pro každou transakci:
   - Vytvoř Transaction
   - Vytvoř TransactionItem pro každou položku
   - Odečti ze skladu (decreaseStock funkce)
   ↓
6. Vrácení odpovědi
   ↓
7. Frontend zobrazí transakce
```

---

## 🔑 Klíčové pojmy

### Next.js
- **File-based routing:** Soubor = route (stránka nebo API)
- **App Router:** Nový Next.js 13+ systém routování
- **Server/Client Components:** Komponenty běží na serveru nebo v prohlížeči
- **API Routes:** Backend endpointy v Next.js projektu

### Prisma
- **ORM:** Object-Relational Mapping (práce s DB bez SQL)
- **Schema:** Definice databázových tabulek
- **Client:** Automaticky vygenerovaný klient pro práci s DB
- **Migration:** Změna struktury databáze

### React
- **Component:** Znovupoužitelný kus UI
- **Hook:** Funkce jako `useState`, `useEffect`
- **Props:** Parametry komponenty
- **State:** Stav komponenty (data která se mění)

### TypeScript
- **Type:** Definice typu proměnné/objektu
- **Interface:** Definice struktury objektu
- **Generic:** Obecný typ (např. `Array<T>`)

### Tailwind CSS
- **Utility-first:** CSS třídy přímo v HTML/JSX
- **Responsive:** `md:`, `lg:` prefixy pro breakpointy
- **States:** `hover:`, `active:`, `focus:` prefixy

---

## 📊 Velikosti a výkon

### Projekt

- **Soubory celkem:** ~50
- **Řádků kódu:** ~3000
- **node_modules:** ~500 MB
- **Build:** ~10 MB

### Runtime

- **Startup čas:** ~5 sekund
- **Hot reload:** <1 sekunda
- **API response:** <100ms (lokálně)
- **SumUp API:** ~500ms (závisí na síti)

---

## 🔒 Bezpečnost

### Citlivé soubory (NIKDY nesdílej!)

- `.env` - obsahuje API klíče a hesla
- `node_modules/` - obsahuje závislosti (velké)
- `.next/` - build cache

### Co můžeš sdílet

- Veškerý zdrojový kód (kromě `.env`)
- Dokumentaci
- Databázové schéma

---

**Pro více informací viz README.md a TUTORIAL.md**
