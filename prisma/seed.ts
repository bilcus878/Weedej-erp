// Seed skript - naplní databázi testovacími daty + RBAC rolemi a oprávněními
// Spusť: npx tsx prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── RBAC definitions ────────────────────────────────────────────────────────

const PERMISSIONS = [
  // System
  { name: 'MANAGE_USERS',           displayName: 'Správa uživatelů',     module: 'system'         },
  { name: 'MANAGE_ROLES',           displayName: 'Správa rolí',           module: 'system'         },
  { name: 'VIEW_AUDIT_LOG',         displayName: 'Zobrazit audit log',    module: 'system'         },
  { name: 'MANAGE_SETTINGS',        displayName: 'Nastavení systému',     module: 'system'         },
  // Customers
  { name: 'VIEW_CUSTOMERS',         displayName: 'Zobrazit odběratele',   module: 'customers'      },
  { name: 'CREATE_CUSTOMERS',       displayName: 'Vytvořit odběratele',   module: 'customers'      },
  { name: 'EDIT_CUSTOMERS',         displayName: 'Upravit odběratele',    module: 'customers'      },
  { name: 'DELETE_CUSTOMERS',       displayName: 'Smazat odběratele',     module: 'customers'      },
  // Suppliers
  { name: 'VIEW_SUPPLIERS',         displayName: 'Zobrazit dodavatele',   module: 'suppliers'      },
  { name: 'CREATE_SUPPLIERS',       displayName: 'Vytvořit dodavatele',   module: 'suppliers'      },
  { name: 'EDIT_SUPPLIERS',         displayName: 'Upravit dodavatele',    module: 'suppliers'      },
  { name: 'DELETE_SUPPLIERS',       displayName: 'Smazat dodavatele',     module: 'suppliers'      },
  // Products
  { name: 'VIEW_PRODUCTS',          displayName: 'Zobrazit produkty',     module: 'products'       },
  { name: 'CREATE_PRODUCTS',        displayName: 'Vytvořit produkt',      module: 'products'       },
  { name: 'EDIT_PRODUCTS',          displayName: 'Upravit produkt',       module: 'products'       },
  { name: 'DELETE_PRODUCTS',        displayName: 'Smazat produkt',        module: 'products'       },
  // Inventory
  { name: 'VIEW_INVENTORY',         displayName: 'Zobrazit sklad',        module: 'inventory'      },
  { name: 'MANAGE_INVENTORY',       displayName: 'Spravovat sklad',       module: 'inventory'      },
  { name: 'VIEW_BATCHES',           displayName: 'Zobrazit šarže',        module: 'inventory'      },
  { name: 'MANAGE_BATCHES',         displayName: 'Spravovat šarže',       module: 'inventory'      },
  // Purchase Orders
  { name: 'VIEW_PURCHASE_ORDERS',   displayName: 'Zobrazit nákup. obj.', module: 'purchase-orders' },
  { name: 'CREATE_PURCHASE_ORDERS', displayName: 'Vytvořit nákup. obj.', module: 'purchase-orders' },
  { name: 'EDIT_PURCHASE_ORDERS',   displayName: 'Upravit nákup. obj.',  module: 'purchase-orders' },
  { name: 'DELETE_PURCHASE_ORDERS', displayName: 'Smazat nákup. obj.',   module: 'purchase-orders' },
  // Customer Orders
  { name: 'VIEW_CUSTOMER_ORDERS',   displayName: 'Zobrazit obj. zákazn.', module: 'customer-orders' },
  { name: 'CREATE_CUSTOMER_ORDERS', displayName: 'Vytvořit obj. zákazn.', module: 'customer-orders' },
  { name: 'EDIT_CUSTOMER_ORDERS',   displayName: 'Upravit obj. zákazn.',  module: 'customer-orders' },
  { name: 'DELETE_CUSTOMER_ORDERS', displayName: 'Smazat obj. zákazn.',   module: 'customer-orders' },
  // Invoices
  { name: 'VIEW_INVOICES',          displayName: 'Zobrazit faktury',      module: 'invoices'       },
  { name: 'CREATE_INVOICE',         displayName: 'Vytvořit fakturu',      module: 'invoices'       },
  { name: 'EDIT_INVOICE',           displayName: 'Upravit fakturu',       module: 'invoices'       },
  { name: 'DELETE_INVOICE',         displayName: 'Smazat fakturu',        module: 'invoices'       },
  { name: 'STORNO_INVOICE',         displayName: 'Stornovat fakturu',     module: 'invoices'       },
  // Receipts
  { name: 'VIEW_RECEIPTS',          displayName: 'Zobrazit příjemky',     module: 'receipts'       },
  { name: 'PROCESS_RECEIPTS',       displayName: 'Zpracovat příjemky',    module: 'receipts'       },
  // Delivery Notes
  { name: 'VIEW_DELIVERY_NOTES',    displayName: 'Zobrazit výdejky',      module: 'delivery-notes' },
  { name: 'CREATE_DELIVERY_NOTES',  displayName: 'Vytvořit výdejku',      module: 'delivery-notes' },
  { name: 'PROCESS_DELIVERY_NOTES', displayName: 'Zpracovat výdejku',     module: 'delivery-notes' },
  // Finance
  { name: 'VIEW_TRANSACTIONS',      displayName: 'Zobrazit transakce',    module: 'transactions'   },
  // Reports
  { name: 'VIEW_REPORTS',           displayName: 'Zobrazit reporty',      module: 'reports'        },
  { name: 'EXPORT_DATA',            displayName: 'Exportovat data',       module: 'reports'        },
  // Eshop
  { name: 'VIEW_ESHOP_ORDERS',      displayName: 'Zobrazit eshop obj.',   module: 'eshop'          },
  { name: 'MANAGE_ESHOP',           displayName: 'Spravovat eshop',       module: 'eshop'          },
] as const

