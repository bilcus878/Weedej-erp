// Standalone RBAC seed — safe to run on a live database at any time.
// Does NOT touch business data (suppliers, products, transactions, etc.).
// Use this to apply or re-apply roles, permissions, and admin role assignment.
//
// Run: npx tsx prisma/seed-rbac.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const PERMISSIONS = [
  { name: 'MANAGE_USERS',           displayName: 'Správa uživatelů',      module: 'system'          },
  { name: 'MANAGE_ROLES',           displayName: 'Správa rolí',            module: 'system'          },
  { name: 'VIEW_AUDIT_LOG',         displayName: 'Zobrazit audit log',     module: 'system'          },
  { name: 'MANAGE_SETTINGS',        displayName: 'Nastavení systému',      module: 'system'          },
  { name: 'VIEW_CUSTOMERS',         displayName: 'Zobrazit odběratele',    module: 'customers'       },
  { name: 'CREATE_CUSTOMERS',       displayName: 'Vytvořit odběratele',    module: 'customers'       },
  { name: 'EDIT_CUSTOMERS',         displayName: 'Upravit odběratele',     module: 'customers'       },
  { name: 'DELETE_CUSTOMERS',       displayName: 'Smazat odběratele',      module: 'customers'       },
  { name: 'VIEW_SUPPLIERS',         displayName: 'Zobrazit dodavatele',    module: 'suppliers'       },
  { name: 'CREATE_SUPPLIERS',       displayName: 'Vytvořit dodavatele',    module: 'suppliers'       },
  { name: 'EDIT_SUPPLIERS',         displayName: 'Upravit dodavatele',     module: 'suppliers'       },
  { name: 'DELETE_SUPPLIERS',       displayName: 'Smazat dodavatele',      module: 'suppliers'       },
  { name: 'VIEW_PRODUCTS',          displayName: 'Zobrazit produkty',      module: 'products'        },
  { name: 'CREATE_PRODUCTS',        displayName: 'Vytvořit produkt',       module: 'products'        },
  { name: 'EDIT_PRODUCTS',          displayName: 'Upravit produkt',        module: 'products'        },
  { name: 'DELETE_PRODUCTS',        displayName: 'Smazat produkt',         module: 'products'        },
  { name: 'VIEW_INVENTORY',         displayName: 'Zobrazit sklad',         module: 'inventory'       },
  { name: 'MANAGE_INVENTORY',       displayName: 'Spravovat sklad',        module: 'inventory'       },
  { name: 'VIEW_BATCHES',           displayName: 'Zobrazit šarže',         module: 'inventory'       },
  { name: 'MANAGE_BATCHES',         displayName: 'Spravovat šarže',        module: 'inventory'       },
  { name: 'VIEW_PURCHASE_ORDERS',   displayName: 'Zobrazit nákup. obj.',   module: 'purchase-orders' },
  { name: 'CREATE_PURCHASE_ORDERS', displayName: 'Vytvořit nákup. obj.',   module: 'purchase-orders' },
  { name: 'EDIT_PURCHASE_ORDERS',   displayName: 'Upravit nákup. obj.',    module: 'purchase-orders' },
  { name: 'DELETE_PURCHASE_ORDERS', displayName: 'Smazat nákup. obj.',     module: 'purchase-orders' },
  { name: 'VIEW_CUSTOMER_ORDERS',   displayName: 'Zobrazit obj. zákazn.',  module: 'customer-orders' },
  { name: 'CREATE_CUSTOMER_ORDERS', displayName: 'Vytvořit obj. zákazn.',  module: 'customer-orders' },
  { name: 'EDIT_CUSTOMER_ORDERS',   displayName: 'Upravit obj. zákazn.',   module: 'customer-orders' },
  { name: 'DELETE_CUSTOMER_ORDERS', displayName: 'Smazat obj. zákazn.',    module: 'customer-orders' },
  { name: 'VIEW_INVOICES',          displayName: 'Zobrazit faktury',       module: 'invoices'        },
  { name: 'CREATE_INVOICE',         displayName: 'Vytvořit fakturu',       module: 'invoices'        },
  { name: 'EDIT_INVOICE',           displayName: 'Upravit fakturu',        module: 'invoices'        },
  { name: 'DELETE_INVOICE',         displayName: 'Smazat fakturu',         module: 'invoices'        },
  { name: 'STORNO_INVOICE',         displayName: 'Stornovat fakturu',      module: 'invoices'        },
  { name: 'VIEW_RECEIPTS',          displayName: 'Zobrazit příjemky',      module: 'receipts'        },
  { name: 'PROCESS_RECEIPTS',       displayName: 'Zpracovat příjemky',     module: 'receipts'        },
  { name: 'VIEW_DELIVERY_NOTES',    displayName: 'Zobrazit výdejky',       module: 'delivery-notes'  },
  { name: 'CREATE_DELIVERY_NOTES',  displayName: 'Vytvořit výdejku',       module: 'delivery-notes'  },
  { name: 'PROCESS_DELIVERY_NOTES', displayName: 'Zpracovat výdejku',      module: 'delivery-notes'  },
  { name: 'VIEW_TRANSACTIONS',      displayName: 'Zobrazit transakce',     module: 'transactions'    },
  { name: 'VIEW_REPORTS',           displayName: 'Zobrazit reporty',       module: 'reports'         },
  { name: 'EXPORT_DATA',            displayName: 'Exportovat data',        module: 'reports'         },
  { name: 'VIEW_ESHOP_ORDERS',         displayName: 'Zobrazit eshop obj.',      module: 'eshop'  },
  { name: 'MANAGE_ESHOP',             displayName: 'Spravovat eshop',          module: 'eshop'  },
  { name: 'CRM_VIEW_CONTACTS',        displayName: 'CRM: Zobrazit kontakty',   module: 'crm'    },
  { name: 'CRM_MANAGE_CONTACTS',      displayName: 'CRM: Spravovat kontakty',  module: 'crm'    },
  { name: 'CRM_VIEW_INTERACTIONS',    displayName: 'CRM: Zobrazit interakce',  module: 'crm'    },
  { name: 'CRM_CREATE_INTERACTIONS',  displayName: 'CRM: Přidat interakci',    module: 'crm'    },
  { name: 'CRM_EDIT_INTERACTIONS',    displayName: 'CRM: Upravit interakci',   module: 'crm'    },
  { name: 'CRM_DELETE_INTERACTIONS',  displayName: 'CRM: Smazat interakci',    module: 'crm'    },
  { name: 'CRM_VIEW_TASKS',           displayName: 'CRM: Zobrazit úkoly',      module: 'crm'    },
  { name: 'CRM_CREATE_TASKS',         displayName: 'CRM: Přidat úkol',         module: 'crm'    },
  { name: 'CRM_EDIT_TASKS',           displayName: 'CRM: Upravit úkol',        module: 'crm'    },
  { name: 'CRM_DELETE_TASKS',         displayName: 'CRM: Smazat úkol',         module: 'crm'    },
  { name: 'CRM_VIEW_OPPORTUNITIES',   displayName: 'CRM: Zobrazit příležitosti', module: 'crm'  },
  { name: 'CRM_CREATE_OPPORTUNITIES', displayName: 'CRM: Přidat příležitost',  module: 'crm'    },
  { name: 'CRM_EDIT_OPPORTUNITIES',   displayName: 'CRM: Upravit příležitost', module: 'crm'    },
  { name: 'CRM_DELETE_OPPORTUNITIES', displayName: 'CRM: Smazat příležitost',  module: 'crm'    },
] as const

