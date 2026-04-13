-- ========================================
-- SETUP STORNO SYSTÉMU + ON-COMMIT ČÍSLOVÁNÍ
-- ========================================

-- 1. Vytvoř tabulku DocumentSeries pro atomické číslování
CREATE TABLE IF NOT EXISTS "DocumentSeries" (
    "id" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentSeries_pkey" PRIMARY KEY ("id")
);

-- Indexy pro rychlé vyhledávání
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentSeries_documentType_year_key"
ON "DocumentSeries"("documentType", "year");

CREATE INDEX IF NOT EXISTS "DocumentSeries_documentType_idx"
ON "DocumentSeries"("documentType");

-- 2. Přidej storno pole do Receipt (Příjemky)
ALTER TABLE "Receipt"
ADD COLUMN IF NOT EXISTS "stornoReason" TEXT,
ADD COLUMN IF NOT EXISTS "stornoAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "stornoBy" TEXT;

-- 3. Přidej storno pole do DeliveryNote (Výdejky)
ALTER TABLE "DeliveryNote"
ADD COLUMN IF NOT EXISTS "stornoReason" TEXT,
ADD COLUMN IF NOT EXISTS "stornoAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "stornoBy" TEXT;

-- 4. Smaž starou DocumentNumber tabulku (pokud existuje)
DROP TABLE IF EXISTS "DocumentNumber" CASCADE;

-- Hotovo!
SELECT 'STORNO systém a ON-COMMIT číslování nainstalováno!' AS status;
