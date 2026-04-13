-- Migrace kategorií ze String na relační tabulku

-- 1. Vytvořit tabulku Category
CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL,
  "sumupId" TEXT,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- 2. Vytvořit indexy
CREATE UNIQUE INDEX IF NOT EXISTS "Category_sumupId_key" ON "Category"("sumupId");
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");
CREATE INDEX IF NOT EXISTS "Category_name_idx" ON "Category"("name");

-- 3. Přidat categoryId do Product (pokud ještě neexistuje)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- 4. Naplnit tabulku Category unikátními kategoriemi z Product
INSERT INTO "Category" (id, name, "createdAt", "updatedAt")
SELECT DISTINCT
  gen_random_uuid(),
  category,
  NOW(),
  NOW()
FROM "Product"
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;

-- 5. Propojit Product s Category pomocí categoryId
UPDATE "Product" p
SET "categoryId" = c.id
FROM "Category" c
WHERE p.category = c.name
  AND p.category IS NOT NULL
  AND p.category != '';

-- 6. Vytvořit index na categoryId
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");

-- 7. Přidat foreign key constraint
ALTER TABLE "Product"
ADD CONSTRAINT "Product_categoryId_fkey"
FOREIGN KEY ("categoryId")
REFERENCES "Category"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 8. Smazat staré pole category (POZOR: toto je nevratná operace!)
-- ALTER TABLE "Product" DROP COLUMN IF EXISTS "category";
