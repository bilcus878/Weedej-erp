-- HARD RESET vystavených faktur a číslování
-- Přímo v PostgreSQL bez Prisma cache

BEGIN;

-- 1. Smazat všechny vystavené faktury
TRUNCATE TABLE "IssuedInvoice" CASCADE;

-- 2. Smazat číslování pro issued-invoice
DELETE FROM "DocumentSeries" WHERE "documentType" IN ('issued-invoice', 'issued_invoice');

-- 3. Ověření
SELECT COUNT(*) AS "Pocet faktur (melo by byt 0)" FROM "IssuedInvoice";
SELECT COUNT(*) AS "Pocet serie (melo by byt 0)" FROM "DocumentSeries" WHERE "documentType" LIKE '%invoice%';

COMMIT;

SELECT '✅ Reset dokončen - můžeš spustit SumUp sync' AS status;
