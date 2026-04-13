# Rychlý start - 5 minut ⚡

## Krok 1: Nainstaluj PostgreSQL (Docker - nejrychlejší)

Pokud máš Docker:
```bash
docker run --name ucetni-db -e POSTGRES_PASSWORD=heslo123 -p 5432:5432 -d postgres:14
```

Pokud nemáš Docker:
- Stáhni PostgreSQL: https://www.postgresql.org/download/
- Nainstaluj a zapamatuj si heslo

## Krok 2: Nastav databázi

Uprav `.env` soubor:
```env
DATABASE_URL="postgresql://postgres:heslo123@localhost:5432/ucetni_db"
```
(Změň `heslo123` na své heslo)

## Krok 3: Nainstaluj a spusť

```bash
# Nainstaluj závislosti
npm install

# Vytvoř tabulky v databázi
npx prisma db push

# Spusť aplikaci
npm run dev
```

## Krok 4: Otevři aplikaci

Otevři prohlížeč: **http://localhost:3000**

## Krok 5: První použití

1. Klikni na "Katalog zboží" v menu
2. Klikni "Synchronizovat ze SumUp"
3. Produkty se stáhnou z SumUp API
4. Jdi na "Skladová evidence" a naskladni zboží
5. Jdi na "Transakce" a synchronizuj transakce

**Hotovo!** 🎉

---

## Problémy?

**"Port 5432 is already in use"**
- PostgreSQL už běží, to je OK!

**"Error: P1001: Can't reach database server"**
- PostgreSQL neběží, spusť ho: `docker start ucetni-db`

**"EADDRINUSE: address already in use :::3000"**
- Port 3000 je obsazený, použij jiný: `npm run dev -- -p 3001`

Více info v `README.md`!
