# Modrý rámeček - Vzor pro proklikávatelné odkazy

Tento vzor se používá pro zobrazení proklikávatelných odkazů na související dokumenty (objednávky, faktury, transakce apod.) v detailech.

## Použití

Vždy když potřebujete v detailu zobrazit odkaz na související dokument s dalšími informacemi na **jednom řádku**.

## Základní struktura

```tsx
<div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
  <div className="text-sm flex items-center gap-4">
    {/* Popisek */}
    <span className="text-gray-600">Název pole: </span>

    {/* Odkaz */}
    <a
      href={`/cesta?highlight=${id}`}
      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      {cisloDokladu}
      <ExternalLink className="w-3 h-3 inline ml-1" />
    </a>

    {/* Další informace (volitelné) */}
    <span className="text-gray-600">Další pole: </span>
    <span className="font-medium text-gray-900">
      Hodnota
    </span>
  </div>
</div>
```

## Klíčové vlastnosti

- **`mb-3 p-3 bg-blue-50 border border-blue-200 rounded`** - Modrý rámeček s paddingem
- **`text-sm flex items-center gap-4`** - Vše na jednom řádku s mezerami 4 (1rem)
- **`text-gray-600`** - Barva popisků
- **`text-blue-600 hover:text-blue-800 hover:underline font-medium`** - Stylování odkazů
- **`onClick={(e) => e.stopPropagation()}`** - Zabrání zavření detail panelu při kliknutí
- **`<ExternalLink className="w-3 h-3 inline ml-1" />`** - Ikona externího odkazu

## Příklad 1: Odkaz na objednávku zákazníka

```tsx
<div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
  <div className="text-sm flex items-center gap-4">
    <span className="text-gray-600">Objednávka: </span>
    <a
      href={`/customer-orders?highlight=${customerOrderId}`}
      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      {customerOrderNumber}
      <ExternalLink className="w-3 h-3 inline ml-1" />
    </a>

    <span className="text-gray-600">Typ platby: </span>
    <span className="font-medium text-gray-900">
      Bankovní převod
    </span>
  </div>
</div>
```

## Příklad 2: Podmíněný odkaz (objednávka NEBO transakce)

```tsx
<div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
  <div className="text-sm flex items-center gap-4">
    {/* Pokud je objednávka zákazníka */}
    {customerOrderId && (
      <>
        <span className="text-gray-600">Objednávka: </span>
        <a
          href={`/customer-orders?highlight=${customerOrderId}`}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {customerOrderNumber}
          <ExternalLink className="w-3 h-3 inline ml-1" />
        </a>
      </>
    )}

    {/* Pokud je transakce SumUp */}
    {transactionId && !customerOrderId && (
      <>
        <span className="text-gray-600">Transakce: </span>
        <a
          href={`/transactions?highlight=${transactionId}`}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {transactionCode}
          <ExternalLink className="w-3 h-3 inline ml-1" />
        </a>
      </>
    )}

    {/* Typ platby - společný pro oba případy */}
    <span className="text-gray-600">Typ platby: </span>
    <span className="font-medium text-gray-900">
      {paymentType === 'cash' && 'Hotovost'}
      {paymentType === 'card' && 'Karta'}
      {paymentType === 'transfer' && 'Bankovní převod'}
    </span>
  </div>
</div>
```

## Příklad 3: Pouze odkaz bez dalších informací

```tsx
<div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
  <div className="text-sm flex items-center gap-4">
    <span className="text-gray-600">Objednávka: </span>
    <a
      href={`/purchase-orders?highlight=${purchaseOrderId}`}
      className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      {orderNumber}
      <ExternalLink className="w-3 h-3 inline ml-1" />
    </a>
  </div>
</div>
```

## Import ikony

```tsx
import { ExternalLink } from 'lucide-react'
```

## Kdy použít

- ✅ V detailech faktur, objednávek, výdejek
- ✅ Kdykoli potřebujete proklikávatelný odkaz na související dokument
- ✅ Když chcete vizuálně odlišit propojené dokumenty
- ✅ Pro zobrazení více informací na jednom řádku

## Kdy NEPOUŽÍT

- ❌ Pro běžný text bez odkazů
- ❌ Pro více řádků informací (použij šedý rámeček nebo seznam)
- ❌ Pro akční tlačítka (použij normální Button komponentu)
