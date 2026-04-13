-- Vyčistění testovacích vystavených faktur a resetování číslování

-- 1. Smazat všechny vystavené faktury (testovací data)
DELETE FROM "IssuedInvoice";

-- 2. Resetovat číslování vystavených faktur na 0
DELETE FROM "DocumentSeries" WHERE "documentType" IN ('issued-invoice', 'issued_invoice');

-- Výsledek
SELECT 'Vystavené faktury smazány a číslování resetováno' AS status;