type PermName = typeof PERMISSIONS[number]['name']

const ALL_PERMS = PERMISSIONS.map(p => p.name)

const ROLES: { name: string; displayName: string; description: string; isSystem: boolean; permissions: PermName[] }[] = [
  {
    name: 'ADMIN', displayName: 'Administrátor',
    description: 'Plný přístup ke všem funkcím systému', isSystem: true,
    permissions: ALL_PERMS,
  },
  {
    name: 'MANAGER', displayName: 'Vedoucí',
    description: 'Přístup ke všem obchodním operacím kromě správy uživatelů', isSystem: false,
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
      'VIEW_TRANSACTIONS', 'VIEW_REPORTS', 'EXPORT_DATA',
      'VIEW_ESHOP_ORDERS', 'VIEW_AUDIT_LOG',
      'CRM_VIEW_CONTACTS', 'CRM_MANAGE_CONTACTS',
      'CRM_VIEW_INTERACTIONS', 'CRM_CREATE_INTERACTIONS', 'CRM_EDIT_INTERACTIONS', 'CRM_DELETE_INTERACTIONS',
      'CRM_VIEW_TASKS', 'CRM_CREATE_TASKS', 'CRM_EDIT_TASKS', 'CRM_DELETE_TASKS',
      'CRM_VIEW_OPPORTUNITIES', 'CRM_CREATE_OPPORTUNITIES', 'CRM_EDIT_OPPORTUNITIES', 'CRM_DELETE_OPPORTUNITIES',
    ],
  },
  {
    name: 'ACCOUNTANT', displayName: 'Účetní',
    description: 'Přístup k fakturaci, transakcím a finančním reportům', isSystem: false,
    permissions: [
      'VIEW_CUSTOMERS', 'VIEW_SUPPLIERS',
      'VIEW_INVOICES', 'CREATE_INVOICE', 'EDIT_INVOICE', 'DELETE_INVOICE', 'STORNO_INVOICE',
      'VIEW_PURCHASE_ORDERS', 'VIEW_RECEIPTS', 'VIEW_TRANSACTIONS',
      'VIEW_REPORTS', 'EXPORT_DATA',
      'CRM_VIEW_CONTACTS', 'CRM_VIEW_INTERACTIONS', 'CRM_VIEW_TASKS', 'CRM_VIEW_OPPORTUNITIES',
    ],
  },
  {
    name: 'WAREHOUSE', displayName: 'Skladník',
    description: 'Přístup ke skladu, příjemkám, výdejkám a šaržím', isSystem: false,
    permissions: [
      'VIEW_PRODUCTS',
      'VIEW_INVENTORY', 'MANAGE_INVENTORY', 'VIEW_BATCHES', 'MANAGE_BATCHES',
      'VIEW_RECEIPTS', 'PROCESS_RECEIPTS',
      'VIEW_DELIVERY_NOTES', 'CREATE_DELIVERY_NOTES', 'PROCESS_DELIVERY_NOTES',
      'VIEW_PURCHASE_ORDERS', 'VIEW_CUSTOMER_ORDERS',
    ],
  },
]

