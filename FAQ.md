# Často kladené otázky (FAQ) ❓

## Instalace a nastavení

### Jak nainstaluju PostgreSQL?

**Nejrychlejší způsob (Docker):**
```bash
docker run --name ucetni-db -e POSTGRES_PASSWORD=heslo123 -p 5432:5432 -d postgres:14
```

**Klasická instalace:**
1. Stáhni z: https://www.postgresql.org/download/
2. Nainstaluj a zapamatuj si heslo
3. PostgreSQL automaticky běží jako služba

### Jak změním heslo k databázi?

Uprav `.env` soubor:
```env
DATABASE_URL="postgresql://postgres:TVOJEHESLO@localhost:5432/ucetni_db"
```
Změň `TVOJEHESLO` na své heslo.

### Aplikace nejde spustit - "Module not found"

Spusť:
```bash
npm install
```

### Chyba "Can't reach database server"

PostgreSQL neběží. Spusť ho:

**Docker:**
```bash
docker start ucetni-db
```

**Windows Service:**
- Otevři Services (Win+R → services.msc)
- Najdi "postgresql-x64-14"
- Klikni "Start"

## Použití

### Jak přidám dodavatele?

Momentálně přes API nebo Prisma Studio:

**API:**
```bash
curl -X POST http://localhost:3000/api/suppliers \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Dodavatel s.r.o.\", \"email\": \"info@dodavatel.cz\"}"
```

**Prisma Studio:**
```bash
npx prisma studio
```
→ Otevři tabulku `Supplier` → Přidej záznam

### Jak opravím chybné naskladnění?

**Přes Prisma Studio (nejjednodušší):**
```bash
npx prisma studio
```
→ Tabulka `InventoryItem` → Najdi položku → Uprav `quantity` nebo `purchasePrice`

**Přes API:**
```bash
curl -X PATCH http://localhost:3000/api/inventory/ID_POLOZKY \
  -H "Content-Type: application/json" \
  -d "{\"quantity\": 100}"
```

### Jak změním jednotku produktu (ks → g)?

**Přes Prisma Studio:**
```bash
npx prisma studio
```
→ Tabulka `Product` → Najdi produkt → Změň `unit` na `g` nebo `ks`

### Produkty ze SumUp nemají správné jednotky

Po synchronizaci jdi do Prisma Studio a uprav `unit` field u každého produktu.

Nebo uprav API v `app/api/products/sync/route.ts`:
```typescript
unit: 'g', // Změň na 'g' pokud většina produktů je na gramy
```

### Jak smažu všechna data a začnu znovu?

**VAROVÁNÍ: Tohle smaže všechno!**

```bash
npx prisma db push --force-reset
```

Nebo použij:
```bash
scripts\reset-db.bat
```

## SumUp API

### SumUp API vrací chybu 401 (Unauthorized)

API klíč je neplatný. Zkontroluj `.env`:
```env
SUMUP_API_KEY="sup_sk_pXdK8RIux1haKPXeeKHEHFXkpp7rHmCvO"
```

### Transakce se nesynchronizují

Možné důvody:
1. **API klíč nemá oprávnění** - Zkontroluj na SumUp dashboardu
2. **Transakce jsou starší než 7 dní** - Změň rozsah dat v kódu
3. **SumUp API je nedostupné** - Zkus později

### Jak změním rozsah synchronizace transakcí?

V `app/transactions/page.tsx` změň:
```typescript
startDate.setDate(startDate.getDate() - 7)  // <-- Změň 7 na jiné číslo (dny)
```

### Produkty mají špatné ceny po synchronizaci

SumUp API může vracet ceny v centech. Zkontroluj `lib/sumup.ts`:
```typescript
price: sumupProduct.price / 100  // Pokud je cena v centech
```

## Skladová evidence

### Jak funguje FIFO?

FIFO = First In, First Out (První dovnitř, první ven)

Když prodáš produkt, odečítá se od **nejstaršího** naskladnění.

**Příklad:**
- 1. 5. 2024: Naskladnil jsi 100 ks za 10 Kč
- 5. 5. 2024: Naskladnil jsi 50 ks za 12 Kč
- 10. 5. 2024: Prodal jsi 120 ks

