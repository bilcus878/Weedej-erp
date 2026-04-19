# Weedej ERP — Deep Swarm Analysis Report

> Generated: 2026-04-19 by Ruflo agentic swarm (8 specialized agents)
> Swarm ID: swarm-1776562769991-pqgot9

## Executive Summary

| Domain | Score | Critical | High | Medium | Low |
|--------|-------|----------|------|--------|-----|
| [Security](./02-security.md) | **3/10** | 5 | 5 | 4 | 2 |
| [Performance](./03-performance.md) | **3/10** | 3 | 7 | 4 | 2 |
| [DevOps & Observability](./04-devops.md) | **2.5/10** | 4 | 4 | 4 | 2 |
| [Architecture](./01-architecture.md) | **5/10** | 4 | 6 | 5 | 3 |
| [Code Quality](./05-code-quality.md) | **5/10** | 4 | 6 | 6 | 3 |
| [UI/UX & Design](./07-ui-ux.md) | **5.5/10** | 2 | 5 | 5 | 3 |
| [Database & Schema](./06-database.md) | **6/10** | 2 | 8 | 6 | 4 |
| [ERP ↔ Eshop Integration](./08-integration.md) | **4/10** | 2 | 4 | 5 | 2 |

**Overall System Score: 4.25 / 10**

---

## 🚨 IMMEDIATE ACTION REQUIRED (Before Next Deploy)

### 1. Rotate the SumUp API key
A **live production SumUp API key** is committed in `.env.example`, `INSTRUCTION.txt`, and `FAQ.md`.
```
sup_sk_pXdK8RIux1haKPXeeKHEHFXkpp7rHmCvO  ← ROTATE THIS NOW
```
**Action:** Log in to SumUp dashboard → API → Revoke key → Generate new → Update production env.

### 2. Remove the `/api/settings/reset-database` auth gap
This endpoint deletes ALL financial data with zero in-handler auth check. Any authenticated ERP user (or potentially unauthenticated in middleware bypass scenarios) can wipe the database.

### 3. Stop using `prisma db push --accept-data-loss` in production build
The build script (`package.json` line 9) silently destroys columns/data on deploy. Switch to `prisma migrate deploy`.

### 4. Add `X-ERP-Timestamp` header to outgoing webhooks
ALL webhooks from ERP to eshop currently fail with HTTP 400 because the eshop requires this header but ERP never sends it. Stock updates are silently dropped. Order-shipped notifications queue up as dead letters.

---

## Priority Fix Order

### Phase 1 — Critical Security (This Week)
1. Rotate SumUp API key + scrub from git history (BFG Repo-Cleaner)
2. Add `getServerSession()` check inside `/api/settings/reset-database`
3. Add `getServerSession()` check inside `/api/api-keys/*`
4. Add `X-ERP-Timestamp` header to `eshopStockWebhook.ts` and `eshopWebhook.ts`
5. Remove production bypass from `delivery-notes/[id]/route.ts` DELETE (TODO comment)
6. Fix CRON_SECRET optional bypass → make it mandatory

### Phase 2 — Critical Performance & Data Integrity (Next 2 Weeks)
1. Replace `getAllProductsStock()` N+1 with `groupBy` aggregates
2. Switch build to `prisma migrate deploy`
3. Add pagination to all list endpoints (default 50 rows)
4. Fix `/api/stats` to use aggregates instead of loading full transaction history
5. Scope Prisma query logging to development only

### Phase 3 — Architecture & Code Quality (Next Month)
1. Consolidate duplicate invoice endpoints (Transaction vs IssuedInvoice models)
2. Consolidate `/api/orders` + `/api/external/orders` into one endpoint
3. Extract `lib/webhookDispatch.ts` to eliminate 4× copy-paste pattern
4. Add Zod input validation to all POST/PATCH route bodies
5. Create `lib/constants.ts` with status enums (no more magic strings)
6. Add `/api/v1/` prefix to external integration endpoints

### Phase 4 — UI/UX & Developer Experience (Ongoing)
1. Implement global toast system (currently only 3/15 pages have it)
2. Replace `window.location.href` with Next.js `router.push()`
3. Split 2000-line page files into sub-components
4. Add basic ARIA attributes to modals and icon buttons
5. Default `isPendingSectionExpanded = true` on delivery-notes page
6. Add structured logging (pino) to replace 408 console.log calls
7. Add Sentry for production error monitoring
8. Add GitHub Actions CI/CD pipeline

---

## Files

- [01-architecture.md](./01-architecture.md) — Architecture & module design
- [02-security.md](./02-security.md) — Security audit
- [03-performance.md](./03-performance.md) — Performance analysis
- [04-devops.md](./04-devops.md) — DevOps & observability
- [05-code-quality.md](./05-code-quality.md) — Code quality & logic
- [06-database.md](./06-database.md) — Database & schema design
- [07-ui-ux.md](./07-ui-ux.md) — UI/UX & design
- [08-integration.md](./08-integration.md) — ERP ↔ Eshop integration
