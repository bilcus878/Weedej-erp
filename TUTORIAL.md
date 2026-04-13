# Tutorial - Jak to používat 📚

## Pro začátečníky v Next.js / React

Tohle je klasická **React aplikace**, akorát s Next.js frameworkem. Pokud znáš React, budeš se rychle orientovat!

## Co je kde

### 📁 `/app` - Stránky a API

V Next.js funguje **file-based routing**. To znamená:

- `app/page.tsx` = stránka na URL `/` (Dashboard)
- `app/products/page.tsx` = stránka na URL `/products`
- `app/api/products/route.ts` = API endpoint na `/api/products`

**Není třeba psát routing kód!** Next.js to udělá automaticky.

### 🎨 Komponenty

V `components/` jsou React komponenty. Používáš je jako:

```tsx
import Button from '@/components/ui/Button'

<Button onClick={handleClick}>Klikni</Button>
```

`@/` je alias pro root složku projektu (viz `tsconfig.json`).

### 🗃️ Databáze - Prisma

Prisma je ORM (Object-Relational Mapping). Místo SQL píšeš:

```typescript
// Místo: SELECT * FROM products WHERE name = 'Coffee'
const products = await prisma.product.findMany({
  where: { name: 'Coffee' }
})
```

**Schéma** je v `prisma/schema.prisma`. Když ho změníš, spusť:
```bash
npx prisma db push
```

### 🌐 API Endpointy

API endpointy jsou v `app/api/`. Každý endpoint má funkce:

- `GET` - Načíst data
- `POST` - Vytvořit nová data
- `PATCH` - Aktualizovat data
- `DELETE` - Smazat data

Příklad (z `app/api/products/route.ts`):

```typescript
// GET /api/products
export async function GET() {
  const products = await prisma.product.findMany()
  return NextResponse.json(products)
}

// POST /api/products
export async function POST(request: Request) {
  const body = await request.json()
  const product = await prisma.product.create({ data: body })
  return NextResponse.json(product)
}
```

### 🎨 Frontend - React komponenty

Frontend komponenty jsou v `app/`. Příklad:

```typescript
'use client'  // <-- Tohle říká Next.js že komponenta používá hooks

import { useState, useEffect } from 'react'

export default function ProductsPage() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    // Při načtení stránky zavolej API
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(data))
  }, [])

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  )
}
```

## Jak přidat novou funkci?

### Příklad: Přidat kategorii k produktům

#### 1. Uprav databázové schéma

`prisma/schema.prisma`:
```prisma
model Product {
  // ...existující fieldy...
  category String? // Přidej tohle
}
```

Aplikuj změnu:
```bash
npx prisma db push
npx prisma generate
```

#### 2. Uprav API endpoint

`app/api/products/route.ts`:
```typescript
export async function POST(request: Request) {
  const body = await request.json()
  const { name, price, unit, category } = body  // Přidej category

  const product = await prisma.product.create({
    data: { name, price, unit, category }  // Přidej category
  })

  return NextResponse.json(product)
}
```

#### 3. Uprav frontend formulář

`app/products/page.tsx`:
```tsx
<Input
  placeholder="Kategorie"
  value={formData.category}
  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
/>
```

**Hotovo!** Kategorie funguje.

## Tailwind CSS - Jak stylovat

Tailwind používá "utility classes". Místo CSS souborů píšeš třídy přímo v JSX:

```tsx
// Místo CSS:
// .button { background: blue; color: white; padding: 8px 16px; }

// Tailwind:
<button className="bg-blue-600 text-white px-4 py-2">
  Tlačítko
</button>
```

**Užitečné třídy:**

- **Barvy:** `bg-blue-600`, `text-white`, `border-gray-300`
- **Spacing:** `p-4` (padding), `m-2` (margin), `px-4` (padding left+right)
- **Layout:** `flex`, `grid`, `hidden`, `block`
- **Typography:** `text-lg`, `font-bold`, `text-center`
- **Zaoblení:** `rounded-md`, `rounded-full`
- **Stíny:** `shadow-sm`, `shadow-lg`

**Hover a další stavy:**
```tsx
<button className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800">
```

## TypeScript - Typy

TypeScript je JavaScript s typy. Pomáhá odhalit chyby:

```typescript
// Bez TypeScript (JavaScript):
function add(a, b) {
  return a + b
}
add("hello", 5)  // Nic nehlásí, ale je to blbost

// S TypeScript:
function add(a: number, b: number): number {
  return a + b
}
add("hello", 5)  // ERROR: Argument of type 'string' is not assignable to parameter of type 'number'
```

**Interface** = definice objektu:
```typescript
interface Product {
  id: string
  name: string
  price: number
}

const product: Product = {
  id: '123',
  name: 'Coffee',
  price: 50
}
```

## Debugging

### 1. Console.log
Klasika:
```typescript
console.log('Products:', products)
```

### 2. React DevTools
Nainstaluj: https://react.dev/learn/react-developer-tools

### 3. Prisma Studio
```bash
npx prisma studio
```
Otevře GUI pro databázi.

### 4. Network Tab
V Chrome DevTools (F12) → Network tab → vidíš všechny API requesty

## Časté chyby

**"Hydration failed"**
- Míchání server a client components. Přidej `'use client'` na začátek souboru.

**"Module not found: Can't resolve '@/...'"**
- Spusť: `npm install` (možná chybí závislost)

**"PrismaClient is unable to run in the browser"**
- Prisma client nelze použít v client komponentách. Používej ho jen v API routes.

**"Objects are not valid as a React child"**
- Snažíš se renderovat objekt místo stringu. Použij: `JSON.stringify(obj)` nebo `.toString()`

## Next.js vs. React - Rozdíly

| Feature | React | Next.js |
|---------|-------|---------|
| Routing | React Router (třeba kód) | File-based (automaticky) |
| API | Externí backend | API routes (v projektu) |
| Server-side | Ne | Ano (Server Components) |
| Optimalizace | Manuální | Automatická |

## Další zdroje

- **Next.js docs:** https://nextjs.org/docs
- **React docs:** https://react.dev/
- **Prisma docs:** https://www.prisma.io/docs
- **Tailwind docs:** https://tailwindcss.com/docs

---

**Pro pomoc nebo otázky, Google je tvůj kámoš!** 🔍

Většina chyb má řešení na Stack Overflow. Zkopíruj error message a vyhledej.