async function run() {
  console.log('🔐 RBAC seed starting...\n')

  // 1. Permissions
  console.log('📋 Upserting permissions...')
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where:  { name: p.name },
      update: { displayName: p.displayName, module: p.module },
      create: { name: p.name, displayName: p.displayName, module: p.module },
    })
  }
  console.log(`   ✅ ${PERMISSIONS.length} permissions OK\n`)

  // 2. Roles + permission assignments
  console.log('🛡️  Upserting roles and permissions...')
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where:  { name: r.name },
      update: { displayName: r.displayName, description: r.description, isSystem: r.isSystem },
      create: { name: r.name, displayName: r.displayName, description: r.description, isSystem: r.isSystem },
    })

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    const permRecords = await prisma.permission.findMany({
      where:  { name: { in: r.permissions as string[] } },
      select: { id: true },
    })
    if (permRecords.length > 0) {
      await prisma.rolePermission.createMany({
        data:           permRecords.map(p => ({ roleId: role.id, permissionId: p.id })),
        skipDuplicates: true,
      })
    }
    console.log(`   ✅ Role '${r.name}' — ${permRecords.length} permissions`)
  }

  // 3. Admin user + ADMIN role assignment
  console.log('\n👤 Ensuring admin user + ADMIN role...')

  let user = await prisma.user.findUnique({ where: { email: 'admin@weedej.cz' } })
  if (!user) {
    const hash = await bcrypt.hash('Admin123!', 12)
    user = await prisma.user.create({
      data: { email: 'admin@weedej.cz', name: 'Administrátor', passwordHash: hash, isActive: true },
    })
    console.log('   ✅ Admin user created')
    console.log('   ⚠️  Change password immediately: Admin123!')
  } else {
    console.log('   ℹ️  Admin user exists — ensuring role assignment...')
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } })
  if (!adminRole) {
    console.error('   ❌ ADMIN role missing — this should not happen, check above output')
    process.exit(1)
  }

  await prisma.userRole.upsert({
    where:  { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    update: {},
    create: { userId: user.id, roleId: adminRole.id },
  })
  console.log('   ✅ ADMIN role assigned to admin@weedej.cz')

  // 4. Report
  const [roleCount, permCount, urCount] = await Promise.all([
    prisma.role.count(),
    prisma.permission.count(),
    prisma.userRole.count({ where: { userId: user.id } }),
  ])

  console.log('\n✨ RBAC seed complete:')
  console.log(`   Roles: ${roleCount}`)
  console.log(`   Permissions: ${permCount}`)
  console.log(`   Admin has ${urCount} role(s) assigned`)
  console.log('\n⚠️  Log out and log back in to get a fresh JWT with the updated roles.')
}

run()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
