# Changelog

Všechny důležité změny v projektu.

## [1.0.0] - 2024-12-25

### Přidáno
- ✅ Kompletní Next.js 14 projekt s TypeScript
- ✅ Prisma ORM s PostgreSQL databází
- ✅ SumUp API integrace
- ✅ Katalog zboží se synchronizací ze SumUp
- ✅ Skladová evidence s naskladněním
- ✅ Evidence transakcí s automatickým vyskladněním
- ✅ Dashboard s přehledem tržeb a skladu
- ✅ Rozepsání multi-item transakcí pod jednu FA
- ✅ FIFO metoda vyskladnění
- ✅ Dodavatelé
- ✅ Podpora jednotek (ks, g)
- ✅ Tailwind CSS styling
- ✅ Responsivní UI
- ✅ Kompletní dokumentace (README, TUTORIAL, FAQ)
- ✅ Windows .bat skripty pro snadné spouštění

### Databázové schéma
- `Product` - Katalog zboží
- `InventoryItem` - Skladové zásoby
- `Supplier` - Dodavatelé
- `Transaction` - Transakce/objednávky
- `TransactionItem` - Položky transakcí

### API Endpointy
- `GET/POST /api/products` - Produkty
- `POST /api/products/sync` - Sync produktů ze SumUp
- `GET/POST /api/inventory` - Skladová evidence
- `GET /api/inventory/summary` - Souhrn skladu
- `GET/POST /api/transactions` - Transakce
- `POST /api/transactions/sync` - Sync transakcí ze SumUp
- `GET /api/suppliers` - Dodavatelé
- `GET /api/stats` - Statistiky pro dashboard

### UI Stránky
- `/` - Dashboard
- `/products` - Katalog zboží
- `/inventory` - Skladová evidence
- `/transactions` - Transakce

### Komponenty
- `Button` - Tlačítko
- `Card` - Karta
- `Input` - Textové pole
- `Table` - Tabulka
- `Modal` - Dialog
- `Badge` - Status indikátor
- `Sidebar` - Navigace

---

## Budoucí vylepšení (TODO)

### Vysoká priorita
- [ ] Autentizace (NextAuth.js nebo Clerk)
- [ ] Export do Excel/CSV
- [ ] Grafy tržeb (Recharts)
- [ ] Filtrace a vyhledávání v tabulkách
- [ ] Notifikace při nízkých stavech skladu
- [ ] UI pro správu dodavatelů

### Střední priorita
- [ ] Multi-currency podpora
- [ ] Inventura (fyzická vs. systémová zásoba)
- [ ] Batch import produktů z CSV
- [ ] Tisk faktur
- [ ] Email notifikace
- [ ] Dark mode

### Nízká priorita
- [ ] Mobilní aplikace (React Native)
- [ ] PWA (Progressive Web App)
- [ ] Real-time updates (WebSockets)
- [ ] Multi-tenant (více uživatelů)
- [ ] Audit log (kdo co změnil)
- [ ] Backup & restore

---

**Verze formát:** [Major.Minor.Patch]
- **Major:** Breaking changes
- **Minor:** Nové funkce
- **Patch:** Bug fixy