type PermName = typeof PERMISSIONS[number]['name']

const ROLES: {
  name: string
  displayName: string
  description: string
  isSystem: boolean
  permissions: PermName[]
}[] = [
  {
    name:        'ADMIN',
    displayName: 'Administrátor',
    description: 'Plný přístup ke všem funkcím systému',
    isSystem:    true,
    permissions: PERMISSIONS.map(p => p.name),
  },
  {
    name:        'MANAGER',
    displayName: 'Vedoucí',
    description: 'Přístup ke všem obchodním operacím kromě správy uživatelů',
    isSystem:    false,
    permissions: [
      'VIEW_CUSTOMERS', 'CREATE_CUSTOMERS', 'EDIT_CUSTOMERS',
      'VIEW_SUPPLIERS', 'CREATE_SUPPLIERS', 'EDIT_SUPPLIERS',
      'VIEW_PRODUCTS', 'CREATE_PRODUCTS', 'EDIT_PRODUCTS',
      'VIEW_INVENTORY', 'MANAGE_INVENTORY', 'VIEW_BATCHES', 'MANAGE_BATCHES',
      'VIEW_PURCHASE_ORDERS', 'CREATE_PURCHASE_ORDERS', 'EDIT_PURCHASE_ORDERS',
      'VIEW_CUSTOMER_ORDERS', 'CREATE_CUSTOMER_ORDERS', 'EDIT_CUSTOMER_ORDERS',
      'VIEW_INVOICES', 'CREATE_INVOICE', 'EDIT_INVOICE', 'STORNO_INVOICE',
      'VIEW_RECEIPTS', 'PROCESS_RECEIPTS',
      'VIEW_DELIVERY_NOTES', 'CREATE_DELIVERY_NOTES', 'PROCESS_DELIVERY_NOTES',
      'VIEW_TRANSACTIONS',
      'VIEW_REPORTS', 'EXPORT_DATA',
      'VIEW_ESHOP_ORDERS',
      'VIEW_AUDIT_LOG',
    ],
  },
  {
    name:        'ACCOUNTANT',
    displayName: 'Účetní',
    description: 'Přístup k fakturaci, transakcím a finančním reportům',
    isSystem:    false,
    permissions: [
      'VIEW_CUSTOMERS', 'VIEW_SUPPLIERS',
      'VIEW_INVOICES', 'CREATE_INVOICE', 'EDIT_INVOICE', 'DELETE_INVOICE', 'STORNO_INVOICE',
      'VIEW_PURCHASE_ORDERS',
      'VIEW_RECEIPTS',
      'VIEW_TRANSACTIONS',
      'VIEW_REPORTS', 'EXPORT_DATA',
    ],
  },
  {
    name:        'WAREHOUSE',
    displayName: 'Skladník',
    description: 'Přístup ke skladu, příjemkám, výdejkám a šaržím',
    isSystem:    false,
    permissions: [
      'VIEW_PRODUCTS',
      'VIEW_INVENTORY', 'MANAGE_INVENTORY',
      'VIEW_BATCHES', 'MANAGE_BATCHES',
      'VIEW_RECEIPTS', 'PROCESS_RECEIPTS',
      'VIEW_DELIVERY_NOTES', 'CREATE_DELIVERY_NOTES', 'PROCESS_DELIVERY_NOTES',
      'VIEW_PURCHASE_ORDERS',
      'VIEW_CUSTOMER_ORDERS',
    ],
  },
]

