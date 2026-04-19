# DevOps & Observability — Score: 2.5/10

## Critical Findings

### 1. No CI/CD Pipeline
**File:** `.github/` (missing entirely)

Zero GitHub Actions workflows. No automated build, test, lint, or deploy. Every deployment is 100% manual.

**Fix:** Create `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '24' }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - run: npm audit --audit-level=high
```

---

### 2. `prisma db push --accept-data-loss` in Production Build
**File:** `package.json` (line 9)

Build script: `prisma generate && prisma db push --accept-data-loss && next build`

`--accept-data-loss` silently drops columns and data in production without confirmation.

**Fix:**
```json
"build": "prisma generate && prisma migrate deploy && next build"
```
Use `prisma migrate dev` locally. Never use `--accept-data-loss` outside local reset scenarios.

---

### 3. Live SumUp API Key Committed to Repository
**File:** `.env.example`, `INSTRUCTION.txt`, `FAQ.md`

`sup_sk_pXdK8RIux1haKPXeeKHEHFXkpp7rHmCvO` — live production key.

**Fix:** Rotate immediately. Purge from git history with BFG Repo-Cleaner.

---

### 4. No Error Monitoring
No Sentry, Datadog, or any structured error monitoring. Production errors → `console.error()` → Vercel logs → no alerting.

**Fix:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```
Add `SENTRY_DSN` to production environment. Takes ~30 minutes.

---

## High Findings

### 5. Cron Endpoint Public When `CRON_SECRET` Not Set
**File:** `app/api/cron/webhook-retry/route.ts:15-21`

```typescript
// BROKEN — skips auth if env var missing:
if (cronSecret) { verifyHeader... }

// FIX:
if (!cronSecret) return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
if (authHeader !== `Bearer ${cronSecret}`) return ...401
```

### 6. No Structured Logging
408 `console.log/error/warn` calls across 99 files. No correlation IDs, no severity levels, no JSON format.

**Fix:**
```typescript
// lib/logger.ts
import pino from 'pino'
export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })
```

### 7. Incomplete `.env.example`
Only 3 variables documented. Missing: `CRON_SECRET`, `ERP_WEBHOOK_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.

**Fix:** Audit all `process.env.*` in codebase and document every variable with placeholder + description.

### 8. Test Coverage: Only 2 Test Files
`vatCalculation.test.ts` and `erpOrderSync.test.ts`. Zero coverage for: storno logic, document numbering, stock calculation, all API routes.

**Fix:** Add coverage threshold to `vitest.config.ts`:
```typescript
coverage: { provider: 'v8', thresholds: { lines: 60 } }
```

---

## Medium Findings

- No Vercel preview deployments or deploy gating documented
- No branch protection rules, no PR templates, no CODEOWNERS
- `.backup` files committed to repo (`page.tsx.backup`, `sumup.ts.backup`) — delete + add `*.backup` to `.gitignore`
- 16+ loose `.md`, `.txt`, `.bat` files in root — move to `/docs/` and `/scripts/`
- `next-auth` pinned at v4 (legacy), `next` not at latest 14.x patch, `zod` at v4 (breaking changes from v3)

---

## Low Findings

- No uptime monitoring (UptimeRobot, Better Uptime, Vercel Analytics)
- `/api/external/stock` computes `priceWithVat` without checking `isVatPayer` — inflates prices 21% for non-VAT-payer scenario

