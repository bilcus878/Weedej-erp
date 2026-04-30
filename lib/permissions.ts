// Permission name constants — follows the as-const pattern from constants.ts
// Each entry maps to a Permission.name in the database

export const Permission = {
  // ── System administration ────────────────────────────────────────────────
  MANAGE_USERS:           'MANAGE_USERS',
  MANAGE_ROLES:           'MANAGE_ROLES',
  VIEW_AUDIT_LOG:         'VIEW_AUDIT_LOG',
  MANAGE_SETTINGS:        'MANAGE_SETTINGS',

  // ── Customers ────────────────────────────────────────────────────────────
  VIEW_CUSTOMERS:         'VIEW_CUSTOMERS',
  CREATE_CUSTOMERS:       'CREATE_CUSTOMERS',
  EDIT_CUSTOMERS:         'EDIT_CUSTOMERS',
  DELETE_CUSTOMERS:       'DELETE_CUSTOMERS',

  // ── Suppliers ────────────────────────────────────────────────────────────
  VIEW_SUPPLIERS:         'VIEW_SUPPLIERS',
  CREATE_SUPPLIERS:       'CREATE_SUPPLIERS',
  EDIT_SUPPLIERS:         'EDIT_SUPPLIERS',
  DELETE_SUPPLIERS:       'DELETE_SUPPLIERS',

  // ── Products ─────────────────────────────────────────────────────────────
  VIEW_PRODUCTS:          'VIEW_PRODUCTS',
  CREATE_PRODUCTS:        'CREATE_PRODUCTS',
  EDIT_PRODUCTS:          'EDIT_PRODUCTS',
  DELETE_PRODUCTS:        'DELETE_PRODUCTS',

  // ── Inventory ─────────────────────────────────────────────────────────────
  VIEW_INVENTORY:         'VIEW_INVENTORY',
  MANAGE_INVENTORY:       'MANAGE_INVENTORY',
  VIEW_BATCHES:           'VIEW_BATCHES',
  MANAGE_BATCHES:         'MANAGE_BATCHES',

  // ── Purchase Orders ──────────────────────────────────────────────────────
  VIEW_PURCHASE_ORDERS:   'VIEW_PURCHASE_ORDERS',
  CREATE_PURCHASE_ORDERS: 'CREATE_PURCHASE_ORDERS',
  EDIT_PURCHASE_ORDERS:   'EDIT_PURCHASE_ORDERS',
  DELETE_PURCHASE_ORDERS: 'DELETE_PURCHASE_ORDERS',

  // ── Customer Orders ───────────────────────────────────────────────────────
  VIEW_CUSTOMER_ORDERS:   'VIEW_CUSTOMER_ORDERS',
  CREATE_CUSTOMER_ORDERS: 'CREATE_CUSTOMER_ORDERS',
  EDIT_CUSTOMER_ORDERS:   'EDIT_CUSTOMER_ORDERS',
  DELETE_CUSTOMER_ORDERS: 'DELETE_CUSTOMER_ORDERS',

  // ── Invoices ──────────────────────────────────────────────────────────────
  VIEW_INVOICES:          'VIEW_INVOICES',
  CREATE_INVOICE:         'CREATE_INVOICE',
  EDIT_INVOICE:           'EDIT_INVOICE',
  DELETE_INVOICE:         'DELETE_INVOICE',
  STORNO_INVOICE:         'STORNO_INVOICE',

  // ── Receipts ──────────────────────────────────────────────────────────────
  VIEW_RECEIPTS:          'VIEW_RECEIPTS',
  PROCESS_RECEIPTS:       'PROCESS_RECEIPTS',

  // ── Delivery Notes ────────────────────────────────────────────────────────
  VIEW_DELIVERY_NOTES:    'VIEW_DELIVERY_NOTES',
  CREATE_DELIVERY_NOTES:  'CREATE_DELIVERY_NOTES',
  PROCESS_DELIVERY_NOTES: 'PROCESS_DELIVERY_NOTES',

  // ── Finance ───────────────────────────────────────────────────────────────
  VIEW_TRANSACTIONS:      'VIEW_TRANSACTIONS',

  // ── Reports ───────────────────────────────────────────────────────────────
  VIEW_REPORTS:           'VIEW_REPORTS',
  EXPORT_DATA:            'EXPORT_DATA',

  // ── E-shop ────────────────────────────────────────────────────────────────
  VIEW_ESHOP_ORDERS:      'VIEW_ESHOP_ORDERS',
  MANAGE_ESHOP:           'MANAGE_ESHOP',

  // ── Returns / Claims ──────────────────────────────────────────────────────
  VIEW_RETURNS:           'VIEW_RETURNS',
  CREATE_RETURNS:         'CREATE_RETURNS',
  EDIT_RETURNS:           'EDIT_RETURNS',
  PROCESS_RETURNS:        'PROCESS_RETURNS',   // approve / reject / restock / refund

  // ── CRM ───────────────────────────────────────────────────────────────────
  CRM_VIEW_CONTACTS:         'CRM_VIEW_CONTACTS',
  CRM_MANAGE_CONTACTS:       'CRM_MANAGE_CONTACTS',
  CRM_VIEW_INTERACTIONS:     'CRM_VIEW_INTERACTIONS',
  CRM_CREATE_INTERACTIONS:   'CRM_CREATE_INTERACTIONS',
  CRM_EDIT_INTERACTIONS:     'CRM_EDIT_INTERACTIONS',
  CRM_DELETE_INTERACTIONS:   'CRM_DELETE_INTERACTIONS',
  CRM_VIEW_TASKS:            'CRM_VIEW_TASKS',
  CRM_CREATE_TASKS:          'CRM_CREATE_TASKS',
  CRM_EDIT_TASKS:            'CRM_EDIT_TASKS',
  CRM_DELETE_TASKS:          'CRM_DELETE_TASKS',
  CRM_VIEW_OPPORTUNITIES:    'CRM_VIEW_OPPORTUNITIES',
  CRM_CREATE_OPPORTUNITIES:  'CRM_CREATE_OPPORTUNITIES',
  CRM_EDIT_OPPORTUNITIES:    'CRM_EDIT_OPPORTUNITIES',
  CRM_DELETE_OPPORTUNITIES:  'CRM_DELETE_OPPORTUNITIES',
} as const

export type Permission = typeof Permission[keyof typeof Permission]