async function seedRbac() {
  console.log('🔐 Seeding RBAC — permissions...')

  // Upsert all permissions
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where:  { name: p.name },
      update: { displayName: p.displayName, module: p.module },
      create: { name: p.name, displayName: p.displayName, module: p.module },
    })
  }
  console.log(`   ✅ ${PERMISSIONS.length} permissions seeded`)

  console.log('🔐 Seeding RBAC — roles...')

  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where:  { name: r.name },
      update: { displayName: r.displayName, description: r.description, isSystem: r.isSystem },
      create: { name: r.name, displayName: r.displayName, description: r.description, isSystem: r.isSystem },
    })

    // Rebuild role-permission assignments (idempotent)
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })

    const permRecords = await prisma.permission.findMany({
      where: { name: { in: r.permissions as string[] } },
      select: { id: true },
    })

    if (permRecords.length > 0) {
      await prisma.rolePermission.createMany({
        data: permRecords.map(p => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      })
    }
    console.log(`   ✅ Role '${r.name}' — ${permRecords.length} permissions`)
  }
}

async function seedAdminUser() {
  console.log('👤 Seeding default admin user...')

  const existing = await prisma.user.findUnique({ where: { email: 'admin@weedej.cz' } })
  if (existing) {
    console.log('   ℹ️  Admin user already exists — skipping')
    return
  }

  const hash = await bcrypt.hash('Admin123!', 12)
  const user = await prisma.user.create({
    data: {
      email:        'admin@weedej.cz',
      name:         'Administrátor',
      passwordHash: hash,
      isActive:     true,
    },
  })

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } })
  if (adminRole) {
    await prisma.userRole.create({
      data: { userId: user.id, roleId: adminRole.id },
    })
  }

  console.log('   ✅ Admin user created: admin@weedej.cz / Admin123!')
  console.log('   ⚠️  Change this password immediately after first login!')
}

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

  await seedRbac()
  await seedAdminUser()

  console.log('✨ Seedování dokončeno!')
  console.log('')
  console.log('📊 Přehled:')
  console.log(`   - ${2} dodavatelé`)
  console.log(`   - ${6} produktů`)
  console.log(`   - ${3} skladové položky`)
  console.log(`   - ${2} transakce`)
  console.log(`   - ${ROLES.length} role, ${PERMISSIONS.length} oprávnění`)
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