Vyskladní se:
- Celých 100 ks z 1. 5.
- 20 ks z 5. 5.
- Zbyde: 30 ks z 5. 5.

### Záporný stav na skladě?

To by se nemělo stát. Pokud ano, je to chyba.

Zkontroluj v Prisma Studio `InventoryItem` tabulku a uprav `quantity`.

### Jak vidím historii naskladnění pro jeden produkt?

**Přes Prisma Studio:**
```bash
npx prisma studio
```
→ `InventoryItem` tabulka → Filtruj podle `productId`

**Nebo přes API:**
```
GET /api/products/ID_PRODUKTU
```
(Vrátí produkt včetně všech inventory items)

## Transakce

### Proč je cena jen u první položky?

Podle zadání! Celá transakce (objednávka) má jednu celkovou cenu.

Jednotlivé položky mají jen množství (ks/g), aby fungovala skladová evidence.

**Příklad:**
```
FA123456 - Celková cena: 250 Kč
  - Položka 1: Espresso, 2 ks, cena: 250 Kč
  - Položka 2: Croissant, 1 ks, cena: -
```

### Jak zobrazím detail transakce?

Na stránce `/transactions` klikni na transakci → Rozbalí se položky.

### Transakce nemá produkty

SumUp API buď nevrací produkty, nebo nejsou namapované.

Zkontroluj:
1. Jestli produkt existuje v databázi (stejný název)
2. Jestli SumUp transakce má `products` pole

## Development

### Jak přidám nové pole do databáze?

1. Uprav `prisma/schema.prisma`:
```prisma
model Product {
  // ...
  newField String?  // Přidej tohle
}
```

2. Aplikuj změnu:
```bash
npx prisma db push
npx prisma generate
```

3. Uprav API endpointy a UI formuláře

### Jak debuguji API endpointy?

**Browser DevTools:**
- F12 → Network tab → Vidíš všechny requesty

**Console.log:**
```typescript
export async function GET() {
  const products = await prisma.product.findMany()
  console.log('Products:', products)  // <-- Přidej tohle
  return NextResponse.json(products)
}
```

**Prisma Query Log:**
V `lib/prisma.ts` je už zapnutý: `log: ['query']`

### Jak změním port (3000 je obsazený)?

```bash
npm run dev -- -p 3001
```

Nebo uprav `package.json`:
```json
"dev": "next dev -p 3001"
```

### TypeScript hlásí chyby ale aplikace funguje

Spusť:
```bash
npx prisma generate
```

To vygeneruje TypeScript typy pro Prisma.

## Production

### Jak nasadím do produkce?

**Vercel (doporučeno):**
1. Push na GitHub
2. Připoj repo na Vercel.com
3. Nastav env variables
4. Deploy!

**Nebo na vlastní server:**
```bash
npm run build
npm start
```

### Kde nastavím environment variables v produkci?

V Vercel/Railway/jiné platformě v nastavení projektu.

**NIKDY** necommituj `.env` do Gitu!

### Databáze v produkci?

Použij spravovaný PostgreSQL:
- **Vercel Postgres**
- **Railway**
- **Supabase**
- **DigitalOcean Managed Databases**

## Bezpečnost

### Je aplikace zabezpečená?

**Pro internal use ano.** Pro public web NE.

Chybí:
- Autentizace (login)
- Autorizace (kdo může co)
- CSRF ochrana
- Rate limiting

### Jak přidám login?

Použij **NextAuth.js**: https://next-auth.js.org/

Nebo **Clerk**: https://clerk.com/

### API klíč je vidět v kódu?

Ne! Je v `.env` souboru který je v `.gitignore`.

V kódu používáme `process.env.SUMUP_API_KEY` který se nahradí při buildu.

---

**Nenašel jsi odpověď?**

1. Zkontroluj `README.md` a `TUTORIAL.md`
2. Hledej na Google
3. Zkus ChatGPT/Claude

Většina problémů má řešení na Stack Overflow! 🔍
