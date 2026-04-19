# Security Audit — Score: 3/10

## 🚨 CRITICAL — Fix Before Next Deploy

### 1. Live SumUp API Key Committed to Repository
**File:** `.env.example`, `INSTRUCTION.txt`, `FAQ.md`

```
sup_sk_pXdK8RIux1haKPXeeKHEHFXkpp7rHmCvO  ← LIVE KEY — ROTATE IMMEDIATELY
```

**Fix:**
1. Rotate key in SumUp dashboard
2. Replace with placeholder in all 3 files
3. Run `git filter-branch` or BFG Repo-Cleaner to purge from git history
4. Add `INSTRUCTION.txt` and `FAQ.md` patterns to `.gitignore` review

---

### 2. Internal API Routes Unprotected (Zero In-Handler Auth Checks)
**File:** ~70 route files under `app/api/`

Middleware alone provides auth. `/api/api-keys/route.ts` (GET, POST), `/api/api-keys/[id]/route.ts` (PATCH, DELETE) have NO session check — any unauthenticated request can list/create/delete API keys.

`PUBLIC_API_PREFIXES` includes `/api/invoices/` which exposes supplier invoice listings to unauthenticated access.

**Fix:**
```typescript
// Add to every sensitive handler:
const session = await getServerSession(authOptions)
if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

Remove `/api/invoices/` from `PUBLIC_API_PREFIXES` in `middleware.ts`.

---

### 3. Database Reset Endpoint — No Auth Check
**File:** `app/api/settings/reset-database/route.ts`

Deletes ALL financial records. Zero authentication logic inside the handler.

**Fix:** Add session check + admin role verification + confirmation token requirement.

---

### 4. API Keys Stored as Plaintext + Timing Attack Vector
**File:** `lib/apiKeyAuth.ts`

API keys stored as plaintext in DB. DB compromise = all keys immediately usable.

**Fix:**
```typescript
// Store hashed: SHA-256 or bcrypt
const keyHash = crypto.createHash('sha256').update(key).digest('hex')
const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } })
// Use crypto.timingSafeEqual() for comparison
```

---

### 5. CORS Wildcard on External API
**File:** `lib/apiKeyAuth.ts`

`corsHeaders()` returns `'Access-Control-Allow-Origin': origin ?? '*'`. Missing origin → wildcard → any browser origin can call external endpoints.

**Fix:** Maintain explicit allowlist. Never default to `*` on data-modifying endpoints.

---

## High Findings

### 6. CRON_SECRET Optional → Public Endpoint
**File:** `app/api/cron/webhook-retry/route.ts`

```typescript
// CURRENT (broken):
if (cronSecret) { ... check auth ... }  // skipped if env var missing

// FIX:
if (!cronSecret) return NextResponse.json({ error: 'Not configured' }, { status: 503 })
```

### 7. Stack Traces Returned to Clients
**File:** Multiple routes (e.g., `app/api/invoices/issued/[id]/storno/route.ts`)

Some 500 responses include `error.stack`. Exposes file paths, line numbers, framework internals.

**Fix:** Remove `stack` from all JSON error responses. Log server-side only.

### 8. No Role-Based Access Control (RBAC)
All authenticated users have identical access. No admin vs employee separation.

**Fix:** Add `role` field to `User` model. Extend JWT/session callbacks. Guard destructive operations.

### 9. Settings PATCH Accepts Arbitrary Body
**File:** `app/api/settings/route.ts`

`prisma.settings.update({ data: body })` — raw unvalidated JSON. Can overwrite bank account, VAT status, any field.

**Fix:** Strict Zod schema with explicit field whitelist.

### 10. No Rate Limiting Anywhere
No protection against brute-force on login, API enumeration, or DoS.

**Fix:** Add `@upstash/ratelimit` or equivalent. Apply strict limits to `/api/auth/*` (5 req/min per IP).

### 11. No Security HTTP Headers
`next.config.js` has no `headers()` function. Missing: CSP, X-Frame-Options, HSTS, X-Content-Type-Options.

**Fix:**
```javascript
// next.config.js
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  }]
}
```

### 12. Test Endpoint in Production
**File:** `app/api/test-sumup/route.ts`

Unauthenticated GET endpoint that returns full SumUp account data. Must not exist in production.

**Fix:** Delete the file. Add `*.test.ts` route convention to `.gitignore` review.

---

## Medium Findings

- External order creation lacks type validation (unbounded `vatRate`, negative `quantity` accepted)
- `$executeRawUnsafe()` in `scripts/setup-storno.ts` — use tagged template literals
- `NEXTAUTH_SECRET` not in `.env.example` — missing or weak JWT secret risk
- `axios` pinned to version with known SSRF CVE (CVE-2024-39338) — upgrade to `>=1.7.4`

---

## Low Findings

- PII in console logs (supplier names, product IDs logged at info level)
- `prisma db push --accept-data-loss` in build script — destructive on deploy

