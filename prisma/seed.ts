// Seed skript - naplní databázi testovacími daty
// Spusť: npx tsx prisma/seed.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Začínám seedování databáze...')

  // 1. Vytvoř dodavatele
  console.log('📦 Vytvářím dodavatele...')
  const supplier1 = await prisma.supplier.create({
    data: {
      name: 'Káva & Co.',
      email: 'info@kavaaco.cz',
      phone: '+420 123 456 789',
      note: 'Hlavní dodavatel kávy',
    },
  })

  const supplier2 = await prisma.supplier.create({
    data: {
      name: 'Pekárna Dobrota',
      email: 'objednavky@pekarna-dobrota.cz',
      phone: '+420 987 654 321',
      note: 'Dodavatel pečiva',
    },
  })

  console.log(`✅ Vytvořeno ${2} dodavatelů`)

  // 2. Vytvoř produkty
  console.log('☕ Vytvářím produkty...')

  const espresso = await prisma.product.create({
    data: {
      name: 'Espresso',
      price: 45,
      unit: 'ks',
    },
  })

  const cappuccino = await prisma.product.create({
    data: {
      name: 'Cappuccino',
      price: 55,
      unit: 'ks',
    },
  })

  const latte = await prisma.product.create({
    data: {
      name: 'Latte',
      price: 60,
      unit: 'ks',
    },
  })

  const croissant = await prisma.product.create({
    data: {
      name: 'Croissant',
      price: 35,
      unit: 'ks',
    },
  })

  const muffin = await prisma.product.create({
    data: {
      name: 'Čokoládový muffin',
      price: 40,
      unit: 'ks',
    },
  })

  const kavaZrnka = await prisma.product.create({
    data: {
      name: 'Káva zrnková',
      price: 350,
      unit: 'g',
    },
  })

  console.log(`✅ Vytvořeno ${6} produktů`)

  // 3. Naskladni zboží
  console.log('📦 Naskladňuji zboží...')

  await prisma.inventoryItem.create({
    data: {
      productId: kavaZrnka.id,
      quantity: 5000, // 5 kg kávy
      unit: 'g',
      supplierId: supplier1.id,
      purchasePrice: 250,
      date: new Date('2024-12-01'),
      note: 'Arabica ze Kolumbie',
    },
  })

  await prisma.inventoryItem.create({
    data: {
      productId: croissant.id,
      quantity: 50,
      unit: 'ks',
      supplierId: supplier2.id,
      purchasePrice: 20,
      date: new Date('2024-12-20'),
      note: 'Čerstvé pečivo',
    },
  })

  await prisma.inventoryItem.create({
    data: {
      productId: muffin.id,
      quantity: 30,
      unit: 'ks',
      supplierId: supplier2.id,
      purchasePrice: 25,
      date: new Date('2024-12-20'),
    },
  })

  console.log(`✅ Naskladněno ${3} položek`)

  // 4. Vytvoř testovací transakce
  console.log('💳 Vytvářím transakce...')

  const transaction1 = await prisma.transaction.create({
    data: {
      transactionCode: 'FA20241201001',
      totalAmount: 100,
      paymentType: 'card',
      status: 'completed',
      transactionDate: new Date('2024-12-01T10:30:00'),
      items: {
        create: [
          {
            productId: espresso.id,
            quantity: 2,
            unit: 'ks',
            price: 100, // Cena jen u první položky
          },
        ],
      },
    },
  })

  const transaction2 = await prisma.transaction.create({
    data: {
      transactionCode: 'FA20241201002',
      totalAmount: 130,
      paymentType: 'cash',
      status: 'completed',
      transactionDate: new Date('2024-12-01T11:15:00'),
      items: {
        create: [
          {
            productId: cappuccino.id,
            quantity: 1,
            unit: 'ks',
            price: 130, // Celková cena
          },
          {
            productId: croissant.id,
            quantity: 2,
            unit: 'ks',
            price: null, // Bez ceny (jen první položka má cenu)
          },
        ],
      },
    },
  })

  // Odečti ze skladu pro transakce
  await prisma.inventoryItem.update({
    where: { id: (await prisma.inventoryItem.findFirst({ where: { productId: croissant.id } }))!.id },
    data: { quantity: 48 }, // 50 - 2
  })

  console.log(`✅ Vytvořeno ${2} transakcí`)

  console.log('✨ Seedování dokončeno!')
  console.log('')
  console.log('📊 Přehled:')
  console.log(`   - ${2} dodavatelé`)
  console.log(`   - ${6} produktů`)
  console.log(`   - ${3} skladové položky`)
  console.log(`   - ${2} transakce`)
  console.log('')
  console.log('🚀 Spusť aplikaci: npm run dev')
}

main()
  .catch((e) => {
    console.error('❌ Chyba při seedování:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
